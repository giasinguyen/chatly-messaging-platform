import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import AdminDetailPanel from "@/components/admin/AdminDetailPanel";
import AdminMessageDetailContent from "@/components/admin/AdminMessageDetailContent";
import { DashboardKpiCard } from "@/components/admin/DashboardKpiCard";
import { adminService } from "@/services/admin.service";
import type { AdminStatsResponse } from "@/types/admin";
import type { Message } from "@/types/message";
import { AlertTriangle, CheckCircle, Edit3, Loader2, MessageSquare, Pin, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 20;

interface MessageFilters {
  q: string;
  conversationId: string;
  senderId: string;
}

const initialFilters: MessageFilters = {
  q: "",
  conversationId: "",
  senderId: "",
};

function getMessagePreview(message: Message) {
  if (message.recalled) {
    return "Message recalled";
  }
  return message.content || `${message.type} message`;
}

export default function MessagesPage() {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [filters, setFilters] = useState<MessageFilters>(initialFilters);
  const [activeFilters, setActiveFilters] = useState<MessageFilters>(initialFilters);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await adminService.listMessages({
        q: activeFilters.q || undefined,
        conversationId: activeFilters.conversationId || undefined,
        senderId: activeFilters.senderId || undefined,
        page,
        size: PAGE_SIZE,
      });
      if (response.code === 1000) {
        setMessages(response.result.items);
        setTotalElements(response.result.totalElements);
        setTotalPages(response.result.totalPages);
      } else {
        toast.error(response.message || "Failed to load messages");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load messages";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [activeFilters, page]);

  useEffect(() => {
    adminService.getStats().then((response) => {
      if (response.code === 1000) {
        setStats(response.result);
      }
    });
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const editedCount = useMemo(() => messages.filter((message) => message.edited).length, [messages]);
  const recalledCount = useMemo(() => messages.filter((message) => message.recalled).length, [messages]);
  const pinnedCount = useMemo(() => messages.filter((message) => message.pinned).length, [messages]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(0);
    setActiveFilters({
      q: filters.q.trim(),
      conversationId: filters.conversationId.trim(),
      senderId: filters.senderId.trim(),
    });
  };

  const handleFilterChange = (field: keyof MessageFilters, value: string) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const handleOpenDetail = async (message: Message) => {
    setSelectedMessage(message);
    try {
      const response = await adminService.getMessage(message.id);
      if (response.code === 1000) {
        setSelectedMessage(response.result);
      }
    } catch (error: unknown) {
      const text = error instanceof Error ? error.message : "Failed to load message detail";
      toast.error(text);
    }
  };

  const handleDeleteMessage = async (message: Message) => {
    if (!confirm("Delete this message permanently?")) {
      return;
    }
    setDeletingId(message.id);
    try {
      const response = await adminService.deleteMessage(message.id);
      if (response.code === 1000) {
        setMessages((current) => current.filter((item) => item.id !== message.id));
        setSelectedMessage(null);
        setTotalElements((current) => Math.max(0, current - 1));
        toast.success("Message deleted");
      } else {
        toast.error(response.message || "Failed to delete message");
      }
    } catch (error: unknown) {
      const text = error instanceof Error ? error.message : "Failed to delete message";
      toast.error(text);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
        <DashboardKpiCard label="Total Messages" value={(stats?.totalMessages ?? totalElements).toLocaleString()} helper="Admin-wide count" icon={MessageSquare} colorClass="text-blue-600 bg-blue-50 border-blue-100" />
        <DashboardKpiCard label="Result Set" value={totalElements.toLocaleString()} helper="Current filters" icon={CheckCircle} colorClass="text-emerald-600 bg-emerald-50 border-emerald-100" />
        <DashboardKpiCard label="Edited Page" value={editedCount.toLocaleString()} helper={`${pinnedCount} pinned`} icon={Edit3} colorClass="text-amber-600 bg-amber-50 border-amber-100" />
        <DashboardKpiCard label="Recalled Page" value={recalledCount.toLocaleString()} helper="Moderation signal" icon={AlertTriangle} colorClass="text-red-600 bg-red-50 border-red-100" />
      </div>

      <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm lg:grid-cols-[1fr_1fr_1fr_auto]">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={filters.q} onChange={(event) => handleFilterChange("q", event.target.value)} placeholder="Search content..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20" />
        </div>
        <input value={filters.conversationId} onChange={(event) => handleFilterChange("conversationId", event.target.value)} placeholder="Conversation ID" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20" />
        <input value={filters.senderId} onChange={(event) => handleFilterChange("senderId", event.target.value)} placeholder="Sender ID" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20" />
        <button type="submit" className="rounded-xl bg-[#7c3aed] px-4 py-2 text-xs font-bold text-white hover:bg-[#6d28d9]">Apply</button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex h-72 items-center justify-center"><Loader2 size={28} className="animate-spin text-[#7c3aed]" /></div>
        ) : messages.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">No messages found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-slate-100 bg-slate-50/70">
                <tr>
                  <th className="px-5 py-4 text-xs font-bold uppercase text-slate-400">Message</th>
                  <th className="px-5 py-4 text-xs font-bold uppercase text-slate-400">Sender</th>
                  <th className="px-5 py-4 text-xs font-bold uppercase text-slate-400">Conversation</th>
                  <th className="px-5 py-4 text-xs font-bold uppercase text-slate-400">Flags</th>
                  <th className="px-5 py-4 text-right text-xs font-bold uppercase text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {messages.map((message) => (
                  <tr key={message.id} onClick={() => handleOpenDetail(message)} className="cursor-pointer hover:bg-slate-50/60">
                    <td className="max-w-xl px-5 py-4"><p className="line-clamp-2 text-sm font-medium text-slate-700">{getMessagePreview(message)}</p><p className="text-[11px] text-slate-400">{message.id}</p></td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-500">{message.senderId}</td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-500">{message.conversationId}</td>
                    <td className="px-5 py-4"><div className="flex flex-wrap gap-1.5"><span className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500">{message.type}</span>{message.pinned && <Pin size={14} className="text-purple-500" />}{message.edited && <span className="rounded-lg border border-amber-100 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-600">EDITED</span>}{message.recalled && <span className="rounded-lg border border-red-100 bg-red-50 px-2 py-1 text-[10px] font-bold text-red-600">RECALLED</span>}</div></td>
                    <td className="px-5 py-4 text-right"><button type="button" onClick={(event) => { event.stopPropagation(); handleDeleteMessage(message); }} disabled={deletingId === message.id} className="rounded-xl border border-red-100 bg-red-50 p-2 text-red-600 hover:bg-red-100 disabled:opacity-50"><Trash2 size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40">Previous</button>
          <span className="text-xs font-medium text-slate-500">Page {page + 1} of {totalPages}</span>
          <button onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} disabled={page >= totalPages - 1} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40">Next</button>
        </div>
      )}

      {selectedMessage && (
        <AdminDetailPanel title="Message Detail" subtitle={selectedMessage.id} onClose={() => setSelectedMessage(null)} footer={<button type="button" onClick={() => handleDeleteMessage(selectedMessage)} disabled={deletingId === selectedMessage.id} className="w-full rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50">Delete Message</button>}>
          <AdminMessageDetailContent message={selectedMessage} />
        </AdminDetailPanel>
      )}
    </div>
  );
}
