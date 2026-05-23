import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { agentFileService, buildFileRequestHeaders } from '@/services/agent-file.service';
import { getApiBaseUrl } from '@/lib/apiConfig';
import type { MessageAttachment } from '@/types/agent';

const FILE_TYPE_META: Record<string, { icon: string; label: string }> = {
  'application/pdf': { icon: 'document-text-outline', label: 'PDF' },
  'application/msword': { icon: 'document-outline', label: 'DOC' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: 'document-outline', label: 'DOCX' },
  'application/vnd.ms-excel': { icon: 'grid-outline', label: 'XLS' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: 'grid-outline', label: 'XLSX' },
  'application/vnd.ms-powerpoint': { icon: 'easel-outline', label: 'PPT' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { icon: 'easel-outline', label: 'PPTX' },
  'text/plain': { icon: 'reader-outline', label: 'TXT' },
  'text/csv': { icon: 'list-outline', label: 'CSV' },
  'text/markdown': { icon: 'code-outline', label: 'MD' },
};

function getFileMeta(contentType: string): { icon: string; label: string } {
  if (contentType.startsWith('image/')) return { icon: 'image-outline', label: 'Image' };
  if (contentType.startsWith('video/')) return { icon: 'videocam-outline', label: 'Video' };
  if (contentType.startsWith('audio/')) return { icon: 'musical-note-outline', label: 'Audio' };
  return FILE_TYPE_META[contentType] ?? { icon: 'document-outline', label: 'File' };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  attachment: MessageAttachment;
  sessionId: string;
  role: 'user' | 'assistant';
}

function ImageAttachment({ attachment, sessionId, role }: Props) {
  // Build auth headers once — expo-image passes them on every request (including cache revalidation)
  const [headers, setHeaders] = useState<Record<string, string> | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    buildFileRequestHeaders()
      .then(setHeaders)
      .catch(() => setHeaders({}));
  }, []);

  const imageUrl = `${getApiBaseUrl()}/api/ai/sessions/${sessionId}/files/${attachment.file_id}/content`;
  // expo-image ImageSource — same pattern as chat MessageBubble but with auth headers
  const imageSource = headers ? { uri: imageUrl, headers } : null;

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      await agentFileService.shareFile(sessionId, attachment.file_id, attachment.filename);
    } catch {
      Alert.alert('Error', 'Could not download file');
    } finally {
      setDownloading(false);
    }
  }, [sessionId, attachment.file_id, attachment.filename]);

  const isUser = role === 'user';

  return (
    <View className="mt-1.5">
      <TouchableOpacity onPress={() => setLightboxOpen(true)} activeOpacity={0.85} disabled={!imageSource}>
        {imageSource ? (
          <Image
            source={imageSource}
            style={{ width: 200, height: 150, borderRadius: 10, backgroundColor: Colors.borderLight }}
            contentFit="cover"
          />
        ) : (
          <View
            style={{ width: 200, height: 150, borderRadius: 10, backgroundColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' }}
          >
            <ActivityIndicator size="small" color={Colors.textMuted} />
          </View>
        )}
      </TouchableOpacity>

      <View className="flex-row items-center justify-between mt-1">
        <TouchableOpacity onPress={handleDownload} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          {downloading ? (
            <ActivityIndicator size="small" color={isUser ? Colors.white : Colors.cta} />
          ) : (
            <Ionicons name="download-outline" size={16} color={isUser ? 'rgba(255,255,255,0.8)' : Colors.cta} />
          )}
        </TouchableOpacity>
      </View>

      {/* Lightbox modal */}
      <Modal visible={lightboxOpen} transparent animationType="fade" onRequestClose={() => setLightboxOpen(false)}>
        {/* Backdrop — tap anywhere outside the image to close */}
        <Pressable
          style={{ flex: 1, backgroundColor: Colors.overlay, alignItems: 'center', justifyContent: 'center' }}
          onPress={() => setLightboxOpen(false)}
        >
          {/* Image container — stop propagation so tapping the image itself doesn't close */}
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Image
              source={imageSource}
              style={{ width: screenWidth * 0.92, height: screenWidth * 0.92, borderRadius: 12 }}
              contentFit="contain"
            />
          </Pressable>
        </Pressable>

        {/* Close button */}
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 52,
            right: 16,
            height: 40,
            width: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(0,0,0,0.5)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => setLightboxOpen(false)}
        >
          <Ionicons name="close" size={20} color={Colors.white} />
        </TouchableOpacity>

        {/* Download button */}
        <TouchableOpacity
          style={{
            position: 'absolute',
            bottom: 48,
            alignSelf: 'center',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 24,
            backgroundColor: 'rgba(0,0,0,0.6)',
          }}
          onPress={handleDownload}
        >
          <Ionicons name="download-outline" size={18} color={Colors.white} />
          <Text style={{ color: Colors.white, fontSize: 14, fontWeight: '500' }}>Save / Share</Text>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function FileAttachment({ attachment, sessionId, role }: Props) {
  const [downloading, setDownloading] = useState(false);
  const { icon, label } = getFileMeta(attachment.content_type);
  const isUser = role === 'user';

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      await agentFileService.shareFile(sessionId, attachment.file_id, attachment.filename);
    } catch {
      Alert.alert('Error', 'Could not download file');
    } finally {
      setDownloading(false);
    }
  }, [sessionId, attachment.file_id, attachment.filename]);

  return (
    <View
      className="flex-row items-center mt-1.5 px-3 py-2 rounded-xl gap-2"
      style={{
        backgroundColor: isUser ? 'rgba(255,255,255,0.15)' : Colors.bg,
        borderWidth: 0.5,
        borderColor: isUser ? 'rgba(255,255,255,0.2)' : Colors.borderLight,
      }}
    >
      <Ionicons name={icon as never} size={22} color={isUser ? Colors.white : Colors.cta} />
      <View className="flex-1 min-w-0">
        <Text className="text-[13px] font-medium" style={{ color: isUser ? Colors.white : Colors.text }} numberOfLines={1}>
          {attachment.filename}
        </Text>
        <Text className="text-[11px]" style={{ color: isUser ? 'rgba(255,255,255,0.6)' : Colors.textLight }}>
          {label} · {formatFileSize(attachment.size)}
        </Text>
      </View>
      <TouchableOpacity onPress={handleDownload} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
        {downloading ? (
          <ActivityIndicator size="small" color={isUser ? Colors.white : Colors.cta} />
        ) : (
          <Ionicons name="download-outline" size={18} color={isUser ? 'rgba(255,255,255,0.8)' : Colors.cta} />
        )}
      </TouchableOpacity>
    </View>
  );
}

export function AssistantAttachmentView({ attachment, sessionId, role }: Props) {
  const isImage = attachment.content_type.startsWith('image/');
  if (isImage) return <ImageAttachment attachment={attachment} sessionId={sessionId} role={role} />;
  return <FileAttachment attachment={attachment} sessionId={sessionId} role={role} />;
}
