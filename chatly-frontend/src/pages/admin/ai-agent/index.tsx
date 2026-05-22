import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardKpiCard } from "@/components/admin/DashboardKpiCard";
import { adminService } from "@/services/admin.service";
import { agentService } from "@/services/agent.service";
import type { AdminStatsResponse } from "@/types/admin";
import type { AgentSession } from "@/types/agent";
import { Activity, Bot, Clock, Cpu, Loader2, RefreshCw, Server } from "lucide-react";
import { toast } from "sonner";

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function AiAgentPage() {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAgentData = useCallback(async (showToast = false) => {
    if (showToast) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const statsResponse = await adminService.getStats();
      if (statsResponse.code === 1000) {
        setStats(statsResponse.result);
      }

      const sessionList = await agentService.listSessions();
      setSessions(sessionList.sessions);
      setTotalSessions(sessionList.total);

      if (showToast) {
        toast.success("AI agent data refreshed");
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to load AI agent data";
      toast.error(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAgentData();
  }, [loadAgentData]);

  const agentHealth = useMemo(
    () =>
      stats?.systemHealth.find((item) =>
        item.service.toLowerCase().includes("agent")
      ) ?? null,
    [stats]
  );

  const contextSessionCount = sessions.filter(
    (session) => Boolean(session.context_conversation_id)
  ).length;

  const latestSession = sessions[0];

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      <div className="flex justify-end">
        <button
          onClick={() => loadAgentData(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:border-purple-200 bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 font-semibold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <DashboardKpiCard
          label="Agent Health"
          value={agentHealth?.status ?? "UNKNOWN"}
          helper={agentHealth?.description ?? "Health check unavailable"}
          icon={Bot}
          colorClass={
            agentHealth?.status === "UP"
              ? "text-emerald-600 bg-emerald-50 border-emerald-100"
              : "text-red-600 bg-red-50 border-red-100"
          }
        />
        <DashboardKpiCard
          label="Sessions"
          value={totalSessions.toLocaleString()}
          helper="Current admin account"
          icon={Activity}
          colorClass="text-purple-600 bg-purple-50 border-purple-100"
        />
        <DashboardKpiCard
          label="Context Linked"
          value={contextSessionCount.toLocaleString()}
          helper="Conversation-aware sessions"
          icon={Server}
          colorClass="text-blue-600 bg-blue-50 border-blue-100"
        />
        <DashboardKpiCard
          label="Latest Update"
          value={latestSession ? new Date(latestSession.updated_at).toLocaleDateString() : "N/A"}
          helper={latestSession?.title ?? "No sessions"}
          icon={Clock}
          colorClass="text-amber-600 bg-amber-50 border-amber-100"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="h-72 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin text-[#7c3aed]" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-400">
              No AI sessions found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase">
                      Session
                    </th>
                    <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase">
                      Context
                    </th>
                    <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase">
                      Created
                    </th>
                    <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase">
                      Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-slate-50/40">
                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-slate-800">
                          {session.title}
                        </p>
                        <p className="text-[11px] text-slate-400">{session.id}</p>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">
                        {session.context_conversation_id ?? "Standalone"}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">
                        {formatDate(session.created_at)}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">
                        {formatDate(session.updated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm h-fit">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center border text-purple-600 bg-purple-50 border-purple-100 mb-4">
            <Cpu size={18} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Operational Notes</h3>
          <div className="mt-4 space-y-3 text-xs text-slate-600">
            <div className="flex items-center justify-between border-b border-slate-50 pb-2">
              <span>Proxy route</span>
              <span className="font-mono text-slate-500">/api/ai/sessions</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-50 pb-2">
              <span>Agent service</span>
              <span className="font-semibold">{agentHealth?.status ?? "UNKNOWN"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Admin metrics</span>
              <span className="font-semibold">/api/admin/stats</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
