import { useCallback, useEffect, useState } from "react";
import { reportService } from "@/services/report.service";
import { ReportStatus } from "@/types/admin";
import type { ReportResponse } from "@/types/admin";
import { ResolveUserReportDialog } from "@/components/admin/ResolveUserReportDialog";
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Gavel,
  ChevronLeft,
  ChevronRight,
  User,
  Flag,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 20;

const REASON_LABEL: Record<string, string> = {
  SPAM: "Spam",
  HARASSMENT: "Harassment",
  INAPPROPRIATE_CONTENT: "Inappropriate Content",
  VIOLENCE: "Violence",
  OTHER: "Other",
};

const REASON_COLOR: Record<string, string> = {
  SPAM: "bg-orange-50 text-orange-600 border-orange-100",
  HARASSMENT: "bg-red-50 text-red-600 border-red-100",
  INAPPROPRIATE_CONTENT: "bg-purple-50 text-purple-600 border-purple-100",
  VIOLENCE: "bg-rose-50 text-rose-600 border-rose-100",
  OTHER: "bg-slate-50 text-slate-500 border-slate-100",
};

function getStatusBadge(status: ReportStatus) {
  switch (status) {
    case ReportStatus.PENDING:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
          <Clock size={11} /> PENDING
        </span>
      );
    case ReportStatus.RESOLVED:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
          <CheckCircle size={11} /> RESOLVED
        </span>
      );
    case ReportStatus.DISMISSED:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-400 border border-slate-100">
          <XCircle size={11} /> DISMISSED
        </span>
      );
  }
}

const STATUS_FILTERS: Array<{ value: ReportStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "All Reports" },
  { value: ReportStatus.PENDING, label: "Pending" },
  { value: ReportStatus.RESOLVED, label: "Resolved" },
  { value: ReportStatus.DISMISSED, label: "Dismissed" },
];

export default function UserReportsPage() {
  const [reports, setReports] = useState<ReportResponse[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | "ALL">("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [resolveTarget, setResolveTarget] = useState<ReportResponse | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const statusParam = selectedStatus === "ALL" ? undefined : selectedStatus;
      const response = await reportService.listUserReports(statusParam, page, PAGE_SIZE);
      if (response.code === 1000) {
        setReports(response.result.content);
        setTotalPages(response.result.totalPages);
        setTotalElements(response.result.totalElements);
      } else {
        toast.error(response.message || "Failed to fetch user reports");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load user reports";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus, page]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleStatusFilterChange = (status: ReportStatus | "ALL") => {
    setSelectedStatus(status);
    setPage(0);
  };

  const handleResolved = (reportId: string, status: ReportStatus) => {
    setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status } : r)));
  };

  const pendingCount = reports.filter((r) => r.status === ReportStatus.PENDING).length;

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* Top bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center border border-red-100">
            <UserX size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">User Reports</p>
            <p className="text-xs text-slate-400">
              {totalElements > 0
                ? `${totalElements} report${totalElements !== 1 ? "s" : ""} total`
                : "No reports found"}
              {pendingCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
                  <Clock size={9} /> {pendingCount} pending
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleStatusFilterChange(f.value)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                selectedStatus === f.value
                  ? "bg-[#7c3aed] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Report cards */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white border border-slate-100 rounded-3xl h-64 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-[#7c3aed]" />
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-16 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
              <ShieldAlert size={26} className="text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-500">No user reports found</p>
            <p className="text-xs text-slate-400">
              {selectedStatus !== "ALL"
                ? `No reports with status "${selectedStatus.toLowerCase()}"`
                : "No user reports have been submitted yet"}
            </p>
          </div>
        ) : (
          reports.map((r) => {
            const reasonKey = r.reason as string;
            const reasonLabel = REASON_LABEL[reasonKey] ?? reasonKey;
            const reasonColor =
              REASON_COLOR[reasonKey] ?? "bg-slate-50 text-slate-500 border-slate-100";

            return (
              <div
                key={r.id}
                className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-200 transition-all"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${reasonColor}`}
                      >
                        <Flag size={10} />
                        {reasonLabel}
                      </span>
                      {getStatusBadge(r.status)}
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Report ID: <code className="bg-slate-50 px-1 py-0.5 rounded text-[10px]">{r.id}</code>
                      {" · "}
                      {new Date(r.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {r.status === ReportStatus.PENDING && (
                    <button
                      type="button"
                      onClick={() => setResolveTarget(r)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7c3aed]/10 border border-[#7c3aed]/20 text-[#7c3aed] hover:bg-[#7c3aed]/20 text-xs font-bold rounded-xl transition-all shrink-0"
                    >
                      <Gavel size={13} />
                      Take Action
                    </button>
                  )}
                </div>

                {/* Reporter description */}
                {r.description && (
                  <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-500 mb-1">Reporter note</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{r.description}</p>
                  </div>
                )}

                {/* User cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Reporter card */}
                  <div className="flex items-center gap-3 bg-blue-50/40 border border-blue-100/60 rounded-xl px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <User size={15} className="text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider mb-0.5">
                        Reported by
                      </p>
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {r.reporterDisplayName || "Unknown"}
                      </p>
                      {r.reporterUsername && (
                        <p className="text-[11px] text-slate-400 truncate">
                          @{r.reporterUsername}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Reported user card */}
                  <div className="flex items-center gap-3 bg-red-50/40 border border-red-100/60 rounded-xl px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                      <UserX size={15} className="text-red-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider mb-0.5">
                        Reported user
                      </p>
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {r.reportedUserDisplayName || "Unknown"}
                      </p>
                      {r.reportedUserUsername && (
                        <p className="text-[11px] text-slate-400 truncate">
                          @{r.reportedUserUsername}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-400 font-medium">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={14} />
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      <ResolveUserReportDialog
        report={resolveTarget}
        onClose={() => setResolveTarget(null)}
        onResolved={handleResolved}
      />
    </div>
  );
}
