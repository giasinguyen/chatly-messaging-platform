import { Bot, Clock, MessageSquare, Users } from "lucide-react";
import type { ConversationResponse } from "@/types/conversation";
import { toMessagePreviewText } from "@/pages/app/chat/components/richTextMessage.utils";

interface AdminConversationDetailContentProps {
  conversation: ConversationResponse;
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : "Not available";
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-700">
        {value ?? "Not available"}
      </p>
    </div>
  );
}

export default function AdminConversationDetailContent({
  conversation,
}: AdminConversationDetailContentProps) {
  const title = conversation.name || `${conversation.type.toLowerCase()} conversation`;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-100 bg-cyan-50 text-cyan-600">
          <MessageSquare size={20} />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">{title}</p>
          <p className="text-xs text-slate-400">{conversation.type}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DetailRow label="Creator" value={conversation.creatorId} />
        <DetailRow label="Participants" value={conversation.participantIds.length} />
        <DetailRow label="Created" value={formatDate(conversation.createdAt)} />
        <DetailRow label="Updated" value={formatDate(conversation.updatedAt)} />
        <DetailRow label="Invite Token" value={conversation.inviteToken} />
        <DetailRow label="Require Approval" value={conversation.requireApproval ? "Yes" : "No"} />
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400">
          <Clock size={13} />
          Last Message
        </p>
        <p className="text-sm font-semibold text-slate-700">
          {toMessagePreviewText(conversation.lastMessage?.content ?? "") || "No message yet"}
        </p>
        {conversation.lastMessage?.timestamp && (
          <p className="mt-1 text-xs text-slate-400">
            {formatDate(conversation.lastMessage.timestamp)}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {conversation.aiProactiveEnabled && (
          <span className="inline-flex items-center gap-1 rounded-lg border border-purple-100 bg-purple-50 px-2 py-1 text-xs font-bold text-purple-600">
            <Bot size={12} />
            AI proactive
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-500">
          <Users size={12} />
          {conversation.participantIds.length.toLocaleString()} members
        </span>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase text-slate-400">Participant IDs</p>
        <div className="max-h-60 space-y-2 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50 p-3">
          {conversation.participantIds.map((id) => (
            <p key={id} className="break-all rounded-lg bg-white px-3 py-2 font-mono text-xs text-slate-500">
              {id}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
