import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Attachment } from "@/types/message";

const GRID_IMAGE_THRESHOLD = 5;
const GRID_CELL_COUNT = 4;

interface ImageCaptionGalleryProps {
    messageId: string;
    attachments: Attachment[];
    onOpenImage: (attachmentId: string) => void;
}

function ImageTile({
    attachmentId,
    url,
    name,
    onOpen,
    className,
    children,
}: {
    attachmentId: string;
    url: string;
    name?: string;
    onOpen: (id: string) => void;
    className?: string;
    children?: ReactNode;
}) {
    return (
        <div className={cn("relative overflow-hidden", className)}>
            <button
                type="button"
                onClick={() => onOpen(attachmentId)}
                className="block h-full w-full text-left transition-opacity hover:opacity-95"
            >
                <img
                    src={url}
                    alt={name ?? "image"}
                    className="h-full w-full object-cover"
                />
            </button>
            {children}
        </div>
    );
}

function StackedGallery({
    messageId,
    attachments,
    onOpenImage,
}: ImageCaptionGalleryProps) {
    return (
        <div className="flex flex-col">
            {attachments.map((att, index) => (
                <ImageTile
                    key={`${messageId}-${index}`}
                    attachmentId={`${messageId}-${index}`}
                    url={att.url}
                    name={att.name}
                    onOpen={onOpenImage}
                    className="max-h-80"
                />
            ))}
        </div>
    );
}

function GridGallery({ messageId, attachments, onOpenImage }: ImageCaptionGalleryProps) {
    const extraCount = attachments.length - GRID_CELL_COUNT;
    const visible = attachments.slice(0, GRID_CELL_COUNT);

    return (
        <div className="grid grid-cols-2 gap-0.5">
            {visible.map((att, index) => {
                const attachmentId = `${messageId}-${index}`;
                const isOverflowCell = index === GRID_CELL_COUNT - 1 && extraCount > 0;

                return (
                    <ImageTile
                        key={attachmentId}
                        attachmentId={attachmentId}
                        url={att.url}
                        name={att.name}
                        onOpen={onOpenImage}
                        className="aspect-square"
                    >
                        {isOverflowCell && (
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/55">
                                <span className="text-2xl font-semibold text-white drop-shadow-sm">
                                    +{extraCount}
                                </span>
                            </div>
                        )}
                    </ImageTile>
                );
            })}
        </div>
    );
}

export function ImageCaptionGallery(props: ImageCaptionGalleryProps) {
    const { attachments } = props;
    if (attachments.length === 0) return null;

    if (attachments.length >= GRID_IMAGE_THRESHOLD) {
        return <GridGallery {...props} />;
    }

    return <StackedGallery {...props} />;
}
