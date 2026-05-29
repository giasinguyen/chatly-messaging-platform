import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/theme';
import type { Attachment } from '@/types/message';
import { normalizeMediaUrl } from '@/utils/mediaUrl';

interface PostPreviewAttachmentProps {
  attachment: Attachment;
  isMe: boolean;
}

export function PostPreviewAttachment({ attachment, isMe }: PostPreviewAttachmentProps) {
  const router = useRouter();
  const targetUrl = attachment.targetUrl ?? (attachment.postId ? `/post/${attachment.postId}` : attachment.url);
  const previewTitle = attachment.postTitle ?? attachment.name ?? 'Shared post';
  const previewText = attachment.postExcerpt ?? previewTitle;
  const previewImageUrl = normalizeMediaUrl(attachment.postImageUrl);
  const titleColor = isMe ? Colors.text : Colors.text;
  const subtitleColor = isMe ? Colors.textMuted : Colors.textMuted;

  return (
    <TouchableOpacity
      onPress={() => router.push(targetUrl as `/post/${string}`)}
      activeOpacity={0.82}
      style={{
        width: 340,
        maxWidth: '100%',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: isMe ? 'rgba(0,113,227,0.16)' : Colors.borderLight,
        backgroundColor: isMe ? '#F4F8FF' : Colors.bgCard,
        padding: 12,
      }}>
      <View>
        {previewImageUrl ? (
          <Image
            source={{ uri: previewImageUrl }}
            style={{ width: '100%', height: 168, borderRadius: 14 }}
            contentFit="cover"
            transition={120}
          />
        ) : (
          <View
            style={{
              width: '100%',
              height: 132,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isMe ? '#DCEBFF' : '#F2F2F7',
            }}>
            <Ionicons
              name="share-social-outline"
              size={20}
              color={isMe ? Colors.cta : Colors.textMuted}
            />
          </View>
        )}

        <View style={{ marginTop: 10 }}>
          <Text
            numberOfLines={2}
            style={{
              fontSize: 14,
              fontWeight: '700',
              color: titleColor,
            }}>
            {previewText}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Avatar uri={attachment.postAuthorAvatarUrl} name={attachment.postAuthorName ?? 'Unknown author'} size={20} />
            <Text
              numberOfLines={1}
              style={{
                marginLeft: 8,
                flex: 1,
                fontSize: 12,
                color: subtitleColor,
              }}>
              {attachment.postAuthorName ?? 'Unknown author'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
