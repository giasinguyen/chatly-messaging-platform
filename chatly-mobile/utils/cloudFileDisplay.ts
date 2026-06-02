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

function getFileExtension(fileName?: string): string {
  return fileName?.split('.').pop()?.toLowerCase() ?? '';
}

function matchesAny(value: string, candidates: string[]): boolean {
  return candidates.some((candidate) => value.includes(candidate));
}

export function getCloudFileIcon(type?: string, fileName?: string): keyof typeof Ionicons.glyphMap {
  const normalizedType = (type ?? '').toLowerCase();
  const extension = getFileExtension(fileName);
  if (normalizedType.startsWith('image/')) return 'image-outline';
  if (normalizedType.startsWith('video/')) return 'videocam-outline';
  if (normalizedType.startsWith('audio/')) return 'musical-notes-outline';
  if (normalizedType.includes('pdf') || extension === 'pdf') return 'document-text-outline';
  if (
    matchesAny(normalizedType, ['word', 'msword', 'wordprocessingml']) ||
    ['doc', 'docx'].includes(extension)
  )
    return 'document-outline';
  if (
    matchesAny(normalizedType, ['sheet', 'excel', 'spreadsheetml']) ||
    ['xls', 'xlsx', 'xslx'].includes(extension)
  )
    return 'grid-outline';
  if (
    matchesAny(normalizedType, ['presentation', 'powerpoint', 'presentationml']) ||
    ['ppt', 'pptx'].includes(extension)
  )
    return 'easel-outline';
  if (extension === 'csv' || normalizedType.includes('csv')) return 'grid-outline';
  if (
    matchesAny(normalizedType, ['zip', 'rar', '7z', 'tar', 'gzip', 'compressed']) ||
    ['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)
  )
    return 'archive-outline';
  if (
    normalizedType.startsWith('text/') ||
    matchesAny(normalizedType, ['json', 'xml']) ||
    ['js', 'ts', 'jsx', 'tsx', 'json', 'xml', 'html', 'css', 'py', 'java'].includes(extension)
  )
    return 'code-slash-outline';
  return 'document-outline';
}

export function getCloudFileIconColor(type?: string, fileName?: string): string {
  const normalizedType = (type ?? '').toLowerCase();
  const extension = getFileExtension(fileName);
  if (normalizedType.startsWith('image/')) return '#a855f7';
  if (normalizedType.startsWith('video/')) return '#e11d48';
  if (normalizedType.startsWith('audio/')) return '#f59e0b';
  if (normalizedType.includes('pdf') || extension === 'pdf') return '#ef4444';
  if (
    matchesAny(normalizedType, ['word', 'msword', 'wordprocessingml']) ||
    ['doc', 'docx'].includes(extension)
  )
    return '#2563eb';
  if (
    matchesAny(normalizedType, ['sheet', 'excel', 'spreadsheetml']) ||
    ['xls', 'xlsx', 'xslx', 'csv'].includes(extension)
  )
    return '#16a34a';
  if (
    matchesAny(normalizedType, ['presentation', 'powerpoint', 'presentationml']) ||
    ['ppt', 'pptx'].includes(extension)
  )
    return '#f97316';
  if (
    matchesAny(normalizedType, ['zip', 'rar', '7z', 'tar', 'gzip', 'compressed']) ||
    ['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)
  )
    return '#b45309';
  if (
    normalizedType.startsWith('text/') ||
    matchesAny(normalizedType, ['json', 'xml']) ||
    ['js', 'ts', 'jsx', 'tsx', 'json', 'xml', 'html', 'css', 'py', 'java'].includes(extension)
  )
    return '#64748b';
  return '#9ca3af';
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
