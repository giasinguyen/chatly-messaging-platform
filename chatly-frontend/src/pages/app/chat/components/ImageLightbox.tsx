import { type KeyboardEvent, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import type { LightboxImage } from "./messageList.utils";

interface ImageLightboxProps {
    images: LightboxImage[];
    index: number;
    onIndexChange: (index: number | null) => void;
}

export function ImageLightbox({ images, index, onIndexChange }: ImageLightboxProps) {
    const current = images[index];
    const pointerStartXRef = useRef<number | null>(null);
    const activeThumbnailRef = useRef<HTMLButtonElement | null>(null);

    const canGoPrevious = index > 0;
    const canGoNext = index < images.length - 1;

    const handlePrevious = () => {
        if (canGoPrevious) onIndexChange(index - 1);
    };

    const handleNext = () => {
        if (canGoNext) onIndexChange(index + 1);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        e.stopPropagation();

        if (e.key === "Escape") onIndexChange(null);
        if (e.key === "ArrowLeft") handlePrevious();
        if (e.key === "ArrowRight") handleNext();
    };

    const handlePointerUp = (clientX: number) => {
        if (pointerStartXRef.current === null) return;
        const distance = clientX - pointerStartXRef.current;
        pointerStartXRef.current = null;

        if (Math.abs(distance) < 60) return;
        if (distance > 0) {
            handlePrevious();
            return;
        }
        handleNext();
    };

    useEffect(() => {
        activeThumbnailRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
        });
    }, [index]);

    if (!current) return null;

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center pointer-events-auto outline-none animate-in fade-in duration-200"
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            onClick={(e) => {
                e.stopPropagation();
                if (e.target === e.currentTarget) {
                    onIndexChange(null);
                }
            }}
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
                        className="hover:text-white transition-colors cursor-pointer"
                        title="Download"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Download size={20} />
                    </a>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onIndexChange(null);
                        }}
                        className="hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>
            </div>

            {canGoPrevious && (
                <button
                    className="absolute left-4 p-2 text-white/50 hover:text-white bg-black/20 hover:bg-black/50 rounded-full transition-all"
                    onClick={(e) => {
                        e.stopPropagation();
                        handlePrevious();
                    }}
                >
                    <ChevronLeft size={36} />
                </button>
            )}
            {canGoNext && (
                <button
                    className="absolute right-4 p-2 text-white/50 hover:text-white bg-black/20 hover:bg-black/50 rounded-full transition-all"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleNext();
                    }}
                >
                    <ChevronRight size={36} />
                </button>
            )}

            <div
                className="flex min-h-0 flex-1 items-center justify-center px-14 pb-24 pt-16"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => {
                    pointerStartXRef.current = e.clientX;
                }}
                onPointerUp={(e) => handlePointerUp(e.clientX)}
                onPointerCancel={() => {
                    pointerStartXRef.current = null;
                }}
            >
                <img
                    src={current.url}
                    alt={current.name}
                    className="max-h-full max-w-full object-contain select-none"
                    draggable={false}
                />
            </div>

            {images.length > 1 && (
                <div
                    className="absolute bottom-0 inset-x-0 bg-black/50 px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="mx-auto flex max-w-4xl gap-2 overflow-x-auto pb-1">
                        {images.map((image, imageIndex) => (
                            <button
                                key={image.id}
                                type="button"
                                ref={imageIndex === index ? activeThumbnailRef : null}
                                className={`h-16 w-16 shrink-0 overflow-hidden rounded border transition ${
                                    imageIndex === index
                                        ? "border-white opacity-100"
                                        : "border-white/20 opacity-60 hover:opacity-100"
                                }`}
                                onClick={() => onIndexChange(imageIndex)}
                            >
                                <img
                                    src={image.url}
                                    alt={image.name}
                                    className="h-full w-full object-cover"
                                    draggable={false}
                                />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
