import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { CustomAiIcon } from '@/components/ui/CustomAiIcon';
import { ImageLightbox } from '@/components/ui/ImageLightbox';
import { UserQuickProfileDialog } from '@/components/profile/UserQuickProfileDialog';
import usePostAiChatStarter from '@/hooks/useStartPostAiChat';
import { useAuthStore } from '@/store/auth.store';
import { CommentsBottomSheet } from './CommentsBottomSheet';
import { PostCardMenu } from './PostCardMenu';
import { PostImageCarousel } from './PostImageCarousel';
import { ReportPostModal } from './ReportPostModal';
import { SharePostDialog } from './SharePostDialog';
import { MentionText } from '@/components/mention/MentionText';
import { Colors } from '@/constants/theme';
import type { Post, PostComment, ReportPostRequest } from '@/types/post';
import { formatCompactCount, formatRelativeTime } from '@/utils/socialFormat';

interface PostCardBodyProps {
  post: Post;
  comments: PostComment[];
  authorName: string;
  authorId: string;
  avatarUrl?: string;
  isLiked: boolean;
  isSaved: boolean;
  totalLikes: number;
  mediaUrls: string[];
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
    parentCommentId?: string,
    mentionIds?: string[]
  ) => void;
  onLikeComment?: (commentId: string, reactionType: string) => void;
  onUnlikeComment?: (commentId: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onEditComment?: (commentId: string, content: string, mentionIds?: string[]) => void;
  onOpenComments?: (postId: string) => void;
  onSharePost?: (updatedPost: Post) => void;
}

const CAPTION_COLLAPSE_THRESHOLD = 160;

export function PostCardBody({
  post,
  comments,
  authorName,
  authorId,
  avatarUrl,
  isLiked,
  isSaved,
  totalLikes,
  mediaUrls,
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
  onEditComment,
  onOpenComments,
  onSharePost,
}: PostCardBodyProps) {
  const router = useRouter();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showQuickProfile, setShowQuickProfile] = useState(false);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const { isStartingAiChat, startPostAiChat } = usePostAiChatStarter();

  const hasLongCaption = (post.content?.trim().length ?? 0) > CAPTION_COLLAPSE_THRESHOLD;
  const isOwnPost = currentUserId === authorId;

  const handleOpenAuthorProfile = () => {
    router.push(`/profile/${authorId}`);
  };

  const handleSave = () => {
    if (isSaved) {
      onUnsavePost?.(post.id);
    } else {
      onSavePost?.(post.id);
    }
  };

  const handleShare = () => {
    setShowShareDialog(true);
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

  const handleOpenMediaViewer = (index: number) => {
    setMediaViewerIndex(index);
    setShowMediaViewer(true);
  };

  return (
    <>
      <View className="mb-4 bg-white">
        <View className="flex-row items-center justify-between px-3 py-2.5">
          <TouchableOpacity
            onPress={() => setShowQuickProfile(true)}
            className="flex-row items-center"
            activeOpacity={0.75}>
            <Avatar uri={avatarUrl} name={authorName} size={38} />
            <View className="ml-2.5">
              <Text className="text-sm font-semibold text-[#1D1D1F]">{authorName}</Text>
              <Text className="text-xs text-[#6E6E73]">{formatRelativeTime(post.createdAt)}</Text>
            </View>
          </TouchableOpacity>

          <View className="flex-row items-center gap-1">
            <TouchableOpacity
              onPress={() => void startPostAiChat(post.id)}
              className="h-9 w-9 items-center justify-center rounded-full bg-[#EEF5FF]"
              activeOpacity={0.75}
              disabled={isStartingAiChat}>
              {isStartingAiChat ? (
                <Ionicons name="hourglass-outline" size={16} color={Colors.cta} />
              ) : (
                <CustomAiIcon size={16} color={Colors.cta} />
              )}
            </TouchableOpacity>

            <View className="relative">
              <TouchableOpacity
                onPress={() => setShowMenu((current) => !current)}
                className="p-1.5"
                activeOpacity={0.7}>
                <Ionicons name="ellipsis-horizontal" size={18} color={Colors.textMuted} />
              </TouchableOpacity>

              {showMenu ? (
                <PostCardMenu
                  isOwnPost={isOwnPost}
                  onEdit={() => {
                    onEditPost?.(post.id);
                    setShowMenu(false);
                  }}
                  onDelete={() => {
                    onDeletePost?.(post.id);
                    setShowMenu(false);
                  }}
                  onReport={() => {
                    setShowMenu(false);
                    setShowReportModal(true);
                  }}
                />
              ) : null}
            </View>
          </View>
        </View>

        {mediaUrls.length > 0 ? (
          <PostImageCarousel
            images={mediaUrls}
            onDoubleTap={() => onDoubleTapLikePost?.(post.id)}
            onPressImage={handleOpenMediaViewer}
          />
        ) : null}

        <View className="px-3 pb-3 pt-2">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-4">
              <TouchableOpacity onPress={() => onToggleLikePost?.(post.id)} className="p-1" activeOpacity={0.7}>
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={24}
                  color={isLiked ? '#FF3B30' : Colors.text}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowComments(true)} className="p-1" activeOpacity={0.7}>
                <Ionicons name="chatbubble-outline" size={22} color={Colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShare} className="p-1" activeOpacity={0.7}>
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

          <Text className="mt-1 text-sm font-semibold text-[#1D1D1F]">
            {formatCompactCount(totalLikes)} likes
          </Text>

          <Text
            className="mt-1 text-sm leading-5 text-[#1D1D1F]"
            numberOfLines={isCaptionExpanded ? undefined : 3}>
            <Text className="font-semibold" onPress={handleOpenAuthorProfile}>
              {authorName}{' '}
            </Text>
            <MentionText content={post.content || 'No caption'} />
          </Text>

          {hasLongCaption && (
            <TouchableOpacity
              onPress={() => setIsCaptionExpanded((current) => !current)}
              activeOpacity={0.7}>
              <Text className="mt-1 text-sm font-semibold text-[#0071E3]">
                {isCaptionExpanded ? 'Hide' : 'View more'}
              </Text>
            </TouchableOpacity>
          )}

          {post.commentCount > 0 && (
            <TouchableOpacity onPress={() => setShowComments(true)} activeOpacity={0.7}>
              <Text className="mt-1 text-sm text-[#6E6E73]">
                View all {formatCompactCount(post.commentCount)} comments
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

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
        onEditComment={async (_postId, commentId, content, mentionIds) => onEditComment?.(commentId, content, mentionIds)}
      />

      <ReportPostModal
        visible={showReportModal}
        isSubmitting={isSubmittingReport}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleSubmitReport}
      />

      <SharePostDialog
        post={post}
        visible={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        onShared={onSharePost}
      />

      <ImageLightbox
        images={mediaUrls}
        initialIndex={mediaViewerIndex}
        visible={showMediaViewer}
        onClose={() => setShowMediaViewer(false)}
      />

      <UserQuickProfileDialog
        visible={showQuickProfile}
        userId={authorId}
        fallbackDisplayName={authorName}
        fallbackAvatarUrl={avatarUrl}
        onClose={() => setShowQuickProfile(false)}
      />
    </>
  );
}