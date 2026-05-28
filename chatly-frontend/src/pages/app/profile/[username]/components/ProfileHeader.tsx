import {
    Ban,
    Check,
    Loader2,
    MessageCircle,
    ShieldOff,
    ShieldAlert,
    Unlock,
    UserMinus,
    UserPlus,
    X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AdminBadge } from "@/components/customize/AdminBadge";
import { EditProfileModal } from "./EditProfileModal";
import { ProfileBioSection } from "./ProfileBioSection";
import { ProfileOverflowMenu } from "./ProfileOverflowMenu";
import { ProfileStats } from "./ProfileStats";

interface ProfileHeaderProps {
    fullName: string;
    displayUsername: string;
    userInitial: string;
    avatarUrl?: string;
    hasActiveStories: boolean;
    isOwnProfile: boolean;
    isLimited: boolean;
    contactStatus: string | null;
    direction: "I_BLOCKED" | "BLOCKED_ME" | null;
    iSentRequest: boolean;
    theySentRequest: boolean;
    bio?: string;
    postCount: number;
    friendCount: number;
    actionLoading: boolean;
    onOpenStoryViewer: () => void;
    onOpenFriends: () => void;
    onSendFriendRequest: () => void;
    onCancelRequest: () => void;
    onAcceptRequest: () => void;
    onMessage: () => void;
    onCopyLink: () => void;
    onReportUser: () => void;
    onSetConfirmDialog: (value: "block" | "unblock" | "remove") => void;
    suspended?: boolean;
    role?: "USER" | "ADMIN";
}

export function ProfileHeader({
    fullName,
    displayUsername,
    userInitial,
    avatarUrl,
    hasActiveStories,
    isOwnProfile,
    isLimited,
    contactStatus,
    direction,
    iSentRequest,
    theySentRequest,
    bio,
    postCount,
    friendCount,
    actionLoading,
    onOpenStoryViewer,
    onOpenFriends,
    onSendFriendRequest,
    onCancelRequest,
    onAcceptRequest,
    onMessage,
    onCopyLink,
    onReportUser,
    onSetConfirmDialog,
    suspended = false,
    role,
}: ProfileHeaderProps) {
    const { t } = useTranslation();
    return (
        <section className="mb-10 grid gap-6 border-b border-border pb-10 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-10 lg:grid-cols-[12rem_minmax(0,1fr)] lg:px-10">
            <div
                className={cn(
                    "relative mx-auto grid h-fit w-fit shrink-0 place-items-center rounded-full sm:mx-0",
                    hasActiveStories &&
                        "cursor-pointer bg-linear-to-tr from-brand via-blue-500 to-cyan-400 p-1",
                )}
                onClick={hasActiveStories ? onOpenStoryViewer : undefined}
            >
                <Avatar
                    className={cn(
                        "size-28 rounded-full border border-border bg-muted sm:size-36 lg:size-40",
                        hasActiveStories && "border-4 border-background",
                    )}
                >
                    <AvatarImage src={avatarUrl} className="object-cover" />
                    <AvatarFallback className="bg-linear-to-tr from-pink-400 to-indigo-500 text-4xl font-semibold text-white">
                        {userInitial}
                    </AvatarFallback>
                </Avatar>
            </div>

            <div className="flex min-w-0 flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                    <h1 className="min-w-0 text-xl font-semibold text-foreground md:text-2xl">
                        {displayUsername}
                    </h1>
                    {role === "ADMIN" && <AdminBadge className="size-5" />}
                    {direction === "I_BLOCKED" && (
                        <Badge variant="destructive" className="gap-1">
                            <Ban className="size-3" /> {t("profile.blocked_badge")}
                        </Badge>
                    )}
                    {suspended && !isOwnProfile && (
                        <Badge variant="destructive" className="gap-1 bg-red-100 text-red-700 border-red-200">
                            <ShieldAlert className="size-3" /> {t("profile.account_suspended_badge")}
                        </Badge>
                    )}
                    {isLimited && direction !== "I_BLOCKED" && (
                        <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-700">
                            <ShieldOff className="size-3" /> {t("profile.limited_badge")}
                        </Badge>
                    )}
                    {contactStatus === "ACCEPTED" && !direction && (
                        <Badge variant="secondary" className="gap-1">
                            <Check className="size-3" /> Friends
                        </Badge>
                    )}
                </div>

                <ProfileStats
                    postCount={postCount}
                    friendCount={friendCount}
                    onOpenFriends={onOpenFriends}
                />

                <ProfileBioSection
                    fullName={fullName}
                    bio={bio}
                    isLimited={isLimited}
                />

                <div className="flex w-full gap-2 sm:max-w-xl">
                    {!(suspended && !isOwnProfile) && (isOwnProfile ? (
                        <EditProfileModal username={displayUsername} />
                    ) : direction === "I_BLOCKED" ? (
                        <Button
                            variant="outline"
                            onClick={() => onSetConfirmDialog("unblock")}
                            disabled={actionLoading}
                        >
                            <Unlock className="mr-2 size-4" /> {t("profile.unblock")}
                        </Button>
                    ) : (
                        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                            {contactStatus === "ACCEPTED" ? (
                                <Button
                                    variant="outline"
                                    onClick={() => onSetConfirmDialog("remove")}
                                    disabled={actionLoading}
                                >
                                    <UserMinus className="mr-2 size-4" /> Unfriend
                                </Button>
                            ) : theySentRequest ? (
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <Button onClick={onAcceptRequest} disabled={actionLoading}>
                                        <Check className="mr-2 size-4" /> {t("profile.accept")}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={onCancelRequest}
                                        disabled={actionLoading}
                                    >
                                        <X className="mr-2 size-4" /> {t("profile.decline")}
                                    </Button>
                                </div>
                            ) : iSentRequest ? (
                                <Button
                                    variant="outline"
                                    onClick={onCancelRequest}
                                    disabled={actionLoading}
                                >
                                    <X className="mr-2 size-4" /> {t("profile.cancel_request")}
                                </Button>
                            ) : (
                                <Button onClick={onSendFriendRequest} disabled={actionLoading}>
                                    {actionLoading ? (
                                        <Loader2 className="mr-2 size-4 animate-spin" />
                                    ) : (
                                        <UserPlus className="mr-2 size-4" />
                                    )}
                                    {t("profile.add_friend")}
                                </Button>
                            )}
                            <Button onClick={onMessage} disabled={actionLoading}>
                                <MessageCircle className="mr-2 size-4" /> {t("profile.message")}
                            </Button>
                        </div>
                    ))}

                    {!isOwnProfile && (
                        <ProfileOverflowMenu
                            contactStatus={contactStatus}
                            direction={direction}
                            onCopyLink={onCopyLink}
                            onMessage={onMessage}
                            onReportUser={onReportUser}
                            onSetConfirmDialog={onSetConfirmDialog}
                        />
                    )}
                </div>
            </div>
        </section>
    );
}
