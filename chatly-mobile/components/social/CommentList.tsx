import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { CommentItem } from './CommentItem';
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
  const [expandedReplyGroups, setExpandedReplyGroups] = useState<Set<string>>(new Set());
  const [showAllComments, setShowAllComments] = useState(false);

  // Separate root comments from replies
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

        {/* Replies Section - Hidden by default */}
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

            {/* Hide replies button */}
            <TouchableOpacity
              onPress={() => toggleReplies(comment.id)}
              className="mt-2 py-1 px-2"
              activeOpacity={0.7}
            >
              <Text className="text-xs font-semibold text-[#0071E3]">Hide replies</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (comments.length === 0) {
    return (
      <View className="py-4">
        <Text className="text-sm text-[#6E6E73]">No comments yet. Be the first to comment!</Text>
      </View>
    );
  }

  return (
    <View>
      {/* Comments List */}
      {visibleRootComments.map(renderComment)}

      {/* Show More Comments Button */}
      {!showAllComments && rootComments.length > maxVisibleCount && (
        <TouchableOpacity
          onPress={() => setShowAllComments(true)}
          className="mb-3 py-2"
          activeOpacity={0.7}
        >
          <Text className="text-sm font-semibold text-[#0071E3]">
            View all {rootComments.length} comments
          </Text>
        </TouchableOpacity>
      )}

      {/* Hide Older Comments Button */}
      {showAllComments && rootComments.length > maxVisibleCount && (
        <TouchableOpacity
          onPress={() => setShowAllComments(false)}
          className="mb-3 py-2"
          activeOpacity={0.7}
        >
          <Text className="text-sm font-semibold text-[#6E6E73]">Hide older comments</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
