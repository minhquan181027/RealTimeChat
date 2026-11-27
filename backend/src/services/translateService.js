import Message from "../models/Message.js";
import User from "../models/User.js";
import { getIO } from "../socket/index.js";
import { createHash } from "node:crypto";
import redis from "../libs/redis.js";
import { STATIC_DICTIONARY } from "../constants/staticDictionary.js";

const ENDPOINT = "https://translate.googleapis.com/translate_a/single";


// Nếu bị Google giới hạn tốc độ (429) thì tạm nghỉ, tránh gọi dồn dập
let blockedUntil = 0;

const CACHE_TTL = 60 * 60 * 24 * 30; // 30 ngày

const createCacheKey = (lang, text) => {
    const normalized = text.trim().toLowerCase().replace(/\s+/g, " ");
    const hash = createHash("sha256").update(normalized).digest("hex");
    return `translation:v1:${lang}:${hash}`;
};



const saveCachedTranslation = async (lang, text, value) => {
    try {
        const key = createCacheKey(lang, text);

        await redis.set(key, JSON.stringify(value), {
            EX: CACHE_TTL,
        });
    } catch (error) {
        console.error("Redis SET error:", error.message);
    }
};

export const shouldTranslate = (text) => {
    if (!text) return false;
    const s = text.trim();

    // 1. Độ dài: Quá ngắn hoặc quá dài thì bỏ qua
    if ([...s].length < 2 || s.length > 1000) return false;

    // 2. Bỏ qua nếu chỉ có link
    if (/^(https?:\/\/\S+\s*)+$/i.test(s)) return false;

    // 3. Phải có chứa chữ cái
    if (!/\p{L}/u.test(s)) return false;

    // CHỐNG SPAM KÝ TỰ LẶP LẠI (Ví dụ: "hiiiiii", "aaaaa")
    // Nếu có bất kỳ ký tự nào lặp lại 4 lần liên tiếp -> Bỏ qua
    if (/(.)\1{3,}/u.test(s)) return false;

    // Latin-vowel heuristics below do not apply to Japanese, Korean, Arabic, and other scripts.
    const hasNonLatinLetter = [...s].some(
        (character) => /\p{L}/u.test(character) && !/\p{Script=Latin}/u.test(character)
    );
    if (hasNonLatinLetter) return true;

    // 🆕 5. CHỐNG GÕ BẬY (Không có nguyên âm)
    // Tiếng Việt và tiếng Anh bắt buộc phải có nguyên âm. 
    // Nếu chuỗi toàn phụ âm (như "hj", "sdfg") -> Bỏ qua
    const vowelRegex = /[aeiouyàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]/i;
    if (!vowelRegex.test(s)) return false;

    // 🆕 6. CHỐNG GÕ BẬY (Tỉ lệ nguyên âm quá thấp)
    // Ví dụ: "sdadas" có 6 chữ nhưng chỉ có 2 nguyên âm (chiếm 33%) -> Có thể dịch.
    // Nhưng "sdfgsdfg" dài 8 chữ, có 0 nguyên âm -> Đã bị bắt ở bước 5.
    // Đoạn này xử lý các chuỗi như "asdfghjk" (chỉ có 1 nguyên âm / 8 chữ)
    const letters = s.replace(/[^a-zA-ZÀ-ỹ]/g, '');
    const vowels = s.match(/[aeiouyàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]/ig) || [];
    if (letters.length > 4 && (vowels.length / letters.length) < 0.2) {
        return false; // Dưới 20% là nguyên âm -> Rác
    }

    return true;
};

