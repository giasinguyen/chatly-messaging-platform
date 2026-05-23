import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { CommentList } from '@/components/social/CommentList';
import { CommentInput } from '@/components/social/CommentInput';
import { Colors } from '@/constants/theme';
import type { PostComment, ReactionType } from '@/types/post';

interface PostCommentsSectionProps {
  commentCount: number;
  comments: PostComment[];
  isCommentsLoading: boolean;
  commentsError: string | null;
  onRetry: () => void;
  onOpenComments: () => void;
  onLikeComment: (commentId: string, reactionType: ReactionType) => void;
  onUnlikeComment: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void;
  onAddComment: (content: string, mediaUrls?: string[], mentionIds?: string[]) => void;
  isSubmittingComment: boolean;
}

export function PostCommentsSection({
  commentCount,
  comments,
  isCommentsLoading,
  commentsError,
  onRetry,
  onOpenComments,
  onLikeComment,
  onUnlikeComment,
  onDeleteComment,
  onAddComment,
  isSubmittingComment,
}: PostCommentsSectionProps) {
  return (
    <View className="mt-6 rounded-2xl px-3 py-3" style={{ backgroundColor: Colors.bgCard }}>
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-base font-semibold" style={{ color: Colors.text }}>Comments ({commentCount})</Text>
        {commentsError && (
          <TouchableOpacity onPress={onRetry} activeOpacity={0.75}>
            <Text className="text-sm font-semibold text-[#0A7AFF]">Retry</Text>
          </TouchableOpacity>
        )}
      </View>

      {isCommentsLoading ? (
        <View className="items-center py-6">
          <ActivityIndicator size="small" color={Colors.cta} />
        </View>
      ) : commentsError ? (
        <Text className="mb-3 text-sm" style={{ color: Colors.textMuted }}>{commentsError}</Text>
      ) : (
        <CommentList
          comments={comments}
          maxVisibleCount={5}
          onAddComment={onOpenComments}
          onLikeComment={onLikeComment}
          onUnlikeComment={onUnlikeComment}
          onDeleteComment={onDeleteComment}
        />
      )}

      <View
        className="mt-3 overflow-hidden rounded-xl border"
        style={{ backgroundColor: Colors.bgCard, borderColor: Colors.borderLight }}>
        <CommentInput
          isLoading={isSubmittingComment}
          onSubmit={(content, mediaUrls, mentionIds) => onAddComment(content, mediaUrls, mentionIds)}
        />
      </View>
    </View>
  );
}
