interface ProfileBioSectionProps {
    displayUsername: string;
    bio?: string;
    isLimited: boolean;
}

export function ProfileBioSection({
    displayUsername,
    bio,
    isLimited,
}: ProfileBioSectionProps) {
    return (
        <div className="flex max-w-lg flex-col gap-1">
            <p className="text-sm font-bold text-foreground">@{displayUsername}</p>
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
