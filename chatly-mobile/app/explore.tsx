import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ExploreHeader } from '@/components/social/ExploreHeader';
import { ExplorePostTile } from '@/components/social/ExplorePostTile';
import { EXPLORE_END_REACHED_THRESHOLD } from '@/constants/feed';
import { Colors } from '@/constants/theme';
import { useExploreFeed } from '@/hooks/useExploreFeed';
import type { Post } from '@/types/post';

interface ExploreFooterProps {
  isLoadingMore: boolean;
  hasMore: boolean;
  postCount: number;
}

function ExploreFooter({ isLoadingMore, hasMore, postCount }: ExploreFooterProps) {
  if (isLoadingMore) {
    return (
      <View className="items-center pb-10 pt-4">
        <ActivityIndicator size="small" color={Colors.cta} />
      </View>
    );
  }

  if (postCount > 0 && !hasMore) {
    return (
      <View className="items-center pb-10 pt-4">
        <Text className="text-sm text-[#6E6E73]">No more posts.</Text>
      </View>
    );
  }

  return <View className="h-10" />;
}

function ExploreEmptyState({ isLoading, message }: { isLoading: boolean; message: string | null }) {
  if (isLoading) {
    return (
      <View className="flex-row flex-wrap px-3 pt-3">
        {Array.from({ length: 9 }).map((_, index) => (
          <View key={index} className="w-1/3 p-0.5">
            <View className="aspect-square rounded-lg bg-[#E5E5EA]" />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View className="items-center px-8 py-16">
      <Text className="text-base font-semibold text-[#1D1D1F]">
        {message ? 'Could not load explore' : 'No posts found'}
      </Text>
      <Text className="mt-1 text-center text-sm text-[#6E6E73]">
        {message ?? 'Try a different search or category.'}
      </Text>
    </View>
  );
}

function ExploreErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View className="items-center px-8 py-16">
      <Text className="text-base font-semibold text-[#1D1D1F]">Could not load explore</Text>
      <Text className="mt-1 text-center text-sm text-[#6E6E73]">{message}</Text>
      <TouchableOpacity
        className="mt-4 rounded-full bg-[#0A7AFF] px-4 py-2 active:opacity-85"
        onPress={onRetry}
      >
        <Text className="text-sm font-semibold text-white">Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ExploreScreen() {
  const router = useRouter();
  const {
    posts,
    selectedCategory,
    selectedHashtag,
    trendingHashtags,
    searchInput,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMore,
    errorMessage,
    setSelectedCategory,
    setSearchInput,
    handleSelectTrendingHashtag,
    handleClearSearch,
    handleRefresh,
    handleLoadMore,
  } = useExploreFeed();

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/home');
  }, [router]);

  const renderPost = useCallback(
    ({ item }: ListRenderItemInfo<Post>) => <ExplorePostTile post={item} />,
    []
  );

  const listHeader = useMemo(
    () => (
      <ExploreHeader
        selectedCategory={selectedCategory}
        selectedHashtag={selectedHashtag}
        trendingHashtags={trendingHashtags}
        searchInput={searchInput}
        onBack={handleBack}
        onChangeSearch={setSearchInput}
        onClearSearch={handleClearSearch}
        onSelectCategory={setSelectedCategory}
        onSelectTrendingHashtag={handleSelectTrendingHashtag}
      />
    ),
    [
      handleBack,
      handleClearSearch,
      handleSelectTrendingHashtag,
      searchInput,
      selectedCategory,
      selectedHashtag,
      setSearchInput,
      setSelectedCategory,
      trendingHashtags,
    ]
  );

  const listFooter = useMemo(
    () => (
      <ExploreFooter isLoadingMore={isLoadingMore} hasMore={hasMore} postCount={posts.length} />
    ),
    [hasMore, isLoadingMore, posts.length]
  );

  return (
    <View className="flex-1 bg-[#F5F5F7]">
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        numColumns={3}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ListEmptyComponent={
          errorMessage && posts.length === 0 ? (
            <ExploreErrorState message={errorMessage} onRetry={() => void handleRefresh()} />
          ) : (
            <ExploreEmptyState isLoading={isLoading} message={errorMessage} />
          )
        }
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={EXPLORE_END_REACHED_THRESHOLD}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
