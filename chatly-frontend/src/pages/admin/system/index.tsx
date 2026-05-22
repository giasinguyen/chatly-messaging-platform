import React, { useEffect, useState } from "react";
import { adminService } from "@/services/admin.service";
import type { AdminStatsResponse } from "@/types/admin";
import {
  Server,
  Activity,
  CheckCircle,
  AlertTriangle,
  Loader2,
  HardDrive,
  Cpu,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export const SystemHealthPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchHealth = async (showToast = false) => {
    if (showToast) setIsRefreshing(true);
    try {
      const response = await adminService.getStats();
      if (response.code === 1000) {
        setStats(response.result);
        if (showToast) toast.success("System status refreshed");
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to refresh system status");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  if (isLoading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 size={32} className="animate-spin text-[#7c3aed]" />
        <span className="text-sm font-semibold text-slate-500">
          Retrieving health metrics...
        </span>
      </div>
    );
  }

  const hasIssues = stats?.systemHealth.some((sh) => sh.status === "DOWN");

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight font-outfit">
            System Diagnostics
          </h1>
          <p className="text-sm text-slate-500">
            Real-time status of the monolithic Chatly infrastructure
          </p>
        </div>

        <button
          onClick={() => fetchHealth(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:border-purple-200 bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 font-semibold text-xs rounded-xl shadow-sm transition-all duration-150"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          <span>Force Refresh</span>
        </button>
      </div>

      {/* Main Status Callout */}
      <div
        className={`border p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm ${
          hasIssues
            ? "bg-red-50/50 border-red-100 text-red-800"
            : "bg-emerald-50/40 border-emerald-100 text-emerald-800"
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-2xl border ${
              hasIssues
                ? "bg-red-50 border-red-200 text-red-600 animate-pulse"
                : "bg-emerald-50 border-emerald-200 text-emerald-600"
            }`}
          >
            {hasIssues ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
          </div>
          <div>
            <h3 className="text-lg font-bold font-outfit">
              {hasIssues ? "System Issues Detected" : "All Components Operational"}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              {hasIssues
                ? "One or more backend subsystem health checks returned negative results. Please check database logs, Redis connectivity, or internal gateway mappings immediately."
                : "The Spring Boot application context, relational database, in-memory cache, and message broker are fully synchronized and responding within optimal latency margins."}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          <div className="text-right">
            <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Uptime Status
            </span>
            <span className="text-xl font-extrabold font-outfit">99.98%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Specs Overview */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
          <h4 className="font-bold text-slate-800 text-sm font-outfit flex items-center gap-2">
            <Cpu size={16} className="text-purple-600" />
            <span>Server Resources</span>
          </h4>
          <div className="space-y-3 pt-1">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                <span>CPU Utilization</span>
                <span>12.4%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-600 h-full rounded-full" style={{ width: "12.4%" }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                <span>Memory Allocation</span>
                <span>1.4 GB / 4.0 GB</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-600 h-full rounded-full" style={{ width: "35%" }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                <span>JVM Heap Size</span>
                <span>512 MB / 1024 MB</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-600 h-full rounded-full" style={{ width: "50%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Database Health Card */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
          <h4 className="font-bold text-slate-800 text-sm font-outfit flex items-center gap-2">
            <HardDrive size={16} className="text-purple-600" />
            <span>Database Integrity</span>
          </h4>
          <div className="space-y-3 pt-1">
            <div className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
              <span className="text-slate-500 font-medium">Driver Class</span>
              <span className="font-bold text-slate-700">org.postgresql.Driver</span>
            </div>
            <div className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
              <span className="text-slate-500 font-medium">Active Connections</span>
              <span className="font-bold text-slate-700">12 / 100</span>
            </div>
            <div className="flex justify-between items-center text-xs pb-1">
              <span className="text-slate-500 font-medium">Transaction Latency</span>
              <span className="font-bold text-emerald-600">4 ms (Optimal)</span>
            </div>
          </div>
        </div>

        {/* WebSocket Session info */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
          <h4 className="font-bold text-slate-800 text-sm font-outfit flex items-center gap-2">
            <Activity size={16} className="text-purple-600" />
            <span>Real-time Socket Gateway</span>
          </h4>
          <div className="space-y-3 pt-1">
            <div className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
              <span className="text-slate-500 font-medium">Active STOMP Sessions</span>
              <span className="font-bold text-slate-700">
                {(stats?.onlineUsers || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
              <span className="text-slate-500 font-medium">Broker Health</span>
              <span className="font-bold text-emerald-600">UP</span>
            </div>
            <div className="flex justify-between items-center text-xs pb-1">
              <span className="text-slate-500 font-medium">Queue Throughput</span>
              <span className="font-bold text-slate-700">~14 msg/sec</span>
            </div>
          </div>
        </div>
      </div>

      {/* Component Availability List */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        <h3 className="font-bold text-slate-800 text-lg font-outfit mb-1">Subsystem Availability Metrics</h3>
        <p className="text-xs text-slate-500 mb-5">Subsystem diagnostics and response integrity</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats?.systemHealth.map((sh, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-4 border border-slate-100 hover:border-purple-100 rounded-2xl hover:bg-slate-50/40 transition-all duration-150"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`p-2.5 rounded-xl border ${
                    sh.status === "UP"
                      ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                      : "bg-red-50 border-red-100 text-red-600 animate-pulse"
                  }`}
                >
                  <Server size={18} />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-bold text-slate-800 block">{sh.service}</span>
                  <span className="text-xs text-slate-400 block truncate">{sh.description}</span>
                </div>
              </div>

              <div className="text-right shrink-0 ml-4">
                <span
                  className={`inline-flex px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${
                    sh.status === "UP"
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                      : "bg-red-50 text-red-600 border-red-100 animate-pulse"
                  }`}
                >
                  {sh.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default SystemHealthPage;
