import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardKpiCard } from "@/components/admin/DashboardKpiCard";
import { adminService } from "@/services/admin.service";
import { conversationService } from "@/services/conversation.service";
import { messageService } from "@/services/message.service";
import type { AdminStatsResponse } from "@/types/admin";
import type { ConversationResponse } from "@/types/conversation";
import type { Message } from "@/types/message";
import {
  AlertTriangle,
  CheckCircle,
  Edit3,
  Loader2,
  MessageSquare,
  Pin,
  Search,
} from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 20;

function getConversationLabel(conversation: ConversationResponse) {
  return conversation.name || `${conversation.type.toLowerCase()} conversation`;
}

function getMessagePreview(message: Message) {
  if (message.recalled) {
    return "Message recalled";
  }

  return message.content || `${message.type} message`;
}

export default function MessagesPage() {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [keyword, setKeyword] = useState("");
  const [activeKeyword, setActiveKeyword] = useState("");
  const [page, setPage] = useState(0);
  const [isLoadingShell, setIsLoadingShell] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  useEffect(() => {
    const loadShell = async () => {
      setIsLoadingShell(true);
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
          setSelectedConversationId(conversationsResponse.result[0]?.id ?? "");
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to load message context";
        toast.error(message);
      } finally {
        setIsLoadingShell(false);
      }
    };

    loadShell();
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    setIsLoadingMessages(true);
    try {
      const response = activeKeyword.trim()
        ? await messageService.search(
            selectedConversationId,
            activeKeyword.trim(),
            page,
            PAGE_SIZE
          )
        : await messageService.getByConversation(selectedConversationId, page, PAGE_SIZE);

      if (response.code === 1000) {
        setMessages(response.result);
      } else {
        toast.error(response.message || "Failed to load messages");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load messages";
      toast.error(message);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [activeKeyword, page, selectedConversationId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const selectedConversation = useMemo(
    () =>
      conversations.find((conversation) => conversation.id === selectedConversationId) ??
      null,
    [conversations, selectedConversationId]
  );

  const editedCount = messages.filter((message) => message.edited).length;
  const recalledCount = messages.filter((message) => message.recalled).length;
  const pinnedCount = messages.filter((message) => message.pinned).length;

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(0);
    setActiveKeyword(keyword);
  };

  const handleConversationChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedConversationId(event.target.value);
    setPage(0);
    setActiveKeyword("");
    setKeyword("");
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <DashboardKpiCard
          label="Total Messages"
          value={(stats?.totalMessages ?? 0).toLocaleString()}
          helper="Platform-wide count"
          icon={MessageSquare}
          colorClass="text-blue-600 bg-blue-50 border-blue-100"
        />
        <DashboardKpiCard
          label="Loaded Page"
          value={messages.length.toLocaleString()}
          helper={selectedConversation ? getConversationLabel(selectedConversation) : "No selection"}
          icon={CheckCircle}
          colorClass="text-emerald-600 bg-emerald-50 border-emerald-100"
        />
        <DashboardKpiCard
          label="Edited"
          value={editedCount.toLocaleString()}
          helper="Current page"
          icon={Edit3}
          colorClass="text-amber-600 bg-amber-50 border-amber-100"
        />
        <DashboardKpiCard
          label="Recalled"
          value={recalledCount.toLocaleString()}
          helper={`${pinnedCount.toLocaleString()} pinned on page`}
          icon={AlertTriangle}
          colorClass="text-red-600 bg-red-50 border-red-100"
        />
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm grid grid-cols-1 xl:grid-cols-[minmax(240px,360px)_1fr] gap-4">
        <select
          value={selectedConversationId}
          onChange={handleConversationChange}
          disabled={isLoadingShell || conversations.length === 0}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 outline-none disabled:opacity-50"
        >
          {conversations.length === 0 ? (
            <option value="">No conversations available</option>
          ) : (
            conversations.map((conversation) => (
              <option key={conversation.id} value={conversation.id}>
                {getConversationLabel(conversation)}
              </option>
            ))
          )}
        </select>

        <form onSubmit={handleSearchSubmit} className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Search messages in selected conversation..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:border-[#7c3aed]"
          />
        </form>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {isLoadingShell || isLoadingMessages ? (
          <div className="h-72 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-[#7c3aed]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">
            No messages found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase">
                    Message
                  </th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase">
                    Sender
                  </th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase">
                    Type
                  </th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase">
                    Status
                  </th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase">
                    Flags
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {messages.map((message) => (
                  <tr key={message.id} className="hover:bg-slate-50/40">
                    <td className="px-5 py-4 max-w-xl">
                      <p className="text-sm font-medium text-slate-700 line-clamp-2">
                        {getMessagePreview(message)}
                      </p>
                      <p className="text-[11px] text-slate-400">{message.id}</p>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {message.senderId}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
                        {message.type}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-semibold text-slate-600">
                      {message.status}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {message.pinned && <Pin size={14} className="text-purple-500" />}
                        {message.edited && (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg">
                            EDITED
                          </span>
                        )}
                        {message.recalled && (
                          <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded-lg">
                            RECALLED
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setPage((current) => Math.max(0, current - 1))}
          disabled={page === 0}
          className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span className="text-xs text-slate-500 font-medium">Page {page + 1}</span>
        <button
          onClick={() => setPage((current) => current + 1)}
          disabled={messages.length < PAGE_SIZE}
          className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
