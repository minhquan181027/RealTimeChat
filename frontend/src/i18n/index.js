import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import vi from "./locales/vi.json";
import en from "./locales/en.json";
import ja from "./locales/ja.json"; 

export const LANGUAGES = [
    { code: "vi", label: "Tiếng Việt" },
    { code: "en", label: "English" },
    { code: "ja", label: "日本語" }, 
];

const saved = localStorage.getItem("lang");

i18n.use(initReactI18next).init({
    resources: {
        vi: { translation: vi },
        en: { translation: en },
        ja: { translation: ja }  
    },
    lng: LANGUAGES.some((l) => l.code === saved) ? saved : "vi",
    fallbackLng: "vi",
    interpolation: { escapeValue: false },
});

export const setLanguage = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem("lang", code);
    document.documentElement.lang = code;
};

// 🆕 4. Cập nhật hàm format ngày tháng theo chuẩn từng nước
export const localeOf = () => {
    if (i18n.language === "en") return "en-US";
    if (i18n.language === "ja") return "ja-JP"; // Nhật dùng chuẩn YYYY/MM/DD
    return "vi-VN";
};

export default i18n;