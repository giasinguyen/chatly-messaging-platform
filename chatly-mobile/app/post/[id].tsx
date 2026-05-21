import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { postService } from '@/services/post.service';
import { CommentsBottomSheet } from '@/components/social/CommentsBottomSheet';
import { Colors } from '@/constants/theme';
import type { Post, PostComment, ReactionType } from '@/types/post';
import { getApiErrorMessage } from '@/utils/errorHandler';
import { PostMediaGallery } from '@/app/post/components/PostMediaGallery';
import { PostCommentsSection } from '@/app/post/components/PostCommentsSection';

const FALLBACK_AVATAR = 'https://i.pravatar.cc/140?img=30';

function formatRelativeTime(createdAt: string): string {
  const diffMinutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [isCommentsSheetVisible, setIsCommentsSheetVisible] = useState(false);

  const loadPost = useCallback(async () => {
    if (!id) {
      setErrorMessage('Invalid post id.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      setErrorMessage(null);
      const response = await postService.getById(id);
      if (response.code !== 1000 || !response.result) {
        throw new Error(response.message ?? 'Could not load post.');
      }
      setPost(response.result);
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, 'Could not load post.'));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const loadComments = useCallback(async () => {
    if (!id) {
      return;
    }

    setIsCommentsLoading(true);
    try {
      setCommentsError(null);
      const response = await postService.getComments(id);
      if (response.code !== 1000) {
        throw new Error(response.message ?? 'Could not load comments.');
      }
      setComments(response.result ?? []);
    } catch (error: unknown) {
      setCommentsError(getApiErrorMessage(error, 'Could not load comments.'));
    } finally {
      setIsCommentsLoading(false);
    }
  }, [id]);

  const handleSubmitComment = useCallback(
    async (
      postId: string,
      content: string,
      mediaUrls?: string[],
      parentCommentId?: string
    ): Promise<void> => {
      if (!id || isSubmittingComment) {
        return;
      }

      setIsSubmittingComment(true);
      try {
        const response = await postService.addComment(postId, {
          content,
          mediaUrls,
          parentCommentId,
        });
        if (response.code !== 1000 || !response.result) {
          throw new Error(response.message ?? 'Could not send comment.');
        }

        setComments((prev) => [response.result, ...prev]);
        setPost((current) =>
          current
            ? {
                ...current,
                commentCount: current.commentCount + 1,
              }
            : current
        );
        setCommentsError(null);
      } catch (error: unknown) {
        setCommentsError(getApiErrorMessage(error, 'Could not send comment.'));
        throw error;
      } finally {
        setIsSubmittingComment(false);
      }
    },
    [id, isSubmittingComment]
  );

  const handleLikeComment = useCallback(
    async (commentId: string, reactionType: ReactionType) => {
      if (!id) {
        return;
      }

      try {
        const response = await postService.reactToComment(id, commentId, reactionType);
        if (response.code === 1000 && response.result) {
          setComments((prev) =>
            prev.map((comment) => (comment.id === commentId ? response.result : comment))
          );
        }
      } catch (error: unknown) {
        setCommentsError(getApiErrorMessage(error, 'Could not react to comment.'));
      }
    },
    [id]
  );

  const handleUnlikeComment = useCallback(
    async (commentId: string) => {
      if (!id) {
        return;
      }

      try {
        const response = await postService.removeCommentReaction(id, commentId);
        if (response.code === 1000 && response.result) {
          setComments((prev) =>
            prev.map((comment) => (comment.id === commentId ? response.result : comment))
          );
        }
      } catch (error: unknown) {
        setCommentsError(getApiErrorMessage(error, 'Could not remove comment reaction.'));
      }
    },
    [id]
  );

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      if (!id) {
        return;
      }

      try {
        const response = await postService.deleteComment(id, commentId);
        if (response.code !== 1000) {
          throw new Error(response.message ?? 'Could not delete comment.');
        }

        setComments((prev) => prev.filter((comment) => comment.id !== commentId));
        setPost((current) =>
          current
            ? {
                ...current,
                commentCount: Math.max(0, current.commentCount - 1),
              }
            : current
        );
      } catch (error: unknown) {
        setCommentsError(getApiErrorMessage(error, 'Could not delete comment.'));
      }
    },
    [id]
  );

  useEffect(() => {
    void loadPost();
  }, [loadPost]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  return (
    <View className="flex-1 bg-[#F5F5F7]">
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-row items-center border-b border-[#E5E5EA] bg-white px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} className="rounded-full p-1.5" activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text className="ml-2 text-lg font-semibold text-[#1D1D1F]">Post</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.cta} />
        </View>
      ) : errorMessage ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-base font-semibold text-[#1D1D1F]">Could not load post</Text>
          <Text className="mt-1 text-center text-sm text-[#6E6E73]">{errorMessage}</Text>
          <TouchableOpacity
            className="mt-4 rounded-full bg-[#0A7AFF] px-4 py-2 active:opacity-85"
            onPress={() => void loadPost()}
          >
            <Text className="text-sm font-semibold text-white">Try again</Text>
          </TouchableOpacity>
        </View>
      ) : post ? (
        <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
          <View className="flex-row items-center">
            <Image
              source={{ uri: post.authorAvatarUrl ?? FALLBACK_AVATAR }}
              contentFit="cover"
              transition={120}
              style={{ width: 40, height: 40, borderRadius: 999 }}
            />
            <View className="ml-2.5">
              <Text className="text-sm font-semibold text-[#1D1D1F]">
                {post.authorDisplayName ?? post.authorUsername ?? 'Unknown user'}
              </Text>
              <Text className="text-xs text-[#6E6E73]">{formatRelativeTime(post.createdAt)}</Text>
            </View>
          </View>

          {post.content?.trim() ? (
            <Text className="mt-3 text-base leading-6 text-[#1D1D1F]">{post.content}</Text>
          ) : null}

          <PostMediaGallery mediaUrls={post.mediaUrls} />

          {post.hashtags.length > 0 && (
            <View className="mt-4 flex-row flex-wrap">
              {post.hashtags.map((tag) => (
                <View key={tag} className="mr-2 mb-2 rounded-full bg-[#EEF5FF] px-3 py-1.5">
                  <Text className="text-xs font-semibold text-[#0A7AFF]">#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          <PostCommentsSection
            commentCount={post.commentCount}
            comments={comments}
            isCommentsLoading={isCommentsLoading}
            commentsError={commentsError}
            onRetry={() => void loadComments()}
            onOpenComments={() => setIsCommentsSheetVisible(true)}
            onLikeComment={handleLikeComment}
            onUnlikeComment={handleUnlikeComment}
            onDeleteComment={handleDeleteComment}
          />
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-base font-semibold text-[#1D1D1F]">Post not found</Text>
        </View>
      )}

      {post && (
        <CommentsBottomSheet
          visible={isCommentsSheetVisible}
          postId={post.id}
          comments={comments}
          commentCount={post.commentCount}
          onClose={() => setIsCommentsSheetVisible(false)}
          onOpen={() => void loadComments()}
          onAddComment={handleSubmitComment}
          onLikeComment={handleLikeComment}
          onUnlikeComment={handleUnlikeComment}
          onDeleteComment={handleDeleteComment}
          isSubmittingComment={isSubmittingComment}
        />
      )}
    </View>
  );
}
