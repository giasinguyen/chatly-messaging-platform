import { Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { Post } from '@/types/post';
import { Colors } from '@/constants/theme';

interface ExplorePostTileProps {
  post: Post;
}

export function ExplorePostTile({ post }: ExplorePostTileProps) {
  const hasMedia = post.mediaUrls.length > 0;
  const isAlbum = post.mediaUrls.length > 1;

  return (
    <View className="w-1/3 p-0.5">
      <TouchableOpacity
        className="aspect-square overflow-hidden rounded-lg bg-[#E5E5EA]"
        activeOpacity={0.85}>
        {hasMedia ? (
          <Image source={{ uri: post.mediaUrls[0] }} contentFit="cover" className="h-full w-full" />
        ) : (
          <View className="h-full w-full items-center justify-center px-2">
            <Text numberOfLines={5} className="text-center text-xs text-[#6E6E73]">
              {post.content}
            </Text>
          </View>
        )}

        {isAlbum && (
          <View className="absolute right-2 top-2 rounded-full bg-black/45 p-1">
            <Ionicons name="copy-outline" size={14} color={Colors.white} />
          </View>
        )}

        {post.hashtags.length > 0 && (
          <View className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1.5">
            <Text numberOfLines={1} className="text-[11px] font-medium text-white">
              {post.hashtags.map((tag) => `#${tag}`).join(' ')}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}
