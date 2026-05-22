import { useEffect, useMemo, useState } from "react";
import { DashboardKpiCard } from "@/components/admin/DashboardKpiCard";
import { adminService } from "@/services/admin.service";
import { conversationService } from "@/services/conversation.service";
import type { AdminStatsResponse } from "@/types/admin";
import type { ConversationResponse, ConversationType } from "@/types/conversation";
import {
  Bot,
  Clock,
  Loader2,
  Lock,
  MessagesSquare,
  Search,
  Users,
} from "lucide-react";
import { toast } from "sonner";

type ConversationFilter = ConversationType | "ALL";

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
  const [filter, setFilter] = useState<ConversationFilter>("ALL");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadConversations = async () => {
      setIsLoading(true);
      try {
        const [statsResponse, conversationsResponse] = await Promise.all([
          adminService.getStats(),
          conversationService.getMyConversations(),
        ]);

        if (statsResponse.code === 1000) {
          setStats(statsResponse.result);
        }
        if (conversationsResponse.code === 1000) {
          setConversations(conversationsResponse.result);
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to load conversations";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, []);

  const filteredConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return conversations.filter((conversation) => {
      const matchesFilter = filter === "ALL" || conversation.type === filter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        getConversationName(conversation).toLowerCase().includes(normalizedQuery) ||
        conversation.id.toLowerCase().includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [conversations, filter, query]);

  const totalConversations = stats?.totalConversations ?? conversations.length;
  const totalGroups = stats?.totalGroups ?? 0;
  const directConversations = Math.max(totalConversations - totalGroups, 0);

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <DashboardKpiCard
          label="Total Conversations"
          value={totalConversations.toLocaleString()}
          helper="Admin stats endpoint"
          icon={MessagesSquare}
          colorClass="text-cyan-600 bg-cyan-50 border-cyan-100"
        />
        <DashboardKpiCard
          label="Group Chats"
          value={totalGroups.toLocaleString()}
          helper="Platform-wide groups"
          icon={Users}
          colorClass="text-amber-600 bg-amber-50 border-amber-100"
        />
        <DashboardKpiCard
          label="Direct Chats"
          value={directConversations.toLocaleString()}
          helper="Estimated from totals"
          icon={Lock}
          colorClass="text-slate-600 bg-slate-50 border-slate-100"
        />
        <DashboardKpiCard
          label="Visible To Admin"
          value={conversations.length.toLocaleString()}
          helper="Current account scope"
          icon={Bot}
          colorClass="text-purple-600 bg-purple-50 border-purple-100"
        />
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative w-full lg:max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or conversation ID..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:border-[#7c3aed]"
          />
        </div>

        <div className="flex gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100">
          {filters.map((item) => (
            <button
              key={item.value}
              onClick={() => setFilter(item.value)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === item.value
                  ? "bg-[#7c3aed] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="h-72 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-[#7c3aed]" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">
            No conversations found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase">
                    Conversation
                  </th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase">
                    Members
                  </th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase">
                    Last Message
                  </th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase">
                    Flags
                  </th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredConversations.map((conversation) => (
                  <tr key={conversation.id} className="hover:bg-slate-50/40">
                    <td className="px-5 py-4">
                      <p className="text-sm font-bold text-slate-800">
                        {getConversationName(conversation)}
                      </p>
                      <p className="text-[11px] text-slate-400">{conversation.id}</p>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                      {conversation.participantIds.length.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 max-w-lg">
                      <p className="text-sm text-slate-600 truncate">
                        {conversation.lastMessage?.content || "No message yet"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
                          {conversation.type}
                        </span>
                        {conversation.aiProactiveEnabled && (
                          <span className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-100 px-2 py-1 rounded-lg">
                            AI
                          </span>
                        )}
                        {conversation.requireApproval && (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg">
                            APPROVAL
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock size={13} />
                        {new Date(conversation.updatedAt).toLocaleDateString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-amber-800">Backend coverage</h3>
        <p className="text-xs text-amber-700 mt-1">
          This view can show platform totals and conversations visible to the current admin
          account. A dedicated admin conversation listing endpoint is still needed for a
          complete moderation roster.
        </p>
      </div>
    </div>
  );
}
