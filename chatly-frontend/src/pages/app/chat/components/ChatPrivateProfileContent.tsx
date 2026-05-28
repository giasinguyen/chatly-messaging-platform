import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    CalendarDays,
    Loader2,
    Phone,
    ShieldOff,
    Unlock,
    UserPlus,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminBadge } from "@/components/customize/AdminBadge";
import {
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { PresenceIndicator } from "@/components/customize/PresenceIndicator";
import type { ChatUser } from "@/types/message";
import type { BlockStatusResponse, ContactStatus } from "@/types/contact";
import { formatDob } from "./chatWindow.utils";

export interface ChatPrivateProfileContentProps {
    profileUser: ChatUser;
    participantId: string;
    isGroup: boolean;
    participantPresence?: { status: string; lastSeen: string | null };
    blockStatus: BlockStatusResponse | null;
    contactStatus: ContactStatus | null;
    canAddFriend: boolean;
    currentUserId: string | undefined;
    sendingContact: boolean;
    blockActionLoading: boolean;
    reportUserSubmitting: boolean;
    onAddFriend: () => void;
    onReportUser: () => void;
    onRequestBlockAction: (action: "block" | "unblock") => void;
    onClose: () => void;
}

export const ChatPrivateProfileContent = memo(function ChatPrivateProfileContent({
    profileUser,
    participantId,
    isGroup,
    participantPresence,
    blockStatus,
    contactStatus,
    canAddFriend,
    currentUserId,
    sendingContact,
    blockActionLoading,
    reportUserSubmitting,
    onAddFriend,
    onReportUser,
    onRequestBlockAction,
    onClose,
}: ChatPrivateProfileContentProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const showPhone = profileUser.privacy?.showPhone !== false;
    const showDob = profileUser.privacy?.showDob !== false;

    return (
        <>
            <DialogHeader>
                <DialogTitle>{t("chat.user_information")}</DialogTitle>
                <DialogDescription>
                    {t("chat.profile_privacy_note")}
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <Avatar className="h-14 w-14 border border-border/60">
                        <AvatarImage src={profileUser.avatarUrl} />
                        <AvatarFallback>
                            {profileUser.displayName.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-1.5">
                            <p className="truncate text-base font-semibold text-foreground">
                                {profileUser.displayName}
                            </p>
                            {profileUser.role === "ADMIN" && <AdminBadge />}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                            @{profileUser.username || t("chat.unknown")}
                        </p>
                        {profileUser.id === participantId &&
                            !isGroup &&
                            participantPresence && (
                                <PresenceIndicator
                                    status={participantPresence.status}
                                    lastSeen={participantPresence.lastSeen}
                                    showLabel
                                    className="mt-1"
                                />
                            )}
                    </div>
                </div>
                <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                    {blockStatus?.direction === "BLOCKED_ME" ? (
                        <p className="text-sm text-muted-foreground text-center py-2">
                            {t("chat.profile_unavailable")}
                        </p>
                    ) : (
                        <>
                            <div className="flex items-center justify-between gap-2 text-sm">
                                <span className="inline-flex items-center gap-1 text-muted-foreground">
                                    <Phone size={14} />
                                    {t("chat.phone_label")}
                                </span>
                                <span className="font-medium text-foreground">
                                    {showPhone
                                        ? profileUser.phone || t("chat.not_updated")
                                        : t("chat.hidden")}
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-2 text-sm">
                                <span className="inline-flex items-center gap-1 text-muted-foreground">
                                    <CalendarDays size={14} />
                                    {t("chat.dob_label")}
                                </span>
                                <span className="font-medium text-foreground">
                                    {showDob ? formatDob(profileUser.dob) : t("chat.hidden")}
                                </span>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {contactStatus === "ACCEPTED" &&
                        blockStatus?.direction !== "I_BLOCKED" && (
                            <Badge variant="secondary">{t("chat.already_friends")}</Badge>
                        )}
                    {contactStatus === "PENDING" && (
                        <Badge variant="outline">{t("chat.request_sent")}</Badge>
                    )}
                    {blockStatus?.direction === "I_BLOCKED" && (
                        <Badge variant="destructive" className="gap-1">
                            <ShieldOff className="h-3 w-3" /> {t("chat.blocked_badge")}
                        </Badge>
                    )}
                    {blockStatus?.direction === "BLOCKED_ME" && (
                        <Badge variant="outline" className="text-muted-foreground gap-1">
                            {t("chat.limited_profile")}
                        </Badge>
                    )}
                </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
                {canAddFriend && !blockStatus?.blocked && (
                    <Button
                        onClick={onAddFriend}
                        disabled={sendingContact}
                        className="w-full sm:w-auto"
                    >
                        {sendingContact ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t("chat.sending")}
                            </>
                        ) : (
                            <>
                                <UserPlus className="mr-2 h-4 w-4" />
                                {t("chat.add_friend")}
                            </>
                        )}
                    </Button>
                )}
                {blockStatus?.direction === "I_BLOCKED" && (
                    <Button
                        variant="outline"
                        onClick={() => onRequestBlockAction("unblock")}
                        disabled={blockActionLoading}
                        className="w-full sm:w-auto"
                    >
                        <Unlock className="mr-2 h-4 w-4" />
                        {t("contact.unblock")}
                    </Button>
                )}
                {!blockStatus?.blocked &&
                    contactStatus === "ACCEPTED" &&
                    profileUser.id !== currentUserId && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRequestBlockAction("block")}
                            disabled={blockActionLoading}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full sm:w-auto"
                        >
                            <ShieldOff className="mr-2 h-4 w-4" />
                            {t("chat.block_user")}
                        </Button>
                    )}
                {profileUser.id !== currentUserId && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onReportUser}
                        disabled={reportUserSubmitting}
                        className="w-full sm:w-auto"
                    >
                        {reportUserSubmitting ? t("chat.reporting") : t("chat.report_user")}
                    </Button>
                )}
                {profileUser.id && profileUser.id !== currentUserId && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto ml-auto"
                        onClick={() => {
                            onClose();
                            navigate(`/u/${profileUser.username}`);
                        }}
                    >
                        {t("chat.view_full_profile")}
                    </Button>
                )}
            </DialogFooter>
        </>
    );
});
