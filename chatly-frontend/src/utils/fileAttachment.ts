import type { FileUploadResponse } from "@/services/file.service";
import type { Attachment } from "@/types/message";

export function fileToAttachment(file: FileUploadResponse): Attachment {
    return {
        fileId: file.fileId,
        url: file.url,
        name: file.fileName,
        type: file.fileType,
        size: file.fileSize,
    };
}

export function isUserUploadedCloudFile(file: FileUploadResponse): boolean {
    return !file.conversationId;
}
