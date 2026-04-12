import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ImageIcon,
    FileText,
    Video,
    Search,
    Download,
    Loader2,
    X,
    ChevronLeft,
    ChevronRight,
    Cloud,
    SlidersHorizontal,
    Image as ImageIconLucide,
    File,
    ArrowDownUp,
    Eye,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { fileService, type FileUploadResponse } from "@/services/file.service";
import { conversationService } from "@/services/conversation.service";
import { cn } from "@/lib/utils";
import { FilePreviewModal } from "./components/FilePreviewModal";

// --- Helpers ---

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const formatTotalSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const getExtension = (fileName: string): string => {
    const parts = fileName.split(".");
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "file";
};

const isImage = (fileType: string) => fileType.startsWith("image/");
const isVideo = (fileType: string) => fileType.startsWith("video/");
const isMedia = (fileType: string) => isImage(fileType) || isVideo(fileType);

const FILE_ICON_COLORS: Record<string, string> = {
    pdf: "bg-red-500",
    doc: "bg-blue-600",
    docx: "bg-blue-600",
    xls: "bg-green-600",
    xlsx: "bg-green-600",
    ppt: "bg-orange-500",
    pptx: "bg-orange-500",
    zip: "bg-yellow-600",
    rar: "bg-yellow-600",
    sql: "bg-purple-600",
    txt: "bg-gray-500",
    csv: "bg-emerald-600",
};

const getExtensionColor = (ext: string): string => FILE_ICON_COLORS[ext] ?? "bg-slate-500";

const formatSectionLabel = (timestamp: string) => {
    const date = new Date(timestamp);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const sameYear = year === new Date().getFullYear();
    return sameYear
        ? `${day} ${new Date(timestamp).toLocaleString("en-US", { month: "long" })}`
        : `${day}/${month}/${year}`;
};

const groupByDate = (files: FileUploadResponse[]): Record<string, FileUploadResponse[]> => {
    return files.reduce<Record<string, FileUploadResponse[]>>((acc, item) => {
        const label = formatSectionLabel(item.createdAt ?? new Date().toISOString());
        acc[label] = acc[label] ? [...acc[label], item] : [item];
        return acc;
    }, {});
};

// --- Constants ---

const STORAGE_QUOTA = 1 * 1024 * 1024 * 1024; // 1 GB

const sortOptions = [
    { value: "latest", label: "Latest" },
    { value: "oldest", label: "Oldest" },
];

const mediaTypeOptions = [
    { value: "all", label: "All" },
    { value: "images", label: "Images" },
    { value: "videos", label: "Videos" },
];

// --- Component ---

