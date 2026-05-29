import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { reelService } from '@/services/reel.service';
import type { PostComment } from '@/types/post';
import type { Reel } from '@/types/reel';
import { getApiErrorMessage } from '@/utils/errorHandler';

interface ReelCommentsModalProps {
  reel: Reel | null;
  visible: boolean;
  onClose: () => void;
  onCommentAdded: (reelId: string) => void;
}

interface CommentNode extends PostComment {
  children: CommentNode[];
}

export function ReelCommentsModal({
  reel,
  visible,
  onClose,
  onCommentAdded,
}: ReelCommentsModalProps) {
  const { t } = useTranslation();
  const [comments, setComments] = useState<PostComment[]>([]);
  const [draft, setDraft] = useState('');
  const [replyToComment, setReplyToComment] = useState<PostComment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible || !reel) return;

    const loadComments = async () => {
      setIsLoading(true);
      try {
        const response = await reelService.getComments(reel.id);
        if (response.code === 1000 && response.result) {
          setComments(response.result);
        }
      } catch (error: unknown) {
        Alert.alert(t('errors.request_failed'), getApiErrorMessage(error, t('mobile.reels.load_comments_failed')));
      } finally {
        setIsLoading(false);
      }
    };

    void loadComments();
  }, [visible, reel]);

  const handleSubmit = async () => {
    if (!reel || !draft.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await reelService.addComment(reel.id, {
        content: draft.trim(),
        mediaUrls: [],
        parentCommentId: replyToComment?.id ?? undefined,
      });

      if (response.code === 1000 && response.result) {
        setComments((current) => [response.result, ...current]);
        setDraft('');
        setReplyToComment(null);
        onCommentAdded(reel.id);
      }
    } catch (error: unknown) {
      Alert.alert(t('errors.request_failed'), getApiErrorMessage(error, t('mobile.reels.post_comment_failed')));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = (comment: PostComment) => {
    setReplyToComment(comment);
    const mention = `@${comment.userUsername ?? comment.userDisplayName} `;
    setDraft((current) => (current.startsWith(mention) ? current : mention + current));
    inputRef.current?.focus();
  };

  const handleToggleCommentLike = async (comment: PostComment) => {
    if (!reel) return;
    try {
      const hasReacted = comment.reactions?.some((reaction) => reaction.reactedByMe);
      const response = hasReacted
        ? await reelService.removeCommentReaction(reel.id, comment.id)
        : await reelService.reactToComment(reel.id, comment.id);

      if (response.code === 1000 && response.result) {
        setComments((current) =>
          current.map((item) => (item.id === comment.id ? response.result : item))
        );
      }
    } catch (error: unknown) {
      Alert.alert(t('errors.request_failed'), getApiErrorMessage(error, t('mobile.reels.toggle_like_failed')));
    }
  };

  const commentTree = buildCommentTree(comments);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        {/* Backdrop Pressable */}
        <TouchableOpacity activeOpacity={1} onPress={onClose} className="absolute inset-0" />

        {/* Content Sheet */}
        <View className="bg-white rounded-t-3xl h-[75%] w-full overflow-hidden">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
            <Text className="text-lg font-bold text-gray-900">{t('mobile.reels.comments_title')}</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} className="p-1">
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {/* List Area */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            className="flex-1">
            {isLoading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color={Colors.cta} />
              </View>
            ) : comments.length === 0 ? (
              <View className="flex-1 items-center justify-center p-6">
                <Text className="text-[#6E6E73] text-sm">{t('mobile.reels.no_comments')}</Text>
                <Text className="text-[#6E6E73] text-xs mt-1">{t('mobile.reels.be_first_comment')}</Text>
              </View>
            ) : (
              <FlatList
                data={commentTree}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <CommentNodeView
                    comment={item}
                    depth={0}
                    onReply={handleReply}
                    onToggleLike={handleToggleCommentLike}
                    replyLabel={t('mobile.reels.reply')}
                    userFallback={t('mobile.reels.chatly_user')}
                  />
                )}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
                showsVerticalScrollIndicator={false}
              />
            )}

            {/* Input bar */}
            <View className="border-t border-gray-200 bg-white p-3 pb-6">
              {replyToComment ? (
                <View className="flex-row items-center justify-between bg-gray-100 rounded-lg px-3 py-1.5 mb-2">
                  <Text className="text-xs text-gray-600">
                    {t('mobile.reels.replying_to', {
                      name: replyToComment.userDisplayName ?? replyToComment.userUsername ?? '',
                    })}
                  </Text>
                  <TouchableOpacity onPress={() => setReplyToComment(null)} activeOpacity={0.7}>
                    <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : null}

              <View className="flex-row items-center gap-2">
                <TextInput
                  ref={inputRef}
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={t('mobile.reels.add_comment_placeholder')}
                  multiline
                  maxLength={500}
                  className="flex-1 bg-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-900 max-h-20"
                />
                <TouchableOpacity
                  disabled={!draft.trim() || isSubmitting}
                  onPress={handleSubmit}
                  activeOpacity={0.7}
                  className={`h-10 w-10 rounded-full items-center justify-center ${
                    !draft.trim() || isSubmitting ? 'bg-gray-100' : 'bg-blue-500'
                  }`}>
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={Colors.textMuted} />
                  ) : (
                    <Ionicons
                      name="send"
                      size={18}
                      color={!draft.trim() || isSubmitting ? Colors.textMuted : Colors.white}
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}

