import { useCallback, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HomePostCard } from '@/components/social/HomePostCard';
import { useSavedPosts } from '@/hooks/useSavedPosts';
import { HOME_FEED_END_REACHED_THRESHOLD } from '@/constants/feed';
import { Colors } from '@/constants/theme';
import { useThemeStore } from '@/store/theme.store';
import type { Post } from '@/types/post';

type ReturnTab = 'home' | 'chats' | 'contacts' | 'assistant' | 'settings';

function isReturnTab(value: string | string[] | undefined): value is ReturnTab {
  return (
    value === 'home' ||
    value === 'chats' ||
    value === 'contacts' ||
    value === 'assistant' ||
    value === 'settings'
  );
}

function SavedPostsEmptyState({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  useThemeStore((state) => state.isDarkMode);
  return (
    <View className="items-center px-8 py-16">
      <Ionicons
        name={message ? 'alert-circle-outline' : 'bookmark-outline'}
        size={38}
        color={Colors.textMuted}
      />
      <Text className="mt-3 text-base font-semibold" style={{ color: Colors.text }}>
        {message ? 'Could not load saved posts' : 'No saved posts yet'}
      </Text>
      <Text className="mt-1 text-center text-sm" style={{ color: Colors.textMuted }}>
        {message ?? 'Posts you save from the feed will show up here.'}
      </Text>
      {message && (
        <Pressable
          className="mt-4 rounded-full bg-[#0A7AFF] px-4 py-2 active:opacity-85"
          onPress={onRetry}>
          <Text className="text-sm font-semibold text-white">Try again</Text>
        </Pressable>
      )}
    </View>
  );
}

interface SavedPostsFooterProps {
  isLoadingMore: boolean;
  hasMorePosts: boolean;
  postCount: number;
}

function SavedPostsFooter({ isLoadingMore, hasMorePosts, postCount }: SavedPostsFooterProps) {
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
          You are all caught up.
        </Text>
      </View>
    );
  }

  return <View className="h-24" />;
}

export default function SavedPostsScreen() {
  const router = useRouter();
  useThemeStore((state) => state.isDarkMode);
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const listRef = useRef<FlatList<Post>>(null);
  const {
    posts,
    commentsByPostId,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMorePosts,
    errorMessage,
    handleRefresh,
    handleLoadMore,
    handleSavePost,
    handleUnsavePost,
    handleTogglePostLike,
    handleDoubleTapPostLike,
    handleSharePost,
    handleReportPost,
    loadComments,
  } = useSavedPosts();
  const returnTab: ReturnTab = isReturnTab(params.returnTo) ? params.returnTo : 'settings';

  const handleBack = useCallback(() => {
    router.replace(`/(tabs)/${returnTab}`);
  }, [returnTab, router]);

  const renderPost = useCallback(
    ({ item }: ListRenderItemInfo<Post>) => (
      <HomePostCard
        post={item}
        comments={commentsByPostId[item.id] || []}
        onToggleLikePost={handleTogglePostLike}
        onDoubleTapLikePost={handleDoubleTapPostLike}
        onSavePost={handleSavePost}
        onUnsavePost={handleUnsavePost}
        onSharePost={handleSharePost}
        onReportPost={handleReportPost}
        onOpenComments={(postId) => void loadComments(postId)}
      />
    ),
    [
      commentsByPostId,
      handleDoubleTapPostLike,
      handleReportPost,
      handleSavePost,
      handleSharePost,
      handleTogglePostLike,
      handleUnsavePost,
      loadComments,
    ]
  );

  const listHeader = useMemo(
    () => (
      <View
        className="border-b px-4 py-4"
        style={{ backgroundColor: Colors.bgCard, borderBottomColor: Colors.borderLight }}>
        <View className="flex-row items-center">
          <Ionicons name="chevron-back" size={26} color={Colors.text} onPress={handleBack} />
          <View className="ml-3">
            <Text className="text-[22px] font-bold" style={{ color: Colors.text }}>
              Saved posts
            </Text>
            <Text className="mt-0.5 text-sm" style={{ color: Colors.textMuted }}>
              Revisit posts you bookmarked.
            </Text>
          </View>
        </View>
      </View>
    ),
    [handleBack]
  );

  const listFooter = useMemo(
    () => (
      <SavedPostsFooter
        isLoadingMore={isLoadingMore}
        hasMorePosts={hasMorePosts}
        postCount={posts.length}
      />
    ),
    [hasMorePosts, isLoadingMore, posts.length]
  );

  return (
    <SafeAreaView className="flex-1" edges={['top']} style={{ backgroundColor: Colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      {isLoading && posts.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.cta} />
          <Text className="mt-2 text-sm" style={{ color: Colors.textMuted }}>
            Loading saved posts...
          </Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          ListEmptyComponent={
            <SavedPostsEmptyState message={errorMessage} onRetry={() => void handleRefresh()} />
          }
          showsVerticalScrollIndicator={false}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={HOME_FEED_END_REACHED_THRESHOLD}
        />
      )}
    </SafeAreaView>
  );
}
