import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { Post } from '@/types/post';
import { normalizeMediaUrl } from '@/utils/mediaUrl';

interface PostSharePreviewProps {
  post: Post;
}

export function PostSharePreview({ post }: PostSharePreviewProps) {
  const previewImageUrl = normalizeMediaUrl(post.mediaUrls[0]);

  return (
    <View className="rounded-3xl border border-[#E5E5EA] bg-[#F7F7FA] p-3">
      <View className="flex-row items-start gap-3">
        {previewImageUrl ? (
          <Image
            source={{ uri: previewImageUrl }}
            style={{ width: 80, height: 80, borderRadius: 16 }}
            contentFit="cover"
            transition={120}
          />
        ) : (
          <View className="h-20 w-20 items-center justify-center rounded-2xl bg-white">
            <Text className="text-xs text-[#6E6E73]">No image</Text>
          </View>
        )}

        <View className="min-w-0 flex-1">
          <Text className="text-sm font-semibold text-[#1D1D1F]">
            {post.authorDisplayName ?? 'Post'}
          </Text>
          <Text numberOfLines={3} className="mt-1 text-sm leading-5 text-[#6E6E73]">
            {post.content || 'Open this post to see the full content.'}
          </Text>
        </View>
      </View>
    </View>
  );
}