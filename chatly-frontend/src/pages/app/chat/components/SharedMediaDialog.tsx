import { useState, useEffect, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Image, FileText, Link as LinkIcon, Download, Loader2 } from "lucide-react";
import { fileService, type FileUploadResponse } from "@/services/file.service";
import { messageService } from "@/services/message.service";

const PAGE_SIZE = 20;
const URL_REGEX = /(https?:\/\/[^\s<>"]+)/g;

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

    const loadMedia = useCallback(async (page: number, append: boolean) => {
        setLoadingMedia(true);
        try {
            const result = await fileService.getByConversation(conversationId, "image", page, PAGE_SIZE);
            setMedia((prev) => append ? [...prev, ...result] : result);
            setHasMoreMedia(result.length === PAGE_SIZE);
            setMediaPage(page);
        } catch { /* silent */ }
        finally { setLoadingMedia(false); }
    }, [conversationId]);

    const loadFiles = useCallback(async (page: number, append: boolean) => {
        setLoadingFiles(true);
        try {
            const result = await fileService.getByConversation(conversationId, "file", page, PAGE_SIZE);
            setFiles((prev) => append ? [...prev, ...result] : result);
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

    useEffect(() => {
        if (!open) return;
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
    }, [open, conversationId, loadMedia, loadFiles, loadLinks]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden max-h-[85vh] flex flex-col">
                <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
                    <DialogTitle className="text-base">Shared Media</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue={defaultTab} className="flex flex-1 min-h-0 flex-col overflow-hidden">
                    <div className="px-5 shrink-0">
                        <TabsList className="h-9 w-full bg-muted/50">
                            <TabsTrigger value="media" className="flex-1 gap-1.5 text-xs">
                                <Image size={13} />
                                Media ({media.length})
                            </TabsTrigger>
                            <TabsTrigger value="files" className="flex-1 gap-1.5 text-xs">
                                <FileText size={13} />
                                Files ({files.length})
                            </TabsTrigger>
                            <TabsTrigger value="links" className="flex-1 gap-1.5 text-xs">
                                <LinkIcon size={13} />
                                Links ({links.length})
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Media Tab */}
                    <TabsContent value="media" className="mt-0 flex-1 min-h-0 overflow-hidden flex flex-col px-5 pb-5">
                        <ScrollArea className="flex-1 min-h-0 pt-3">
                            {media.length === 0 && !loadingMedia ? (
                                <p className="text-xs text-muted-foreground text-center py-10">No media yet</p>
                            ) : (
                                <>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {media.map((file) => (
                                            <a
                                                key={file.fileId}
                                                href={file.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="aspect-square rounded bg-muted/60 border border-border/40 overflow-hidden hover:opacity-80 transition"
                                            >
                                                {file.fileType?.startsWith("video/") ? (
                                                    <video src={file.url} className="w-full h-full object-cover" muted />
                                                ) : (
                                                    <img src={file.url} alt={file.fileName} className="w-full h-full object-cover" />
                                                )}
                                            </a>
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
                                                Load more
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
                        </ScrollArea>
                    </TabsContent>

                    {/* Files Tab */}
                    <TabsContent value="files" className="mt-0 flex-1 min-h-0 overflow-hidden flex flex-col px-5 pb-5">
                        <ScrollArea className="flex-1 min-h-0 pt-3">
                            {files.length === 0 && !loadingFiles ? (
                                <p className="text-xs text-muted-foreground text-center py-10">No files yet</p>
                            ) : (
                                <>
                                    <div className="flex flex-col gap-2">
                                        {files.map((file) => {
                                            const sizeStr = file.fileSize
                                                ? file.fileSize > 1048576
                                                    ? `${(file.fileSize / 1048576).toFixed(1)} MB`
                                                    : `${(file.fileSize / 1024).toFixed(0)} KB`
                                                : "";
                                            const dateStr = file.createdAt
                                                ? new Date(file.createdAt).toLocaleDateString("en-US")
                                                : "";
                                            return (
                                                <a
                                                    key={file.fileId}
                                                    href={file.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 transition"
                                                >
                                                    <div className="h-8 w-8 rounded bg-brand/10 flex items-center justify-center shrink-0">
                                                        <FileText size={14} className="text-brand" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium text-foreground truncate">{file.fileName}</p>
                                                        <p className="text-[11px] text-muted-foreground">
                                                            {sizeStr}{sizeStr && dateStr ? " · " : ""}{dateStr}
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
                                                Load more
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
                        </ScrollArea>
                    </TabsContent>

                    {/* Links Tab */}
                    <TabsContent value="links" className="mt-0 flex-1 min-h-0 overflow-hidden flex flex-col px-5 pb-5">
                        <ScrollArea className="flex-1 min-h-0 pt-3">
                            {links.length === 0 && !loadingLinks ? (
                                <p className="text-xs text-muted-foreground text-center py-10">No links yet</p>
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
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
