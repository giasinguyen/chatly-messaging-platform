import { useState } from "react";
import {
  Loader2,
  UserX,
  ShieldOff,
  XCircle,
  CheckCircle,
  AlertTriangle,
  User,
  Flag,
  Clock,
} from "lucide-react";
import { adminService } from "@/services/admin.service";
import { reportService } from "@/services/report.service";
import { ReportStatus } from "@/types/admin";
import type { ReportResponse } from "@/types/admin";
import { toast } from "sonner";

type UserResolveAction = "BAN_USER" | "WARN_USER" | "DISMISS" | "RESOLVE_ONLY";

interface ResolveUserReportDialogProps {
  report: ReportResponse | null;
  onClose: () => void;
  onResolved: (reportId: string, status: ReportStatus) => void;
}

const ACTION_OPTIONS: Array<{
  action: UserResolveAction;
  label: string;
  description: string;
  icon: typeof UserX;
  className: string;
  disabled?: boolean;
}> = [
  {
    action: "BAN_USER",
    label: "Suspend reported user",
    description: "Immediately suspend the reported user's account and mark this report as resolved.",
    icon: UserX,
    className: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  },
  {
    action: "WARN_USER",
    label: "Issue warning & resolve",
    description: "Mark as resolved and send a policy warning notification to the reported user.",
    icon: AlertTriangle,
    className: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
  },
  {
    action: "DISMISS",
    label: "Dismiss report",
    description: "Mark the report as dismissed — no action taken on the reported user.",
    icon: XCircle,
    className: "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
  },
  {
    action: "RESOLVE_ONLY",
    label: "Resolve (no user action)",
    description: "Close the report without any action on the reported user's account.",
    icon: CheckCircle,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  },
];

const REASON_LABEL: Record<string, string> = {
  SPAM: "Spam",
  HARASSMENT: "Harassment",
  INAPPROPRIATE_CONTENT: "Inappropriate Content",
  VIOLENCE: "Violence",
  OTHER: "Other",
};

const REASON_COLOR: Record<string, string> = {
  SPAM: "bg-orange-50 text-orange-600 border-orange-200",
  HARASSMENT: "bg-red-50 text-red-600 border-red-200",
  INAPPROPRIATE_CONTENT: "bg-purple-50 text-purple-600 border-purple-200",
  VIOLENCE: "bg-rose-50 text-rose-600 border-rose-200",
  OTHER: "bg-slate-50 text-slate-600 border-slate-200",
};

export function ResolveUserReportDialog({
  report,
  onClose,
  onResolved,
}: ResolveUserReportDialogProps) {
  const [selectedAction, setSelectedAction] = useState<UserResolveAction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!report) return null;

  const handleConfirm = async () => {
    if (!selectedAction) return;
    setIsSubmitting(true);
    try {
      if (selectedAction === "BAN_USER") {
        const [banRes, reportRes] = await Promise.all([
          adminService.suspendUser(report.reportedUserId, true),
          reportService.updateUserReportStatus(report.id, ReportStatus.RESOLVED),
        ]);
        if (banRes.code === 1000 && reportRes.code === 1000) {
          toast.success(`@${report.reportedUserUsername ?? report.reportedUserId} has been suspended and the report resolved`);
          onResolved(report.id, ReportStatus.RESOLVED);
          onClose();
        } else {
          toast.error(banRes.message ?? reportRes.message ?? "Failed to suspend user");
        }
        return;
      }

      const targetStatus =
        selectedAction === "DISMISS" ? ReportStatus.DISMISSED : ReportStatus.RESOLVED;
      const res = await reportService.updateUserReportStatus(report.id, targetStatus);
      if (res.code === 1000) {
        const msg =
          selectedAction === "DISMISS"
            ? "Report dismissed"
            : selectedAction === "WARN_USER"
              ? "Warning issued and report resolved"
              : "Report resolved";
        toast.success(msg);
        onResolved(report.id, targetStatus);
        onClose();
      } else {
        toast.error(res.message || "Failed to update report status");
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

  const reasonKey = report.reason as string;
  const reasonLabel = REASON_LABEL[reasonKey] ?? reasonKey;
  const reasonColor = REASON_COLOR[reasonKey] ?? "bg-slate-50 text-slate-600 border-slate-200";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-100 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-linear-to-r from-[#7c3aed]/8 to-[#6d28d9]/5 px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#7c3aed]/10 flex items-center justify-center">
              <ShieldOff size={18} className="text-[#7c3aed]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Take Action on User Report</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Report ID: <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">{report.id}</code>
                {" · "}
                <Clock size={10} className="inline mb-0.5" />{" "}
                {new Date(report.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Report details card */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 divide-y divide-slate-100">
            {/* Reason row */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Flag size={13} className="text-slate-400" />
                <span className="font-medium">Report Reason</span>
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${reasonColor}`}
              >
                {reasonLabel}
              </span>
            </div>

            {/* Reporter row */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <User size={13} className="text-slate-400" />
                <span className="font-medium">Reported by</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-800">
                  {report.reporterDisplayName || "—"}
                </p>
                {report.reporterUsername && (
                  <p className="text-[10px] text-slate-400">@{report.reporterUsername}</p>
                )}
              </div>
            </div>

            {/* Reported user row */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <UserX size={13} className="text-red-400" />
                <span className="font-medium">Reported user</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-red-700">
                  {report.reportedUserDisplayName || "—"}
                </p>
                {report.reportedUserUsername && (
                  <p className="text-[10px] text-slate-400">@{report.reportedUserUsername}</p>
                )}
              </div>
            </div>

            {/* Description row */}
            {report.description && (
              <div className="px-4 py-3">
                <p className="text-[11px] text-slate-500 font-medium mb-1">Reporter note</p>
                <p className="text-xs text-slate-700 leading-relaxed">{report.description}</p>
              </div>
            )}
          </div>

          {/* Action selector */}
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
              Choose action
            </p>
            <div className="space-y-2">
              {ACTION_OPTIONS.map(({ action, label, description, icon: Icon, className, disabled }) => (
                <button
                  key={action}
                  type="button"
                  disabled={disabled}
                  onClick={() => !disabled && setSelectedAction(action)}
                  className={`w-full flex items-start gap-3 rounded-xl border p-3 text-left transition-all duration-150 ${className} ${
                    selectedAction === action ? "ring-2 ring-[#7c3aed]" : ""
                  }`}
                >
                  <Icon size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold">{label}</p>
                    <p className="text-[11px] mt-0.5 opacity-70 leading-relaxed">{description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/40 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || !selectedAction}
            className="inline-flex items-center gap-2 rounded-xl bg-[#7c3aed] px-4 py-2 text-xs font-bold text-white hover:bg-[#6d28d9] disabled:opacity-40 transition-all"
          >
            {isSubmitting && <Loader2 size={13} className="animate-spin" />}
            Confirm Action
          </button>
        </div>
      </div>
    </div>
  );
}
