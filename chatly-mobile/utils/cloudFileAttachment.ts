import type { FileUploadResponse } from '@/services/file.service';
import type { MessageType } from '@/types/conversation';
import type { Attachment } from '@/types/message';

export function isCloudUpload(file: FileUploadResponse): boolean {
  return !file.conversationId;
}

export function fileToAttachment(file: FileUploadResponse): Attachment {
  return {
    fileId: file.fileId,
    url: file.url,
    name: file.fileName,
    type: file.fileType,
    size: file.fileSize,
  };
}

export function resolveCloudFileMessageType(files: FileUploadResponse[]): MessageType {
  const firstType = files[0]?.fileType ?? '';

  if (firstType.startsWith('image/')) {
    return 'IMAGE';
  }

  if (firstType.startsWith('video/')) {
    return 'VIDEO';
  }

  if (firstType.startsWith('audio/')) {
    return 'AUDIO';
  }

  return 'FILE';
}
