import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { authService } from '../services/auth.service';
import { LayoutDashboard, Users, ShieldAlert, LogOut, Bell, Shield } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (err: unknown) {
      console.error(err);
    }
    clearAuth();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/users', label: 'User Management', icon: Users },
    { to: '/reports', label: 'Spam & Abuse', icon: ShieldAlert },
  ];

  return (
    <div className="flex h-screen bg-[#faf8ff] overflow-hidden">
      {/* Sidebar - Fixed 260px */}
      <aside className="w-[260px] bg-white border-r border-slate-100 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo */}
          <div className="h-16 px-6 flex items-center gap-2.5 border-b border-slate-50">
            <div className="w-8 h-8 rounded-lg bg-[#005ab3] flex items-center justify-center text-white shadow-sm">
              <Shield size={18} className="stroke-[2.5]" />
            </div>
            <div>
              <span className="font-bold text-[#2c3e50] tracking-tight text-base font-outfit">Control Center</span>
              <span className="block text-[10px] font-semibold text-[#505f76] tracking-wider uppercase">Chatly Admin</span>
            </div>
          </div>

          {/* Nav list */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-[#005ab3]/8 text-[#005ab3]'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
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

        {/* User profile & Logout */}
        <div className="p-4 border-t border-slate-50">
          <div className="flex items-center gap-3 p-2 mb-3 bg-slate-50/50 rounded-xl">
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
              alt="Avatar"
              className="w-9 h-9 rounded-full object-cover border border-slate-200"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 truncate leading-tight">
                {user?.displayName || 'Administrator'}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                @{user?.username || 'admin'}
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

      {/* Main content pane */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-100 px-8 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-slate-800 font-outfit">
            System Control Panel
          </h2>
          <div className="flex items-center gap-4">
            <button className="w-9 h-9 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 flex items-center justify-center transition-all duration-150 relative">
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-500"></span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
