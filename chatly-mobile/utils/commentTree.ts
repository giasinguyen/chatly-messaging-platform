import type { PostComment } from '@/types/post';

function collectDescendantIds(comments: PostComment[], rootCommentId: string): Set<string> {
  const idsToRemove = new Set([rootCommentId]);
  let changed = true;

  while (changed) {
    changed = false;

    comments.forEach((comment) => {
      if (comment.parentCommentId && idsToRemove.has(comment.parentCommentId) && !idsToRemove.has(comment.id)) {
        idsToRemove.add(comment.id);
        changed = true;
      }
    });
  }

  return idsToRemove;
}

export function removeCommentBranch(comments: PostComment[], commentId: string): PostComment[] {
  const idsToRemove = collectDescendantIds(comments, commentId);
  return comments.filter((comment) => !idsToRemove.has(comment.id));
}

export function countCommentBranch(comments: PostComment[], commentId: string): number {
  return collectDescendantIds(comments, commentId).size;
}