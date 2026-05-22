import { FileText, Pin, RotateCcw } from "lucide-react";
import type { Message } from "@/types/message";
import { toMessagePreviewText } from "@/pages/app/chat/components/richTextMessage.utils";

interface AdminMessageDetailContentProps {
  message: Message;
}

function formatDate(value?: string | null) {
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

export default function AdminMessageDetailContent({ message }: AdminMessageDetailContentProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400">
          <FileText size={13} />
          Content
        </p>
        <p className="whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">
          {message.recalled ? "Message recalled" : toMessagePreviewText(message.content) || `${message.type} message`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DetailRow label="Conversation" value={message.conversationId} />
        <DetailRow label="Sender" value={message.senderId} />
        <DetailRow label="Type" value={message.type} />
        <DetailRow label="Status" value={message.status} />
        <DetailRow label="Created" value={formatDate(message.createdAt)} />
        <DetailRow label="Updated" value={formatDate(message.updatedAt)} />
        <DetailRow label="Reply To" value={message.replyToId} />
        <DetailRow label="Forwarded From" value={message.forwardedFromId} />
      </div>

      <div className="flex flex-wrap gap-2">
        {message.pinned && (
          <span className="inline-flex items-center gap-1 rounded-lg border border-purple-100 bg-purple-50 px-2 py-1 text-xs font-bold text-purple-600">
            <Pin size={12} />
            Pinned
          </span>
        )}
        {message.recalled && (
          <span className="inline-flex items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-2 py-1 text-xs font-bold text-red-600">
            <RotateCcw size={12} />
            Recalled
          </span>
        )}
        {message.edited && (
          <span className="rounded-lg border border-amber-100 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-600">
            Edited {formatDate(message.editedAt)}
          </span>
        )}
      </div>

      {message.attachments.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase text-slate-400">Attachments</p>
          <div className="space-y-2">
            {message.attachments.map((attachment) => (
              <div key={attachment.url} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="break-all text-xs font-semibold text-slate-700">{attachment.name || attachment.url}</p>
                <p className="mt-1 text-[11px] text-slate-400">{attachment.type || attachment.kind || "file"}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
