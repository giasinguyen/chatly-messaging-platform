import { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, Text, View, type ListRenderItemInfo } from 'react-native';
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

export default function ExploreScreen() {
  const router = useRouter();
  const {
    posts,
    selectedCategory,
    searchInput,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMore,
    errorMessage,
    setSelectedCategory,
    setSearchInput,
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
        searchInput={searchInput}
        onBack={handleBack}
        onChangeSearch={setSearchInput}
        onClearSearch={handleClearSearch}
        onSelectCategory={setSelectedCategory}
      />
    ),
    [
      handleBack,
      handleClearSearch,
      searchInput,
      selectedCategory,
      setSearchInput,
      setSelectedCategory,
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
        ListEmptyComponent={<ExploreEmptyState isLoading={isLoading} message={errorMessage} />}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={EXPLORE_END_REACHED_THRESHOLD}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
