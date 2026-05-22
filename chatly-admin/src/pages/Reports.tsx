import React, { useEffect, useState } from 'react';
import { reportService } from '../services/report.service';
import { ReportResponse, ReportStatus } from '../services/types';
import { ShieldAlert, CheckCircle, XCircle, Clock, Link as LinkIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const Reports: React.FC = () => {
  const [reports, setReports] = useState<ReportResponse[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const statusParam = selectedStatus === 'ALL' ? undefined : selectedStatus;
      const response = await reportService.list(statusParam, 0, 55);
      if (response.code === 1000) {
        setReports(response.result.content);
      } else {
        toast.error(response.message || 'Failed to fetch reports');
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error('Failed to load reports from server');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedStatus]);

  const handleUpdateStatus = async (reportId: string, status: ReportStatus) => {
    setIsUpdating(reportId);
    try {
      const response = await reportService.updateStatus(reportId, status);
      if (response.code === 1000) {
        toast.success(`Report status updated to ${status}`);
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r));
      } else {
        toast.error(response.message || 'Failed to update report status');
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error('An error occurred updating report status');
    } finally {
      setIsUpdating(null);
    }
  };

  const getStatusBadge = (status: ReportStatus) => {
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
  };

  const statusFilters: Array<{ value: ReportStatus | 'ALL'; label: string }> = [
    { value: 'ALL', label: 'All Reports' },
    { value: ReportStatus.PENDING, label: 'Pending' },
    { value: ReportStatus.RESOLVED, label: 'Resolved' },
    { value: ReportStatus.DISMISSED, label: 'Dismissed' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight font-outfit">Spam & Abuse Moderation</h1>
          <p className="text-sm text-slate-500 font-medium">Moderate flagged social posts and inappropriate user activities</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setSelectedStatus(f.value)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                selectedStatus === f.value
                  ? 'bg-[#005ab3] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Feed */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white border border-slate-100 rounded-3xl h-64 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-[#005ab3]" />
          </div>
        ) : (
          <>
            {reports.map((r) => (
              <div key={r.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-lg">
                        {r.reason}
                      </span>
                      {getStatusBadge(r.status)}
                    </div>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                      Report ID: {r.id} • Created: {new Date(r.createdAt).toLocaleString()}
                    </p>
                  </div>
                  
                  {r.status === ReportStatus.PENDING && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateStatus(r.id, ReportStatus.RESOLVED)}
                        disabled={isUpdating === r.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 text-xs font-bold rounded-xl transition-all duration-150"
                      >
                        <CheckCircle size={14} />
                        <span>Resolve</span>
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(r.id, ReportStatus.DISMISSED)}
                        disabled={isUpdating === r.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-100 text-slate-500 hover:bg-slate-100 disabled:opacity-50 text-xs font-bold rounded-xl transition-all duration-150"
                      >
                        <XCircle size={14} />
                        <span>Dismiss</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-50">
                  <p className="text-sm font-semibold text-slate-800">Reasoning Description:</p>
                  <p className="text-sm text-slate-600 mt-1">{r.description || 'No detailed reasoning provided by reporter.'}</p>
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
                    <span>Flagged Post: <code className="bg-slate-50 px-1 py-0.5 rounded">{r.postId}</code></span>
                  </div>
                </div>
              </div>
            ))}

            {reports.length === 0 && (
              <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400 text-sm font-medium">
                No moderation reports logged
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
