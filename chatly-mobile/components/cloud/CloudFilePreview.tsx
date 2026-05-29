import { Text, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import type { FileUploadResponse } from '@/services/file.service';
import { normalizeMediaUrl } from '@/utils/mediaUrl';

interface CloudFilePreviewProps {
  file: FileUploadResponse;
}

function formatSize(bytes: number): string {
  if (bytes >= 1_048_576) {
    return `${(bytes / 1_048_576).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function getFileIcon(fileType?: string): keyof typeof Ionicons.glyphMap {
  if (!fileType) return 'document-outline';
  if (fileType.startsWith('image/')) return 'image-outline';
  if (fileType.startsWith('video/')) return 'videocam-outline';
  if (fileType.startsWith('audio/')) return 'musical-notes-outline';
  if (fileType.includes('pdf')) return 'document-text-outline';
  if (fileType.includes('zip') || fileType.includes('compressed')) return 'archive-outline';
  return 'document-outline';
}

export function CloudFilePreview({ file }: CloudFilePreviewProps) {
  const imageUrl = file.fileType.startsWith('image/') ? normalizeMediaUrl(file.url) : null;

  return (
    <View className="mb-4 flex-row items-center rounded-3xl border border-[#E5E5EA] bg-[#FAFAFB] p-3">
      {imageUrl ? (
        <ExpoImage
          source={{ uri: imageUrl }}
          className="h-14 w-14 rounded-2xl"
          contentFit="cover"
        />
      ) : (
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF2FF]">
          <Ionicons name={getFileIcon(file.fileType)} size={24} color={Colors.cta} />
        </View>
      )}
      <View className="ml-3 min-w-0 flex-1">
        <Text numberOfLines={1} className="text-sm font-semibold text-[#1D1D1F]">
          {file.fileName}
        </Text>
        <Text className="mt-0.5 text-xs text-[#6E6E73]">{formatSize(file.fileSize)}</Text>
      </View>
    </View>
  );
}
