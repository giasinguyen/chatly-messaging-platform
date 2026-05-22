import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import AdminConversationDetailContent from "@/components/admin/AdminConversationDetailContent";
import AdminDetailPanel from "@/components/admin/AdminDetailPanel";
import { DashboardKpiCard } from "@/components/admin/DashboardKpiCard";
import { adminService } from "@/services/admin.service";
import type { AdminStatsResponse } from "@/types/admin";
import type { ConversationResponse, ConversationType } from "@/types/conversation";
import { Bot, Loader2, Lock, MessagesSquare, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { toMessagePreviewText } from "@/pages/app/chat/components/richTextMessage.utils";

type ConversationFilter = ConversationType | "ALL";

const PAGE_SIZE = 20;
const filters: Array<{ value: ConversationFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "PRIVATE", label: "Private" },
  { value: "GROUP", label: "Groups" },
];

function getConversationName(conversation: ConversationResponse) {
  return conversation.name || `${conversation.type.toLowerCase()} conversation`;
}

export default function ConversationsPage() {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationResponse | null>(null);
  const [filter, setFilter] = useState<ConversationFilter>("ALL");
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await adminService.listConversations({
        type: filter === "ALL" ? undefined : filter,
        q: activeQuery || undefined,
        page,
        size: PAGE_SIZE,
      });
      if (response.code === 1000) {
        setConversations(response.result.items);
        setTotalElements(response.result.totalElements);
        setTotalPages(response.result.totalPages);
      } else {
        toast.error(response.message || "Failed to load conversations");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load conversations";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [activeQuery, filter, page]);

  useEffect(() => {
    adminService.getStats().then((response) => {
      if (response.code === 1000) {
        setStats(response.result);
      }
    });
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const totalConversations = stats?.totalConversations ?? totalElements;
  const totalGroups = stats?.totalGroups ?? conversations.filter((item) => item.type === "GROUP").length;
  const directConversations = Math.max(totalConversations - totalGroups, 0);
  const aiEnabledOnPage = useMemo(
    () => conversations.filter((item) => item.aiProactiveEnabled).length,
    [conversations]
  );

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(0);
    setActiveQuery(query.trim());
  };

  const handleFilterChange = (nextFilter: ConversationFilter) => {
    setFilter(nextFilter);
    setPage(0);
  };

  const handleOpenDetail = async (conversation: ConversationResponse) => {
    setSelectedConversation(conversation);
    try {
      const response = await adminService.getConversation(conversation.id);
      if (response.code === 1000) {
        setSelectedConversation(response.result);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load conversation detail";
      toast.error(message);
    }
  };

  const handleDeleteConversation = async (conversation: ConversationResponse) => {
    if (!confirm("Delete this conversation permanently?")) {
      return;
    }
    setDeletingId(conversation.id);
    try {
      const response = await adminService.deleteConversation(conversation.id);
      if (response.code === 1000) {
        setConversations((current) => current.filter((item) => item.id !== conversation.id));
        setSelectedConversation(null);
        setTotalElements((current) => Math.max(0, current - 1));
        toast.success("Conversation deleted");
      } else {
        toast.error(response.message || "Failed to delete conversation");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete conversation";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
        <DashboardKpiCard label="Total Conversations" value={totalConversations.toLocaleString()} helper="Admin-wide total" icon={MessagesSquare} colorClass="text-cyan-600 bg-cyan-50 border-cyan-100" />
        <DashboardKpiCard label="Group Chats" value={totalGroups.toLocaleString()} helper="Platform groups" icon={Users} colorClass="text-amber-600 bg-amber-50 border-amber-100" />
        <DashboardKpiCard label="Direct Chats" value={directConversations.toLocaleString()} helper="Estimated from totals" icon={Lock} colorClass="text-slate-600 bg-slate-50 border-slate-100" />
        <DashboardKpiCard label="AI Enabled Page" value={aiEnabledOnPage.toLocaleString()} helper="Current page" icon={Bot} colorClass="text-purple-600 bg-purple-50 border-purple-100" />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full lg:max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, id, creator, participant..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20" />
        </form>
        <div className="flex gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-1">
          {filters.map((item) => (
            <button key={item.value} type="button" onClick={() => handleFilterChange(item.value)} className={`rounded-xl px-4 py-1.5 text-xs font-semibold transition-all ${filter === item.value ? "bg-[#7c3aed] text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex h-72 items-center justify-center"><Loader2 size={28} className="animate-spin text-[#7c3aed]" /></div>
        ) : conversations.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">No conversations found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-slate-100 bg-slate-50/70">
                <tr>
                  <th className="px-5 py-4 text-xs font-bold uppercase text-slate-400">Conversation</th>
                  <th className="px-5 py-4 text-xs font-bold uppercase text-slate-400">Members</th>
                  <th className="px-5 py-4 text-xs font-bold uppercase text-slate-400">Last Message</th>
                  <th className="px-5 py-4 text-xs font-bold uppercase text-slate-400">Flags</th>
                  <th className="px-5 py-4 text-right text-xs font-bold uppercase text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {conversations.map((conversation) => (
                  <tr key={conversation.id} onClick={() => handleOpenDetail(conversation)} className="cursor-pointer hover:bg-slate-50/60">
                    <td className="px-5 py-4"><p className="text-sm font-bold text-slate-800">{getConversationName(conversation)}</p><p className="text-[11px] text-slate-400">{conversation.id}</p></td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-600">{conversation.participantIds.length.toLocaleString()}</td>
                    <td className="max-w-lg px-5 py-4"><p className="truncate text-sm text-slate-600">{toMessagePreviewText(conversation.lastMessage?.content ?? "") || "No message yet"}</p></td>
                    <td className="px-5 py-4"><div className="flex flex-wrap gap-1.5"><span className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500">{conversation.type}</span>{conversation.aiProactiveEnabled && <span className="rounded-lg border border-purple-100 bg-purple-50 px-2 py-1 text-[10px] font-bold text-purple-600">AI</span>}</div></td>
                    <td className="px-5 py-4 text-right"><button type="button" onClick={(event) => { event.stopPropagation(); handleDeleteConversation(conversation); }} disabled={deletingId === conversation.id} className="rounded-xl border border-red-100 bg-red-50 p-2 text-red-600 hover:bg-red-100 disabled:opacity-50"><Trash2 size={16} /></button></td>
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

      {selectedConversation && (
        <AdminDetailPanel title={getConversationName(selectedConversation)} subtitle={selectedConversation.id} onClose={() => setSelectedConversation(null)} footer={<button type="button" onClick={() => handleDeleteConversation(selectedConversation)} disabled={deletingId === selectedConversation.id} className="w-full rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50">Delete Conversation</button>}>
          <AdminConversationDetailContent conversation={selectedConversation} />
        </AdminDetailPanel>
      )}
    </div>
  );
}
