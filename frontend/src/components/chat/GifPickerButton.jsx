import { useEffect, useRef, useState } from "react";
import { Film, Loader2, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isGiphyConfigured, searchGiphyGifs } from "@/services/giphyService";

const GifPickerButton = ({ onGifSelect, disabled }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [gifs, setGifs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const pickerRef = useRef(null);
    const requestRef = useRef(null);
    const hasLoadedRef = useRef(false);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            requestRef.current?.abort();
        };
    }, []);

    const loadGifs = async (searchTerm = "") => {
        requestRef.current?.abort();
        const controller = new AbortController();
        requestRef.current = controller;
        setLoading(true);
        setError("");

        try {
            const results = await searchGiphyGifs(searchTerm, { signal: controller.signal });
            setGifs(results);
            hasLoadedRef.current = true;
        } catch (requestError) {
            if (requestError.name === "AbortError") return;
            setError(
                requestError.message === "GIPHY_API_KEY_MISSING"
                    ? t("chatInput.gifApiKeyMissing")
                    : t("chatInput.gifSearchFailed")
            );
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    };

    const togglePicker = () => {
        if (isOpen) {
            setIsOpen(false);
            return;
        }

        setIsOpen(true);
        if (isGiphyConfigured() && !hasLoadedRef.current) {
            loadGifs("");
        } else if (!isGiphyConfigured()) {
            setError(t("chatInput.gifApiKeyMissing"));
        }
    };

    const handleSearch = (event) => {
        event.preventDefault();
        loadGifs(query);
    };

    return (
        <div className="relative" ref={pickerRef}>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                title={t("chatInput.gifPicker")}
                aria-label={t("chatInput.gifPicker")}
                aria-expanded={isOpen}
                disabled={disabled}
                onClick={togglePicker}
            >
                <Film className="size-5" />
            </Button>

            {isOpen && (
                <div className="absolute bottom-full right-0 z-50 mb-2 flex w-[min(340px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border bg-background shadow-xl">
                    <form onSubmit={handleSearch} className="flex gap-2 border-b p-2">
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={t("chatInput.searchGifs")}
                            aria-label={t("chatInput.searchGifs")}
                            maxLength={50}
                            className="h-9 min-w-0"
                        />
                        <Button type="submit" size="icon" className="size-9 shrink-0" disabled={loading}>
                            <Search className="size-4" />
                        </Button>
                    </form>

                    <div className="grid max-h-72 min-h-32 grid-cols-3 gap-1 overflow-y-auto p-2">
                        {loading ? (
                            <div className="col-span-3 flex items-center justify-center text-muted-foreground">
                                <Loader2 className="size-5 animate-spin" />
                            </div>
                        ) : error ? (
                            <p className="col-span-3 self-center px-2 text-center text-sm text-muted-foreground">{error}</p>
                        ) : gifs.length ? (
                            gifs.map((gif) => (
                                <button
                                    key={gif.id}
                                    type="button"
                                    onClick={() => {
                                        onGifSelect?.(gif);
                                        setIsOpen(false);
                                    }}
                                    className="overflow-hidden rounded-md bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    title={t("chatInput.sendGif")}
                                >
                                    <img
                                        src={gif.previewUrl}
                                        alt=""
                                        loading="lazy"
                                        className="h-24 w-full object-cover"
                                    />
                                </button>
                            ))
                        ) : (
                            <p className="col-span-3 self-center text-center text-sm text-muted-foreground">{t("chatInput.noGifs")}</p>
                        )}
                    </div>

                    <a
                        href="https://giphy.com"
                        target="_blank"
                        rel="noreferrer"
                        className="border-t px-3 py-1.5 text-right text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                        Powered By GIPHY
                    </a>
                </div>
            )}
        </div>
    );
};

export default GifPickerButton;
