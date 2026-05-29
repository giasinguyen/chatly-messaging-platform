import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CommentItem } from './CommentItem';
import { Colors } from '@/constants/theme';
import type { PostComment, ReactionType } from '@/types/post';

interface CommentListProps {
  comments: PostComment[];
  onAddComment?: (parentCommentId?: string, username?: string) => void;
  onLikeComment?: (commentId: string, reactionType: ReactionType) => void;
  onUnlikeComment?: (commentId: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onEditComment?: (commentId: string, content: string) => void;
  maxVisibleCount?: number;
}

export function CommentList({
  comments,
  onAddComment,
  onLikeComment,
  onUnlikeComment,
  onDeleteComment,
  onEditComment,
  maxVisibleCount = 3,
}: CommentListProps) {
  const { t } = useTranslation();
  const [expandedReplyGroups, setExpandedReplyGroups] = useState<Set<string>>(new Set());
  const [showAllComments, setShowAllComments] = useState(false);

  const { rootComments, repliesByParentId } = useMemo(() => {
    const root: PostComment[] = [];
    const replies: Record<string, PostComment[]> = {};

    comments.forEach((comment) => {
      if (!comment.parentCommentId) {
        root.push(comment);
      } else {
        if (!replies[comment.parentCommentId]) {
          replies[comment.parentCommentId] = [];
        }
        replies[comment.parentCommentId].push(comment);
      }
    });

    return { rootComments: root, repliesByParentId: replies };
  }, [comments]);

  const toggleReplies = (commentId: string) => {
    const newExpanded = new Set(expandedReplyGroups);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedReplyGroups(newExpanded);
  };

  const visibleRootComments = showAllComments
    ? rootComments
    : rootComments.slice(0, maxVisibleCount);

  const renderComment = (comment: PostComment) => {
    const replies = repliesByParentId[comment.id] || [];
    const isExpanded = expandedReplyGroups.has(comment.id);

    return (
      <View key={comment.id} className="mb-2">
        <CommentItem
          comment={comment}
          level={0}
          onReply={(commentId, username) => onAddComment?.(commentId, username)}
          onLike={onLikeComment}
          onUnlike={onUnlikeComment}
          onDelete={onDeleteComment}
          onEdit={onEditComment}
          replyCount={replies.length}
          onShowReplies={() => toggleReplies(comment.id)}
          showRepliesButton={replies.length > 0 && !isExpanded}
        />

        {isExpanded && replies.length > 0 && (
          <View className="mt-1">
            {replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                level={1}
                onReply={(commentId, username) => onAddComment?.(commentId, username)}
                onLike={onLikeComment}
                onUnlike={onUnlikeComment}
                onDelete={onDeleteComment}
                onEdit={onEditComment}
              />
            ))}

            <TouchableOpacity
              onPress={() => toggleReplies(comment.id)}
              className="mt-2 px-2 py-1"
              activeOpacity={0.7}>
              <Text className="text-xs font-semibold text-[#0071E3]">
                {t('post.hide_replies')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (comments.length === 0) {
    return (
      <View className="py-4">
        <Text className="text-sm" style={{ color: Colors.textMuted }}>
          {t('post.no_comments')}
        </Text>
      </View>
    );
  }

  return (
    <View>
      {visibleRootComments.map(renderComment)}

      {!showAllComments && rootComments.length > maxVisibleCount && (
        <TouchableOpacity
          onPress={() => setShowAllComments(true)}
          className="mb-3 py-2"
          activeOpacity={0.7}>
          <Text className="text-sm font-semibold text-[#0071E3]">
            {t('post.view_all_comments', { count: rootComments.length })}
          </Text>
        </TouchableOpacity>
      )}

      {showAllComments && rootComments.length > maxVisibleCount && (
        <TouchableOpacity
          onPress={() => setShowAllComments(false)}
          className="mb-3 py-2"
          activeOpacity={0.7}>
          <Text className="text-sm font-semibold" style={{ color: Colors.textMuted }}>
            {t('post.hide_older_comments')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
