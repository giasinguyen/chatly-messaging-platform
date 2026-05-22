import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Share } from 'react-native';
import { SAVED_POSTS_PAGE_SIZE } from '@/constants/feed';
import { postService } from '@/services/post.service';
import type { Post, PostComment, PostReactionSummary, ReportPostRequest } from '@/types/post';
import { getApiErrorMessage } from '@/utils/errorHandler';

type SavedLoadMode = 'initial' | 'refresh' | 'append';

function mergeUniquePosts(existing: Post[], incoming: Post[]): Post[] {
  const existingIds = new Set(existing.map((post) => post.id));
  return [...existing, ...incoming.filter((post) => !existingIds.has(post.id))];
}

export function useSavedPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [commentsByPostId, setCommentsByPostId] = useState<Record<string, PostComment[]>>({});

  const showError = useCallback((error: unknown, fallback: string) => {
    Alert.alert('Error', getApiErrorMessage(error, fallback));
  }, []);

  const updatePost = useCallback((postId: string, updates: Partial<Post>) => {
    setPosts((current) =>
      current.map((post) => (post.id === postId ? { ...post, ...updates } : post))
    );
  }, []);

  const replacePost = useCallback((updatedPost: Post) => {
    setPosts((current) =>
      current.map((post) => (post.id === updatedPost.id ? updatedPost : post))
    );
  }, []);

  const loadPosts = useCallback(async (targetPage: number, mode: SavedLoadMode) => {
    if (mode === 'append') {
      setIsLoadingMore(true);
    } else if (mode === 'refresh') {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      setErrorMessage(null);
      const response = await postService.getSavedPosts(targetPage, SAVED_POSTS_PAGE_SIZE);
      if (response.code !== 1000 || !response.result) {
        throw new Error(response.message ?? 'Could not load saved posts.');
      }

      setPosts((current) =>
        mode === 'append'
          ? mergeUniquePosts(current, response.result.content)
          : response.result.content
      );
      setPage(response.result.number);
      setHasMorePosts(!response.result.last);
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, 'Could not load saved posts.');
      setErrorMessage(message);
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
    void loadPosts(0, 'initial');
  }, [loadPosts]);

  const handleRefresh = useCallback(async () => {
    await loadPosts(0, 'refresh');
  }, [loadPosts]);

  const handleLoadMore = useCallback(() => {
    if (isLoading || isRefreshing || isLoadingMore || !hasMorePosts) {
      return;
    }
    void loadPosts(page + 1, 'append');
  }, [hasMorePosts, isLoading, isLoadingMore, isRefreshing, loadPosts, page]);

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
      const removedPost = posts.find((post) => post.id === postId);
      setPosts((current) => current.filter((post) => post.id !== postId));
      try {
        const response = await postService.unsavePost(postId);
        if (response.code !== 1000) {
          throw new Error(response.message ?? 'Could not unsave post.');
        }
      } catch (error: unknown) {
        if (removedPost) {
          setPosts((current) => [removedPost, ...current]);
        }
        showError(error, 'Could not unsave post.');
      }
    },
    [posts, showError]
  );

  const togglePostLikeInState = useCallback((postId: string) => {
    let nextShouldLike = false;
    setPosts((current) =>
      current.map((post) => {
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

  const handleReportPost = useCallback(
    async (postId: string, payload: ReportPostRequest) => {
      try {
        const response = await postService.reportPost(postId, payload);
        if (response.code !== 1000) {
          throw new Error(response.message ?? 'Could not submit report.');
        }
        Alert.alert('Report submitted', 'Thanks for helping keep Chatly safe.');
      } catch (error: unknown) {
        showError(error, 'Could not submit report.');
        throw error;
      }
    },
    [showError]
  );

  const handleSharePost = useCallback(
    async (postId: string) => {
      try {
        const response = await postService.sharePost(postId);
        if (response.code !== 1000 || !response.result) {
          throw new Error(response.message ?? 'Could not share post.');
        }

        replacePost(response.result);
        await Share.share({ message: `chatly-mobile://post/${postId}` });
      } catch (error: unknown) {
        showError(error, 'Could not share post.');
      }
    },
    [replacePost, showError]
  );

  const loadComments = useCallback(
    async (postId: string) => {
      if (postId in commentsByPostId) return;
      try {
        const response = await postService.getComments(postId);
        if (response.code === 1000 && response.result) {
          setCommentsByPostId((current) => ({ ...current, [postId]: response.result }));
        }
      } catch (error: unknown) {
        showError(error, 'Could not load comments.');
      }
    },
    [commentsByPostId, showError]
  );

  return {
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
  };
}
