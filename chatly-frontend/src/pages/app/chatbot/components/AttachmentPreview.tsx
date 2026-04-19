import { useState, useEffect, useCallback } from "react";
import { Download, FileText, X, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { agentFileService } from "@/services/agent-file.service";
import type { MessageAttachment } from "@/types/agent";

interface AttachmentPreviewProps {
    attachment: MessageAttachment;
    sessionId: string;
    /** Bubble role — controls colour scheme */
    role: "user" | "assistant";
}

function ImageThumbnail({
    attachment,
    sessionId,
    role,
}: AttachmentPreviewProps) {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let revoked = false;
        agentFileService
            .fetchObjectUrl(sessionId, attachment.file_id)
            .then((url) => {
                if (!revoked) setObjectUrl(url);
            })
            .catch(() => {
                // silently fall back to filename chip
            })
            .finally(() => {
                if (!revoked) setLoading(false);
            });
        return () => {
            revoked = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
        // objectUrl intentionally excluded — only run on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId, attachment.file_id]);

    const handleDownload = useCallback(async () => {
        try {
            await agentFileService.downloadBlob(sessionId, attachment.file_id, attachment.filename);
        } catch {
            toast.error("Download failed");
        }
    }, [sessionId, attachment.file_id, attachment.filename]);

    if (loading) {
        return (
            <div className="h-36 w-36 animate-pulse rounded-xl bg-white/10" />
        );
    }

    if (!objectUrl) {
        return <FileChip attachment={attachment} sessionId={sessionId} role={role} />;
    }

    return (
        <>
            {/* Thumbnail */}
            <div className="relative group rounded-xl overflow-hidden w-fit">
                <img
                    src={objectUrl}
                    alt={attachment.filename}
                    className="max-h-48 max-w-xs rounded-xl object-cover cursor-pointer"
                    onClick={() => setLightboxOpen(true)}
                />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white hover:bg-white/20"
                        onClick={() => setLightboxOpen(true)}
                        title="Preview"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white hover:bg-white/20"
                        onClick={handleDownload}
                        title="Download"
                    >
                        <Download className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Lightbox */}
            <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                <DialogContent className="max-w-3xl p-0 bg-black/90 border-none overflow-hidden">
                    <div className="relative flex items-center justify-center min-h-64 p-4">
                        <img
                            src={objectUrl}
                            alt={attachment.filename}
                            className="max-h-[80vh] max-w-full rounded-lg object-contain"
                        />
                        <div className="absolute top-3 right-3 flex gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10"
                                onClick={handleDownload}
                                title="Download"
                            >
                                <Download className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10"
                                onClick={() => setLightboxOpen(false)}
                                title="Close"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="absolute bottom-3 left-0 right-0 text-center text-white/60 text-xs">
                            {attachment.filename}
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

function FileChip({ attachment, sessionId, role }: AttachmentPreviewProps) {
    const handleDownload = useCallback(async () => {
        try {
            await agentFileService.downloadBlob(sessionId, attachment.file_id, attachment.filename);
        } catch {
            toast.error("Download failed");
        }
    }, [sessionId, attachment.file_id, attachment.filename]);

    return (
        <button
            onClick={handleDownload}
            title={`Download ${attachment.filename}`}
            className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs max-w-44",
                "transition-opacity hover:opacity-80 cursor-pointer",
                role === "user"
                    ? "border-white/20 bg-white/10 text-white"
                    : "border-border bg-muted/60 text-foreground",
            )}
        >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate font-medium flex-1">{attachment.filename}</span>
            <Download className="h-3 w-3 shrink-0 opacity-60" />
        </button>
    );
}

/** Renders a single attachment — image thumbnail with preview or file download chip. */
export function AttachmentPreview({ attachment, sessionId, role }: AttachmentPreviewProps) {
    const isImage = attachment.content_type.startsWith("image/");
    if (isImage) {
        return <ImageThumbnail attachment={attachment} sessionId={sessionId} role={role} />;
    }
    return <FileChip attachment={attachment} sessionId={sessionId} role={role} />;
}
