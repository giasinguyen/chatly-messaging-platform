import { Image, Linking, Share, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import type { FileUploadResponse } from '@/services/file.service';
import { isCloudUpload } from '@/utils/cloudFileAttachment';
import { isCloudImage } from '@/utils/cloudFileDisplay';

interface CloudMediaTileProps {
  file: FileUploadResponse;
  imageIndex: number;
  imageUrls: string[];
  onOpenImage: (urls: string[], index: number) => void;
  onShareFile: (file: FileUploadResponse) => void;
  onDeleteFile: (file: FileUploadResponse) => void;
  getConversationName: (conversationId?: string) => string;
}

export function CloudMediaTile({
  file,
  imageIndex,
  imageUrls,
  onOpenImage,
  onShareFile,
  onDeleteFile,
  getConversationName,
}: CloudMediaTileProps) {
  const isUploaded = isCloudUpload(file);

  const handlePress = () => {
    if (isCloudImage(file)) {
      onOpenImage(imageUrls, imageIndex >= 0 ? imageIndex : 0);
      return;
    }
    Linking.openURL(file.url);
  };

  return (
    <TouchableOpacity
      key={file.fileId}
      onPress={handlePress}
      onLongPress={() => Share.share({ url: file.url, message: file.fileName })}
      style={{ borderRadius: 8, overflow: 'hidden' }}>
      {isCloudImage(file) ? (
        <Image source={{ uri: file.url }} style={{ width: 110, height: 110 }} resizeMode="cover" />
      ) : (
        <View
          style={{
            width: 110,
            height: 110,
            backgroundColor: Colors.ctaLight,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="play-circle-outline" size={34} color={Colors.cta} />
          <Text
            style={{
              marginTop: 4,
              maxWidth: 88,
              color: Colors.textMuted,
              fontSize: 10,
              textAlign: 'center',
            }}
            numberOfLines={2}>
            {file.fileName}
          </Text>
        </View>
      )}
      {isUploaded ? (
        <>
          <TouchableOpacity
            onPress={() => onDeleteFile(file)}
            style={{
              position: 'absolute',
              top: 6,
              left: 6,
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: 'rgba(0,0,0,0.55)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="trash-outline" size={15} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onShareFile(file)}
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: 'rgba(0,0,0,0.55)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="paper-plane-outline" size={15} color={Colors.white} />
          </TouchableOpacity>
        </>
      ) : null}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(0,0,0,0.45)',
          paddingHorizontal: 4,
          paddingVertical: 2,
        }}>
        <Text style={{ color: Colors.white, fontSize: 9 }} numberOfLines={1}>
          {isUploaded ? 'Cloud upload' : getConversationName(file.conversationId)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
