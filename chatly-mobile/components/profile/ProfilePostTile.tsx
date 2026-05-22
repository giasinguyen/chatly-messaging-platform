import { useEffect, useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Colors } from '@/constants/theme';
import type { Post } from '@/types/post';
import { normalizeMediaUrl } from '@/utils/mediaUrl';

interface ProfilePostTileProps {
  post: Post;
  onPress: () => void;
}

export function ProfilePostTile({ post, onPress }: ProfilePostTileProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const coverUrl = useMemo(() => normalizeMediaUrl(post.mediaUrls[0]), [post.mediaUrls]);
  const hasMedia = !!coverUrl && !hasImageError;

  useEffect(() => {
    setHasImageError(false);
  }, [coverUrl]);

  return (
    <TouchableOpacity
      onPress={onPress}
      className="aspect-square w-1/3 border border-white bg-[#F2F2F7] active:opacity-80">
      {hasMedia ? (
        <Image
          source={{ uri: coverUrl }}
          contentFit="cover"
          style={{ width: '100%', height: '100%' }}
          transition={120}
          onError={() => setHasImageError(true)}
        />
      ) : (
        <View className="h-full w-full items-center justify-center px-2">
          <Ionicons name="chatbox-ellipses-outline" size={20} color={Colors.textLight} />
          <Text className="mt-1 text-center text-xs text-[#6E6E73]" numberOfLines={3}>
            {post.content || 'Open post'}
          </Text>
        </View>
      )}
      {post.mediaUrls.length > 1 ? (
        <View className="absolute right-1.5 top-1.5 rounded bg-black/45 p-1">
          <Ionicons name="copy-outline" size={12} color={Colors.white} />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
