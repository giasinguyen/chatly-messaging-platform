import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { settingsService } from "@/services/settings.service";
import type { UserSettingsType, PrivacySettingsType } from "@/services/settings.service";
import { toast } from "sonner";

export function PrivacySettings() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<UserSettingsType | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await settingsService.getSettings();
                if (res.code === 1000) {
                    setSettings(res.result);
                }
            } catch {
                toast.error(t("settings.privacy.load_failed"));
            } finally {
                setLoading(false);
            }
        };
        void fetchSettings();
    }, []);

    const handleTogglePrivacy = async (key: keyof PrivacySettingsType) => {
        if (!settings) return;
        const currentVal = settings.privacy[key];
        const updatedVal = !currentVal;
        
        // Optimistic update
        const originalSettings = { ...settings };
        setSettings({
            ...settings,
            privacy: {
                ...settings.privacy,
                [key]: updatedVal,
            },
        });

        try {
            const res = await settingsService.updateSection("privacy", {
                [key]: updatedVal,
            });
            if (res.code === 1000) {
                setSettings(res.result);
                toast.success(t("settings.privacy.updated"));
            } else {
                setSettings(originalSettings);
                toast.error(t("settings.privacy.update_failed"));
            }
        } catch {
            setSettings(originalSettings);
            toast.error(t("settings.privacy.update_failed"));
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const showOnlineStatus = settings?.privacy?.showOnlineStatus ?? true;
    const showSeenStatus = settings?.privacy?.showReadReceipts ?? true;
    const showFriendList = settings?.privacy?.showFriendList ?? true;
    const allowFriendRequests = settings?.privacy?.allowFriendRequests ?? true;

    return (
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
                <section className="space-y-3">
                    <h3 className="text-2xl font-bold tracking-tight text-foreground">
                        {t("settings.privacy.title")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {t("settings.privacy.description")}
                    </p>
                </section>

                <section className="space-y-4">
                    <h4 className="text-xl font-semibold text-foreground">
                        {t("settings.privacy.personal_title")}
                    </h4>
                    <div className="space-y-1 rounded-xl border border-border bg-card/40 p-4 md:p-5">
                        <SettingRow label={t("settings.privacy.show_online_status")}>
                            <SettingSwitch
                                checked={showOnlineStatus}
                                onToggle={() => void handleTogglePrivacy("showOnlineStatus")}
                            />
                        </SettingRow>
                        <SettingRow
                            label={t("settings.privacy.show_friend_list")}
                            description={t("settings.privacy.show_friend_list_desc")}
                        >
                            <SettingSwitch
                                checked={showFriendList}
                                onToggle={() => void handleTogglePrivacy("showFriendList")}
                            />
                        </SettingRow>
                    </div>
                </section>

                <section className="space-y-4">
                    <h4 className="text-xl font-semibold text-foreground">
                        {t("settings.privacy.messages_calls_title")}
                    </h4>
                    <div className="space-y-1 rounded-xl border border-border bg-card/40 p-4 md:p-5">
                        <SettingRow label={t("settings.privacy.show_seen_status")}>
                            <SettingSwitch
                                checked={showSeenStatus}
                                onToggle={() => void handleTogglePrivacy("showReadReceipts")}
                            />
                        </SettingRow>
                        <SettingRow label={t("settings.privacy.allow_friend_requests")}>
                            <SettingSwitch
                                checked={allowFriendRequests}
                                onToggle={() => void handleTogglePrivacy("allowFriendRequests")}
                            />
                        </SettingRow>
                    </div>
                </section>
            </div>
        </div>
    );
}

function SettingRow({
    label,
    description,
    children,
}: {
    label: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-lg px-2 py-3">
            <div className="space-y-1">
                <p className="text-base font-medium text-foreground">{label}</p>
                {description && (
                    <p className="text-sm text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
            {children}
        </div>
    );
}

function SettingSwitch({
    checked,
    onToggle,
}: {
    checked: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={onToggle}
            className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                checked ? "bg-brand" : "bg-muted",
            )}
        >
            <span
                className={cn(
                    "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
                    checked ? "translate-x-5" : "translate-x-0.5",
                )}
            />
        </button>
    );
}
