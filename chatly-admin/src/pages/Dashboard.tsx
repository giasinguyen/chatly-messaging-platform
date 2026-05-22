import React, { useEffect, useState } from 'react';
import { adminService } from '../services/admin.service';
import { AdminStatsResponse } from '../services/types';
import { CustomChart } from '../components/CustomChart';
import { Users, Activity, MessageSquare, Database, ShieldAlert, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await adminService.getStats();
        if (response.code === 1000) {
          setStats(response.result);
        } else {
          toast.error(response.message || 'Failed to load system metrics');
        }
      } catch (err: unknown) {
        console.error(err);
        toast.error('Unable to reach server. Please check connection.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 size={32} className="animate-spin text-[#005ab3]" />
        <span className="text-sm font-semibold text-slate-500">Retrieving system diagnostics...</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-center text-slate-400">
        Failed to load statistics. Please try reloading.
      </div>
    );
  }

  const kpiCards = [
    { label: 'Total Accounts', value: stats.totalUsers, icon: Users, color: 'text-blue-600 bg-blue-50 border-blue-100' },
    { label: 'Active Users', value: stats.activeUsers, icon: Activity, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { label: 'Chat Rooms', value: stats.totalConversations, icon: MessageSquare, color: 'text-violet-600 bg-violet-50 border-violet-100' },
    { label: 'Total Messages', value: stats.totalMessages, icon: Database, color: 'text-amber-600 bg-amber-50 border-amber-100' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Info */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight font-outfit">Dashboard Overview</h1>
        <p className="text-sm text-slate-500">Real-time usage metrics and system status briefings</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-white border border-slate-100 rounded-2xl p-6 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{card.label}</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-2 font-outfit">
                  {card.value.toLocaleString()}
                </h3>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${card.color}`}>
                <Icon size={22} className="stroke-[2.2]" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts & System Health Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CustomChart data={stats.userGrowth} />
        </div>

        {/* System Health */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-lg font-outfit mb-1">System Health</h3>
            <p className="text-xs text-slate-500 mb-5">Subsystem availability metrics</p>
            
            <div className="space-y-4">
              {stats.systemHealth.map((sh, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <span className="text-sm font-semibold text-slate-700">{sh.service}</span>
                    <span className="block text-[10px] text-slate-400">Response reliability</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-800">{sh.statusRate}%</span>
                    {sh.status === 'UP' ? (
                      <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md text-[10px] font-bold border border-emerald-100">UP</span>
                    ) : (
                      <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md text-[10px] font-bold border border-amber-100">DEGRADED</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-50 flex items-center gap-2 text-emerald-600 text-xs font-semibold">
            <CheckCircle size={16} />
            <span>All systems operational</span>
          </div>
        </div>
      </div>

      {/* Lower Timeline & Activity Log */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-slate-800 text-lg font-outfit mb-1">System Activity Timeline</h3>
        <p className="text-xs text-slate-500 mb-6">Recent user registrations and reporting occurrences</p>

        <div className="relative border-l border-slate-100 ml-4 pl-6 space-y-6">
          {stats.recentActivity.map((activity) => (
            <div key={activity.id} className="relative">
              {/* Dot indicator */}
              <span className={`absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center ${
                activity.type === 'USER_SIGNUP'
                  ? 'bg-blue-500'
                  : 'bg-red-500'
              }`} />
              
              <div>
                <span className="text-xs font-semibold text-slate-400">
                  {new Date(activity.timestamp).toLocaleString()}
                </span>
                <h4 className="text-sm font-bold text-slate-800 mt-0.5">
                  {activity.title}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  {activity.description}
                </p>
              </div>
            </div>
          ))}

          {stats.recentActivity.length === 0 && (
            <div className="text-center py-6 text-slate-400 text-sm">
              No recent occurrences logged
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
