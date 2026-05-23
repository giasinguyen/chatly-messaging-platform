import { ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '@/constants/theme';
import { normalizeMediaUrl } from '@/utils/mediaUrl';

interface PostMediaGalleryProps {
  mediaUrls: string[];
}

export function PostMediaGallery({ mediaUrls }: PostMediaGalleryProps) {
  const normalizedMediaUrls = mediaUrls
    .map((url) => normalizeMediaUrl(url))
    .filter((url): url is string => !!url);

  if (normalizedMediaUrls.length === 0) {
    return null;
  }

  if (normalizedMediaUrls.length === 1) {
    return (
      <View className="mt-3 overflow-hidden rounded-2xl" style={{ backgroundColor: Colors.borderLight }}>
        <Image
          source={{ uri: normalizedMediaUrls[0] }}
          contentFit="cover"
          style={{ width: '100%', height: 360 }}
          transition={140}
        />
      </View>
    );
  }

  return (
    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} className="mt-3">
      {normalizedMediaUrls.map((url, index) => (
        <Image
          key={`${url}-${index}`}
          source={{ uri: url }}
          contentFit="cover"
          style={{ width: 300, height: 320, borderRadius: 16, marginRight: 8 }}
          transition={140}
        />
      ))}
    </ScrollView>
  );
}
