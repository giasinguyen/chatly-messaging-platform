import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CustomAiIcon } from '@/components/ui/CustomAiIcon';
import { postService } from '@/services/post.service';
import { CommentsBottomSheet } from '@/components/social/CommentsBottomSheet';
import { MentionText } from '@/components/mention/MentionText';
import { Avatar } from '@/components/ui/Avatar';
import { UserQuickProfileDialog } from '@/components/profile/UserQuickProfileDialog';
import usePostAiChatStarter from '@/hooks/useStartPostAiChat';
import { Colors } from '@/constants/theme';
import { useThemeStore } from '@/store/theme.store';
import type { Post, PostComment, ReactionType } from '@/types/post';
import { countCommentBranch, removeCommentBranch } from '@/utils/commentTree';
import { getApiErrorMessage } from '@/utils/errorHandler';
import { PostMediaGallery } from '@/app/post/components/PostMediaGallery';
import { PostCommentsSection } from '@/app/post/components/PostCommentsSection';
import { formatRelativeTime } from '@/utils/socialFormat';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  useThemeStore((state) => state.isDarkMode);
  const { isStartingAiChat, startPostAiChat } = usePostAiChatStarter();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [isCommentsSheetVisible, setIsCommentsSheetVisible] = useState(false);
  const [isQuickProfileVisible, setIsQuickProfileVisible] = useState(false);

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
      parentCommentId?: string,
      mentionIds?: string[]
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
          mentionIds,
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

        const removedCount = countCommentBranch(comments, commentId);

        setComments((prev) => removeCommentBranch(prev, commentId));
        setPost((current) =>
          current
            ? {
                ...current,
                commentCount: Math.max(0, current.commentCount - removedCount),
              }
            : current
        );
      } catch (error: unknown) {
        setCommentsError(getApiErrorMessage(error, 'Could not delete comment.'));
      }
    },
    [comments, id]
  );

  const handleEditComment = useCallback(
    async (_postId: string, commentId: string, content: string, mentionIds?: string[]) => {
      if (!id) {
        return;
      }

      try {
        const response = await postService.updateComment(id, commentId, { content, mentionIds });
        if (response.code !== 1000 || !response.result) {
          throw new Error(response.message ?? 'Could not update comment.');
        }

        setComments((prev) =>
          prev.map((comment) => (comment.id === commentId ? response.result : comment))
        );
        setCommentsError(null);
      } catch (error: unknown) {
        setCommentsError(getApiErrorMessage(error, 'Could not update comment.'));
        throw error;
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
    <View className="flex-1" style={{ backgroundColor: Colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />

      <View
        className="flex-row items-center border-b px-4 py-3"
        style={{ backgroundColor: Colors.bgCard, borderBottomColor: Colors.borderLight }}>
        <TouchableOpacity
          onPress={() => router.back()}
          className="rounded-full p-1.5"
          activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text className="ml-2 text-lg font-semibold" style={{ color: Colors.text }}>Post</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.cta} />
        </View>
      ) : errorMessage ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-base font-semibold" style={{ color: Colors.text }}>Could not load post</Text>
          <Text className="mt-1 text-center text-sm" style={{ color: Colors.textMuted }}>{errorMessage}</Text>
          <TouchableOpacity
            className="mt-4 rounded-full bg-[#0A7AFF] px-4 py-2 active:opacity-85"
            onPress={() => void loadPost()}>
            <Text className="text-sm font-semibold text-white">Try again</Text>
          </TouchableOpacity>
        </View>
      ) : post ? (
        <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => setIsQuickProfileVisible(true)}
              className="flex-row items-center flex-1"
              activeOpacity={0.75}>
              <Avatar
                uri={post.authorAvatarUrl}
                name={post.authorDisplayName ?? post.authorUsername ?? 'Unknown user'}
                size={40}
              />
              <View className="ml-2.5">
                <Text className="text-sm font-semibold" style={{ color: Colors.text }}>
                  {post.authorDisplayName ?? post.authorUsername ?? 'Unknown user'}
                </Text>
                <Text className="text-xs" style={{ color: Colors.textMuted }}>{formatRelativeTime(post.createdAt)}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => void startPostAiChat(id)}
              className="ml-3 h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: Colors.ctaLight }}
              activeOpacity={0.78}
              disabled={isStartingAiChat}>
              {isStartingAiChat ? (
                <ActivityIndicator size="small" color={Colors.cta} />
              ) : (
                <CustomAiIcon size={18} color={Colors.cta} />
              )}
            </TouchableOpacity>
          </View>

          {post.content?.trim() ? (
            <MentionText content={post.content} style={{ marginTop: 12, fontSize: 16, lineHeight: 24, color: Colors.text }} />
          ) : null}

          <PostMediaGallery mediaUrls={post.mediaUrls} />

          {post.hashtags.length > 0 && (
            <View className="mt-4 flex-row flex-wrap">
              {post.hashtags.map((tag) => (
                <View key={tag} className="mb-2 mr-2 rounded-full px-3 py-1.5" style={{ backgroundColor: Colors.ctaLight }}>
                  <Text className="text-xs font-semibold" style={{ color: Colors.cta }}>#{tag}</Text>
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
            onAddComment={(content, mediaUrls, mentionIds) =>
              void handleSubmitComment(post.id, content, mediaUrls, undefined, mentionIds)
            }
            isSubmittingComment={isSubmittingComment}
          />
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-base font-semibold" style={{ color: Colors.text }}>Post not found</Text>
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
          onEditComment={handleEditComment}
          isSubmittingComment={isSubmittingComment}
        />
      )}

      {post ? (
        <UserQuickProfileDialog
          visible={isQuickProfileVisible}
          userId={post.authorId}
          fallbackDisplayName={post.authorDisplayName ?? post.authorUsername ?? 'Unknown user'}
          fallbackAvatarUrl={post.authorAvatarUrl}
          onClose={() => setIsQuickProfileVisible(false)}
        />
      ) : null}
    </View>
  );
}
