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
    return (
        <div className="flex max-w-lg flex-col gap-1">
            <p className="text-sm font-semibold text-foreground">{fullName}</p>
            {!isLimited ? (
                <p className="whitespace-pre-line text-sm text-muted-foreground">
                    {bio || "No bio yet."}
                </p>
            ) : (
                <p className="text-sm italic text-muted-foreground">
                    This user has restricted their profile.
                </p>
            )}
        </div>
    );
}
