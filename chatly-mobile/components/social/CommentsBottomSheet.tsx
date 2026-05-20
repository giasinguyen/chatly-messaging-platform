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
import type { PostComment } from '@/types/post';
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
    parentCommentId?: string
  ) => void;
  onLikeComment?: (commentId: string, reactionType: string) => void;
  onUnlikeComment?: (commentId: string) => void;
  onDeleteComment?: (commentId: string) => void;
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
}: CommentsBottomSheetProps) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyToUsername, setReplyToUsername] = useState<string | null>(null);
  const pan = useRef(new Animated.ValueXY()).current;
  const scrollViewRef = useRef<ScrollView>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => scrollPosition === 0,
      onMoveShouldSetPanResponder: () => scrollPosition === 0,
      onPanResponderMove: (evt, { dy }) => {
        if (dy > 0 && scrollPosition === 0) {
          pan.y.setValue(dy);
        }
      },
      onPanResponderRelease: (evt, { dy }) => {
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
        {...panResponder.panHandlers}
        style={{
          height: SHEET_HEIGHT,
          transform: [{ translateY: pan.y }],
        }}
        className="bg-white">
        {/* Handle Bar */}
        <View className="items-center py-3">
          <View className="h-1 w-12 rounded-full bg-gray-300" />
        </View>

        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-gray-200 px-4 py-3">
          <Text className="text-lg font-semibold text-[#1D1D1F]">Comments</Text>
          <TouchableOpacity onPress={onClose} className="p-1" activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Comments List */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}>
          <ScrollView
            ref={scrollViewRef}
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
                    setReplyToId(parentId ?? null);
                    setReplyToUsername(username ?? null);
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
                  <Text className="mt-3 text-sm text-[#6E6E73]">No comments yet</Text>
                  <Text className="mt-1 text-center text-xs text-[#6E6E73]">
                    Be the first to comment!
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Comment Input - Sticky at bottom */}
          <CommentInput
            isReply={Boolean(replyToId)}
            replyToUsername={replyToUsername}
            onCancel={() => {
              setReplyToId(null);
              setReplyToUsername(null);
            }}
            onSubmit={(content, mediaUrls) => {
              onAddComment?.(postId, content, mediaUrls, replyToId ?? undefined);
              // reset reply state after submit
              setReplyToId(null);
              setReplyToUsername(null);
            }}
            placeholder={replyToId ? 'Reply...' : 'Add a comment...'}
          />
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}
