import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { Alert, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { UserQuickProfileDialog } from '@/components/profile/UserQuickProfileDialog';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/theme';
import type { PostComment, ReactionType } from '@/types/post';

interface CommentItemProps {
  comment: PostComment;
  level?: number;
  onReply?: (commentId: string, authorUsername?: string) => void;
  onLike?: (commentId: string, reactionType: ReactionType) => void;
  onUnlike?: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  onEdit?: (commentId: string, content: string) => void;
  replyCount?: number;
  onShowReplies?: (commentId: string) => void;
  showRepliesButton?: boolean;
}

function formatRelativeTime(createdAt: string): string {
  const diffMinutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

function formatCount(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return `${value}`;
}

// Parse mentions (@username) in text and return components with bold mentions
function renderContentWithMentions(content: string) {
  const mentionRegex = /@([\w._]+)/g;
  const parts: Array<{ type: 'text' | 'mention'; value: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'mention', value: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', value: content.slice(lastIndex) });
  }

  if (parts.length === 0) {
    return (
      <Text style={{ marginTop: 0, fontSize: 13, lineHeight: 20, color: '#1D1D1F' }}>
        {content}
      </Text>
    );
  }

  return (
    <Text style={{ marginTop: 0, fontSize: 13, lineHeight: 20, color: '#1D1D1F' }}>
      {parts.map((part, idx) =>
        part.type === 'mention' ? (
          <Text key={idx} style={{ fontWeight: '700', color: '#1D1D1F' }}>
            {part.value}
          </Text>
        ) : (
          <Text key={idx}>{part.value}</Text>
        )
      )}
    </Text>
  );
}

export function CommentItem({
  comment,
  level = 0,
  onReply,
  onLike,
  onUnlike,
  onDelete,
  onEdit,
  replyCount = 0,
  onShowReplies,
  showRepliesButton = false,
}: CommentItemProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showQuickProfile, setShowQuickProfile] = useState(false);
  const currentUser = useAuthStore((s) => s.user);
  const authorName = comment.userDisplayName ?? comment.userUsername ?? 'Unknown user';
  const avatarUrl = comment.userAvatarUrl;
  const totalReactions = comment.reactions?.reduce((sum, r) => sum + r.count, 0) ?? 0;
  const userReaction = comment.reactions?.find((r) => r.reactedByMe);
  const leftPadding = level > 0 ? level * 16 : 0;
  const isAuthor = currentUser?.id === comment.userId;
  const hasMenuActions = Boolean((isAuthor && (onDelete || onEdit)) || comment.content.trim());
  const handleOpenAuthorProfile = () => {
    router.push(`/profile/${comment.userId}`);
  };

  const handleCopyComment = async () => {
    const text = comment.content.trim();
    if (!text) {
      Alert.alert('Nothing to copy', 'This comment does not contain text.');
      return;
    }

    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', 'Comment copied to clipboard.');
    setShowMenu(false);
  };

  return (
    <View style={{ paddingLeft: leftPadding }} className="mb-3 border-l border-gray-200">
      {level > 0 && <View className="absolute bottom-0 left-0 top-0 w-px bg-gray-200" />}

      <View className="flex-row gap-2 px-2">
        <TouchableOpacity onPress={() => setShowQuickProfile(true)} activeOpacity={0.75}>
          <Avatar uri={avatarUrl} name={authorName} size={30} />
        </TouchableOpacity>

        <View className="flex-1">
          {/* Header: Name, Time, Menu */}
          <View className="flex-row items-center justify-between">
            <View style={{ flex: 1 }}>
              <Text
                numberOfLines={1}
                onPress={handleOpenAuthorProfile}
                style={{ fontSize: 13, fontWeight: '700', color: '#1D1D1F' }}>
                {authorName}
              </Text>
            </View>

            <View className="flex-row items-center gap-1">
              <Text style={{ fontSize: 11, color: '#6E6E73' }}>
                {formatRelativeTime(comment.createdAt)}
              </Text>

              {hasMenuActions ? (
                <TouchableOpacity
                  onPress={() => setShowMenu(!showMenu)}
                  className="p-1"
                  activeOpacity={0.7}>
                  <Ionicons name="ellipsis-horizontal" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">{renderContentWithMentions(comment.content)}</View>

            <TouchableOpacity
              onPress={() => {
                if (userReaction) {
                  onUnlike?.(comment.id);
                } else {
                  onLike?.(comment.id, 'LIKE');
                }
              }}
              className="flex-row items-center gap-1"
              activeOpacity={0.7}>
              <Ionicons name={userReaction ? 'heart' : 'heart-outline'} size={17} color="#FF3B30" />
            </TouchableOpacity>
          </View>

          {/* Media Preview */}
          {comment.mediaUrls && comment.mediaUrls.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
              <View className="flex-row gap-2">
                {comment.mediaUrls.map((url, idx) => (
                  <Image
                    key={`${comment.id}-media-${idx}`}
                    source={{ uri: url }}
                    contentFit="cover"
                    transition={100}
                    style={{ width: 120, height: 120, borderRadius: 8 }}
                  />
                ))}
              </View>
            </ScrollView>
          )}

          {/* Actions: Reply */}
          <View className="mt-2 flex-row items-center gap-4">
            <TouchableOpacity
              onPress={() => onReply?.(comment.id, comment.userUsername)}
              className="flex-row items-center gap-1"
              activeOpacity={0.7}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#6E6E73' }}>Reply</Text>
            </TouchableOpacity>
          </View>

          {/* Show Replies Button */}
          {showRepliesButton && replyCount > 0 && (
            <TouchableOpacity
              onPress={() => onShowReplies?.(comment.id)}
              className="mt-2 py-1"
              activeOpacity={0.7}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#0071E3' }}>
                View {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Menu Dropdown */}
          {showMenu && (
            <View className="absolute right-0 top-10 z-50 w-40 rounded-lg border border-gray-200 bg-white shadow-sm">
              {isAuthor && onDelete ? (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      onDelete?.(comment.id);
                      setShowMenu(false);
                    }}
                    style={{
                      borderBottomWidth: 1,
                      borderBottomColor: '#f3f4f6',
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                    activeOpacity={0.7}>
                    <Ionicons name="trash-outline" size={14} color="#FF3B30" />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#FF3B30' }}>
                      Delete
                    </Text>
                  </TouchableOpacity>

                  {onEdit ? (
                    <TouchableOpacity
                      onPress={() => {
                        onEdit(comment.id, comment.content);
                        setShowMenu(false);
                      }}
                      style={{
                        borderBottomWidth: 1,
                        borderBottomColor: '#f3f4f6',
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                      }}
                      activeOpacity={0.7}>
                      <Ionicons name="pencil-outline" size={14} color={Colors.text} />
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#1D1D1F' }}>
                        Edit
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </>
              ) : null}

              <TouchableOpacity
                onPress={() => void handleCopyComment()}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
                activeOpacity={0.7}>
                <Ionicons name="copy-outline" size={14} color={Colors.text} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1D1D1F' }}>Copy</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <UserQuickProfileDialog
        visible={showQuickProfile}
        userId={comment.userId}
        fallbackDisplayName={authorName}
        fallbackAvatarUrl={avatarUrl}
        onClose={() => setShowQuickProfile(false)}
      />
    </View>
  );
}
