import type { Post, PostComment, ReportPostRequest } from '@/types/post';
import { PostCardBody } from './PostCardBody';

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
  onEditComment?: (commentId: string, content: string) => void;
  onOpenComments?: (postId: string) => void;
  onSharePost?: (updatedPost: Post) => void;
}

export function HomePostCard(props: HomePostCardProps) {
  const post = props.post;
  const authorName = post.authorDisplayName ?? post.authorUsername ?? 'Unknown user';
  const mediaUrls = post.mediaUrls;

  return (
    <PostCardBody
      post={post}
      comments={props.comments ?? []}
      authorName={authorName}
      authorId={post.authorId}
      avatarUrl={post.authorAvatarUrl}
      isLiked={post.reactions?.some((reaction) => reaction.type === 'LIKE' && reaction.reactedByMe) ?? false}
      isSaved={post.savedByMe ?? false}
      totalLikes={post.reactions?.find((reaction) => reaction.type === 'LIKE')?.count ?? 0}
      mediaUrls={mediaUrls}
      onToggleLikePost={props.onToggleLikePost}
      onDoubleTapLikePost={props.onDoubleTapLikePost}
      onSavePost={props.onSavePost}
      onUnsavePost={props.onUnsavePost}
      onDeletePost={props.onDeletePost}
      onEditPost={props.onEditPost}
      onReportPost={props.onReportPost}
      onAddComment={props.onAddComment}
      onLikeComment={props.onLikeComment}
      onUnlikeComment={props.onUnlikeComment}
      onDeleteComment={props.onDeleteComment}
      onEditComment={props.onEditComment}
      onOpenComments={props.onOpenComments}
      onSharePost={props.onSharePost}
    />
  );
}
