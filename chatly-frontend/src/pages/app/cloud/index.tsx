import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ImageIcon,
    FileText,
    Video,
    Music4,
    Link2,
    Search,
    Download,
    Eye,
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type MediaEntry = {
    id: string;
    name: string;
    thumbnail: string;
    size: string;
    uploadedAt: string;
    conversationId: string;
    conversationName: string;
    type: "images" | "videos";
};

type FileEntry = {
    id: string;
    name: string;
    size: string;
    uploadedAt: string;
    status: string;
    extension: string;
    color: string;
    conversationId: string;
    conversationName: string;
};

type LinkEntry = {
    id: string;
    title: string;
    url: string;
    uploadedAt: string;
    meta: string;
    conversationId: string;
    conversationName: string;
};

const mediaLibrary: MediaEntry[] = [
    {
        id: "M-1001",
        name: "Ảnh họp Retro",
        size: "1.8 MB",
        uploadedAt: "2026-01-26T09:10:00Z",
        thumbnail: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=60",
        conversationId: "growth",
        conversationName: "Growth team",
        type: "images",
    },
    {
        id: "M-1002",
        name: "Moodboard concept",
        size: "2.3 MB",
        uploadedAt: "2025-12-09T08:00:00Z",
        thumbnail: "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=600&q=60",
        conversationId: "brand",
        conversationName: "Brand refresh",
        type: "images",
    },
    {
        id: "M-1003",
        name: "Product teaser",
        size: "48 MB",
        uploadedAt: "2025-11-28T12:00:00Z",
        thumbnail: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=600&q=60",
        conversationId: "alpha",
        conversationName: "Alpha cohort",
        type: "videos",
    },
    {
        id: "M-1004",
        name: "Ảnh khách hàng",
        size: "950 KB",
        uploadedAt: "2025-10-25T11:00:00Z",
        thumbnail: "https://images.unsplash.com/photo-1502767089025-6572583495b0?auto=format&fit=crop&w=600&q=60",
        conversationId: "stories",
        conversationName: "Customer stories",
        type: "images",
    },
];

const fileLibrary: FileEntry[] = [
    {
        id: "F-101",
        name: "itpm02-140329000706-phpapp02.pdf",
        size: "3.94 MB",
        uploadedAt: "2026-01-23T14:00:00Z",
        status: "Chưa có trên Cloud",
        extension: "PDF",
        color: "bg-red-500",
        conversationId: "growth",
        conversationName: "Growth team",
    },
    {
        id: "F-102",
        name: "itpm01-40329000787-phpapp02.pdf",
        size: "1.94 MB",
        uploadedAt: "2026-01-23T13:10:00Z",
        status: "Chưa có trên Cloud",
        extension: "PDF",
        color: "bg-red-500",
        conversationId: "growth",
        conversationName: "Growth team",
    },
    {
        id: "F-103",
        name: "handover-pack-v4.rar",
        size: "21.33 KB",
        uploadedAt: "2025-10-16T09:00:00Z",
        status: "Chưa có trên Cloud",
        extension: "RAR",
        color: "bg-purple-500",
        conversationId: "brand",
        conversationName: "Brand refresh",
    },
    {
        id: "F-104",
        name: "shopping.sql",
        size: "8.99 KB",
        uploadedAt: "2025-10-16T10:40:00Z",
        status: "Chưa có trên Cloud",
        extension: "SQL",
        color: "bg-sky-600",
        conversationId: "alpha",
        conversationName: "Alpha cohort",
    },
];

const linkLibrary: LinkEntry[] = [
    {
        id: "L-01",
        title: "Sprint board",
        url: "https://miro.com/retro",
        uploadedAt: "2026-01-20T08:00:00Z",
        meta: "Miro • 12 cards",
        conversationId: "growth",
        conversationName: "Growth team",
    },
    {
        id: "L-02",
        title: "Figma - Landing revamp",
        url: "https://figma.com/file/landing",
        uploadedAt: "2025-12-01T09:30:00Z",
        meta: "Figma • 18 frames",
        conversationId: "brand",
        conversationName: "Brand refresh",
    },
];

const categoryTabs = [
    { id: "media", label: "Ảnh/Video" },
    { id: "files", label: "Files" },
    { id: "links", label: "Links" },
];

const sortOptions = [
    { value: "latest", label: "Ngày gửi (mới nhất)" },
    { value: "oldest", label: "Ngày gửi (cũ nhất)" },
];

