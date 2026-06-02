import { useTranslation } from "react-i18next";

interface ProfileBioSectionProps {
    fullName: string;
    bio?: string;
    isLimited: boolean;
}

export function ProfileBioSection({
    fullName,
    bio,
    isLimited,
}: ProfileBioSectionProps) {
    const { t } = useTranslation();
    return (
        <div className="flex max-w-lg flex-col gap-1">
            <p className="text-sm font-semibold text-foreground">{fullName}</p>
            {!isLimited ? (
                <p className="whitespace-pre-line text-sm text-muted-foreground">
                    {bio || t("profile.no_bio_yet")}
                </p>
            ) : (
                <p className="text-sm italic text-muted-foreground">
                    {t("profile.restricted_profile")}
                </p>
            )}
        </div>
    );
}
