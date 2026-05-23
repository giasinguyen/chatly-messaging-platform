import { useCallback, useEffect, useState } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Download,
    FileText,
    Loader2,
    X,
    ZoomIn,
    ZoomOut,
    RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import type { FileUploadResponse } from "@/services/file.service";

interface FilePreviewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    file: FileUploadResponse | null;
    /** All files in the current view for navigation */
    files?: FileUploadResponse[];
    onNavigate?: (file: FileUploadResponse) => void;
}

const isImage = (type: string) => type.startsWith("image/");
const isVideo = (type: string) => type.startsWith("video/");
const isAudio = (type: string) => type.startsWith("audio/");
const isPdf = (type: string) => type === "application/pdf";

const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;

export function FilePreviewModal({
    open,
    onOpenChange,
    file,
    files = [],
    onNavigate,
}: FilePreviewModalProps) {
    const [zoom, setZoom] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const currentIndex = file ? files.findIndex((f) => f.fileId === file.fileId) : -1;
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex >= 0 && currentIndex < files.length - 1;

    // Reset state when file changes
    useEffect(() => {
        setZoom(1);
        setLoading(true);
        setError(false);
    }, [file?.fileId]);

    const handleZoomIn = () => setZoom((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX));
    const handleZoomOut = () => setZoom((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN));
    const handleZoomReset = () => setZoom(1);

    const navigatePrev = useCallback(() => {
        if (hasPrev && onNavigate) onNavigate(files[currentIndex - 1]);
    }, [hasPrev, currentIndex, files, onNavigate]);

    const navigateNext = useCallback(() => {
        if (hasNext && onNavigate) onNavigate(files[currentIndex + 1]);
    }, [hasNext, currentIndex, files, onNavigate]);

    // Keyboard navigation
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") navigatePrev();
            else if (e.key === "ArrowRight") navigateNext();
            else if (e.key === "Escape") onOpenChange(false);
            else if (e.key === "+" || e.key === "=") handleZoomIn();
            else if (e.key === "-") handleZoomOut();
            else if (e.key === "0") handleZoomReset();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, navigatePrev, navigateNext, onOpenChange]);

    const handleDownload = () => {
        if (!file) return;
        const a = document.createElement("a");
        a.href = file.url;
        a.download = file.fileName;
        a.target = "_blank";
        a.rel = "noreferrer";
        a.click();
    };

    if (!file) return null;

    const canPreview =
        isImage(file.fileType) ||
        isVideo(file.fileType) ||
        isAudio(file.fileType) ||
        isPdf(file.fileType);

    const renderPreview = () => {
        if (error) {
            return (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                    <FileText className="h-12 w-12 opacity-40" />
                    <p className="text-sm">
                        This file could not be downloaded.
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownload}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Tải xuống
                    </Button>
                </div>
            );
        }

        if (isImage(file.fileType)) {
            return (
                <div className="relative flex items-center justify-center overflow-auto max-h-[70vh]">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    )}
                    <img
                        src={file.url}
                        alt={file.fileName}
                        className="max-w-full transition-transform duration-200 ease-out"
                        style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
                        onLoad={() => setLoading(false)}
                        onError={() => { setLoading(false); setError(true); }}
                        draggable={false}
                    />
                </div>
            );
        }

        if (isVideo(file.fileType)) {
            return (
                <div className="flex items-center justify-center">
                    <video
                        src={file.url}
                        controls
                        className="max-h-[70vh] max-w-full rounded-lg"
                        onLoadedData={() => setLoading(false)}
                        onError={() => { setLoading(false); setError(true); }}
                    >
                        Trình duyệt không hỗ trợ phát video.
                    </video>
                </div>
            );
        }

        if (isAudio(file.fileType)) {
            return (
                <div className="flex flex-col items-center gap-4 py-8">
                    <FileText className="h-16 w-16 text-muted-foreground/40" />
                    <p className="text-sm font-medium">{file.fileName}</p>
                    <audio
                        src={file.url}
                        controls
                        className="w-full max-w-md"
                        onLoadedData={() => setLoading(false)}
                        onError={() => { setLoading(false); setError(true); }}
                    />
                </div>
            );
        }

        if (isPdf(file.fileType)) {
            return (
                <iframe
                    src={file.url}
                    title={file.fileName}
                    className="h-[70vh] w-full rounded-lg border-0"
                    onLoad={() => setLoading(false)}
                    onError={() => { setLoading(false); setError(true); }}
                />
            );
        }

        // Fallback: non-previewable file
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                <FileText className="h-16 w-16 opacity-40" />
                <p className="text-sm font-medium">{file.fileName}</p>
                <p className="text-xs">This file type cannot be previewed.</p>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                </Button>
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                className="max-w-4xl w-[95vw] max-h-[90vh] p-0 gap-0 overflow-hidden"
            >
                <VisuallyHidden>
                    <DialogTitle>View file: {file.fileName}</DialogTitle>
                </VisuallyHidden>

                {/* Header toolbar */}
                <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-card">
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                            {file.fileName}
                        </p>
                        {files.length > 1 && (
                            <p className="text-xs text-muted-foreground">
                                {currentIndex + 1} / {files.length}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                        {/* Zoom controls — only for images */}
                        {isImage(file.fileType) && !error && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={handleZoomOut}
                                    title="Thu nhỏ (-)"
                                >
                                    <ZoomOut className="h-4 w-4" />
                                </Button>
                                <span className="text-xs text-muted-foreground w-12 text-center tabular-nums">
                                    {Math.round(zoom * 100)}%
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={handleZoomIn}
                                    title="Phóng to (+)"
                                >
                                    <ZoomIn className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={handleZoomReset}
                                    title="Đặt lại (0)"
                                >
                                    <RotateCw className="h-4 w-4" />
                                </Button>
                                <div className="mx-1 h-5 w-px bg-border" />
                            </>
                        )}

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleDownload}
                            title="Tải xuống"
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onOpenChange(false)}
                            title="Đóng (Esc)"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Preview area */}
                <div className="relative flex-1 bg-muted/30 p-4 overflow-auto min-h-[300px] flex items-center justify-center">
                    {loading && canPreview && (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    )}

                    {renderPreview()}

                    {/* Navigation arrows */}
                    {hasPrev && (
                        <Button
                            variant="secondary"
                            size="icon"
                            className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full shadow-lg opacity-80 hover:opacity-100"
                            onClick={navigatePrev}
                            title="Trước (←)"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    )}
                    {hasNext && (
                        <Button
                            variant="secondary"
                            size="icon"
                            className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full shadow-lg opacity-80 hover:opacity-100"
                            onClick={navigateNext}
                            title="Sau (→)"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
