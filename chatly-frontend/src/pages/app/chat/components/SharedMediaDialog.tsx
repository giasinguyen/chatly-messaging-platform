import { useState, useEffect, useCallback, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Image, FileText, Link as LinkIcon, Download, Loader2, X } from "lucide-react";
import { fileService, type FileUploadResponse } from "@/services/file.service";
import { messageService } from "@/services/message.service";
import { useTranslation } from "react-i18next";
import { ImageLightbox } from "./ImageLightbox";
import type { LightboxImage } from "./messageList.utils";
import { getFileTypeDisplay } from "./fileTypeDisplay";

type ActiveTab = "media" | "files" | "links";

const PAGE_SIZE = 20;
const URL_REGEX = /(https?:\/\/[^\s<>"]+)/g;

function isSharedMediaType(fileType?: string): boolean {
    if (!fileType || fileType === "image/gif") {
        return false;
    }
    return fileType.startsWith("image/") || fileType.startsWith("video/");
}

function isStickerOrGifAsset(
    fileType?: string,
    fileName?: string,
    url?: string,
): boolean {
    const normalizedType = (fileType ?? "").toLowerCase();
    const normalizedName = (fileName ?? "").toLowerCase();
    const normalizedUrl = (url ?? "").toLowerCase();

    if (normalizedType === "image/gif") {
        return true;
    }

    if (normalizedName.endsWith(".gif")) {
        return true;
    }

    return normalizedUrl.includes("/sticker") || normalizedUrl.includes("/gif");
}

function getFileKey(file: FileUploadResponse): string {
    return file.fileId || file.url;
}

function fileToLightboxImage(file: FileUploadResponse): LightboxImage {
    return {
        id: getFileKey(file),
        url: file.url,
        name: file.fileName ?? "image",
    };
}

interface SharedMediaDialogProps {
    conversationId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultTab?: "media" | "files" | "links";
}

export function SharedMediaDialog({
    conversationId,
    open,
    onOpenChange,
    defaultTab = "media",
}: SharedMediaDialogProps) {
    const { t, i18n } = useTranslation();
    const [activeTab, setActiveTab] = useState<ActiveTab>(defaultTab);
    const dateLocale = i18n.language === "vi" ? "vi-VN" : "en-US";

    const [media, setMedia] = useState<FileUploadResponse[]>([]);
    const [files, setFiles] = useState<FileUploadResponse[]>([]);
    const [links, setLinks] = useState<{ url: string; domain: string }[]>([]);

    const [mediaPage, setMediaPage] = useState(0);
    const [filesPage, setFilesPage] = useState(0);
    const [hasMoreMedia, setHasMoreMedia] = useState(true);
    const [hasMoreFiles, setHasMoreFiles] = useState(true);

    const [loadingMedia, setLoadingMedia] = useState(false);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [loadingLinks, setLoadingLinks] = useState(false);
    const [previewMedia, setPreviewMedia] = useState<FileUploadResponse | null>(null);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    const mediaImages = useMemo(
        () =>
            media
                .filter((file) => file.fileType?.startsWith("image/"))
                .map(fileToLightboxImage),
        [media],
    );

    const tabTitle =
        activeTab === "media"
            ? t("chat.shared_media_title")
            : activeTab === "files"
              ? t("chat.shared_files_title")
              : t("chat.shared_links_title");

    const loadMedia = useCallback(async (page: number, append: boolean) => {
        setLoadingMedia(true);
        try {
            const result = await fileService.getByConversation(conversationId, "image", page, PAGE_SIZE);
            const mediaFiles = result.filter((file) => isSharedMediaType(file.fileType));
            setMedia((prev) => append ? [...prev, ...mediaFiles] : mediaFiles);
            setHasMoreMedia(result.length === PAGE_SIZE);
            setMediaPage(page);
        } catch { /* silent */ }
        finally { setLoadingMedia(false); }
    }, [conversationId]);

    const loadFiles = useCallback(async (page: number, append: boolean) => {
        setLoadingFiles(true);
        try {
            const result = await fileService.getByConversation(conversationId, "file", page, PAGE_SIZE);
            const filtered = result.filter((file) =>
                !isStickerOrGifAsset(file.fileType, file.fileName, file.url)
                && !isSharedMediaType(file.fileType),
            );
            setFiles((prev) => append ? [...prev, ...filtered] : filtered);
            setHasMoreFiles(result.length === PAGE_SIZE);
            setFilesPage(page);
        } catch { /* silent */ }
        finally { setLoadingFiles(false); }
    }, [conversationId]);

    const loadLinks = useCallback(async () => {
        setLoadingLinks(true);
        try {
            const res = await messageService.search(conversationId, "http", 0, 100);
            const extracted: { url: string; domain: string }[] = [];
            for (const msg of res.result) {
                if (msg.type === "GIF" || msg.type === "STICKER") continue;
                const matches = msg.content?.match(URL_REGEX) ?? [];
                for (const url of matches) {
                    try {
                        const domain = new URL(url).hostname;
                        if (!extracted.find((l) => l.url === url)) {
                            extracted.push({ url, domain });
                        }
                    } catch { /* ignore */ }
                }
            }
            setLinks(extracted);
        } catch { /* silent */ }
        finally { setLoadingLinks(false); }
    }, [conversationId]);

    const handleOpenMedia = useCallback(
        (file: FileUploadResponse) => {
            if (file.fileType?.startsWith("video/")) {
                setPreviewMedia(file);
                return;
            }

            const imageIndex = mediaImages.findIndex(
                (image) => image.id === getFileKey(file),
            );
            if (imageIndex >= 0) {
                setLightboxIndex(imageIndex);
            }
        },
        [mediaImages],
    );

    useEffect(() => {
        if (!open) return;
        setActiveTab(defaultTab);
        setMedia([]);
        setFiles([]);
        setLinks([]);
        setMediaPage(0);
        setFilesPage(0);
        setHasMoreMedia(true);
        setHasMoreFiles(true);
        loadMedia(0, false);
        loadFiles(0, false);
        loadLinks();
    }, [open, conversationId, defaultTab, loadMedia, loadFiles, loadLinks]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {previewMedia && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
                    onClick={() => setPreviewMedia(null)}
                >
                    <button
                        type="button"
                        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
                        onClick={() => setPreviewMedia(null)}
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <div className="max-h-[88vh] max-w-[92vw]" onClick={(event) => event.stopPropagation()}>
                        <video
                            src={previewMedia.url}
                            controls
                            className="max-h-[86vh] max-w-[90vw] rounded-xl shadow-2xl"
                        />
                        <p className="mt-2 text-center text-xs text-white/70">
                            {previewMedia.fileName}
                        </p>
                    </div>
                </div>
            )}
            <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden max-h-[85vh] flex flex-col">
                <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
                    <DialogTitle className="text-base">{tabTitle}</DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)} className="flex flex-1 min-h-0 flex-col overflow-hidden">
                    <div className="px-5 shrink-0">
                        <TabsList className="h-9 w-full bg-muted/50">
                            <TabsTrigger value="media" className="flex-1 gap-1.5 text-xs">
                                <Image size={13} />
                                {t("chat.media")} ({media.length})
                            </TabsTrigger>
                            <TabsTrigger value="files" className="flex-1 gap-1.5 text-xs">
                                <FileText size={13} />
                                {t("chat.files")} ({files.length})
                            </TabsTrigger>
                            <TabsTrigger value="links" className="flex-1 gap-1.5 text-xs">
                                <LinkIcon size={13} />
                                {t("chat.links")} ({links.length})
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Media Tab */}
                    <TabsContent value="media" className="mt-0 flex-1 min-h-0 overflow-hidden flex flex-col px-5 pb-5">
                        <div className="flex-1 min-h-0 overflow-y-auto pt-3 pr-1">
                            {media.length === 0 && !loadingMedia ? (
                                <p className="text-xs text-muted-foreground text-center py-10">{t("chat.no_media_yet")}</p>
                            ) : (
                                <>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {media.map((file) => (
                                            <button
                                                type="button"
                                                key={getFileKey(file)}
                                                onClick={() => handleOpenMedia(file)}
                                                className="aspect-square rounded bg-muted/60 border border-border/40 overflow-hidden hover:opacity-80 transition"
                                            >
                                                {file.fileType?.startsWith("video/") ? (
                                                    <video src={file.url} className="w-full h-full object-cover" muted />
                                                ) : (
                                                    <img src={file.url} alt={file.fileName} className="w-full h-full object-cover" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                    {hasMoreMedia && (
                                        <div className="flex justify-center pt-3">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-xs"
                                                onClick={() => loadMedia(mediaPage + 1, true)}
                                                disabled={loadingMedia}
                                            >
                                                {loadingMedia ? <Loader2 size={13} className="animate-spin mr-1" /> : null}
                                                {t("chat.load_more")}
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                            {loadingMedia && media.length === 0 && (
                                <div className="flex justify-center py-10">
                                    <Loader2 size={20} className="animate-spin text-muted-foreground" />
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* Files Tab */}
                    <TabsContent value="files" className="mt-0 flex-1 min-h-0 overflow-hidden flex flex-col px-5 pb-5">
                        <div className="flex-1 min-h-0 overflow-y-auto pt-3 pr-1">
                            {files.length === 0 && !loadingFiles ? (
                                <p className="text-xs text-muted-foreground text-center py-10">{t("chat.no_files_yet")}</p>
                            ) : (
                                <>
                                    <div className="flex flex-col gap-2">
                                        {files.map((file) => {
                                            const fileDisplay = getFileTypeDisplay(
                                                file.fileName,
                                                file.fileType,
                                            );
                                            const FileIcon = fileDisplay.Icon;
                                            const sizeStr = file.fileSize
                                                ? file.fileSize > 1048576
                                                    ? `${(file.fileSize / 1048576).toFixed(1)} MB`
                                                    : `${(file.fileSize / 1024).toFixed(0)} KB`
                                                : "";
                                            const dateStr = file.createdAt
                                                ? new Date(file.createdAt).toLocaleDateString(dateLocale)
                                                : "";
                                            return (
                                                <a
                                                    key={file.fileId}
                                                    href={file.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 transition"
                                                >
                                                    <div
                                                        className={`h-9 w-9 rounded text-white flex flex-col items-center justify-center shrink-0 ${fileDisplay.colorClass}`}
                                                    >
                                                        <FileIcon size={14} />
                                                        <span className="mt-0.5 max-w-full px-0.5 text-[7px] font-bold uppercase leading-none">
                                                            {fileDisplay.extension}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium text-foreground truncate">{file.fileName}</p>
                                                        <p className="text-[11px] text-muted-foreground">
                                                            {sizeStr}{sizeStr && dateStr ? " - " : ""}{dateStr}
                                                        </p>
                                                    </div>
                                                    <Download size={14} className="text-muted-foreground shrink-0" />
                                                </a>
                                            );
                                        })}
                                    </div>
                                    {hasMoreFiles && (
                                        <div className="flex justify-center pt-3">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-xs"
                                                onClick={() => loadFiles(filesPage + 1, true)}
                                                disabled={loadingFiles}
                                            >
                                                {loadingFiles ? <Loader2 size={13} className="animate-spin mr-1" /> : null}
                                                {t("chat.load_more")}
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                            {loadingFiles && files.length === 0 && (
                                <div className="flex justify-center py-10">
                                    <Loader2 size={20} className="animate-spin text-muted-foreground" />
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* Links Tab */}
                    <TabsContent value="links" className="mt-0 flex-1 min-h-0 overflow-hidden flex flex-col px-5 pb-5">
                        <div className="flex-1 min-h-0 overflow-y-auto pt-3 pr-1">
                            {links.length === 0 && !loadingLinks ? (
                                <p className="text-xs text-muted-foreground text-center py-10">{t("chat.no_links_yet")}</p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {links.map((link, i) => (
                                        <a
                                            key={i}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex min-w-0 items-center gap-2.5 p-2 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 transition no-underline"
                                        >
                                            <div className="h-7 w-7 rounded bg-brand/10 flex items-center justify-center shrink-0">
                                                <LinkIcon size={13} className="text-brand" />
                                            </div>
                                            <div className="flex-1 min-w-0 overflow-hidden">
                                                <p className="text-xs text-brand truncate">{link.domain}</p>
                                                <p className="text-[11px] text-muted-foreground truncate leading-tight" title={link.url}>
                                                    {link.url}
                                                </p>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            )}
                            {loadingLinks && links.length === 0 && (
                                <div className="flex justify-center py-10">
                                    <Loader2 size={20} className="animate-spin text-muted-foreground" />
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
            {lightboxIndex !== null && (
                <ImageLightbox
                    images={mediaImages}
                    index={lightboxIndex}
                    onIndexChange={setLightboxIndex}
                />
            )}
        </Dialog>
    );
}
