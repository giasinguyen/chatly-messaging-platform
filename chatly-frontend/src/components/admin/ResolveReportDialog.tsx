import { useState } from "react";
import { Loader2, Trash2, EyeOff, XCircle, CheckCircle } from "lucide-react";
import { adminService } from "@/services/admin.service";
import { reportService } from "@/services/report.service";
import { ReportStatus } from "@/types/admin";
import type { ReportResponse } from "@/types/admin";
import { toast } from "sonner";

type ResolveAction = "DELETE_POST" | "HIDE_POST" | "DISMISS" | "RESOLVE_ONLY";

interface ResolveReportDialogProps {
  report: ReportResponse | null;
  onClose: () => void;
  onResolved: (reportId: string, status: ReportStatus) => void;
}

const ACTION_OPTIONS: Array<{ action: ResolveAction; label: string; description: string; icon: typeof Trash2; className: string }> = [
  {
    action: "DELETE_POST",
    label: "Delete the post",
    description: "Permanently remove the reported post from the platform.",
    icon: Trash2,
    className: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  },
  {
    action: "HIDE_POST",
    label: "Hide post (restrict visibility)",
    description: "TODO: Backend admin endpoint to change post visibility is not yet available.",
    icon: EyeOff,
    className: "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed",
  },
  {
    action: "DISMISS",
    label: "Dismiss report",
    description: "Mark the report as dismissed — no action taken on the post.",
    icon: XCircle,
    className: "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
  },
  {
    action: "RESOLVE_ONLY",
    label: "Mark as resolved (no post action)",
    description: "Close the report without modifying or removing the post.",
    icon: CheckCircle,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  },
];

export function ResolveReportDialog({ report, onClose, onResolved }: ResolveReportDialogProps) {
  const [selectedAction, setSelectedAction] = useState<ResolveAction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!report) return null;

  const handleConfirm = async () => {
    if (!selectedAction || selectedAction === "HIDE_POST") return;
    setIsSubmitting(true);
    try {
      if (selectedAction === "DELETE_POST") {
        const deleteRes = await adminService.deletePost(report.postId);
        if (deleteRes.code !== 1000) {
          toast.error(deleteRes.message || "Failed to delete post");
          return;
        }
        const statusRes = await reportService.updateStatus(report.id, ReportStatus.RESOLVED);
        if (statusRes.code === 1000) {
          toast.success("Post deleted and report resolved");
          // TODO: Send notification to affected user (reportedUserId) when backend
          // notification API supports post-moderation events.
          onResolved(report.id, ReportStatus.RESOLVED);
          onClose();
        } else {
          toast.error(statusRes.message || "Post deleted but failed to update report status");
        }
        return;
      }

      const targetStatus = selectedAction === "DISMISS" ? ReportStatus.DISMISSED : ReportStatus.RESOLVED;
      const statusRes = await reportService.updateStatus(report.id, targetStatus);
      if (statusRes.code === 1000) {
        toast.success(targetStatus === ReportStatus.DISMISSED ? "Report dismissed" : "Report resolved");
        // TODO: Send notification to affected user (reportedUserId) when backend
        // notification API supports post-moderation events.
        onResolved(report.id, targetStatus);
        onClose();
      } else {
        toast.error(statusRes.message || "Failed to update report status");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An error occurred";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedAction(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
        <h3 className="mb-1 text-sm font-bold text-slate-800">Take Action on Report</h3>
        <p className="mb-5 text-xs text-slate-400">
          Report ID: {report.id} · Post: <code className="bg-slate-100 px-1 rounded">{report.postId}</code>
        </p>

        <div className="space-y-2 mb-5">
          {ACTION_OPTIONS.map(({ action, label, description, icon: Icon, className }) => {
            const isDisabled = action === "HIDE_POST";
            return (
              <button
                key={action}
                type="button"
                disabled={isDisabled}
                onClick={() => !isDisabled && setSelectedAction(action)}
                className={`w-full flex items-start gap-3 rounded-xl border p-3 text-left transition-all duration-150 ${className} ${selectedAction === action ? "ring-2 ring-[#7c3aed]" : ""}`}
              >
                <Icon size={16} className="mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold">{label}</p>
                  <p className="text-[11px] mt-0.5 opacity-70">{description}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || !selectedAction || selectedAction === "HIDE_POST"}
            className="inline-flex items-center gap-2 rounded-xl bg-[#7c3aed] px-4 py-2 text-xs font-bold text-white hover:bg-[#6d28d9] disabled:opacity-40"
          >
            {isSubmitting && <Loader2 size={13} className="animate-spin" />}
            Confirm Action
          </button>
        </div>
      </div>
    </div>
  );
}