const callGoogle = async (text, to, signal) => {
    const url = `${ENDPOINT}?client=gtx&sl=auto&tl=${encodeURIComponent(to)}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { signal });

    if (res.status === 429) {
        blockedUntil = Date.now() + 60_000;
        throw new Error("Google Translate giới hạn tốc độ (429), tạm nghỉ 60 giây");
    }
    if (!res.ok) throw new Error(`Google Translate ${res.status}`);

    const data = await res.json();
    // data[0] là các đoạn đã dịch, data[2] là ngôn ngữ nguồn được phát hiện
    return {
        text: (data[0] || []).map((seg) => seg[0]).join(""),
        sourceLang: data[2] || null,
    };
};

const normalizeForStatic = (text) =>
    text.trim().toLowerCase().replace(/[!?.~,]+$/g, "").replace(/\s+/g, " ");

export const translateText = async (text, targets) => {
    const result = {
        sourceLang: null,
        translations: {},
    };

    if (!targets.length) return result;

    // 0. Kiểm tra từ điển tĩnh trên RAM (0ms - không tốn ping Redis hay Google)
    const staticKey = normalizeForStatic(text);
    const staticEntry = STATIC_DICTIONARY[staticKey];
    const missingAfterStatic = [];

    for (const to of targets) {
        if (staticEntry && staticEntry[to]) {
            result.sourceLang = staticEntry.sourceLang;
            result.translations[to] = staticEntry[to];

            console.log(`⚡ [STATIC HIT] "${text}" -> ${to}`);
        } else {
            missingAfterStatic.push(to);
        }
    }

    // Nếu từ điển tĩnh đã dịch đủ hết các ngôn ngữ cần thiết thì trả về luôn
    if (!missingAfterStatic.length) {
        if (result.sourceLang) delete result.translations[result.sourceLang];
        return result;
    }

    const missingAfterRedis = [];

    // 1. Kiểm tra Redis bằng mGet cho những ngôn ngữ chưa có trong từ điển tĩnh
    if (redis.isReady) {
        try {
            const keys = missingAfterStatic.map((to) => createCacheKey(to, text));
            const cachedValues = await redis.mGet(keys);

            missingAfterStatic.forEach((to, idx) => {
                const raw = cachedValues[idx];
                if (raw) {
                    const hit = JSON.parse(raw);
                    result.sourceLang = hit.sourceLang || result.sourceLang;
                    result.translations[to] = hit.text;
                    console.log(`🟢 [REDIS HIT] "${text}" -> ${to}`);
                } else {
                    missingAfterRedis.push(to);
                }
            });
        } catch (error) {
            console.error("Redis MGET error:", error.message);
            missingAfterRedis.push(...missingAfterStatic);
        }
    } else {
        missingAfterRedis.push(...missingAfterStatic);
    }

    // 2. Chỉ gọi Google cho những ngôn ngữ cả RAM lẫn Redis đều không có
    if (missingAfterRedis.length && Date.now() >= blockedUntil) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3000);

        try {
            const results = await Promise.all(
                missingAfterRedis.map((to) =>
                    callGoogle(text, to, ctrl.signal).then((r) => ({ to, ...r }))
                )
            );

            // 3. Lưu đồng thời các bản dịch mới vào Redis
            await Promise.all(
                results.map((r) => {
                    result.sourceLang = r.sourceLang || result.sourceLang;
                    result.translations[r.to] = r.text;

                    return saveCachedTranslation(r.to, text, {
                        text: r.text,
                        sourceLang: r.sourceLang,
                    });
                })
            );
            console.log(`🌐 [GOOGLE API] "${text}" -> ${missingAfterRedis.join(", ")}`);
        } catch (err) {
            console.error("Lỗi gọi Google Translate:", err.message);
        } finally {
            clearTimeout(timer);
        }
    }

    // Bỏ qua nếu ngôn ngữ đích trùng với ngôn ngữ gốc của tin nhắn
    if (result.sourceLang) {
        delete result.translations[result.sourceLang];
    }

    return result;
};

// Chạy nền: không await ở nơi gọi để việc gửi tin không bị chậm
export const translateForRecipients = async (conversation, message, sender) => {
    try {
        if (message.type !== "text" || !shouldTranslate(message.content)) return;

        const senderId = sender._id.toString();
        const senderLang = sender.language || "vi";

        const ids = conversation.participants
            .filter((p) => p.userId.toString() !== senderId && p.status !== "declined")
            .map((p) => p.userId);

        const users = await User.find({ _id: { $in: ids } }).select("_id language autoTranslate");
        const wanted = users.filter(
            (u) => u.autoTranslate !== false && (u.language || "vi") !== senderLang
        );

        // Gom theo ngôn ngữ: mỗi ngôn ngữ chỉ dịch một lần dù có nhiều người nhận
        const targets = [...new Set(wanted.map((u) => u.language || "vi"))];
        if (!targets.length) return;

        const { sourceLang, translations } = await translateText(message.content, targets);
        const langs = Object.keys(translations);
        if (!langs.length) return;

        const $set = {};
        if (sourceLang) $set.sourceLang = sourceLang;
        langs.forEach((l) => { $set[`translations.${l}`] = translations[l]; });
        await Message.updateOne({ _id: message._id }, { $set });

        const io = getIO();
        wanted.forEach((u) => {
            const lang = u.language || "vi";
            if (!translations[lang]) return;
            io.to(u._id.toString()).emit("message_translated", {
                conversationId: conversation._id.toString(),
                messageId: message._id.toString(),
                lang,
                text: translations[lang],
                sourceLang,
            });
        });
    } catch (err) {
        console.error("Lỗi dịch tin nhắn:", err);
    }
};