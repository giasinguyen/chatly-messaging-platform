import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Colors } from '@/constants/theme';

interface HomeFeedFooterProps {
  isLoadingMore: boolean;
  hasMorePosts: boolean;
  postCount: number;
}

export function HomeFeedFooter({ isLoadingMore, hasMorePosts, postCount }: HomeFeedFooterProps) {
  if (isLoadingMore) {
    return (
      <View className="items-center pb-24 pt-4">
        <ActivityIndicator size="small" color={Colors.cta} />
      </View>
    );
  }

  if (postCount > 0 && !hasMorePosts) {
    return (
      <View className="items-center pb-24 pt-4">
        <Text className="text-sm text-[#6E6E73]">You are all caught up.</Text>
      </View>
    );
  }

  return <View className="h-24" />;
}

interface HomeFeedEmptyStateProps {
  message: string | null;
  onRetry: () => void;
}

export function HomeFeedEmptyState({ message, onRetry }: HomeFeedEmptyStateProps) {
  return (
    <View className="items-center px-8 py-16">
      <Text className="text-base font-semibold text-[#1D1D1F]">
        {message ? 'Could not load feed' : 'No posts yet'}
      </Text>
      <Text className="mt-1 text-center text-sm text-[#6E6E73]">
        {message ?? 'Pull to refresh or create your first post from the plus button.'}
      </Text>
      {message && (
        <Pressable
          className="mt-4 rounded-full bg-[#0A7AFF] px-4 py-2 active:opacity-85"
          onPress={onRetry}
        >
          <Text className="text-sm font-semibold text-white">Try again</Text>
        </Pressable>
      )}
    </View>
  );
}

interface HomeNewPostsBannerProps {
  count: number;
  onPress: () => void;
}

export function HomeNewPostsBanner({ count, onPress }: HomeNewPostsBannerProps) {
  if (count === 0) {
    return null;
  }

  return (
    <Pressable
      className="mx-4 mt-3 items-center rounded-full bg-[#0A7AFF] px-4 py-2 active:opacity-80"
      onPress={onPress}
    >
      <Text className="text-sm font-semibold text-white">
        {count === 1 ? 'New post available' : `${count} new posts available`}
      </Text>
    </Pressable>
  );
}
