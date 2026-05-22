import { Hash, Heart, Image, MessageCircle, Share2 } from "lucide-react";
import type { Post } from "@/types/post";

interface AdminPostDetailContentProps {
  post: Post;
}

function getReactionCount(post: Post) {
  return post.reactions.reduce((total, item) => total + item.count, 0);
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : "Not available";
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-800">{value.toLocaleString()}</p>
    </div>
  );
}

export default function AdminPostDetailContent({ post }: AdminPostDetailContentProps) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-bold uppercase text-slate-400">Author</p>
        <div className="mt-2 flex items-center gap-3">
          <img
            src={
              post.authorAvatarUrl ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                post.authorDisplayName || post.authorUsername || "User"
              )}&background=7c3aed&color=fff&size=96`
            }
            alt={post.authorDisplayName || post.authorUsername || "User"}
            className="h-11 w-11 rounded-xl border border-slate-100 object-cover"
          />
          <div>
            <p className="text-sm font-bold text-slate-800">
              {post.authorDisplayName || "Unknown user"}
            </p>
            <p className="text-xs text-slate-400">@{post.authorUsername || "unknown"}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <p className="whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">
          {post.content || "Media-only post"}
        </p>
      </div>

      {post.mediaUrls.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400">
            <Image size={13} />
            Media
          </p>
          <div className="grid grid-cols-2 gap-3">
            {post.mediaUrls.slice(0, 4).map((url) => (
              <img
                key={url}
                src={url}
                alt="Post media"
                className="aspect-video rounded-xl border border-slate-100 object-cover"
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Metric label="Reactions" value={getReactionCount(post)} />
        <Metric label="Comments" value={post.commentCount} />
        <Metric label="Shares" value={post.shareCount} />
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500">
          <Heart size={12} />
          {post.visibility}
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500">
          <MessageCircle size={12} />
          {formatDate(post.createdAt)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500">
          <Share2 size={12} />
          {formatDate(post.updatedAt)}
        </span>
      </div>

      {post.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {post.hashtags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-lg border border-purple-100 bg-purple-50 px-2 py-1 text-xs font-bold text-purple-600">
              <Hash size={12} />
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
