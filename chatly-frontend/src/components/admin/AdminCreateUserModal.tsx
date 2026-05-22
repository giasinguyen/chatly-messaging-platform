import { useState } from "react";
import type { FormEvent } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { adminService } from "@/services/admin.service";
import type { AdminCreateUserRequest } from "@/types/admin";
import type { UserResponse } from "@/types/auth";

interface AdminCreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (user: UserResponse) => void;
}

const initialForm: AdminCreateUserRequest = {
  username: "",
  displayName: "",
  email: "",
  phone: "",
  password: "",
  avatarUrl: "",
  bio: "",
};

export default function AdminCreateUserModal({
  isOpen,
  onClose,
  onCreated,
}: AdminCreateUserModalProps) {
  const [form, setForm] = useState<AdminCreateUserRequest>(initialForm);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleChange = (field: keyof AdminCreateUserRequest, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleClose = () => {
    setForm(initialForm);
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const response = await adminService.createUser({
        ...form,
        email: form.email?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        avatarUrl: form.avatarUrl?.trim() || undefined,
        bio: form.bio?.trim() || undefined,
      });

      if (response.code === 1000) {
        toast.success("User created successfully");
        onCreated(response.result);
        handleClose();
      } else {
        toast.error(response.message || "Failed to create user");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create user";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-100 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Create User</h2>
            <p className="mt-1 text-xs text-slate-500">
              Add a platform account with admin-managed credentials.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close create user"
            onClick={handleClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-xs font-bold uppercase text-slate-400">
              Username
              <input
                required
                value={form.username}
                onChange={(event) => handleChange("username", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium normal-case text-slate-700 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20"
              />
            </label>
            <label className="space-y-1.5 text-xs font-bold uppercase text-slate-400">
              Display Name
              <input
                required
                value={form.displayName}
                onChange={(event) => handleChange("displayName", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium normal-case text-slate-700 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20"
              />
            </label>
            <label className="space-y-1.5 text-xs font-bold uppercase text-slate-400">
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) => handleChange("email", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium normal-case text-slate-700 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20"
              />
            </label>
            <label className="space-y-1.5 text-xs font-bold uppercase text-slate-400">
              Phone
              <input
                value={form.phone}
                onChange={(event) => handleChange("phone", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium normal-case text-slate-700 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20"
              />
            </label>
            <label className="space-y-1.5 text-xs font-bold uppercase text-slate-400">
              Password
              <input
                required
                minLength={6}
                type="password"
                value={form.password}
                onChange={(event) => handleChange("password", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium normal-case text-slate-700 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20"
              />
            </label>
            <label className="space-y-1.5 text-xs font-bold uppercase text-slate-400">
              Avatar URL
              <input
                value={form.avatarUrl}
                onChange={(event) => handleChange("avatarUrl", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium normal-case text-slate-700 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20"
              />
            </label>
          </div>

          <label className="block space-y-1.5 text-xs font-bold uppercase text-slate-400">
            Bio
            <textarea
              rows={3}
              value={form.bio}
              onChange={(event) => handleChange("bio", event.target.value)}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium normal-case text-slate-700 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20"
            />
          </label>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#7c3aed] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#6d28d9] disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
