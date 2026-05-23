import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommentList } from './CommentList';
import { CommentInput } from './CommentInput';
import type { PostComment, ReactionType } from '@/types/post';
import { Colors } from '@/constants/theme';

interface CommentsBottomSheetProps {
  visible: boolean;
  postId: string;
  comments: PostComment[];
  commentCount: number;
  onClose: () => void;
  onOpen?: (postId: string) => void;
  onAddComment?: (
    postId: string,
    content: string,
    mediaUrls?: string[],
    parentCommentId?: string,
    mentionIds?: string[]
  ) => void | Promise<void>;
  onLikeComment?: (commentId: string, reactionType: ReactionType) => void;
  onUnlikeComment?: (commentId: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onEditComment?: (postId: string, commentId: string, content: string, mentionIds?: string[]) => void | Promise<void>;
  isSubmittingComment?: boolean;
}

const { height: screenHeight } = Dimensions.get('window');
const SHEET_HEIGHT = screenHeight * 0.9;
const DRAG_THRESHOLD = 50;

export function CommentsBottomSheet({
  visible,
  postId,
  comments,
  commentCount,
  onClose,
  onOpen,
  onAddComment,
  onLikeComment,
  onUnlikeComment,
  onDeleteComment,
  onEditComment,
  isSubmittingComment = false,
}: CommentsBottomSheetProps) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyToUsername, setReplyToUsername] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const pan = useRef(new Animated.ValueXY()).current;
  const scrollViewRef = useRef<ScrollView>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) => {
        if (scrollPosition > 0) return false;
        const isVerticalDrag = Math.abs(dy) > Math.abs(dx);
        return isVerticalDrag && dy > 6;
      },
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0 && scrollPosition === 0) {
          pan.y.setValue(dy);
        }
      },
      onPanResponderRelease: (_, { dy }) => {
        if (dy > DRAG_THRESHOLD) {
          onClose();
          pan.y.setValue(0);
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      onOpen?.(postId);
    } else {
      pan.y.setValue(0);
      setReplyToId(null);
      setReplyToUsername(null);
      setEditingCommentId(null);
      setEditingContent('');
    }
  }, [visible, postId, onOpen, pan.y]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Backdrop */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
      />

      {/* Bottom Sheet */}
      <Animated.View
        style={{
          height: SHEET_HEIGHT,
          transform: [{ translateY: pan.y }],
          backgroundColor: Colors.bgCard,
        }}>
        {/* Handle Bar */}
        <View className="items-center py-3" {...panResponder.panHandlers}>
          <View className="h-1 w-12 rounded-full" style={{ backgroundColor: Colors.borderLight }} />
        </View>

        {/* Header */}
        <View className="flex-row items-center justify-between border-b px-4 py-3" style={{ borderBottomColor: Colors.borderLight }}>
          <Text className="text-lg font-semibold" style={{ color: Colors.text }}>Comments</Text>
          <TouchableOpacity onPress={onClose} className="p-1" activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Comments List */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
          style={{ flex: 1 }}>
          <ScrollView
            ref={scrollViewRef}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            scrollEventThrottle={16}
            onScroll={(evt) => {
              const offsetY = evt.nativeEvent.contentOffset.y;
              setScrollPosition(offsetY);
            }}
            className="flex-1"
            showsVerticalScrollIndicator={true}>
            <View className="px-3 py-3">
              {comments.length > 0 ? (
                <CommentList
                  comments={comments}
                  onAddComment={(parentId?: string, username?: string) => {
                    setEditingCommentId(null);
                    setEditingContent('');
                    setReplyToId(parentId ?? null);
                    setReplyToUsername(username ?? null);
                  }}
                  onEditComment={(commentId, content) => {
                    setReplyToId(null);
                    setReplyToUsername(null);
                    setEditingCommentId(commentId);
                    setEditingContent(content);
                  }}
                  onLikeComment={(commentId, reactionType) =>
                    onLikeComment?.(commentId, reactionType)
                  }
                  onUnlikeComment={onUnlikeComment}
                  onDeleteComment={onDeleteComment}
                  maxVisibleCount={999} // Show all comments in bottom sheet
                />
              ) : (
                <View className="items-center py-8">
                  <Ionicons name="chatbubble-outline" size={48} color={Colors.textMuted} />
                  <Text className="mt-3 text-sm" style={{ color: Colors.textMuted }}>No comments yet</Text>
                  <Text className="mt-1 text-center text-xs" style={{ color: Colors.textMuted }}>
                    Be the first to comment!
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Comment Input - Sticky at bottom */}
          <CommentInput
            isReply={Boolean(replyToId)}
            isEditing={Boolean(editingCommentId)}
            replyToUsername={replyToUsername}
            initialContent={editingContent}
            isLoading={isSubmittingComment}
            onCancel={() => {
              setReplyToId(null);
              setReplyToUsername(null);
              setEditingCommentId(null);
              setEditingContent('');
            }}
            onSubmit={async (content, mediaUrls, mentionIds) => {
              if (editingCommentId) {
                await onEditComment?.(postId, editingCommentId, content, mentionIds);
                setEditingCommentId(null);
                setEditingContent('');
                return;
              }

              await onAddComment?.(postId, content, mediaUrls, replyToId ?? undefined, mentionIds);
              setReplyToId(null);
              setReplyToUsername(null);
            }}
            placeholder={editingCommentId ? 'Edit comment...' : replyToId ? 'Reply...' : 'Add a comment...'}
          />
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}
