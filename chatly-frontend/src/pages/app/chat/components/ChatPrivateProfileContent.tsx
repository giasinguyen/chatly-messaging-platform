import { memo } from "react";
import { useNavigate } from "react-router-dom";
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
    onAddFriend: () => void;
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
    onAddFriend,
    onRequestBlockAction,
    onClose,
}: ChatPrivateProfileContentProps) {
    const navigate = useNavigate();
    const showPhone = profileUser.privacy?.showPhone !== false;
    const showDob = profileUser.privacy?.showDob !== false;

    return (
        <>
            <DialogHeader>
                <DialogTitle>User Information</DialogTitle>
                <DialogDescription>
                    Profile visible based on privacy settings.
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
                        <p className="text-base font-semibold text-foreground truncate">
                            {profileUser.displayName}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                            @{profileUser.username || "unknown"}
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
                            Profile information is not available.
                        </p>
                    ) : (
                        <>
                            <div className="flex items-center justify-between gap-2 text-sm">
                                <span className="inline-flex items-center gap-1 text-muted-foreground">
                                    <Phone size={14} />
                                    Phone number
                                </span>
                                <span className="font-medium text-foreground">
                                    {showPhone
                                        ? profileUser.phone || "Not updated"
                                        : "Hidden"}
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-2 text-sm">
                                <span className="inline-flex items-center gap-1 text-muted-foreground">
                                    <CalendarDays size={14} />
                                    Date of birth
                                </span>
                                <span className="font-medium text-foreground">
                                    {showDob ? formatDob(profileUser.dob) : "Hidden"}
                                </span>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {contactStatus === "ACCEPTED" &&
                        blockStatus?.direction !== "I_BLOCKED" && (
                            <Badge variant="secondary">Already friends</Badge>
                        )}
                    {contactStatus === "PENDING" && (
                        <Badge variant="outline">Request sent</Badge>
                    )}
                    {blockStatus?.direction === "I_BLOCKED" && (
                        <Badge variant="destructive" className="gap-1">
                            <ShieldOff className="h-3 w-3" /> Blocked
                        </Badge>
                    )}
                    {blockStatus?.direction === "BLOCKED_ME" && (
                        <Badge variant="outline" className="text-muted-foreground gap-1">
                            Limited profile
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
                                Sending...
                            </>
                        ) : (
                            <>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Add Friend
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
                        Unblock
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
                            Block user
                        </Button>
                    )}
                {profileUser.id && profileUser.id !== currentUserId && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto ml-auto"
                        onClick={() => {
                            onClose();
                            navigate(`/profile/${profileUser.id}`);
                        }}
                    >
                        View full profile
                    </Button>
                )}
            </DialogFooter>
        </>
    );
});
