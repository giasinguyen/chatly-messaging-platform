import { ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { UserResponse } from "@/types/auth";

interface AdminUserDetailContentProps {
  user: UserResponse;
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : "Not available";
}

function getAvatarUrl(user: UserResponse) {
  return (
    user.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      user.displayName || user.username
    )}&background=7c3aed&color=fff&size=96`
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-700">
        {value || "Not available"}
      </p>
    </div>
  );
}

export default function AdminUserDetailContent({ user }: AdminUserDetailContentProps) {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <img
          src={getAvatarUrl(user)}
          alt={user.username}
          className="h-16 w-16 rounded-2xl border border-slate-100 object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-800">{user.displayName}</p>
          <p className="text-xs text-slate-400">@{user.username}</p>
          <p className="text-xs text-slate-400">{user.status || "OFFLINE"}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/u/${user.username}`)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#7c3aed]/20 bg-purple-50 px-3 py-1.5 text-[11px] font-semibold text-[#7c3aed] hover:bg-purple-100"
          title="View public profile"
        >
          <ExternalLink size={13} />
          View Profile
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DetailRow label="Email" value={user.email} />
        <DetailRow label="Phone" value={user.phone} />
        <DetailRow label="Created" value={formatDate(user.createdAt)} />
        <DetailRow label="Last Seen" value={formatDate(user.lastSeen)} />
        <DetailRow label="Suspended" value={user.suspended ? "Yes" : "No"} />
        <DetailRow label="Date of Birth" value={user.dob} />
      </div>
      <DetailRow label="Bio" value={user.bio} />
    </div>
  );
}
