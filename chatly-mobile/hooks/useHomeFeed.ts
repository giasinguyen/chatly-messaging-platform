import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { HOME_FEED_PAGE_SIZE } from '@/constants/feed';
import { postService } from '@/services/post.service';
import { storyService } from '@/services/story.service';
import type { Post, PostComment, PostReactionSummary } from '@/types/post';
import type { StoryGroup, StoryResponse } from '@/types/story';
import { getApiErrorMessage } from '@/utils/errorHandler';

type FeedLoadMode = 'initial' | 'refresh' | 'append';

function mergeUniquePosts(existing: Post[], incoming: Post[]): Post[] {
  const existingIds = new Set(existing.map((post) => post.id));
  return [...existing, ...incoming.filter((post) => !existingIds.has(post.id))];
}

function prependUniquePosts(existing: Post[], incoming: Post[]): Post[] {
  const existingIds = new Set(existing.map((post) => post.id));
  const uniqueIncoming = incoming.filter((post) => !existingIds.has(post.id));
  return [...uniqueIncoming, ...existing];
}

function groupStories(stories: StoryResponse[]): StoryGroup[] {
  const map = new Map<string, StoryGroup>();
  for (const story of stories) {
    const existing = map.get(story.userId);
    if (existing) {
      existing.stories.push(story);
    } else {
      map.set(story.userId, {
        user: {
          id: story.userId,
          username: story.user?.username ?? story.userId,
          displayName: story.user?.displayName,
          avatarUrl: story.user?.avatarUrl,
        },
        stories: [story],
      });
    }
  }
  return Array.from(map.values());
}

