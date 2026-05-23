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
  const previewText = attachment.postExcerpt ?? 'Open this post to see the full content.';
  const previewImageUrl = normalizeMediaUrl(attachment.postImageUrl);
  const titleColor = isMe ? Colors.text : Colors.text;
  const metaColor = isMe ? Colors.textMuted : Colors.textMuted;
  const subtitleColor = isMe ? Colors.textMuted : Colors.textMuted;

  return (
    <TouchableOpacity
      onPress={() => router.push(targetUrl as `/post/${string}`)}
      activeOpacity={0.82}
      style={{
        width: 280,
        maxWidth: '100%',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: isMe ? 'rgba(0,113,227,0.16)' : Colors.borderLight,
        backgroundColor: isMe ? '#F4F8FF' : Colors.bgCard,
        padding: 12,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        {previewImageUrl ? (
          <Image
            source={{ uri: previewImageUrl }}
            style={{ width: 80, height: 80, borderRadius: 14 }}
            contentFit="cover"
            transition={120}
          />
        ) : (
          <View
            style={{
              width: 80,
              height: 80,
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

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text
              style={{
                fontSize: 11,
                color: metaColor,
                textTransform: 'uppercase',
                letterSpacing: 0.4,
              }}>
              Shared post
            </Text>
            <Ionicons
              name="open-outline"
              size={12}
              color={metaColor}
              style={{ marginLeft: 4 }}
            />
          </View>
          <Text
            numberOfLines={2}
            style={{
              marginTop: 4,
              fontSize: 14,
              fontWeight: '700',
              color: titleColor,
            }}>
            {previewTitle}
          </Text>
          <Text
            numberOfLines={2}
            style={{
              marginTop: 4,
              fontSize: 12,
              lineHeight: 18,
              color: subtitleColor,
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