import { useCallback, useEffect, useState } from "react";
import { reportService } from "@/services/report.service";
import { ReportStatus } from "@/types/admin";
import type { ReportResponse } from "@/types/admin";
import { ResolveReportDialog } from "@/components/admin/ResolveReportDialog";
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  Clock,
  Link as LinkIcon,
  Loader2,
  ExternalLink,
  Gavel,
} from "lucide-react";
import { toast } from "sonner";

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

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportResponse[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | "ALL">("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [resolveTarget, setResolveTarget] = useState<ReportResponse | null>(null);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const statusParam = selectedStatus === "ALL" ? undefined : selectedStatus;
      const response = await reportService.list(statusParam, 0, 55);
      if (response.code === 1000) {
        setReports(response.result.content);
      } else {
        toast.error(response.message || "Failed to fetch reports");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load reports from server";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleResolved = (reportId: string, status: ReportStatus) => {
    setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status } : r)));
  };

  const handleViewPost = (postId: string) => {
    // TODO: Navigate to /admin/posts/:postId once a dedicated post detail route is created.
    // For now, opening the admin posts page as a fallback.
    window.open(`/admin/posts?postId=${postId}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      <div className="flex flex-col md:flex-row md:items-center justify-end gap-4">
        <div className="flex gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setSelectedStatus(f.value)}
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

      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white border border-slate-100 rounded-3xl h-64 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-[#7c3aed]" />
          </div>
        ) : (
          <>
            {reports.map((r) => (
              <div
                key={r.id}
                className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-lg">
                        {r.reason}
                      </span>
                      {getStatusBadge(r.status)}
                    </div>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                      Report ID: {r.id} · Created: {new Date(r.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleViewPost(r.postId)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 text-xs font-semibold rounded-xl transition-all"
                      title="View flagged post"
                    >
                      <ExternalLink size={13} />
                      View Post
                    </button>
                    {r.status === ReportStatus.PENDING && (
                      <button
                        type="button"
                        onClick={() => setResolveTarget(r)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7c3aed]/10 border border-[#7c3aed]/20 text-[#7c3aed] hover:bg-[#7c3aed]/20 text-xs font-bold rounded-xl transition-all"
                      >
                        <Gavel size={13} />
                        Take Action
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-50">
                  <p className="text-sm font-semibold text-slate-800">Reporter description:</p>
                  <p className="text-sm text-slate-600 mt-1">
                    {r.description || "No detailed description provided by reporter."}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium text-slate-500 pt-1">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert size={14} className="text-slate-400" />
                    <span>Reporter: <code className="bg-slate-50 px-1 py-0.5 rounded">{r.reporterId}</code></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert size={14} className="text-slate-400" />
                    <span>Reported User: <code className="bg-slate-50 px-1 py-0.5 rounded">{r.reportedUserId}</code></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <LinkIcon size={14} className="text-slate-400" />
                    <span>Post ID: <code className="bg-slate-50 px-1 py-0.5 rounded">{r.postId}</code></span>
                  </div>
                </div>
              </div>
            ))}

            {reports.length === 0 && (
              <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400 text-sm font-medium">
                No moderation reports found
              </div>
            )}
          </>
        )}
      </div>

      <ResolveReportDialog
        report={resolveTarget}
        onClose={() => setResolveTarget(null)}
        onResolved={handleResolved}
      />
    </div>
  );
}

