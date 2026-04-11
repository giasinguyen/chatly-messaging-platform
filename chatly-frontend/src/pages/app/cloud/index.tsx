import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ImageIcon,
    FileText,
    Video,
    Search,
    Download,
    Eye,
    Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { fileService, type FileUploadResponse } from "@/services/file.service";
import { conversationService } from "@/services/conversation.service";

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
        ? `Ngày ${day} Tháng ${month}`
        : `Ngày ${day} Tháng ${month} Năm ${year}`;
};

const groupByDate = (files: FileUploadResponse[]): Record<string, FileUploadResponse[]> => {
    return files.reduce<Record<string, FileUploadResponse[]>>((acc, item) => {
        const label = formatSectionLabel(item.createdAt ?? new Date().toISOString());
        acc[label] = acc[label] ? [...acc[label], item] : [item];
        return acc;
    }, {});
};

// --- Constants ---

const sortOptions = [
    { value: "latest", label: "Mới nhất" },
    { value: "oldest", label: "Cũ nhất" },
];

const mediaTypeOptions = [
    { value: "all", label: "Tất cả" },
    { value: "images", label: "Ảnh" },
    { value: "videos", label: "Video" },
];

// --- Component ---

export default function CloudPage() {
    const [loading, setLoading] = useState(true);
    const [allFiles, setAllFiles] = useState<FileUploadResponse[]>([]);
    const [convMap, setConvMap] = useState<Record<string, string>>({});

    const [searchTerm, setSearchTerm] = useState("");
    const [sortFilter, setSortFilter] = useState("latest");
    const [categoryTab, setCategoryTab] = useState("media");
    const [typeFilterByTab, setTypeFilterByTab] = useState<Record<string, string>>({
        media: "all",
        files: "all",
    });

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
            .catch(() => toast.error("Không thể tải dữ liệu kho lưu trữ"))
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

    const mediaFiles = useMemo(() => allFiles.filter((f) => isMedia(f.fileType)), [allFiles]);
    const docFiles = useMemo(() => allFiles.filter((f) => !isMedia(f.fileType)), [allFiles]);

    const docExtensions = useMemo(() => {
        const exts = new Set(docFiles.map((f) => getExtension(f.fileName)));
        return [
            { value: "all", label: "Tất cả" },
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
        id ? (convMap[id] ?? id.slice(0, 8) + "...") : "-";

    const handleDownload = (file: FileUploadResponse) => {
        const a = document.createElement("a");
        a.href = file.url;
        a.download = file.fileName;
        a.target = "_blank";
        a.rel = "noreferrer";
        a.click();
    };

    return (
        <div className="h-full overflow-y-auto bg-background text-foreground">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-16 pt-8 md:px-8">
                <section className="rounded-3xl border border-border bg-card/95 p-8 shadow-xl">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-xl space-y-3">
                            <Badge className="w-fit bg-primary text-primary-foreground">Cloud Storage</Badge>
                            <h1 className="text-3xl font-semibold leading-tight">
                                Kho lưu trữ cá nhân — mọi file từ các cuộc trò chuyện.
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Lọc theo loại file, hội thoại và thời gian gửi. Xem nhanh hình ảnh hoặc tải về tài liệu chỉ với một cú nhấp.
                            </p>
                        </div>
                        <div className="grid w-full max-w-sm grid-cols-2 gap-4 text-center text-sm text-muted-foreground">
                            <div className="rounded-2xl border border-border/60 bg-muted/60 p-4">
                                <p className="text-2xl font-semibold text-foreground">{loading ? "-" : allFiles.length}</p>
                                <p>Files đã lưu</p>
                            </div>
                            <div className="rounded-2xl border border-border/60 bg-muted/60 p-4">
                                <p className="text-2xl font-semibold text-foreground">{loading ? "-" : uniqueConvCount}</p>
                                <p>Conversations</p>
                            </div>
                            <div className="rounded-2xl border border-border/60 bg-muted/60 p-4">
                                <p className="text-2xl font-semibold text-foreground">{loading ? "-" : mediaFiles.length}</p>
                                <p>Ảnh / Video</p>
                            </div>
                            <div className="rounded-2xl border border-border/60 bg-muted/60 p-4">
                                <p className="text-2xl font-semibold text-foreground">{loading ? "-" : formatTotalSize(totalSize)}</p>
                                <p>Đã đồng bộ</p>
                            </div>
                        </div>
                    </div>
                </section>

                <Tabs value={categoryTab} onValueChange={setCategoryTab}>
                    <Card className="border-border bg-card shadow-2xl">
                        <CardHeader className="flex flex-col gap-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <CardTitle>Cloud Library</CardTitle>
                                    <CardDescription>Filter theo loại file, thời gian gửi và hội thoại.</CardDescription>
                                </div>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                    <div className="relative sm:min-w-[220px]">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                                        <Input
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Tìm kiếm file"
                                            className="h-10 rounded-2xl border-border bg-muted pl-10"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Select value={currentTypeFilter} onValueChange={handleTypeChange}>
                                            <SelectTrigger className="h-10 min-w-[140px] rounded-2xl border-border">
                                                <SelectValue placeholder="Loại" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(categoryTab === "media" ? mediaTypeOptions : docExtensions).map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select value={sortFilter} onValueChange={setSortFilter}>
                                            <SelectTrigger className="h-10 min-w-[140px] rounded-2xl border-border">
                                                <SelectValue placeholder="Ngày gửi" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {sortOptions.map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            <TabsList className="inline-flex rounded-2xl bg-muted/70 p-1 text-sm">
                                <TabsTrigger value="media" className="rounded-2xl px-4 py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground">
                                    Ảnh / Video
                                </TabsTrigger>
                                <TabsTrigger value="files" className="rounded-2xl px-4 py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground">
                                    Tài liệu
                                </TabsTrigger>
                            </TabsList>
                        </CardHeader>

                        <CardContent className="space-y-8">
                            {loading ? (
                                <div className="flex h-40 items-center justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <>
                                    <TabsContent value="media" className="space-y-6">
                                        {filteredMedia.length === 0 ? (
                                            <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
                                                <ImageIcon className="h-8 w-8 opacity-40" />
                                                <p className="text-sm">Không có ảnh hoặc video nào.</p>
                                            </div>
                                        ) : (
                                            Object.entries(sectionedMedia).map(([label, items]) => (
                                                <div key={label} className="space-y-3">
                                                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">{label}</p>
                                                    <div className="space-y-4">
                                                        {items.map((item) => (
                                                            <div key={item.fileId} className="flex gap-4 rounded-3xl border border-border/60 bg-muted/60 p-4">
                                                                <div className="flex h-28 w-32 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted">
                                                                    {isImage(item.fileType) ? (
                                                                        <img src={item.url} alt={item.fileName} className="h-full w-full object-cover" />
                                                                    ) : (
                                                                        <Video className="h-10 w-10 text-muted-foreground/60" />
                                                                    )}
                                                                </div>
                                                                <div className="flex flex-1 flex-col justify-between min-w-0">
                                                                    <div>
                                                                        <p className="text-sm font-semibold line-clamp-1">{item.fileName}</p>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {formatFileSize(item.fileSize)} •{" "}
                                                                            {getConvName(item.conversationId)}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <Button size="sm" variant="secondary" className="rounded-2xl" onClick={() => window.open(item.url, "_blank")}>
                                                                            <Eye className="mr-1 h-4 w-4" />
                                                                            Xem
                                                                        </Button>
                                                                        <Button size="sm" className="rounded-2xl" onClick={() => handleDownload(item)}>
                                                                            <Download className="mr-1 h-4 w-4" />
                                                                            Tải xuống
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </TabsContent>

                                    <TabsContent value="files" className="space-y-6">
                                        {filteredDocs.length === 0 ? (
                                            <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
                                                <FileText className="h-8 w-8 opacity-40" />
                                                <p className="text-sm">Không có tài liệu nào.</p>
                                            </div>
                                        ) : (
                                            Object.entries(sectionedDocs).map(([label, items]) => (
                                                <div key={label} className="space-y-3">
                                                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">{label}</p>
                                                    <div className="space-y-4">
                                                        {items.map((item) => {
                                                            const ext = getExtension(item.fileName);
                                                            return (
                                                                <div key={item.fileId} className="flex items-center gap-4 rounded-3xl border border-border/60 bg-muted/60 p-4">
                                                                    <div className={`flex h-16 w-14 shrink-0 items-center justify-center rounded-2xl text-xs font-bold uppercase text-white ${getExtensionColor(ext)}`}>
                                                                        {ext}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-semibold line-clamp-1">{item.fileName}</p>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {formatFileSize(item.fileSize)} - {getConvName(item.conversationId)}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex shrink-0 items-center gap-2">
                                                                        <span className="hidden text-right text-xs text-muted-foreground/80 sm:block">
                                                                            {new Date(item.createdAt ?? "").toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                                                                        </span>
                                                                        <Button size="sm" variant="ghost" className="rounded-2xl" onClick={() => handleDownload(item)}>
                                                                            <Download className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </TabsContent>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </Tabs>
            </div>
        </div>
    );
}
