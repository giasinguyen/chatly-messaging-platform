import type { ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";
import { authService } from "@/services/auth.service";
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  LogOut,
  Bell,
  MessagesSquare,
  FileText,
  MessageSquare,
  Bot,
  Activity,
  ClipboardList,
  Settings,
} from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  {
    to: "/admin/dashboard",
    label: "Dashboard",
    headerTitle: "Dashboard Overview",
    headerDescription: "Live metrics and platform operations",
    icon: LayoutDashboard,
  },
  {
    to: "/admin/users",
    label: "User Management",
    headerTitle: "User Management",
    headerDescription: "Accounts, access status, and moderation controls",
    icon: Users,
  },
  {
    to: "/admin/conversations",
    label: "Conversations",
    headerTitle: "Conversations",
    headerDescription: "Direct chats, groups, membership, and routing status",
    icon: MessagesSquare,
  },
  {
    to: "/admin/posts",
    label: "Post Moderation",
    headerTitle: "Post Moderation",
    headerDescription: "Social content search and visibility review",
    icon: FileText,
  },
  {
    to: "/admin/reports",
    label: "Spam & Abuse",
    headerTitle: "Spam & Abuse",
    headerDescription: "Report queue and policy decisions",
    icon: ShieldAlert,
  },
  {
    to: "/admin/messages",
    label: "Message Moderation",
    headerTitle: "Message Moderation",
    headerDescription: "Message ledger, recall review, and delivery controls",
    icon: MessageSquare,
  },
  {
    to: "/admin/notifications",
    label: "Notifications",
    headerTitle: "Notifications",
    headerDescription: "Broadcasts, targeted notices, and dispatch history",
    icon: Bell,
  },
  {
    to: "/admin/ai-agent",
    label: "AI Agent",
    headerTitle: "AI Agent",
    headerDescription: "Agent sessions, health, and internal service checks",
    icon: Bot,
  },
  {
    to: "/admin/system",
    label: "System Health",
    headerTitle: "System Health",
    headerDescription: "Subsystem availability and infrastructure diagnostics",
    icon: Activity,
  },
  {
    to: "/admin/audit",
    label: "Audit Logs",
    headerTitle: "Audit Logs",
    headerDescription: "Administrative action trace and accountability",
    icon: ClipboardList,
  },
  {
    to: "/admin/settings",
    label: "Settings",
    headerTitle: "Settings",
    headerDescription: "Platform policies, limits, and operational defaults",
    icon: Settings,
  },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const activeItem =
    navItems.find((item) => location.pathname.startsWith(item.to)) ?? navItems[0];

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (err: unknown) {
      console.error(err);
    }
    clearAuth();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-[#faf8ff] overflow-hidden text-slate-800">
      <aside className="w-[260px] bg-white border-r border-slate-100 flex flex-col justify-between shrink-0">
        <div className="flex flex-col h-[calc(100vh-140px)] overflow-y-auto">
          <div className="h-16 px-6 flex items-center gap-2.5 border-b border-slate-50 shrink-0 sticky top-0 bg-white z-10">
            <img
              src="/chatly-logo-nobg.png"
              alt="Chatly Logo"
              className="w-9 h-9 object-contain"
            />
            <div>
              <span className="font-extrabold text-[#7c3aed] tracking-tight text-base font-outfit">
                Control Center
              </span>
              <span className="block text-[10px] font-semibold text-[#505f76] tracking-wider uppercase">
                Chatly Admin
              </span>
            </div>
          </div>

          {/* Nav list */}
          <nav className="p-4 space-y-1 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-[#7c3aed]/10 text-[#7c3aed] shadow-sm font-semibold"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }`
                  }
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-50 bg-white shrink-0">
          <div className="flex items-center gap-3 p-2 mb-3 bg-slate-50/50 rounded-xl">
            <img
              src={
                user?.avatarUrl ||
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
              }
              alt="Avatar"
              className="w-9 h-9 rounded-full object-cover border border-slate-200"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 truncate leading-tight">
                {user?.displayName || "Administrator"}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                @{user?.username || "admin"}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-150"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-100 px-8 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-800 font-outfit leading-tight">
              {activeItem.headerTitle}
            </h2>
            <p className="text-xs font-medium text-slate-400 truncate">
              {activeItem.headerDescription}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button className="w-9 h-9 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 flex items-center justify-center transition-all duration-150 relative">
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-500"></span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
export default AdminLayout;
