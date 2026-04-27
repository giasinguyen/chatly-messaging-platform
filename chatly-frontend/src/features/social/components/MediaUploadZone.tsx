import { useRef, useState } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { fileService } from "@/services/file.service";
import { toast } from "sonner";

const MAX_FILES = 6;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/webm"];

interface MediaUploadZoneProps {
    value: string[];
    onChange: (urls: string[]) => void;
    disabled?: boolean;
}

export function MediaUploadZone({ value, onChange, disabled }: MediaUploadZoneProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const handleFiles = async (files: FileList) => {
        const remaining = MAX_FILES - value.length;
        if (remaining <= 0) return;

        const selected = Array.from(files).slice(0, remaining);
        const invalid = selected.filter((f) => !ALLOWED_TYPES.includes(f.type));
        if (invalid.length > 0) {
            toast.error("Only images and videos are supported.");
            return;
        }

        setUploading(true);
        try {
            const uploads = await Promise.all(selected.map((f) => fileService.upload(f)));
            onChange([...value, ...uploads.map((r) => r.url)]);
        } catch {
            toast.error("Upload failed. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    const removeUrl = (url: string) => onChange(value.filter((u) => u !== url));

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!disabled && e.dataTransfer.files.length) {
            handleFiles(e.dataTransfer.files);
        }
    };

    return (
        <div className="space-y-2">
            {/* Preview grid */}
            {value.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                    {value.map((url) => (
                        <div key={url} className="relative aspect-square rounded-xl overflow-hidden group">
                            {url.match(/\.(mp4|webm)$/i) ? (
                                <video src={url} className="w-full h-full object-cover" muted />
                            ) : (
                                <img src={url} alt="" className="w-full h-full object-cover" />
                            )}
                            <button
                                type="button"
                                onClick={() => removeUrl(url)}
                                disabled={disabled}
                                className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="size-3 text-white" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload trigger */}
            {value.length < MAX_FILES && (
                <div
                    role="button"
                    tabIndex={0}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => !disabled && inputRef.current?.click()}
                    onKeyDown={(e) => e.key === "Enter" && !disabled && inputRef.current?.click()}
                    className={cn(
                        "flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 py-5 text-sm text-indigo-400 transition-colors",
                        !disabled && "cursor-pointer hover:border-indigo-400 hover:bg-indigo-50",
                        disabled && "opacity-50 cursor-not-allowed",
                    )}
                >
                    {uploading ? (
                        <Loader2 className="size-5 animate-spin" />
                    ) : (
                        <ImagePlus className="size-5" />
                    )}
                    <span>{uploading ? "Uploading…" : "Add photos / videos"}</span>
                    <span className="text-xs text-indigo-300">
                        {value.length}/{MAX_FILES} files
                    </span>
                </div>
            )}

            <input
                ref={inputRef}
                type="file"
                accept={ALLOWED_TYPES.join(",")}
                multiple
                className="hidden"
                disabled={disabled || uploading}
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
        </div>
    );
}
