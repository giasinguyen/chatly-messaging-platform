import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UtilitiesSettings() {
    const { t } = useTranslation();
    return (
        <div className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto flex max-w-2xl flex-col gap-10">
                <section className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-foreground">{t("settings.utilities.export_title")}</h3>
                    <div className="space-y-4 rounded-xl border border-border bg-card/40 p-6 transition-all hover:border-border/80">
                        <div className="space-y-2">
                            <Label htmlFor="export-email">{t("settings.utilities.export_email_label")}</Label>
                            <Input
                                id="export-email"
                                type="email"
                                defaultValue="thechallenger@iuh.edu.vn"
                            />
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={() => alert(t("settings.utilities.dev_mode"))} className="bg-brand text-white hover:bg-brand-hover">
                                {t("settings.utilities.request_export")}
                            </Button>
                        </div>
                    </div>
                </section>

                <section className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-foreground">{t("settings.utilities.shortcuts_title")}</h3>
                    <div className="space-y-3 rounded-xl border border-border bg-card/40 p-6 transition-all hover:border-border/80">
                        <ShortcutRow shortcut="Ctrl + K" description={t("settings.utilities.shortcut_search")} />
                        <ShortcutRow shortcut="Ctrl + Shift + M" description={t("settings.utilities.shortcut_mute")} />
                        <ShortcutRow shortcut="Ctrl + /" description={t("settings.utilities.shortcut_panel")} />
                    </div>
                </section>
            </div>
        </div>
    );
}

interface ShortcutRowProps {
    shortcut: string;
    description: string;
}

function ShortcutRow({ shortcut, description }: ShortcutRowProps) {
    return (
        <div className="flex items-center justify-between rounded-lg bg-muted/60 px-4 py-3 dark:bg-muted/40">
            <span className="text-sm text-foreground">{description}</span>
            <kbd className="rounded-md bg-background px-2 py-1 text-xs text-muted-foreground shadow-sm">
                {shortcut}
            </kbd>
        </div>
    );
}
