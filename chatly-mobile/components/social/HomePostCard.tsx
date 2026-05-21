import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Colors } from '@/constants/theme';
import { CommentsBottomSheet } from './CommentsBottomSheet';
import { PostImageCarousel } from './PostImageCarousel';
import { ReportPostModal } from './ReportPostModal';
import type { Post, PostComment, ReportPostRequest } from '@/types/post';

interface HomePostCardProps {
  post: Post;
  comments?: PostComment[];
  onToggleLikePost?: (postId: string) => void;
  onDoubleTapLikePost?: (postId: string) => void;
  onSavePost?: (postId: string) => void;
  onUnsavePost?: (postId: string) => void;
  onDeletePost?: (postId: string) => void;
  onEditPost?: (postId: string) => void;
  onReportPost?: (postId: string, payload: ReportPostRequest) => Promise<void> | void;
  onAddComment?: (
    postId: string,
    content: string,
    mediaUrls?: string[],
    parentCommentId?: string
  ) => void;
  onLikeComment?: (commentId: string, reactionType: string) => void;
  onUnlikeComment?: (commentId: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onOpenComments?: (postId: string) => void;
}

const FALLBACK_AVATAR = 'https://i.pravatar.cc/140?img=30';
const FALLBACK_MEDIA = 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200';

function formatCount(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return `${value}`;
}

function formatRelativeTime(createdAt: string): string {
  const diffMinutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function HomePostCard({
  post,
  comments = [],
  onToggleLikePost,
  onDoubleTapLikePost,
  onSavePost,
  onUnsavePost,
  onDeletePost,
  onEditPost,
  onReportPost,
  onAddComment,
  onLikeComment,
  onUnlikeComment,
  onDeleteComment,
  onOpenComments,
}: HomePostCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const authorName = post.authorDisplayName ?? post.authorUsername ?? 'Unknown user';
  const avatarUrl = post.authorAvatarUrl ?? FALLBACK_AVATAR;
  const likeSummary = post.reactions?.find((reaction) => reaction.type === 'LIKE');
  const isLiked = likeSummary?.reactedByMe ?? false;
  const isSaved = post.savedByMe ?? false;
  const totalLikes = likeSummary?.count ?? 0;

  const handleLike = () => {
    onToggleLikePost?.(post.id);
  };

  const handleDoubleTapLike = () => {
    onDoubleTapLikePost?.(post.id);
  };

  const handleSave = () => {
    if (isSaved) {
      onUnsavePost?.(post.id);
    } else {
      onSavePost?.(post.id);
    }
  };

  const handleSubmitReport = async (payload: ReportPostRequest) => {
    if (isSubmittingReport) return;
    setIsSubmittingReport(true);
    try {
      await onReportPost?.(post.id, payload);
      setShowReportModal(false);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <>
      <View className="mb-4 bg-white">
        {/* Header: Author Info + Menu */}
        <View className="flex-row items-center justify-between px-3 py-2.5">
          <View className="flex-row items-center">
            <Image
              source={{ uri: avatarUrl }}
              contentFit="cover"
              transition={120}
              style={{ width: 38, height: 38, borderRadius: 999 }}
            />
            <View className="ml-2.5">
              <Text className="text-sm font-semibold text-[#1D1D1F]">{authorName}</Text>
              <Text className="text-xs text-[#6E6E73]">{formatRelativeTime(post.createdAt)}</Text>
            </View>
          </View>

          <View className="relative">
            <TouchableOpacity
              onPress={() => setShowMenu(!showMenu)}
              className="p-1.5"
              activeOpacity={0.7}>
              <Ionicons name="ellipsis-horizontal" size={18} color={Colors.textMuted} />
            </TouchableOpacity>

            {/* Menu Dropdown */}
            {showMenu && (
              <View className="absolute right-0 top-10 z-50 w-44 rounded-lg border border-gray-200 bg-white shadow-sm">
                <TouchableOpacity
                  onPress={() => {
                    onEditPost?.(post.id);
                    setShowMenu(false);
                  }}
                  className="flex-row items-center gap-2 border-b border-gray-100 px-3 py-2.5"
                  activeOpacity={0.7}>
                  <Ionicons name="pencil-outline" size={16} color={Colors.text} />
                  <Text className="text-sm font-medium text-[#1D1D1F]">Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    onDeletePost?.(post.id);
                    setShowMenu(false);
                  }}
                  className="flex-row items-center gap-2 border-b border-gray-100 px-3 py-2.5"
                  activeOpacity={0.7}>
                  <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                  <Text className="text-sm font-medium text-[#FF3B30]">Delete</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    handleSave();
                    setShowMenu(false);
                  }}
                  className="flex-row items-center gap-2 border-b border-gray-100 px-3 py-2.5"
                  activeOpacity={0.7}>
                  <Ionicons
                    name={isSaved ? 'bookmark' : 'bookmark-outline'}
                    size={16}
                    color={isSaved ? '#0071E3' : Colors.text}
                  />
                  <Text
                    className="text-sm font-medium"
                    style={{ color: isSaved ? '#0071E3' : Colors.text }}>
                    {isSaved ? 'Saved' : 'Save post'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setShowMenu(false);
                    setShowReportModal(true);
                  }}
                  className="flex-row items-center gap-2 px-3 py-2.5"
                  activeOpacity={0.7}>
                  <Ionicons name="flag-outline" size={16} color={Colors.text} />
                  <Text className="text-sm font-medium text-[#1D1D1F]">Report</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Post Image Carousel */}
        <PostImageCarousel
          images={post.mediaUrls && post.mediaUrls.length > 0 ? post.mediaUrls : [FALLBACK_MEDIA]}
          onDoubleTap={handleDoubleTapLike}
        />

