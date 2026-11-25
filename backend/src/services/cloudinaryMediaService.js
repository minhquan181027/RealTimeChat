import cloudinary from "cloudinary";
import Message from "../models/Message.js";

cloudinary.v2.config();

const getOwnedAsset = (url, mediaType, ownerId) => {
    if (typeof url !== "string" || !ownerId || !["image", "audio"].includes(mediaType)) {
        return null;
    }

    try {
        const parsed = new URL(url);
        const cloudName = cloudinary.v2.config().cloud_name;
        const resourceType = mediaType === "audio" ? "video" : "image";
        const segments = parsed.pathname.split("/").filter(Boolean).map(decodeURIComponent);

        if (
            parsed.protocol !== "https:" ||
            parsed.hostname !== "res.cloudinary.com" ||
            !cloudName ||
            segments[0] !== cloudName ||
            segments[1] !== resourceType ||
            segments[2] !== "upload"
        ) {
            return null;
        }

        const versionIndex = segments.findIndex((segment, index) => index >= 3 && /^v\d+$/.test(segment));
        if (versionIndex < 0) return null;

        const publicIdSegments = segments.slice(versionIndex + 1);
        const lastSegment = publicIdSegments.pop();
        if (!lastSegment) return null;

        const publicId = [...publicIdSegments, lastSegment.replace(/\.[^.]+$/, "")].join("/");
        const expectedFolder = mediaType === "audio"
            ? `chat_app/${ownerId}/audio/`
            : `chat_app/${ownerId}/`;
        if (!publicId.startsWith(expectedFolder)) return null;

        return { publicId, resourceType };
    } catch {
        return null;
    }
};

export const isOwnedCloudinaryMedia = (url, mediaType, ownerId) =>
    Boolean(getOwnedAsset(url, mediaType, ownerId));

export const deleteOwnedCloudinaryMedia = async (url, mediaType, ownerId) => {
    const asset = getOwnedAsset(url, mediaType, ownerId);
    if (!asset) return false;

    const result = await cloudinary.v2.uploader.destroy(asset.publicId, {
        resource_type: asset.resourceType,
        invalidate: true,
    });
    if (result.result !== "ok" && result.result !== "not found") {
        throw new Error(`Cloudinary did not delete ${asset.publicId}: ${result.result}`);
    }

    return true;
};

export const deleteMessageCloudinaryMedia = async (message, { excludeConversationId } = {}) => {
    let complete = true;
    const ownerId = message.senderId?._id || message.senderId;

    for (const [url, mediaType] of [[message.imgURL, "image"], [message.audioURL, "audio"]]) {
        if (!url) continue;

        const ownedAsset = getOwnedAsset(url, mediaType, ownerId);
        if (!ownedAsset) {
            complete = false;
            continue;
        }

        const references = {
            _id: { $ne: message._id },
            recalledAt: null,
            $or: [{ imgURL: url }, { audioURL: url }],
        };
        if (excludeConversationId) {
            references.conversationId = { $ne: excludeConversationId };
        }
        if (await Message.exists(references)) continue;

        await deleteOwnedCloudinaryMedia(url, mediaType, ownerId);
    }

    return complete;
};