function CommentNodeView({
  comment,
  depth,
  onReply,
  onToggleLike,
  replyLabel,
  userFallback,
}: {
  comment: CommentNode;
  depth: number;
  onReply: (comment: PostComment) => void;
  onToggleLike: (comment: PostComment) => void;
  replyLabel: string;
  userFallback: string;
}) {
  const label = comment.userDisplayName ?? comment.userUsername ?? userFallback;
  const reactionCount = comment.reactions?.reduce((sum, reaction) => sum + reaction.count, 0) ?? 0;
  const isLiked = comment.reactions?.some((reaction) => reaction.reactedByMe) ?? false;

  return (
    <View style={{ marginLeft: depth > 0 ? 32 : 0 }} className="mb-4">
      <View className="flex-row items-start gap-3">
        {/* Avatar */}
        <View className="h-8 w-8 rounded-full overflow-hidden bg-gray-200 border border-gray-100">
          {comment.userAvatarUrl ? (
            <Image
              source={{ uri: comment.userAvatarUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center bg-gray-400">
              <Text className="text-white text-xs font-semibold">
                {label.slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Content Box */}
        <View className="flex-1">
          <View className="bg-gray-100 rounded-2xl px-3 py-2">
            <Text className="text-xs font-bold text-gray-800">{label}</Text>
            <Text className="text-sm text-gray-900 mt-0.5 leading-5">{comment.content}</Text>
          </View>

          {/* Action Row */}
          <View className="flex-row items-center gap-4 mt-1.5 ml-1">
            <TouchableOpacity
              onPress={() => onToggleLike(comment)}
              activeOpacity={0.7}
              className="flex-row items-center gap-1">
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={14}
                color={isLiked ? '#FF3B30' : Colors.textMuted}
              />
              {reactionCount > 0 ? (
                <Text className={`text-xs ${isLiked ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                  {reactionCount}
                </Text>
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onReply(comment)}
              activeOpacity={0.7}
              className="flex-row items-center gap-1">
              <Ionicons name="chatbubble-outline" size={13} color={Colors.textMuted} />
              <Text className="text-xs text-gray-500">{replyLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Children replies */}
      {comment.children.map((child) => (
        <CommentNodeView
          key={child.id}
          comment={child}
          depth={depth + 1}
          onReply={onReply}
          onToggleLike={onToggleLike}
          replyLabel={replyLabel}
          userFallback={userFallback}
        />
      ))}
    </View>
  );
}

function buildCommentTree(comments: PostComment[]): CommentNode[] {
  const nodeMap = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  comments.forEach((comment) => {
    nodeMap.set(comment.id, { ...comment, children: [] });
  });

  nodeMap.forEach((node) => {
    if (node.parentCommentId && nodeMap.has(node.parentCommentId)) {
      nodeMap.get(node.parentCommentId)?.children.push(node);
      return;
    }
    roots.push(node);
  });

  return roots.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