        {/* Post Actions & Caption */}
        <View className="px-3 pb-3 pt-2">
          {/* Action Buttons */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-4">
              <TouchableOpacity onPress={handleLike} className="p-1" activeOpacity={0.7}>
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={24}
                  color={isLiked ? '#FF3B30' : Colors.text}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowComments(true)}
                className="p-1"
                activeOpacity={0.7}>
                <Ionicons name="chatbubble-outline" size={22} color={Colors.text} />
              </TouchableOpacity>
              <TouchableOpacity className="p-1" activeOpacity={0.7}>
                <Ionicons name="paper-plane-outline" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={handleSave} className="p-1" activeOpacity={0.7}>
              <Ionicons
                name={isSaved ? 'bookmark' : 'bookmark-outline'}
                size={22}
                color={isSaved ? '#0071E3' : Colors.text}
              />
            </TouchableOpacity>
          </View>

          {/* Likes Count */}
          <Text className="mt-1 text-sm font-semibold text-[#1D1D1F]">
            {formatCount(totalLikes)} likes
          </Text>

          {/* Caption */}
          <Text className="mt-1 text-sm leading-5 text-[#1D1D1F]">
            <Text className="font-semibold">{authorName} </Text>
            {post.content || 'No caption'}
          </Text>

          {/* Comments Count */}
          {post.commentCount > 0 && (
            <TouchableOpacity onPress={() => setShowComments(true)} activeOpacity={0.7}>
              <Text className="mt-1 text-sm text-[#6E6E73]">
                View all {formatCount(post.commentCount)} comments
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Comments Bottom Sheet Modal */}
      <CommentsBottomSheet
        visible={showComments}
        postId={post.id}
        comments={comments}
        commentCount={post.commentCount}
        onClose={() => setShowComments(false)}
        onOpen={onOpenComments}
        onAddComment={onAddComment}
        onLikeComment={(commentId, reactionType) => onLikeComment?.(commentId, reactionType)}
        onUnlikeComment={(commentId) => onUnlikeComment?.(commentId)}
        onDeleteComment={(commentId) => onDeleteComment?.(commentId)}
      />

      <ReportPostModal
        visible={showReportModal}
        isSubmitting={isSubmittingReport}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleSubmitReport}
      />
    </>
  );
}