export default function CloudPage() {
    const [loading, setLoading] = useState(true);
    const [allFiles, setAllFiles] = useState<FileUploadResponse[]>([]);
    const [convMap, setConvMap] = useState<Record<string, string>>({});

    const [searchTerm, setSearchTerm] = useState("");
    const [sortFilter, setSortFilter] = useState("latest");
    const [categoryTab, setCategoryTab] = useState<"media" | "files">("media");
    const [typeFilterByTab, setTypeFilterByTab] = useState<Record<string, string>>({
        media: "all",
        files: "all",
    });    
    // Cleanup state
    const [isCleaningUp, setIsCleaningUp] = useState(false);

    // Document preview state
    const [docPreviewFile, setDocPreviewFile] = useState<FileUploadResponse | null>(null);
    const [docPreviewOpen, setDocPreviewOpen] = useState(false);

    // Lightbox state
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [lightboxList, setLightboxList] = useState<FileUploadResponse[]>([]);

    const openLightbox = (list: FileUploadResponse[], index: number) => {
        setLightboxList(list);
        setLightboxIndex(index);
    };

    const closeLightbox = () => setLightboxIndex(null);

    const lightboxPrev = () =>
        setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i));

    const lightboxNext = () =>
        setLightboxIndex((i) => (i !== null && i < lightboxList.length - 1 ? i + 1 : i));

    // Auto-cleanup: delete oldest files when total size exceeds 1 GB
    useEffect(() => {
        const currentSize = allFiles.reduce((sum, f) => sum + (f.fileSize ?? 0), 0);
        if (currentSize <= STORAGE_QUOTA || isCleaningUp || allFiles.length === 0) return;

        const sorted = [...allFiles].sort(
            (a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime(),
        );

        let remaining = currentSize;
        const toDelete: FileUploadResponse[] = [];
        for (const file of sorted) {
            if (remaining <= STORAGE_QUOTA) break;
            toDelete.push(file);
            remaining -= file.fileSize ?? 0;
        }
        if (toDelete.length === 0) return;

        setIsCleaningUp(true);
        toast.warning(
            `Storage limit of 1 GB exceeded. Deleting ${toDelete.length} oldest files to free up space...`,
            { duration: 5000 },
        );
        Promise.all(toDelete.map((f) => fileService.deleteFile(f.fileId)))
            .then(() => {
                setAllFiles((prev) =>
                    prev.filter((f) => !toDelete.some((d) => d.fileId === f.fileId)),
                );
                toast.success(`Deleted ${toDelete.length} oldest files to free up space.`);
            })
            .catch(() => toast.error("Failed to clean up old files. Please check again."))
            .finally(() => setIsCleaningUp(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allFiles]);

    useEffect(() => {
        if (lightboxIndex === null) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeLightbox();
            if (e.key === "ArrowLeft") lightboxPrev();
            if (e.key === "ArrowRight") lightboxNext();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lightboxIndex, lightboxList]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        Promise.all([
            fileService.getMyFiles(),
            conversationService.getMyConversations(),
        ])
            .then(([files, convsResp]) => {
                if (cancelled) return;
                setAllFiles(files);
                const map: Record<string, string> = {};
                for (const c of convsResp.result) {
                    map[c.id] = c.nickname ?? c.name ?? c.id;
                }
                setConvMap(map);
            })
            .catch(() => toast.error("Failed to load storage data"))
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const mediaFiles = useMemo(() => allFiles.filter((f) => isMedia(f.fileType)), [allFiles]);
    const docFiles = useMemo(() => allFiles.filter((f) => !isMedia(f.fileType)), [allFiles]);

    const docExtensions = useMemo(() => {
        const exts = new Set(docFiles.map((f) => getExtension(f.fileName)));
        return [
            { value: "all", label: "All" },
            ...Array.from(exts).map((e) => ({ value: e, label: e.toUpperCase() })),
        ];
    }, [docFiles]);

    const totalSize = useMemo(
        () => allFiles.reduce((sum, f) => sum + (f.fileSize ?? 0), 0),
        [allFiles],
    );

    const uniqueConvCount = useMemo(() => {
        const ids = new Set(allFiles.map((f) => f.conversationId).filter(Boolean));
        return ids.size;
    }, [allFiles]);

    const currentTypeFilter = typeFilterByTab[categoryTab];

    const handleTypeChange = (value: string) => {
        setTypeFilterByTab((prev) => ({ ...prev, [categoryTab]: value }));
    };

    const applySort = useCallback(
        (files: FileUploadResponse[]) =>
            [...files].sort((a, b) => {
                const delta =
                    new Date(a.createdAt ?? 0).getTime() -
                    new Date(b.createdAt ?? 0).getTime();
                return sortFilter === "latest" ? -delta : delta;
            }),
        [sortFilter],
    );

    const filteredMedia = useMemo(() => {
        const mediaType = typeFilterByTab.media;
        const search = searchTerm.trim().toLowerCase();
        const result = mediaFiles.filter((f) => {
            const matchSearch = !search || f.fileName.toLowerCase().includes(search);
            const matchType =
                mediaType === "all" ||
                (mediaType === "images" && isImage(f.fileType)) ||
                (mediaType === "videos" && isVideo(f.fileType));
            return matchSearch && matchType;
        });
        return applySort(result);
    }, [mediaFiles, typeFilterByTab, searchTerm, applySort]);

    const filteredDocs = useMemo(() => {
        const extFilter = typeFilterByTab.files;
        const search = searchTerm.trim().toLowerCase();
        const result = docFiles.filter((f) => {
            const matchSearch = !search || f.fileName.toLowerCase().includes(search);
            const matchType = extFilter === "all" || getExtension(f.fileName) === extFilter;
            return matchSearch && matchType;
        });
        return applySort(result);
    }, [docFiles, typeFilterByTab, searchTerm, applySort]);

    const sectionedMedia = useMemo(() => groupByDate(filteredMedia), [filteredMedia]);
    const sectionedDocs = useMemo(() => groupByDate(filteredDocs), [filteredDocs]);

    const getConvName = (id?: string) =>
        id ? (convMap[id] ?? id.slice(0, 8) + "...") : "—";

    const handleDownload = (file: FileUploadResponse) => {
        const a = document.createElement("a");
        a.href = file.url;
        a.download = file.fileName;
        a.target = "_blank";
        a.rel = "noreferrer";
        a.click();
    };

    return (
        <div className="flex h-full overflow-hidden bg-background text-foreground">

            {/* ── Lightbox ────────────────────────────────────────────────── */}
            {lightboxIndex !== null && lightboxList[lightboxIndex] && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
                    onClick={closeLightbox}
                >
                    {lightboxIndex > 0 && (
                        <button
                            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
                            onClick={(e) => { e.stopPropagation(); lightboxPrev(); }}
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                    )}
                    <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
                        {isImage(lightboxList[lightboxIndex].fileType) ? (
                            <img
                                src={lightboxList[lightboxIndex].url}
                                alt={lightboxList[lightboxIndex].fileName}
                                className="max-h-[86vh] max-w-[86vw] rounded-xl object-contain shadow-2xl"
                            />
                        ) : (
                            <video
                                src={lightboxList[lightboxIndex].url}
                                controls
                                className="max-h-[86vh] max-w-[86vw] rounded-xl shadow-2xl"
                            />
                        )}
                        <p className="mt-2 text-center text-xs text-white/50">
                            {lightboxList[lightboxIndex].fileName}
                        </p>
                    </div>
                    {lightboxIndex < lightboxList.length - 1 && (
                        <button
                            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
                            onClick={(e) => { e.stopPropagation(); lightboxNext(); }}
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    )}
                    <button
                        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
                        onClick={closeLightbox}
                    >
                        <X className="h-4 w-4" />
                    </button>
                    {lightboxList.length > 1 && (
                        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white/80 backdrop-blur-sm">
                            {lightboxIndex + 1} / {lightboxList.length}
                        </div>
                    )}
                </div>
            )}

            {/* ── Left Sidebar ─────────────────────────────────────────────── */}
            <aside className="flex w-64 shrink-0 flex-col gap-5 border-r border-border bg-card px-4 py-6 overflow-y-auto">
                {/* Brand */}
                <div className="flex items-center gap-2.5 px-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                        <Cloud className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <span className="text-sm font-semibold tracking-tight">Cloud Storage</span>
                </div>

                {/* Stats */}
                {!loading && (
                    <div className="space-y-1.5">
                        <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Overview</p>
                        <div className="rounded-xl border border-border/60 bg-muted/40 p-3 space-y-2.5">
                            <StatRow label="Files" value={String(allFiles.length)} />
                            <StatRow label="Images / Videos" value={String(mediaFiles.length)} />
                            <StatRow label="Documents" value={String(docFiles.length)} />
                            <StatRow label="Conversations" value={String(uniqueConvCount)} />
                        </div>
                    </div>
                )}

                {/* Nav tabs */}
                <div className="space-y-1.5">
                    <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Library</p>
                    <nav className="space-y-0.5">
                        <NavItem
                            icon={<ImageIconLucide className="h-4 w-4" />}
                            label="Images & Videos"
                            count={mediaFiles.length}
                            active={categoryTab === "media"}
                            onClick={() => setCategoryTab("media")}
                        />
                        <NavItem
                            icon={<File className="h-4 w-4" />}
                            label="Documents"
                            count={docFiles.length}
                            active={categoryTab === "files"}
                            onClick={() => setCategoryTab("files")}
                        />
                    </nav>
                </div>

                {/* Filters */}
                <div className="space-y-2">
                    <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                        <SlidersHorizontal className="inline h-3 w-3 mr-1" />Filters
                    </p>
                    <Select value={currentTypeFilter} onValueChange={handleTypeChange}>
                        <SelectTrigger className="h-9 rounded-lg border-border bg-background text-xs">
                            <SelectValue placeholder="File type" />
                        </SelectTrigger>
                        <SelectContent>
                            {(categoryTab === "media" ? mediaTypeOptions : docExtensions).map((opt) => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={sortFilter} onValueChange={setSortFilter}>
                        <SelectTrigger className="h-9 rounded-lg border-border bg-background text-xs">
                            <ArrowDownUp className="mr-1.5 h-3 w-3 text-muted-foreground" />
                            <SelectValue placeholder="Sort" />
                        </SelectTrigger>
                        <SelectContent>
                            {sortOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Storage Quota Widget */}
                {!loading && (
                    <div className="space-y-1.5 border-t border-border/40 pt-5 mt-auto">
                        <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Storage</p>
                        <StorageWidget used={totalSize} quota={STORAGE_QUOTA} cleaning={isCleaningUp} />
                    </div>
                )}
            </aside>

            {/* ── Main Area ─────────────────────────────────────────────────── */}
            <main className="flex flex-1 flex-col overflow-hidden">
                {/* Top bar */}
                <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-6 py-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
                        <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search file name..."
                            className="h-9 rounded-lg border-border bg-background pl-9 text-sm"
                        />
                    </div>
                    <span className="ml-auto text-xs text-muted-foreground">
                        {loading ? "—" : categoryTab === "media"
                            ? `${filteredMedia.length} file`
                            : `${filteredDocs.length} file`}
                    </span>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex h-full items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : categoryTab === "media" ? (
                        filteredMedia.length === 0 ? (
                            <EmptyState icon={<ImageIcon className="h-10 w-10" />} label="No images or videos found" />
                        ) : (
                            <div className="space-y-8">
                                {Object.entries(sectionedMedia).map(([label, items]) => (
                                    <section key={label}>
                                        <p className="mb-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">{label}</p>
                                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
                                            {items.map((item) => {
                                                const idx = filteredMedia.findIndex((m) => m.fileId === item.fileId);
                                                return (
                                                    <button
                                                        key={item.fileId}
                                                        onClick={() => openLightbox(filteredMedia, idx)}
                                                        className="group relative aspect-square overflow-hidden rounded-lg bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                                                    >
                                                        {isImage(item.fileType) ? (
                                                            <img
                                                                src={item.url}
                                                                alt={item.fileName}
                                                                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                                            />
                                                        ) : (
                                                            <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                                                                <Video className="h-7 w-7 text-muted-foreground/50" />
                                                                <span className="px-1 text-center text-[9px] text-muted-foreground/60 leading-tight line-clamp-2">{item.fileName}</span>
                                                            </div>
                                                        )}
                                                        {/* Hover overlay */}
                                                        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 p-1.5">
                                                            <p className="truncate text-[9px] font-medium text-white leading-tight">{item.fileName}</p>
                                                            <div className="mt-1 flex items-center justify-between">
                                                                <span className="text-[8px] text-white/60">{formatFileSize(item.fileSize)}</span>
                                                                <button
                                                                    className="rounded p-0.5 text-white/80 hover:text-white"
                                                                    onClick={(e) => { e.stopPropagation(); handleDownload(item); }}
                                                                >
                                                                    <Download className="h-3 w-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        )
                    ) : (
                        filteredDocs.length === 0 ? (
                            <EmptyState icon={<FileText className="h-10 w-10" />} label="No documents found" />
                        ) : (
                            <div className="space-y-8">
                                {Object.entries(sectionedDocs).map(([label, items]) => (
                                    <section key={label}>
                                        <p className="mb-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">{label}</p>
                                        <div className="overflow-hidden rounded-xl border border-border/60">
                                            {items.map((item, i) => {
                                                const ext = getExtension(item.fileName);
                                                return (
                                                    <div
                                                        key={item.fileId}
                                                        className={cn(
                                                            "flex items-center gap-3 bg-card px-4 py-3 transition-colors hover:bg-muted/50",
                                                            i < items.length - 1 && "border-b border-border/40",
                                                        )}
                                                    >
                                                        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold uppercase text-white", getExtensionColor(ext))}>
                                                            {ext}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium leading-tight line-clamp-1">{item.fileName}</p>
                                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                                {formatFileSize(item.fileSize)} · {getConvName(item.conversationId)}
                                                            </p>
                                                        </div>
                                                        <span className="hidden shrink-0 text-xs text-muted-foreground/60 md:block">
                                                            {new Date(item.createdAt ?? "").toLocaleDateString("en-US")}
                                                        </span>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-7 w-7 shrink-0 rounded-lg"
                                                            title="Xem trước"
                                                            onClick={() => {
                                                                setDocPreviewFile(item);
                                                                setDocPreviewOpen(true);
                                                            }}
                                                        >
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-7 w-7 shrink-0 rounded-lg"
                                                            title="Tải xuống"
                                                            onClick={() => handleDownload(item)}
                                                        >
                                                            <Download className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </main>

            {/* Document preview modal */}
            <FilePreviewModal
                open={docPreviewOpen}
                onOpenChange={setDocPreviewOpen}
                file={docPreviewFile}
                files={filteredDocs}
                onNavigate={(f) => setDocPreviewFile(f)}
            />
        </div>
    );
}

// --- Small sub-components ---

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className={cn("text-xs font-semibold tabular-nums", highlight ? "text-primary" : "text-foreground")}>
                {value}
            </span>
        </div>
    );
}

function NavItem({
    icon, label, count, active, onClick,
}: {
    icon: React.ReactNode;
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
        >
            {icon}
            <span className="flex-1 text-left">{label}</span>
            <span className={cn("text-xs tabular-nums", active ? "text-primary-foreground/70" : "text-muted-foreground/60")}>
                {count}
            </span>
        </button>
    );
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground/50">
            {icon}
            <p className="text-sm">{label}</p>
        </div>
    );
}

function StorageWidget({ used, quota, cleaning }: { used: number; quota: number; cleaning: boolean }) {
    const pct = Math.min((used / quota) * 100, 100);
    const usedStr = formatTotalSize(used);
    const quotaStr = "1 GB";
    const barColor =
        pct >= 90 ? "bg-red-500" :
        pct >= 70 ? "bg-yellow-500" :
        "bg-primary";
    const textColor =
        pct >= 90 ? "text-red-500" :
        pct >= 70 ? "text-yellow-500" :
        "text-primary";

    return (
        <div className="rounded-xl border border-border/60 bg-muted/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
                <span className={cn("text-sm font-semibold tabular-nums", textColor)}>{usedStr}</span>
                <span className="text-xs text-muted-foreground">/ {quotaStr}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                <div
                    className={cn("h-full rounded-full transition-all duration-700", barColor)}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <p className="text-[11px] text-muted-foreground">
                {cleaning ? (
                    <span className="flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Cleaning up...
                    </span>
                ) : (
                    <>Used <span className={cn("font-medium", textColor)}>{pct.toFixed(1)}%</span> of {quotaStr}</>
                )}
            </p>
            {pct >= 90 && !cleaning && (
                <p className="text-[10px] text-red-500/80">
                    ⚠ Almost full — oldest files will be automatically deleted when limit is reached.
                </p>
            )}
        </div>
    );
}

