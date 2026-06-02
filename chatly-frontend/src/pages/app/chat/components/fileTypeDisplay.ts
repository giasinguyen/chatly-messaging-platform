import {
    FileArchive,
    FileCode,
    FileImage,
    FileSpreadsheet,
    FileText,
    FileVideo,
    type LucideIcon,
} from "lucide-react";

interface FileTypeDisplay {
    Icon: LucideIcon;
    extension: string;
    colorClass: string;
}

const DEFAULT_EXTENSION = "file";

const MIME_EXTENSION_MAP: Record<string, string> = {
    "application/msword": "doc",
    "application/pdf": "pdf",
    "application/vnd.ms-excel": "xls",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/csv": "csv",
    "text/plain": "txt",
};

const EXTENSION_COLORS: Record<string, string> = {
    csv: "bg-emerald-600",
    doc: "bg-blue-600",
    docx: "bg-blue-600",
    gif: "bg-pink-600",
    jpeg: "bg-sky-600",
    jpg: "bg-sky-600",
    js: "bg-purple-600",
    json: "bg-purple-600",
    mp4: "bg-rose-600",
    pdf: "bg-red-600",
    png: "bg-sky-600",
    ppt: "bg-orange-600",
    pptx: "bg-orange-600",
    py: "bg-purple-600",
    rar: "bg-yellow-600",
    sql: "bg-purple-600",
    ts: "bg-purple-600",
    tsx: "bg-purple-600",
    txt: "bg-slate-600",
    webm: "bg-rose-600",
    xls: "bg-green-600",
    xlsx: "bg-green-600",
    zip: "bg-yellow-600",
};

function getExtension(fileName?: string, fileType?: string): string {
    const normalizedType = fileType?.toLowerCase();
    const fromName = fileName?.split(".").pop()?.toLowerCase();
    if (fromName && fromName !== fileName?.toLowerCase()) {
        return fromName === "xslx" ? "xlsx" : fromName;
    }

    if (normalizedType && MIME_EXTENSION_MAP[normalizedType]) {
        return MIME_EXTENSION_MAP[normalizedType];
    }

    const fromType = normalizedType?.split("/").pop()?.toLowerCase();
    return fromType || DEFAULT_EXTENSION;
}

function getIcon(extension: string, fileType?: string): LucideIcon {
    if (fileType?.startsWith("image/")) return FileImage;
    if (fileType?.startsWith("video/")) return FileVideo;
    if (["xls", "xlsx", "csv"].includes(extension)) return FileSpreadsheet;
    if (["zip", "rar", "7z"].includes(extension)) return FileArchive;
    if (["js", "ts", "tsx", "jsx", "py", "java", "sql", "json"].includes(extension)) {
        return FileCode;
    }
    return FileText;
}

export function getFileTypeDisplay(
    fileName?: string,
    fileType?: string,
): FileTypeDisplay {
    const extension = getExtension(fileName, fileType);

    return {
        Icon: getIcon(extension, fileType),
        colorClass: EXTENSION_COLORS[extension] ?? "bg-slate-600",
        extension,
    };
}
