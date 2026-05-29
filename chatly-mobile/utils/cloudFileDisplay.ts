import { Ionicons } from '@expo/vector-icons';
import type { FileUploadResponse } from '@/services/file.service';

export type CloudTab = 'all' | 'uploads' | 'media' | 'file';

export function formatCloudFileSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function formatCloudFileDate(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function getCloudFileIcon(type?: string): keyof typeof Ionicons.glyphMap {
  if (!type) return 'document-outline';
  if (type.startsWith('image/')) return 'image-outline';
  if (type.startsWith('video/')) return 'videocam-outline';
  if (type.startsWith('audio/')) return 'musical-notes-outline';
  if (type.includes('pdf')) return 'document-text-outline';
  if (type.includes('word') || type.includes('docx')) return 'document-outline';
  if (type.includes('excel') || type.includes('xlsx')) return 'grid-outline';
  if (type.includes('zip') || type.includes('compressed')) return 'archive-outline';
  return 'document-outline';
}

export function isCloudImage(file: FileUploadResponse): boolean {
  return (file.fileType ?? '').startsWith('image/');
}

export function isCloudVideo(file: FileUploadResponse): boolean {
  return (file.fileType ?? '').startsWith('video/');
}

export function isCloudMedia(file: FileUploadResponse): boolean {
  return isCloudImage(file) || isCloudVideo(file);
}