export function useHomeFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [pendingNewPosts, setPendingNewPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerGroupIndex, setViewerGroupIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [commentsByPostId, setCommentsByPostId] = useState<Record<string, PostComment[]>>({});

  const showError = useCallback((error: unknown, fallback: string) => {
    Alert.alert('Error', getApiErrorMessage(error, fallback));
  }, []);

  const updatePost = useCallback((postId: string, updates: Partial<Post>) => {
    setPosts((prev) => prev.map((post) => (post.id === postId ? { ...post, ...updates } : post)));
  }, []);

  const replacePost = useCallback((updatedPost: Post) => {
    setPosts((prev) => prev.map((post) => (post.id === updatedPost.id ? updatedPost : post)));
  }, []);

  const loadStories = useCallback(async () => {
    try {
      const response = await storyService.getFeed();
      if (response.code === 1000 && response.result) {
        setStoryGroups(groupStories(response.result));
      }
    } catch {
      setStoryGroups([]);
    }
  }, []);

  const loadPosts = useCallback(async (cursor: string | null, mode: FeedLoadMode) => {
    if (mode === 'append') {
      setIsLoadingMore(true);
    } else if (mode === 'refresh') {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      setFeedError(null);
      const response = await postService.getHomeFeed(cursor, HOME_FEED_PAGE_SIZE);
      if (response.code !== 1000 || !response.result) {
        throw new Error(response.message ?? 'Could not load posts.');
      }

      setPosts((prev) =>
        mode === 'append' ? mergeUniquePosts(prev, response.result.items) : response.result.items
      );
      if (mode !== 'append') {
        setPendingNewPosts([]);
      }
      setNextCursor(response.result.nextCursor);
      setHasMorePosts(response.result.hasMore);
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, 'Could not load posts.');
      setFeedError(message);
      if (mode !== 'initial') {
        Alert.alert('Error', message);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void loadPosts(null, 'initial');
    void loadStories();
  }, [loadPosts, loadStories]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([loadPosts(null, 'refresh'), loadStories()]);
  }, [loadPosts, loadStories]);

  const handleLoadMore = useCallback(() => {
    if (isLoading || isRefreshing || isLoadingMore || !hasMorePosts || !nextCursor) {
      return;
    }
    void loadPosts(nextCursor, 'append');
  }, [hasMorePosts, isLoading, isLoadingMore, isRefreshing, loadPosts, nextCursor]);

  const addPendingPost = useCallback(
    (post: Post) => {
      if (posts.some((item) => item.id === post.id)) {
        return;
      }

      setPendingNewPosts((prev) => {
        if (prev.some((item) => item.id === post.id)) {
          return prev;
        }
        return [post, ...prev];
      });
    },
    [posts]
  );

  const flushPendingPosts = useCallback(() => {
    setPosts((prev) => prependUniquePosts(prev, pendingNewPosts));
    setPendingNewPosts([]);
  }, [pendingNewPosts]);

  const loadComments = useCallback(
    async (postId: string) => {
      if (postId in commentsByPostId) {
        return;
      }

      try {
        const response = await postService.getComments(postId);
        if (response.code === 1000 && response.result) {
          setCommentsByPostId((prev) => ({
            ...prev,
            [postId]: response.result,
          }));
        }
      } catch (error: unknown) {
        showError(error, 'Could not load comments.');
      }
    },
    [commentsByPostId, showError]
  );

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
        return { ...post, reactions: nextReactions };
      })
    );
    return nextShouldLike;
  }, []);

  const handleTogglePostLike = useCallback(
    async (postId: string) => {
      const shouldLike = togglePostLikeInState(postId);
      try {
        const response = shouldLike
          ? await postService.react(postId, { type: 'LIKE' })
          : await postService.removeReaction(postId);
        if (response.code === 1000 && response.result) {
          replacePost(response.result);
        }
      } catch (error: unknown) {
        togglePostLikeInState(postId);
        showError(error, 'Could not update reaction.');
      }
    },
    [replacePost, showError, togglePostLikeInState]
  );

  const isPostLiked = useCallback(
    (postId: string) =>
      posts
        .find((post) => post.id === postId)
        ?.reactions?.some((reaction) => reaction.type === 'LIKE' && reaction.reactedByMe) ?? false,
    [posts]
  );

  const handleDoubleTapPostLike = useCallback(
    async (postId: string) => {
      if (isPostLiked(postId)) return;
      togglePostLikeInState(postId);
      try {
        const response = await postService.react(postId, { type: 'LIKE' });
        if (response.code === 1000 && response.result) {
          replacePost(response.result);
        }
      } catch (error: unknown) {
        togglePostLikeInState(postId);
        showError(error, 'Could not like post.');
      }
    },
    [isPostLiked, replacePost, showError, togglePostLikeInState]
  );

  const handleSavePost = useCallback(
    async (postId: string) => {
      updatePost(postId, { savedByMe: true });
      try {
        const response = await postService.savePost(postId);
        if (response.code !== 1000) {
          throw new Error(response.message ?? 'Could not save post.');
        }
      } catch (error: unknown) {
        updatePost(postId, { savedByMe: false });
        showError(error, 'Could not save post.');
      }
    },
    [showError, updatePost]
  );

  const handleUnsavePost = useCallback(
    async (postId: string) => {
      updatePost(postId, { savedByMe: false });
      try {
        const response = await postService.unsavePost(postId);
        if (response.code !== 1000) {
          throw new Error(response.message ?? 'Could not unsave post.');
        }
      } catch (error: unknown) {
        updatePost(postId, { savedByMe: true });
        showError(error, 'Could not unsave post.');
      }
    },
    [showError, updatePost]
  );

  const handleDeletePost = useCallback(
    async (postId: string) => {
      try {
        const response = await postService.delete(postId);
        if (response.code !== 1000) {
          throw new Error(response.message ?? 'Could not delete post.');
        }
        setPosts((prev) => prev.filter((post) => post.id !== postId));
      } catch (error: unknown) {
        showError(error, 'Could not delete post.');
      }
    },
    [showError]
  );

  const handleAddComment = useCallback(
    async (postId: string, content: string, mediaUrls?: string[], parentCommentId?: string) => {
      try {
        const response = await postService.addComment(postId, {
          content,
          mediaUrls,
          parentCommentId,
        });
        if (response.code === 1000 && response.result) {
          setCommentsByPostId((prev) => ({
            ...prev,
            [postId]: [response.result, ...(prev[postId] || [])],
          }));
          updatePost(postId, {
            commentCount: (posts.find((post) => post.id === postId)?.commentCount ?? 0) + 1,
          });
        }
      } catch (error: unknown) {
        showError(error, 'Could not add comment.');
      }
    },
    [posts, showError, updatePost]
  );

  const handleLikeComment = useCallback(
    async (postId: string, commentId: string, reactionType: string) => {
      try {
        const response = await postService.reactToComment(postId, commentId, reactionType);
        if (response.code === 1000 && response.result) {
          setCommentsByPostId((prev) => ({
            ...prev,
            [postId]: (prev[postId] || []).map((comment) =>
              comment.id === commentId ? response.result : comment
            ),
          }));
        }
      } catch (error: unknown) {
        showError(error, 'Could not react to comment.');
      }
    },
    [showError]
  );

  const handleUnlikeComment = useCallback(
    async (postId: string, commentId: string) => {
      try {
        const response = await postService.removeCommentReaction(postId, commentId);
        if (response.code === 1000 && response.result) {
          setCommentsByPostId((prev) => ({
            ...prev,
            [postId]: (prev[postId] || []).map((comment) =>
              comment.id === commentId ? response.result : comment
            ),
          }));
        }
      } catch (error: unknown) {
        showError(error, 'Could not remove comment reaction.');
      }
    },
    [showError]
  );

  const handleDeleteComment = useCallback(
    async (postId: string, commentId: string) => {
      try {
        const response = await postService.deleteComment(postId, commentId);
        if (response.code !== 1000) {
          throw new Error(response.message ?? 'Could not delete comment.');
        }
        setCommentsByPostId((prev) => ({
          ...prev,
          [postId]: (prev[postId] || []).filter((comment) => comment.id !== commentId),
        }));
        updatePost(postId, {
          commentCount: Math.max(
            0,
            (posts.find((post) => post.id === postId)?.commentCount ?? 1) - 1
          ),
        });
      } catch (error: unknown) {
        showError(error, 'Could not delete comment.');
      }
    },
    [posts, showError, updatePost]
  );

  const handleEditPost = useCallback(
    (postId: string) => {
      const post = posts.find((item) => item.id === postId);
      if (!post) return;
      setEditingPost(post);
      setIsCreatePostOpen(true);
    },
    [posts]
  );

  const handlePostCreated = useCallback((post: Post) => {
    setPosts((prev) => [post, ...prev]);
    setPendingNewPosts((prev) => prev.filter((item) => item.id !== post.id));
    setIsCreatePostOpen(false);
  }, []);

  const handlePostUpdated = useCallback(
    (updatedPost: Post) => {
      replacePost(updatedPost);
      setEditingPost(null);
      setIsCreatePostOpen(false);
    },
    [replacePost]
  );

  const handleStoryCreated = useCallback(async () => {
    setIsCreateStoryOpen(false);
    await loadStories();
  }, [loadStories]);

  return {
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
    handleAddComment,
    handleLikeComment,
    handleUnlikeComment,
    handleDeleteComment,
    handleEditPost,
    handlePostCreated,
    handlePostUpdated,
    handleStoryCreated,
    loadComments,
  };
}
