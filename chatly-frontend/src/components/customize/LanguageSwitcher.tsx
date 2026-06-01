import { useTranslation } from "react-i18next";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DEFAULT_LANGUAGE,
    SUPPORTED_LANGUAGES,
    setAppLanguage,
    type SupportedLanguage,
} from "@/i18n";

interface LanguageSwitcherProps {
    className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
    const { t, i18n } = useTranslation();
    const resolvedLanguage = i18n.resolvedLanguage ?? i18n.language;
    const current = (
        SUPPORTED_LANGUAGES.includes(resolvedLanguage as SupportedLanguage)
            ? resolvedLanguage
            : DEFAULT_LANGUAGE
    ) as SupportedLanguage;

    const labels: Record<SupportedLanguage, string> = {
        vi: t("settings.general.vietnamese"),
        en: t("settings.general.english"),
    };

    return (
        <Select
            value={current}
            onValueChange={(value) => setAppLanguage(value as SupportedLanguage)}
        >
            <SelectTrigger className={className ?? "w-[180px] bg-card border-border"}>
                <SelectValue
                    placeholder={t("settings.general.select_placeholder")}
                />
            </SelectTrigger>
            <SelectContent>
                {SUPPORTED_LANGUAGES.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                        {labels[lang]}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
