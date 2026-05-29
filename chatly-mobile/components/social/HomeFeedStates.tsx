import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';

interface HomeFeedFooterProps {
  isLoadingMore: boolean;
  hasMorePosts: boolean;
  postCount: number;
}

export function HomeFeedFooter({ isLoadingMore, hasMorePosts, postCount }: HomeFeedFooterProps) {
  const { t } = useTranslation();

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
        <Text className="text-sm" style={{ color: Colors.textMuted }}>
          {t('home.all_caught_up')}
        </Text>
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
  const { t } = useTranslation();

  return (
    <View className="items-center px-8 py-16">
      <Text className="text-base font-semibold" style={{ color: Colors.text }}>
        {message ? t('home.feed_load_failed') : t('home.no_posts_yet')}
      </Text>
      <Text className="mt-1 text-center text-sm" style={{ color: Colors.textMuted }}>
        {message ?? t('mobile.home.feed_empty_hint')}
      </Text>
      {message && (
        <Pressable
          className="mt-4 rounded-full bg-[#0A7AFF] px-4 py-2 active:opacity-85"
          onPress={onRetry}>
          <Text className="text-sm font-semibold text-white">{t('common.retry')}</Text>
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
  const { t } = useTranslation();

  if (count === 0) {
    return null;
  }

  return (
    <Pressable
      className="mx-4 mt-3 items-center rounded-full bg-[#0A7AFF] px-4 py-2 active:opacity-80"
      onPress={onPress}>
      <Text className="text-sm font-semibold text-white">
        {count === 1
          ? t('mobile.home.new_post_one')
          : t('mobile.home.new_post_many', { count })}
      </Text>
    </Pressable>
  );
}
