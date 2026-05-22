import React, { useEffect, useState } from "react";
import { userService } from "@/services/user.service";
import { adminService } from "@/services/admin.service";
import type { UserResponse } from "@/types/auth";
import {
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Mail,
  Phone,
  Calendar,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const fetchUsers = async (query = "") => {
    setIsLoading(true);
    try {
      if (query.trim()) {
        const response = await userService.search(query, 0, 50);
        if (response.code === 1000) {
          setUsers(response.result.items);
        }
      } else {
        const response = await userService.getAll();
        if (response.code === 1000) {
          setUsers(response.result);
        }
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to load user records");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(searchQuery);
  };

  const handleToggleSuspend = async (userId: string, currentStatus = false) => {
    setIsUpdating(userId);
    try {
      const targetState = !currentStatus;
      const response = await adminService.suspendUser(userId, targetState);
      if (response.code === 1000) {
        toast.success(
          targetState ? "User suspended successfully" : "User unsuspended successfully"
        );
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, suspended: targetState } : u))
        );
      } else {
        toast.error(response.message || "Action failed");
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("An error occurred during suspension toggle");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (
      !confirm(
        `Are you absolutely sure you want to permanently delete user @${username}? This action is irreversible.`
      )
    ) {
      return;
    }
    setIsUpdating(userId);
    try {
      const response = await userService.deleteUser(userId);
      if (response.code === 1000) {
        toast.success(`User @${username} deleted successfully`);
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      } else {
        toast.error(response.message || "Deletion failed");
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("An error occurred during user deletion");
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight font-outfit">
            User Management
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Verify credentials, toggle suspension, and restrict platform access
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] rounded-2xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all duration-150"
            placeholder="Search username, email..."
          />
          <button
            type="submit"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          >
            <Search size={16} />
          </button>
        </form>
      </div>

      {/* Users Card Table */}
      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-[#7c3aed]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    User Profile
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Contact Info
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Registered
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50/30 transition-colors duration-100"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            u.avatarUrl ||
                            "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"
                          }
                          alt={u.username}
                          className="w-10 h-10 rounded-full object-cover border border-slate-100"
                        />
                        <div>
                          <span className="font-bold text-slate-800 text-sm block leading-tight">
                            {u.displayName}
                          </span>
                          <span className="text-xs text-slate-400">@{u.username}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Mail size={13} className="text-slate-400" />
                        <span>{u.email}</span>
                      </div>
                      {u.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Phone size={13} className="text-slate-400" />
                          <span>{u.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Calendar size={13} className="text-slate-400" />
                        <span>
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {u.suspended ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100">
                          SUSPENDED
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            u.status === "ONLINE"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                              : u.status === "AWAY"
                              ? "bg-amber-50 text-amber-600 border-amber-100"
                              : "bg-slate-50 text-slate-400 border-slate-100"
                          }`}
                        >
                          {u.status || "OFFLINE"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => handleToggleSuspend(u.id, u.suspended)}
                          disabled={isUpdating === u.id}
                          className={`p-2 rounded-xl border transition-all duration-150 ${
                            u.suspended
                              ? "text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-100"
                              : "text-amber-600 bg-amber-50 border-amber-100 hover:bg-amber-100"
                          }`}
                          title={u.suspended ? "Unsuspend Account" : "Suspend Account"}
                        >
                          {u.suspended ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          disabled={isUpdating === u.id}
                          className="p-2 rounded-xl text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 transition-all duration-150"
                          title="Delete Account"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-slate-400 text-sm font-medium"
                    >
                      No user accounts found matching query
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default UsersPage;
