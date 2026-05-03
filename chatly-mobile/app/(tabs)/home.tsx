import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomePostCard } from '@/components/social/HomePostCard';
import { HomeStoryCarousel, type HomeStoryItem } from '@/components/social/HomeStoryCarousel';
import { CreatePostModal } from '@/components/social/CreatePostModal';
import { postService } from '@/services/post.service';
import type { Post, PostComment, PostReactionSummary } from '@/types/post';
import { Colors } from '@/constants/theme';

const STORY_ITEMS: HomeStoryItem[] = [
  {
    id: 's1',
    name: 'hust.lee',
    avatarUrl: 'https://i.pravatar.cc/140?img=32',
  },
  {
    id: 's2',
    name: 'enzofernandez',
    avatarUrl: 'https://i.pravatar.cc/140?img=45',
  },
  {
    id: 's3',
    name: 'leomessi',
    avatarUrl: 'https://i.pravatar.cc/140?img=12',
  },
  {
    id: 's4',
    name: 'maria.do',
    avatarUrl: 'https://i.pravatar.cc/140?img=5',
  },
  {
    id: 's5',
    name: 'duy.ng',
    avatarUrl: 'https://i.pravatar.cc/140?img=20',
  },
];

export default function HomeTabScreen() {
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [commentsByPostId, setCommentsByPostId] = useState<Record<string, PostComment[]>>({});
  const [loadingCommentsPostId, setLoadingCommentsPostId] = useState<string | null>(null);

  const loadPosts = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const response = await postService.getFeed(0, 15);
      if (response.code === 1000 && response.result) {
        setPosts(response.result.content ?? []);
      }
    } catch (error: unknown) {
      console.error('Failed to load posts', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Load posts on first mount
    void loadPosts();
  }, [loadPosts]);

  const loadComments = useCallback(async (postId: string) => {
    // Check if comments already loaded
    if (postId in commentsByPostId) {
      return;
    }

    setLoadingCommentsPostId(postId);
    try {
      console.log(`Loading comments for post ${postId}`);
      const response = await postService.getComments(postId);
      console.log(`Comments response:`, response);
      if (response.code === 1000) {
        // response.result is already an array of PostComment[]
        const comments = Array.isArray(response.result) ? response.result : (response.result ? [response.result] : []);
        console.log(`Loaded ${comments.length} comments for post ${postId}`);
        setCommentsByPostId((prev) => ({
          ...prev,
          [postId]: comments,
        }));
      }
    } catch (error: unknown) {
      console.error(`Failed to load comments for post ${postId}`, error);
    } finally {
      setLoadingCommentsPostId(null);
    }
  }, [commentsByPostId]);

  const handlePostInteractions = useCallback((postId: string, action: string, data?: any) => {
    // Load comments when opening the bottom sheet
    if (action === 'openComments') {
      void loadComments(postId);
    }
  }, [loadComments]);

  const handleAddComment = useCallback(async (postId: string, content: string, mediaUrls?: string[], parentCommentId?: string) => {
    try {
      const response = await postService.addComment(postId, {
        content,
        mediaUrls,
        parentCommentId,
      });
      if (response.code === 1000 && response.result) {
        // Update comments cache
        setCommentsByPostId((prev) => ({
          ...prev,
          [postId]: [response.result, ...(prev[postId] || [])],
        }));
      }
    } catch (error: unknown) {
      console.error('Failed to add comment', error);
    }
  }, []);

  const togglePostLikeInState = useCallback((postId: string) => {
    let nextShouldLike = false;

    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;

        const reactions = post.reactions ?? [];
        const likeSummary = reactions.find((reaction) => reaction.type === 'LIKE');
        const wasLiked = likeSummary?.reactedByMe ?? false;
        nextShouldLike = !wasLiked;

        const nextLikeSummary: PostReactionSummary = {
          type: 'LIKE',
          count: Math.max(0, (likeSummary?.count ?? 0) + (nextShouldLike ? 1 : -1)),
          reactedByMe: nextShouldLike,
        };

        const nextReactions = likeSummary
          ? reactions.map((reaction) => (reaction.type === 'LIKE' ? nextLikeSummary : reaction))
          : [nextLikeSummary, ...reactions];

        return {
          ...post,
          reactions: nextReactions,
        };
      }),
    );

    return nextShouldLike;
  }, []);

  const handleTogglePostLike = useCallback(async (postId: string) => {
    const shouldLike = togglePostLikeInState(postId);

    try {
      if (shouldLike) {
        await postService.react(postId, { type: 'LIKE' });
      } else {
        await postService.removeReaction(postId);
      }
    } catch (error: unknown) {
      togglePostLikeInState(postId);
      console.error('Failed to toggle post like', error);
    }
  }, [togglePostLikeInState]);

  const handleSavePost = useCallback(async (postId: string) => {
    try {
      // TODO: Implement save post API call
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, savedByMe: true } : post,
        ),
      );
    } catch (error: unknown) {
      console.error('Failed to save post', error);
    }
  }, []);

  const handleUnsavePost = useCallback(async (postId: string) => {
    try {
      // TODO: Implement unsave post API call
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, savedByMe: false } : post,
        ),
      );
    } catch (error: unknown) {
      console.error('Failed to unsave post', error);
    }
  }, []);

  const handleDeletePost = useCallback(async (postId: string) => {
    try {
      await postService.delete(postId);
      setPosts((prev) => prev.filter((post) => post.id !== postId));
    } catch (error: unknown) {
      console.error('Failed to delete post', error);
    }
  }, []);

  const handleLikeComment = useCallback(async (postId: string, commentId: string, reactionType: string) => {
    try {
      const response = await postService.reactToComment(postId, commentId, reactionType);
      if (response.code === 1000 && response.result) {
        setCommentsByPostId((prev) => {
          const list = prev[postId] || [];
          return {
            ...prev,
            [postId]: list.map((c) => (c.id === commentId ? response.result : c)),
          };
        });
      }
    } catch (error: unknown) {
      console.error('Failed to like comment', error);
    }
  }, []);

  const handleUnlikeComment = useCallback(async (postId: string, commentId: string) => {
    try {
      const response = await postService.removeCommentReaction(postId, commentId);
      if (response.code === 1000 && response.result) {
        setCommentsByPostId((prev) => {
          const list = prev[postId] || [];
          return {
            ...prev,
            [postId]: list.map((c) => (c.id === commentId ? response.result : c)),
          };
        });
      }
    } catch (error: unknown) {
      console.error('Failed to unlike comment', error);
    }
  }, []);

  const handleDeleteComment = useCallback(async (postId: string, commentId: string) => {
    try {
      await postService.deleteComment(postId, commentId);
      setCommentsByPostId((prev) => {
        const list = prev[postId] || [];
        return {
          ...prev,
          [postId]: list.filter((c) => c.id !== commentId),
        };
      });
    } catch (error: unknown) {
      console.error('Failed to delete comment', error);
    }
  }, []);

  const handleEditPost = useCallback((postId: string) => {
    // TODO: Implement edit post modal
    console.log('Edit post:', postId);
  }, []);

  const listHeader = useMemo(
    () => (
      <View>
        <View
          className="border-b border-[#E5E5EA] bg-white px-4 pb-3"
          style={{ paddingTop: Math.max(insets.top + 6, 12) }}
        >
          <View className="relative h-10 flex-row items-center justify-center">
            <TouchableOpacity
              onPress={() => setIsCreatePostOpen(true)}
              className="absolute left-0 rounded-full p-1.5"
              activeOpacity={0.75}
            >
              <Ionicons name="add" size={28} color={Colors.text} />
            </TouchableOpacity>

            <Text className="text-3xl font-bold text-[#1D1D1F]">Chatly</Text>

            <View className="absolute right-0 h-8 w-8" />
          </View>
        </View>

        <HomeStoryCarousel stories={STORY_ITEMS} />
      </View>
    ),
    [insets.top],
  );

  return (
    <View className="flex-1 bg-[#F5F5F7]">
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.cta} />
          <Text className="mt-2 text-sm text-[#6E6E73]">Loading posts...</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <HomePostCard
              post={item}
              comments={commentsByPostId[item.id] || []}
              onToggleLikePost={handleTogglePostLike}
              onSavePost={handleSavePost}
              onUnsavePost={handleUnsavePost}
              onDeletePost={handleDeletePost}
              onEditPost={handleEditPost}
              onAddComment={handleAddComment}
              onLikeComment={(commentId, reactionType) => void handleLikeComment(item.id, commentId, reactionType)}
              onUnlikeComment={(commentId) => void handleUnlikeComment(item.id, commentId)}
              onDeleteComment={(commentId) => void handleDeleteComment(item.id, commentId)}
              onOpenComments={(postId) => void loadComments(postId)}
            />
          )}
          ListHeaderComponent={listHeader}
          contentContainerStyle={{ paddingBottom: 90 }}
          showsVerticalScrollIndicator={false}
          refreshing={isRefreshing}
          onRefresh={() => void loadPosts(true)}
          ListEmptyComponent={
            <View className="items-center px-8 py-16">
              <Text className="text-base font-semibold text-[#1D1D1F]">No posts yet</Text>
              <Text className="mt-1 text-center text-sm text-[#6E6E73]">
                Pull to refresh or create your first post from the plus button.
              </Text>
            </View>
          }
        />
      )}

      <CreatePostModal
        visible={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
      />
    </View>
  );
}
