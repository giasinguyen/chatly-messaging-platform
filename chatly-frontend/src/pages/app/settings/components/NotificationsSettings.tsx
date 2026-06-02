import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    useNotificationPrefsStore,
    type NotificationSound,
} from "@/store/notificationPrefs.store";

export function NotificationsSettings() {
    const { t } = useTranslation();
    const {
        browserNotificationsEnabled,
        setBrowserNotificationsEnabled,
        setSound,
        sound,
    } = useNotificationPrefsStore();

    const handleBrowserNotificationsChange = async (enabled: boolean) => {
        setBrowserNotificationsEnabled(enabled);
        if (
            enabled &&
            "Notification" in window &&
            Notification.permission === "default"
        ) {
            await Notification.requestPermission();
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto flex max-w-2xl flex-col gap-10">
                <section className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-lg font-bold text-foreground">{t("settings.notifications.push_title")}</h3>
                        <p className="text-sm text-muted-foreground">
                            {t("settings.notifications.push_description")}
                        </p>
                    </div>

                    <div className="rounded-xl border border-border bg-card/40 p-6 transition-all hover:border-border/80">
                        <div className="flex items-center justify-between gap-4">
                            <Label htmlFor="browser-notifications">
                                {t("settings.notifications.browser_notifications")}
                            </Label>
                            <Switch
                                id="browser-notifications"
                                checked={browserNotificationsEnabled}
                                onCheckedChange={(enabled) => {
                                    void handleBrowserNotificationsChange(enabled);
                                }}
                            />
                        </div>
                    </div>
                </section>

                <section className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-foreground">{t("settings.notifications.sound_title")}</h3>
                    <div className="flex items-center justify-between rounded-xl border border-border bg-card/40 p-6 transition-all hover:border-border/80">
                        <Label htmlFor="notification-sound">{t("settings.notifications.sound_label")}</Label>
                        <Select
                            value={sound}
                            onValueChange={(value) =>
                                setSound(value as NotificationSound)
                            }
                        >
                            <SelectTrigger id="notification-sound" className="w-[220px]">
                                <SelectValue placeholder={t("settings.notifications.sound_placeholder")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="soft-bell">{t("settings.notifications.sound_soft_bell")}</SelectItem>
                                <SelectItem value="iphone">{t("settings.notifications.sound_iphone")}</SelectItem>
                                <SelectItem value="silent">{t("settings.notifications.sound_silent")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </section>
            </div>
        </div>
    );
}