const typeOptionsByTab: Record<string, { label: string; value: string }[]> = {
    media: [
        { value: "all", label: "Tất cả" },
        { value: "images", label: "Ảnh" },
        { value: "videos", label: "Video" },
    ],
    files: [
        { value: "all", label: "Tất cả" },
        { value: "pdf", label: "PDF" },
        { value: "rar", label: "RAR" },
        { value: "sql", label: "SQL" },
    ],
    links: [
        { value: "all", label: "Tất cả" },
        { value: "design", label: "Design" },
        { value: "board", label: "Board" },
    ],
};

const formatSectionLabel = (timestamp: string) => {
    const date = new Date(timestamp);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const sameYear = year === new Date().getFullYear();
    return sameYear ? `Ngày ${day} Tháng ${month}` : `Ngày ${day} Tháng ${month} Năm ${year}`;
};

const groupByDate = <T extends { uploadedAt: string }>(collection: T[]) => {
    return collection.reduce<Record<string, T[]>>((acc, item) => {
        const label = formatSectionLabel(item.uploadedAt);
        acc[label] = acc[label] ? [...acc[label], item] : [item];
        return acc;
    }, {});
};

export default function CloudPage() {
    const [conversationFilter, setConversationFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [sortFilter, setSortFilter] = useState("latest");
    const [categoryTab, setCategoryTab] = useState("media");
    const [typeFilterByTab, setTypeFilterByTab] = useState<Record<string, string>>({
        media: "all",
        files: "all",
        links: "all",
    });

    useEffect(() => {
        toast.dismiss();
    }, []);

    const conversations = useMemo(() => {
        const pool = [...mediaLibrary, ...fileLibrary, ...linkLibrary];
        const entries = Array.from(
            new Map(pool.map((item) => [item.conversationId, item.conversationName])).entries(),
        ).map(([id, label]) => ({ id, label }));
        return [{ id: "all", label: "Tất cả" }, ...entries];
    }, []);

    const currentTypeFilter = typeFilterByTab[categoryTab];

    const handleTypeChange = (value: string) => {
        setTypeFilterByTab((prev) => ({ ...prev, [categoryTab]: value }));
    };

    const applyFilters = useCallback(<T extends {
        name?: string;
        title?: string;
        conversationId: string;
        uploadedAt: string;
        type?: string;
        extension?: string;
    }>(data: T[], category: keyof typeof typeOptionsByTab) => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        const currentType = typeFilterByTab[category];
        const filtered = data.filter((item) => {
            const label = (item.name ?? item.title ?? "").toLowerCase();
            const matchesConversation =
                conversationFilter === "all" || item.conversationId === conversationFilter;
            const matchesSearch = !normalizedSearch || label.includes(normalizedSearch);
            let matchesType = true;
            if (category === "media" && currentType !== "all") {
                matchesType = item.type === currentType;
            }
            if (category === "files" && currentType !== "all" && "extension" in item) {
                matchesType = item.extension.toLowerCase() === currentType;
            }
            if (category === "links" && currentType !== "all") {
                const title = item.title?.toLowerCase() ?? "";
                matchesType =
                    (currentType === "design" && title.includes("figma")) ||
                    (currentType === "board" && title.includes("board"));
            }
            return matchesConversation && matchesSearch && matchesType;
        });

        return filtered.sort((a, b) => {
            const delta = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
            return sortFilter === "latest" ? -delta : delta;
        });
    }, [conversationFilter, searchTerm, sortFilter, typeFilterByTab]);

    const filteredMedia = useMemo(() => applyFilters(mediaLibrary, "media"), [applyFilters]);
    const filteredFiles = useMemo(() => applyFilters(fileLibrary, "files"), [applyFilters]);
    const filteredLinks = useMemo(() => applyFilters(linkLibrary, "links"), [applyFilters]);

    const sectionedMedia = useMemo(() => groupByDate(filteredMedia), [filteredMedia]);
    const sectionedFiles = useMemo(() => groupByDate(filteredFiles), [filteredFiles]);
    const sectionedLinks = useMemo(() => groupByDate(filteredLinks), [filteredLinks]);

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-16 pt-8 md:px-8">
                <section className="rounded-3xl border border-border bg-card/95 p-8 shadow-xl">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-xl space-y-3">
                            <Badge className="w-fit bg-primary text-primary-foreground">Cloud Storage</Badge>
                            <h1 className="text-3xl font-semibold leading-tight">
                                Kho lưu trữ cá nhân — mọi file từ các cuộc trò chuyện.
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Lọc theo loại file, hội thoại và thời gian gửi. Xem nhanh hình ảnh hoặc tải về PDF
                                chỉ với một cú nhấp.
                            </p>
                        </div>
                        <div className="grid w-full max-w-sm grid-cols-2 gap-4 text-center text-sm text-muted-foreground">
                            <div className="rounded-2xl border border-border/60 bg-muted/60 p-4">
                                <p className="text-2xl font-semibold text-foreground">{mediaLibrary.length + fileLibrary.length}</p>
                                <p>Files đã lưu</p>
                            </div>
                            <div className="rounded-2xl border border-border/60 bg-muted/60 p-4">
                                <p className="text-2xl font-semibold text-foreground">4</p>
                                <p>Conversations</p>
                            </div>
                            <div className="rounded-2xl border border-border/60 bg-muted/60 p-4">
                                <p className="text-2xl font-semibold text-foreground">12</p>
                                <p>Tập tin mới</p>
                            </div>
                            <div className="rounded-2xl border border-border/60 bg-muted/60 p-4">
                                <p className="text-2xl font-semibold text-foreground">412 MB</p>
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
                                            onChange={(event) => setSearchTerm(event.target.value)}
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
                                                {typeOptionsByTab[categoryTab].map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select value={sortFilter} onValueChange={setSortFilter}>
                                            <SelectTrigger className="h-10 min-w-[140px] rounded-2xl border-border">
                                                <SelectValue placeholder="Ngày gửi" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {sortOptions.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            <TabsList className="inline-flex rounded-2xl bg-muted/70 p-1 text-sm">
                                {categoryTabs.map((tab) => (
                                    <TabsTrigger
                                        key={tab.id}
                                        value={tab.id}
                                        className="rounded-2xl px-4 py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground"
                                    >
                                        {tab.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <TabsContent value="media" className="space-y-6">
                                    {Object.entries(sectionedMedia).map(([label, items]) => (
                                        <div key={label} className="space-y-3">
                                            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
                                                {label}
                                            </p>
                                            <div className="space-y-4">
                                                {items.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className="flex gap-4 rounded-3xl border border-border/60 bg-muted/60 p-4"
                                                    >
                                                        <div className="h-28 w-32 overflow-hidden rounded-2xl bg-muted">
                                                            <img src={item.thumbnail} alt={item.name} className="h-full w-full object-cover" />
                                                        </div>
                                                        <div className="flex flex-1 flex-col justify-between">
                                                            <div>
                                                                <p className="text-sm font-semibold">{item.name}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {item.size} • {item.conversationName}
                                                                </p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="secondary"
                                                                    className="rounded-2xl"
                                                                    onClick={() => toast.info(`Preview ${item.name}`)}
                                                                >
                                                                    <Eye className="mr-1 h-4 w-4" />
                                                                    Xem
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    className="rounded-2xl"
                                                                    onClick={() => toast.success(`Downloading ${item.name}`)}
                                                                >
                                                                    <Download className="mr-1 h-4 w-4" />
                                                                    Tải xuống
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                            </TabsContent>

                            <TabsContent value="files" className="space-y-6">
                                    {Object.entries(sectionedFiles).map(([label, items]) => (
                                        <div key={label} className="space-y-3">
                                            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
                                                {label}
                                            </p>
                                            <div className="space-y-4">
                                                {items.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className="flex items-center gap-4 rounded-3xl border border-border/60 bg-muted/60 p-4"
                                                    >
                                                        <div className={`flex h-16 w-14 items-center justify-center rounded-2xl text-xs font-bold text-white ${item.color}`}>
                                                            {item.extension}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-semibold">{item.name}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {item.size} • {item.status}
                                                            </p>
                                                        </div>
                                                        <div className="text-right text-xs text-muted-foreground/80">
                                                            {new Date(item.uploadedAt).toLocaleTimeString("vi-VN", {
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                            </TabsContent>

                            <TabsContent value="links" className="space-y-6">
                                    {Object.entries(sectionedLinks).map(([label, items]) => (
                                        <div key={label} className="space-y-3">
                                            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
                                                {label}
                                            </p>
                                            <div className="space-y-4">
                                                {items.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className="flex items-center gap-4 rounded-3xl border border-border/60 bg-muted/60 p-4"
                                                    >
                                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                                                            <Link2 className="h-5 w-5" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-semibold">{item.title}</p>
                                                            <p className="text-xs text-muted-foreground">{item.meta}</p>
                                                            <a
                                                                href={item.url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-xs text-primary underline"
                                                            >
                                                                {item.url}
                                                            </a>
                                                        </div>
                                                        <span className="text-xs text-muted-foreground/80">
                                                            {new Date(item.uploadedAt).toLocaleDateString("vi-VN", {
                                                                day: "2-digit",
                                                                month: "2-digit",
                                                            })}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                            </TabsContent>
                        </CardContent>
                    </Card>
                </Tabs>
            </div>
        </div>
    );
}
