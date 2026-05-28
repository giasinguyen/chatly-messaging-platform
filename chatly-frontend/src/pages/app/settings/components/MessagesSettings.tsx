import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function MessagesSettings() {
    const { t } = useTranslation();

    return (
        <div className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto flex max-w-2xl flex-col gap-10">
                <section className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-lg font-bold text-foreground">{t("settings.messages.compose_title")}</h3>
                        <p className="text-sm text-muted-foreground">
                            {t("settings.messages.compose_description")}
                        </p>
                    </div>

                    <div className="rounded-xl border border-border bg-card/40 p-6 transition-all hover:border-border/80">
                        <RadioGroup disabled defaultValue="enter-send" className="flex flex-col gap-5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="send-enter">{t("settings.messages.enter_send")}</Label>
                                <RadioGroupItem value="enter-send" id="send-enter" />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="send-ctrl-enter">{t("settings.messages.ctrl_enter_send")}</Label>
                                <RadioGroupItem value="ctrl-enter-send" id="send-ctrl-enter" />
                            </div>
                        </RadioGroup>
                    </div>
                </section>

                <section className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-foreground">{t("settings.messages.link_preview_title")}</h3>
                    <div className="rounded-xl border border-border bg-card/40 p-6 transition-all hover:border-border/80">
                        <RadioGroup disabled defaultValue="enabled" className="flex flex-col gap-5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="link-preview-enabled">{t("settings.messages.enable_preview")}</Label>
                                <RadioGroupItem value="enabled" id="link-preview-enabled" />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="link-preview-disabled">{t("settings.messages.disable_preview")}</Label>
                                <RadioGroupItem value="disabled" id="link-preview-disabled" />
                            </div>
                        </RadioGroup>
                    </div>
                </section>
            </div>
        </div>
    );
}
