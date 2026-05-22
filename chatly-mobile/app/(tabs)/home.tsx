import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useRouter } from 'expo-router';
import { HomeFeedHeader } from '@/components/social/HomeFeedHeader';
import { HomePostCard } from '@/components/social/HomePostCard';
import { StoryViewerModal } from '@/components/social/StoryViewerModal';
import { CreatePostModal } from '@/components/social/CreatePostModal';
import { CreateStoryModal } from '@/components/social/CreateStoryModal';
import {
  HomeFeedEmptyState,
  HomeFeedFooter,
  HomeNewPostsBanner,
} from '@/app/(tabs)/components/HomeFeedStates';
import { useHomeFeed } from '@/hooks/useHomeFeed';
import { HOME_FEED_END_REACHED_THRESHOLD } from '@/constants/feed';
import { Colors } from '@/constants/theme';
import { socketService } from '@/services/socket.service';
import { useAuthStore } from '@/store/auth.store';
import { useNotificationStore } from '@/store/notification.store';
import type { Post } from '@/types/post';
import type { StoryGroup } from '@/types/story';

export default function HomeTabScreen() {
  const router = useRouter();
  const listRef = useRef<FlatList<Post>>(null);
  const userId = useAuthStore((state) => state.user?.id);
  const socialUnreadCount = useNotificationStore((state) => state.socialUnreadCount);
  const {
    posts,
    pendingNewPosts,
    storyGroups,
    viewerVisible,
    viewerGroupIndex,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMorePosts,
    feedError,
    isCreatePostOpen,
    isCreateStoryOpen,
    editingPost,
    commentsByPostId,
    setViewerVisible,
    setViewerGroupIndex,
    setStoryGroups,
    setEditingPost,
    setIsCreatePostOpen,
    setIsCreateStoryOpen,
    handleRefresh,
    handleLoadMore,
    addPendingPost,
    flushPendingPosts,
    handleTogglePostLike,
    handleDoubleTapPostLike,
    handleSavePost,
    handleUnsavePost,
    handleDeletePost,
    handleReportPost,
    handleAddComment,
    handleLikeComment,
    handleUnlikeComment,
    handleDeleteComment,
    handleEditComment,
    handleEditPost,
    handlePostCreated,
    handlePostUpdated,
    handleStoryCreated,
    loadComments,
  } = useHomeFeed();

  useEffect(() => {
    if (!userId) return undefined;
    return socketService.subscribeToFeed(userId, addPendingPost);
  }, [addPendingPost, userId]);

  const handleCreatePostPress = useCallback(() => {
    setEditingPost(null);
    setIsCreatePostOpen(true);
  }, [setEditingPost, setIsCreatePostOpen]);

  const handleCreateStoryPress = useCallback(() => {
    setIsCreateStoryOpen(true);
  }, [setIsCreateStoryOpen]);

  const handleOpenExplore = useCallback(() => {
    router.push('/explore');
  }, [router]);

  const handleOpenNotifications = useCallback(() => {
    router.push({ pathname: '/notifications', params: { scope: 'social' } });
  }, [router]);

  const handlePressStoryGroup = useCallback(
    (group: StoryGroup, groupIndex: number) => {
      setViewerGroupIndex(groupIndex);
      setViewerVisible(true);
    },
    [setViewerGroupIndex, setViewerVisible]
  );

  const handleStoryViewed = useCallback(
    (storyId: string) => {
      setStoryGroups((prev) =>
        prev.map((group) => ({
          ...group,
          stories: group.stories.map((story) =>
            story.id === storyId ? { ...story, viewedByMe: true } : story
          ),
        }))
      );
    },
    [setStoryGroups]
  );

  const handleFlushPendingPosts = useCallback(() => {
    if (pendingNewPosts.length === 0) {
      return;
    }
    flushPendingPosts();
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [flushPendingPosts, pendingNewPosts.length]);

  const renderPost = useCallback(
    ({ item }: ListRenderItemInfo<Post>) => (
      <HomePostCard
        post={item}
        comments={commentsByPostId[item.id] || []}
        onToggleLikePost={handleTogglePostLike}
        onDoubleTapLikePost={handleDoubleTapPostLike}
        onSavePost={handleSavePost}
        onUnsavePost={handleUnsavePost}
        onDeletePost={handleDeletePost}
        onEditPost={handleEditPost}
        onReportPost={handleReportPost}
        onAddComment={handleAddComment}
        onLikeComment={(commentId, reactionType) =>
          void handleLikeComment(item.id, commentId, reactionType)
        }
        onUnlikeComment={(commentId) => void handleUnlikeComment(item.id, commentId)}
        onDeleteComment={(commentId) => void handleDeleteComment(item.id, commentId)}
        onEditComment={(commentId, content) => void handleEditComment(item.id, commentId, content)}
        onOpenComments={(postId) => void loadComments(postId)}
      />
    ),
    [
      commentsByPostId,
      handleAddComment,
      handleDeleteComment,
      handleDeletePost,
      handleDoubleTapPostLike,
      handleEditComment,
      handleEditPost,
      handleLikeComment,
      handleReportPost,
      handleSavePost,
      handleTogglePostLike,
      handleUnlikeComment,
      handleUnsavePost,
      loadComments,
    ]
  );

  const listHeader = useMemo(
    () => (
      <View>
        <HomeFeedHeader
          storyGroups={storyGroups}
          onCreatePost={handleCreatePostPress}
          onCreateStory={handleCreateStoryPress}
          onOpenExplore={handleOpenExplore}
          onOpenNotifications={handleOpenNotifications}
          onPressStoryGroup={handlePressStoryGroup}
          hasUnreadNotifications={socialUnreadCount > 0}
        />
        <HomeNewPostsBanner count={pendingNewPosts.length} onPress={handleFlushPendingPosts} />
      </View>
    ),
    [
      handleCreatePostPress,
      handleCreateStoryPress,
      handleFlushPendingPosts,
      handleOpenExplore,
      handleOpenNotifications,
      handlePressStoryGroup,
      pendingNewPosts.length,
      socialUnreadCount,
      storyGroups,
    ]
  );

  const listFooter = useMemo(
    () => (
      <HomeFeedFooter
        isLoadingMore={isLoadingMore}
        hasMorePosts={hasMorePosts}
        postCount={posts.length}
      />
    ),
    [hasMorePosts, isLoadingMore, posts.length]
  );

  return (
    <View className="flex-1 bg-[#F5F5F7]">
      {isLoading && posts.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.cta} />
          <Text className="mt-2 text-sm text-[#6E6E73]">Loading posts...</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          showsVerticalScrollIndicator={false}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={HOME_FEED_END_REACHED_THRESHOLD}
          ListEmptyComponent={
            <HomeFeedEmptyState message={feedError} onRetry={() => void handleRefresh()} />
          }
        />
      )}

      <CreatePostModal
        visible={isCreatePostOpen}
        onClose={() => {
          setIsCreatePostOpen(false);
          setEditingPost(null);
        }}
        onCreated={handlePostCreated}
        editingPost={editingPost}
        onUpdated={handlePostUpdated}
      />

      <CreateStoryModal
        visible={isCreateStoryOpen}
        onClose={() => setIsCreateStoryOpen(false)}
        onCreated={() => void handleStoryCreated()}
      />

      <StoryViewerModal
        groups={storyGroups}
        initialGroupIndex={viewerGroupIndex}
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        onStoryViewed={handleStoryViewed}
      />
    </View>
  );
}
