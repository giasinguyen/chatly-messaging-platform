import { Linking, Share, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import type { FileUploadResponse } from '@/services/file.service';
import { isCloudUpload } from '@/utils/cloudFileAttachment';
import { formatCloudFileSize, getCloudFileIcon } from '@/utils/cloudFileDisplay';

interface CloudDocumentRowProps {
  file: FileUploadResponse;
  onShareFile: (file: FileUploadResponse) => void;
  onDeleteFile: (file: FileUploadResponse) => void;
  getConversationName: (conversationId?: string) => string;
}

export function CloudDocumentRow({
  file,
  onShareFile,
  onDeleteFile,
  getConversationName,
}: CloudDocumentRowProps) {
  const isUploaded = isCloudUpload(file);

  return (
    <TouchableOpacity
      onPress={() => Linking.openURL(file.url)}
      onLongPress={() => Share.share({ url: file.url, message: file.fileName })}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: Colors.bgCard,
        borderBottomWidth: 0.5,
        borderBottomColor: Colors.borderLight,
      }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          backgroundColor: Colors.ctaLight,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}>
        <Ionicons name={getCloudFileIcon(file.fileType)} size={22} color={Colors.cta} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: Colors.text }} numberOfLines={1}>
          {file.fileName}
        </Text>
        <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 2 }}>
          {formatCloudFileSize(file.fileSize)} ·{' '}
          {isUploaded ? 'Cloud upload' : getConversationName(file.conversationId)}
        </Text>
      </View>
      {isUploaded ? (
        <>
          <TouchableOpacity onPress={() => onShareFile(file)} style={{ padding: 8 }}>
            <Ionicons name="paper-plane-outline" size={20} color={Colors.cta} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDeleteFile(file)} style={{ padding: 8 }}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </>
      ) : null}
      <TouchableOpacity onPress={() => Linking.openURL(file.url)} style={{ padding: 8 }}>
        <Ionicons name="download-outline" size={20} color={Colors.cta} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}
