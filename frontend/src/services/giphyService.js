const API_BASE_URL = "https://api.giphy.com/v1/gifs";
const API_KEY = import.meta.env.VITE_GIPHY_API_KEY;
const RESULT_LIMIT = 30;

export const isGiphyConfigured = () => Boolean(API_KEY);

const requestGiphy = async (endpoint, params, signal) => {
    if (!API_KEY) {
        throw new Error("GIPHY_API_KEY_MISSING");
    }

    const url = new URL(endpoint ? `${API_BASE_URL}/${endpoint}` : API_BASE_URL);
    url.search = new URLSearchParams({
        api_key: API_KEY,
        rating: "g",
        bundle: "messaging_non_clips",
        ...params,
    });

    const response = await fetch(url, { signal });
    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.meta?.msg || `GIPHY request failed (${response.status})`);
    }

    return result.data;
};

const toGifMedia = (gif) => {
    const images = gif.images || {};
    const preview = images.fixed_width_small || images.fixed_width || images.downsized_small || images.original;

    return {
        id: gif.id,
        previewUrl: preview?.webp || preview?.url || "",
        mediaUrl: images.downsized?.url || images.fixed_width?.url || images.original?.url || "",
    };
};

export const searchGiphyGifs = async (query, { signal } = {}) => {
    const trimmedQuery = query.trim().slice(0, 50);
    const endpoint = trimmedQuery ? "search" : "trending";
    const params = { limit: String(RESULT_LIMIT) };

    if (trimmedQuery) params.q = trimmedQuery;

    const gifs = await requestGiphy(endpoint, params, signal);
    return gifs.map(toGifMedia).filter((gif) => gif.id && gif.previewUrl);
};

export const fetchGiphyGifsByIds = async (gifIds) => {
    const uniqueIds = [...new Set(gifIds.filter(Boolean))];
    const resolvedGifs = [];

    for (let index = 0; index < uniqueIds.length; index += 50) {
        const ids = uniqueIds.slice(index, index + 50);
        const gifs = await requestGiphy("",
            { ids: ids.join(","), limit: String(ids.length) }
        );
        resolvedGifs.push(...gifs.map(toGifMedia).filter((gif) => gif.id && gif.previewUrl));
    }

    return resolvedGifs;
};
