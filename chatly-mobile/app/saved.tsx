import { useCallback, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HomePostCard } from '@/components/social/HomePostCard';
import { useSavedPosts } from '@/hooks/useSavedPosts';
import { HOME_FEED_END_REACHED_THRESHOLD } from '@/constants/feed';
import { Colors } from '@/constants/theme';
import type { Post } from '@/types/post';

function SavedPostsEmptyState({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  return (
    <View className="items-center px-8 py-16">
      <Ionicons
        name={message ? 'alert-circle-outline' : 'bookmark-outline'}
        size={38}
        color="#6E6E73"
      />
      <Text className="mt-3 text-base font-semibold text-[#1D1D1F]">
        {message ? 'Could not load saved posts' : 'No saved posts yet'}
      </Text>
      <Text className="mt-1 text-center text-sm text-[#6E6E73]">
        {message ?? 'Posts you save from the feed will show up here.'}
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
        <Text className="text-sm text-[#6E6E73]">You are all caught up.</Text>
      </View>
    );
  }

  return <View className="h-24" />;
}

export default function SavedPostsScreen() {
  const router = useRouter();
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
    handleReportPost,
    loadComments,
  } = useSavedPosts();

  const renderPost = useCallback(
    ({ item }: ListRenderItemInfo<Post>) => (
      <HomePostCard
        post={item}
        comments={commentsByPostId[item.id] || []}
        onToggleLikePost={handleTogglePostLike}
        onDoubleTapLikePost={handleDoubleTapPostLike}
        onSavePost={handleSavePost}
        onUnsavePost={handleUnsavePost}
        onReportPost={handleReportPost}
        onOpenComments={(postId) => void loadComments(postId)}
      />
    ),
    [
      commentsByPostId,
      handleDoubleTapPostLike,
      handleReportPost,
      handleSavePost,
      handleTogglePostLike,
      handleUnsavePost,
      loadComments,
    ]
  );

  const listHeader = useMemo(
    () => (
      <View className="border-b border-[#E5E5EA] bg-white px-4 py-4">
        <View className="flex-row items-center">
          <Ionicons
            name="chevron-back"
            size={26}
            color={Colors.text}
            onPress={() => router.back()}
          />
          <View className="ml-3">
            <Text className="text-[22px] font-bold text-[#1D1D1F]">Saved posts</Text>
            <Text className="mt-0.5 text-sm text-[#6E6E73]">
              Revisit posts you bookmarked.
            </Text>
          </View>
        </View>
      </View>
    ),
    [router]
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
    <SafeAreaView className="flex-1 bg-[#F5F5F7]" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      {isLoading && posts.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.cta} />
          <Text className="mt-2 text-sm text-[#6E6E73]">Loading saved posts...</Text>
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
