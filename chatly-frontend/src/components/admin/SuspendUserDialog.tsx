import { useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import type { UserResponse } from "@/types/auth";

interface SuspendUserDialogProps {
  user: UserResponse | null;
  isSuspending: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

export function SuspendUserDialog({ user, isSuspending, onConfirm, onClose }: SuspendUserDialogProps) {
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  if (!user) return null;

  const handleConfirm = () => {
    if (!reason.trim()) {
      setReasonError("Please enter a reason for suspending this account.");
      return;
    }
    setReasonError("");
    // TODO: Send suspend reason to backend when API supports it.
    // Current endpoint: PUT /api/admin/users/{id}/suspend?suspend=true — no reason parameter.
    onConfirm(reason.trim());
  };

  const handleClose = () => {
    setReason("");
    setReasonError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
            <ShieldAlert size={20} className="text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Suspend Account</h3>
            <p className="text-xs text-slate-400">@{user.username} · {user.displayName}</p>
          </div>
        </div>

        <p className="mb-4 text-xs text-slate-500">
          Suspending this account will immediately prevent the user from logging in. You must
          provide a reason for record-keeping purposes.
        </p>

        <label className="block mb-1 text-xs font-semibold text-slate-600" htmlFor="suspend-reason">
          Reason <span className="text-red-500">*</span>
        </label>
        <textarea
          id="suspend-reason"
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            if (event.target.value.trim()) setReasonError("");
          }}
          placeholder="e.g. Repeated policy violations — spamming, harassment..."
          rows={3}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 resize-none"
        />
        {reasonError && (
          <p className="mt-1 text-[11px] font-medium text-red-500">{reasonError}</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSuspending}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSuspending}
            className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-50"
          >
            {isSuspending && <Loader2 size={13} className="animate-spin" />}
            Confirm Suspend
          </button>
        </div>
      </div>
    </div>
  );
}
