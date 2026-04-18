import { type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import type { LightboxImage } from "./messageList.utils";

interface ImageLightboxProps {
    images: LightboxImage[];
    index: number;
    onIndexChange: (index: number | null) => void;
}

export function ImageLightbox({ images, index, onIndexChange }: ImageLightboxProps) {
    const current = images[index];
    if (!current) return null;

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Escape") onIndexChange(null);
        if (e.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
        if (e.key === "ArrowRight" && index < images.length - 1)
            onIndexChange(index + 1);
    };

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center pointer-events-auto outline-none animate-in fade-in duration-200"
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            autoFocus
        >
            <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between text-white/70">
                <span className="text-sm">
                    {index + 1} / {images.length}
                </span>
                <div className="flex items-center gap-4">
                    <a
                        href={current.url}
                        download={current.name}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-white transition-colors"
                        title="Download"
                    >
                        <Download size={20} />
                    </a>
                    <button
                        onClick={() => onIndexChange(null)}
                        className="hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>
            </div>

            {index > 0 && (
                <button
                    className="absolute left-4 p-2 text-white/50 hover:text-white bg-black/20 hover:bg-black/50 rounded-full transition-all"
                    onClick={() => onIndexChange(index - 1)}
                >
                    <ChevronLeft size={36} />
                </button>
            )}
            {index < images.length - 1 && (
                <button
                    className="absolute right-4 p-2 text-white/50 hover:text-white bg-black/20 hover:bg-black/50 rounded-full transition-all"
                    onClick={() => onIndexChange(index + 1)}
                >
                    <ChevronRight size={36} />
                </button>
            )}

            <img
                src={current.url}
                alt={current.name}
                className="max-h-[90vh] max-w-[90vw] object-contain select-none"
            />
        </div>
    );
}
