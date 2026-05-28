import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/customize/LanguageSwitcher";

export function GeneralSettings() {
    const { t } = useTranslation();

    return (
        <div className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-2xl mx-auto flex flex-col gap-10">
                <section className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-lg font-bold text-foreground">
                            {t("settings.general.language_title")}
                        </h3>
                    </div>

                    <div className="bg-card/40 border border-border rounded-xl p-6 transition-all hover:border-border/80 flex items-center justify-between">
                        <span className="text-sm font-medium">
                            {t("settings.general.change_language")}
                        </span>
                        <LanguageSwitcher />
                    </div>
                </section>
            </div>
        </div>
    );
}
