import { useCallback, useEffect, useState } from "react";
import { DashboardKpiCard } from "@/components/admin/DashboardKpiCard";
import { adminService } from "@/services/admin.service";
import type { AdminSettingsRequest, AdminSettingsResponse } from "@/types/admin";
import { Bot, CheckCircle, Loader2, RefreshCw, Save, Settings, Shield } from "lucide-react";
import { toast } from "sonner";

type BooleanSettingKey =
  | "publicRegistrationEnabled"
  | "userReportsEnabled"
  | "aiProactiveRepliesEnabled"
  | "maintenanceBannerEnabled";

type NumberSettingKey =
  | "sessionTimeoutDays"
  | "maxUploadSizeMb"
  | "messageRetentionDays"
  | "rateLimitWindowSeconds";

const toggleItems: Array<{ key: BooleanSettingKey; label: string; helper: string }> = [
  { key: "publicRegistrationEnabled", label: "Public registration", helper: "Allow new user signups" },
  { key: "userReportsEnabled", label: "User reports", helper: "Enable social report intake" },
  { key: "aiProactiveRepliesEnabled", label: "AI proactive replies", helper: "Allow assistant to answer in groups" },
  { key: "maintenanceBannerEnabled", label: "Maintenance banner", helper: "Show a platform-wide notice" },
];

const limitItems: Array<{ key: NumberSettingKey; label: string; suffix: string }> = [
  { key: "sessionTimeoutDays", label: "Session timeout", suffix: "days" },
  { key: "maxUploadSizeMb", label: "Max upload size", suffix: "MB" },
  { key: "messageRetentionDays", label: "Message retention", suffix: "days" },
  { key: "rateLimitWindowSeconds", label: "Rate limit window", suffix: "seconds" },
];

function buildSettingsRequest(settings: AdminSettingsResponse): AdminSettingsRequest {
  return {
    publicRegistrationEnabled: settings.publicRegistrationEnabled,
    userReportsEnabled: settings.userReportsEnabled,
    aiProactiveRepliesEnabled: settings.aiProactiveRepliesEnabled,
    maintenanceBannerEnabled: settings.maintenanceBannerEnabled,
    sessionTimeoutDays: settings.sessionTimeoutDays,
    maxUploadSizeMb: settings.maxUploadSizeMb,
    messageRetentionDays: settings.messageRetentionDays,
    rateLimitWindowSeconds: settings.rateLimitWindowSeconds,
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AdminSettingsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadSettings = useCallback(async (showToast = false) => {
    if (showToast) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const response = await adminService.getSettings();
      if (response.code === 1000) {
        setSettings(response.result);
        if (showToast) {
          toast.success("Settings refreshed");
        }
      } else {
        toast.error(response.message || "Failed to load settings");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load settings";
      toast.error(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleToggle = (key: BooleanSettingKey) => {
    setSettings((current) =>
      current ? { ...current, [key]: !current[key] } : current
    );
  };

  const handleLimitChange = (key: NumberSettingKey, value: string) => {
    const numericValue = Number(value);
    setSettings((current) =>
      current ? { ...current, [key]: Number.isNaN(numericValue) ? 0 : numericValue } : current
    );
  };

  const handleSave = async () => {
    if (!settings) {
      return;
    }
    setIsSaving(true);
    try {
      const response = await adminService.updateSettings(buildSettingsRequest(settings));
      if (response.code === 1000) {
        setSettings(response.result);
        toast.success("Settings saved");
      } else {
        toast.error(response.message || "Failed to save settings");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save settings";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#7c3aed]" />
      </div>
    );
  }

  const enabledPolicies = toggleItems.filter((item) => settings[item.key]).length;
  const retentionLabel = settings.messageRetentionDays === 0 ? "Unlimited" : `${settings.messageRetentionDays} days`;

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      <div className="flex justify-end gap-3">
        <button onClick={() => loadSettings(true)} disabled={isRefreshing} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700 disabled:opacity-50">
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          Refresh
        </button>
        <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 rounded-xl bg-[#7c3aed] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#6d28d9] disabled:opacity-50">
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
        <DashboardKpiCard label="Enabled Policies" value={`${enabledPolicies}/${toggleItems.length}`} helper="Live admin settings" icon={Settings} colorClass="text-purple-600 bg-purple-50 border-purple-100" />
        <DashboardKpiCard label="Session Timeout" value={`${settings.sessionTimeoutDays}d`} helper="Token/session policy" icon={Shield} colorClass="text-blue-600 bg-blue-50 border-blue-100" />
        <DashboardKpiCard label="Upload Limit" value={`${settings.maxUploadSizeMb}MB`} helper="File policy" icon={CheckCircle} colorClass="text-emerald-600 bg-emerald-50 border-emerald-100" />
        <DashboardKpiCard label="AI Replies" value={settings.aiProactiveRepliesEnabled ? "On" : "Off"} helper="Group assistant behavior" icon={Bot} colorClass="text-amber-600 bg-amber-50 border-amber-100" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800">Policy Toggles</h3>
          <div className="mt-4 space-y-3">
            {toggleItems.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{item.label}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{item.helper}</p>
                </div>
                <button type="button" onClick={() => handleToggle(item.key)} className={`h-6 w-12 rounded-full border p-0.5 transition-all ${settings[item.key] ? "border-purple-200 bg-purple-100" : "border-slate-200 bg-slate-100"}`}>
                  <span className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-all ${settings[item.key] ? "ml-5" : "ml-0"}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800">Operational Limits</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {limitItems.map((item) => (
              <label key={item.key} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <span className="text-[11px] font-semibold uppercase text-slate-400">{item.label}</span>
                <div className="mt-2 flex items-center gap-2">
                  <input type="number" min={item.key === "messageRetentionDays" ? 0 : 1} value={settings[item.key]} onChange={(event) => handleLimitChange(item.key, event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-[#7c3aed]" />
                  <span className="text-xs font-semibold text-slate-400">{item.suffix}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-slate-800">Current Retention Policy</p>
        <p className="mt-1 text-xs text-slate-500">
          Messages are retained for {retentionLabel}. Last updated: {settings.updatedAt ? new Date(settings.updatedAt).toLocaleString() : "not recorded"}.
        </p>
      </div>
    </div>
  );
}
