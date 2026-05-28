import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function NotificationsSettings() {
    const { t } = useTranslation();

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
                        <RadioGroup disabled defaultValue="enabled" className="flex flex-col gap-5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="push-enabled">{t("settings.notifications.enable_push")}</Label>
                                <RadioGroupItem value="enabled" id="push-enabled" />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="push-disabled">{t("settings.notifications.disable_push")}</Label>
                                <RadioGroupItem value="disabled" id="push-disabled" />
                            </div>
                        </RadioGroup>
                    </div>
                </section>

                <section className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-foreground">{t("settings.notifications.sound_title")}</h3>
                    <div className="flex items-center justify-between rounded-xl border border-border bg-card/40 p-6 transition-all hover:border-border/80">
                        <Label htmlFor="notification-sound">{t("settings.notifications.sound_label")}</Label>
                        <Select disabled defaultValue="soft-bell">
                            <SelectTrigger id="notification-sound" className="w-[220px]">
                                <SelectValue placeholder={t("settings.notifications.sound_placeholder")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="soft-bell">{t("settings.notifications.sound_soft_bell")}</SelectItem>
                                <SelectItem value="classic-pop">{t("settings.notifications.sound_classic_pop")}</SelectItem>
                                <SelectItem value="silent">{t("settings.notifications.sound_silent")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </section>

                <section className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-foreground">{t("settings.notifications.dnd_title")}</h3>
                    <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-card/40 p-6 transition-all hover:border-border/80 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="dnd-start">{t("settings.notifications.dnd_start")}</Label>
                            <Input disabled id="dnd-start" type="time" defaultValue="22:00" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dnd-end">{t("settings.notifications.dnd_end")}</Label>
                            <Input disabled id="dnd-end" type="time" defaultValue="07:00" />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
