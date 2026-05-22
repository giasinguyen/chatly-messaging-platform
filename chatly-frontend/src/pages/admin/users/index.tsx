import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import AdminCreateUserModal from "@/components/admin/AdminCreateUserModal";
import AdminDetailPanel from "@/components/admin/AdminDetailPanel";
import AdminUserDetailContent from "@/components/admin/AdminUserDetailContent";
import { DashboardKpiCard } from "@/components/admin/DashboardKpiCard";
import { adminService } from "@/services/admin.service";
import type { UserResponse } from "@/types/auth";
import { Activity, Calendar, Loader2, Mail, Phone, Plus, Search, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : "Not available";
}

function getAvatarUrl(user: UserResponse) {
  return (
    user.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      user.displayName || user.username
    )}&background=7c3aed&color=fff&size=96`
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await adminService.listUsers({
        q: activeQuery || undefined,
        page,
        size: pageSize,
      });
      if (response.code === 1000) {
        setUsers(response.result.items);
        setTotalElements(response.result.totalElements);
        setTotalPages(response.result.totalPages);
      } else {
        toast.error(response.message || "Failed to load user records");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load users";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [activeQuery, page, pageSize]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onlineOnPage = useMemo(
    () => users.filter((user) => user.status === "ONLINE").length,
    [users]
  );
  const suspendedOnPage = useMemo(
    () => users.filter((user) => user.suspended).length,
    [users]
  );

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(0);
    setActiveQuery(searchQuery.trim());
  };

  const handlePageSizeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(event.target.value));
    setPage(0);
  };

  const handleOpenDetail = async (user: UserResponse) => {
    setSelectedUser(user);
    try {
      const response = await adminService.getUser(user.id);
      if (response.code === 1000) {
        setSelectedUser(response.result);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load user detail";
      toast.error(message);
    }
  };

  const handleToggleSuspend = async (user: UserResponse) => {
    const targetState = !user.suspended;
    setUpdatingUserId(user.id);
    try {
      const response = await adminService.suspendUser(user.id, targetState);
      if (response.code === 1000) {
        setUsers((current) =>
          current.map((item) =>
            item.id === user.id ? { ...item, suspended: targetState } : item
          )
        );
        setSelectedUser((current) =>
          current?.id === user.id ? { ...current, suspended: targetState } : current
        );
        toast.success(targetState ? "User suspended" : "User restored");
      } else {
        toast.error(response.message || "Failed to update user");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update user";
      toast.error(message);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleUserCreated = (user: UserResponse) => {
    setUsers((current) => [user, ...current].slice(0, pageSize));
    setTotalElements((current) => current + 1);
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
        <DashboardKpiCard
          label="Total Users"
          value={totalElements.toLocaleString()}
          helper="Admin directory"
          icon={Users}
          colorClass="text-purple-600 bg-purple-50 border-purple-100"
        />
        <DashboardKpiCard
          label="Loaded"
          value={users.length.toLocaleString()}
          helper="Current page"
          icon={Activity}
          colorClass="text-blue-600 bg-blue-50 border-blue-100"
        />
        <DashboardKpiCard
          label="Online Page"
          value={onlineOnPage.toLocaleString()}
          helper="Visible records"
          icon={ShieldCheck}
          colorClass="text-emerald-600 bg-emerald-50 border-emerald-100"
        />
        <DashboardKpiCard
          label="Suspended Page"
          value={suspendedOnPage.toLocaleString()}
          helper="Requires review"
          icon={ShieldAlert}
          colorClass="text-red-600 bg-red-50 border-red-100"
        />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full lg:max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search username, email, phone..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20"
          />
        </form>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 outline-none"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>{size} rows</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#7c3aed] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#6d28d9]"
          >
            <Plus size={14} />
            New User
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex h-72 items-center justify-center">
            <Loader2 size={28} className="animate-spin text-[#7c3aed]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-slate-100 bg-slate-50/70">
                <tr>
                  <th className="px-5 py-4 text-xs font-bold uppercase text-slate-400">User</th>
                  <th className="px-5 py-4 text-xs font-bold uppercase text-slate-400">Contact</th>
                  <th className="px-5 py-4 text-xs font-bold uppercase text-slate-400">Registered</th>
                  <th className="px-5 py-4 text-xs font-bold uppercase text-slate-400">Status</th>
                  <th className="px-5 py-4 text-right text-xs font-bold uppercase text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => handleOpenDetail(user)}
                    className="cursor-pointer hover:bg-slate-50/60"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <img src={getAvatarUrl(user)} alt={user.username} className="h-10 w-10 rounded-full border border-slate-100 object-cover" />
                        <div>
                          <p className="text-sm font-bold text-slate-800">{user.displayName}</p>
                          <p className="text-xs text-slate-400">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      <p className="flex items-center gap-1.5"><Mail size={13} />{user.email || "No email"}</p>
                      <p className="mt-1 flex items-center gap-1.5"><Phone size={13} />{user.phone || "No phone"}</p>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5"><Calendar size={13} />{formatDate(user.createdAt)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${user.suspended ? "border-red-100 bg-red-50 text-red-600" : "border-emerald-100 bg-emerald-50 text-emerald-600"}`}>
                        {user.suspended ? "SUSPENDED" : user.status || "OFFLINE"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleToggleSuspend(user);
                        }}
                        disabled={updatingUserId === user.id}
                        className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {user.suspended ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40">Previous</button>
          <span className="text-xs font-medium text-slate-500">Page {page + 1} of {totalPages}</span>
          <button onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} disabled={page >= totalPages - 1} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40">Next</button>
        </div>
      )}

      <AdminCreateUserModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={handleUserCreated} />

      {selectedUser && (
        <AdminDetailPanel
          title={selectedUser.displayName}
          subtitle={`@${selectedUser.username} / ${selectedUser.id}`}
          onClose={() => setSelectedUser(null)}
          footer={
            <button
              type="button"
              onClick={() => handleToggleSuspend(selectedUser)}
              disabled={updatingUserId === selectedUser.id}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {selectedUser.suspended ? "Restore User" : "Suspend User"}
            </button>
          }
        >
          <AdminUserDetailContent user={selectedUser} />
        </AdminDetailPanel>
      )}
    </div>
  );
}
