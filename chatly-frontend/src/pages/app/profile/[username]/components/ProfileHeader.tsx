import {
    Ban,
    Check,
    Link as LinkIcon,
    Loader2,
    MessageCircle,
    MoreHorizontal,
    ShieldOff,
    Unlock,
    UserMinus,
    UserPlus,
    X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { EditProfileModal } from "./EditProfileModal";
import { ProfileBioSection } from "./ProfileBioSection";
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
    onSetConfirmDialog: (value: "block" | "unblock" | "remove") => void;
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
    onSetConfirmDialog,
}: ProfileHeaderProps) {
    return (
        <section className="mb-10 flex flex-col items-start gap-10 md:flex-row md:items-center">
            <div
                className={cn(
                    "relative shrink-0 rounded-full",
                    hasActiveStories &&
                        "cursor-pointer bg-linear-to-tr from-brand via-blue-500 to-cyan-400 p-1",
                )}
                onClick={hasActiveStories ? onOpenStoryViewer : undefined}
            >
                <div className={cn("rounded-full", hasActiveStories && "bg-background p-1")}>
                    <Avatar className="h-24 w-24 rounded-full border-4 border-background shadow-lg md:h-36 md:w-36">
                        <AvatarImage src={avatarUrl} className="object-cover" />
                        <AvatarFallback className="bg-linear-to-tr from-pink-400 to-indigo-500 text-4xl font-semibold text-white">
                            {userInitial}
                        </AvatarFallback>
                    </Avatar>
                </div>
            </div>

            <div className="flex w-full flex-1 flex-col gap-3">
                <div className="flex flex-col gap-6 md:flex-row md:items-center">
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                        {fullName}
                        {direction === "I_BLOCKED" && (
                            <Badge variant="destructive" className="gap-1 px-1.5 py-0">
                                <Ban size={12} /> Blocked
                            </Badge>
                        )}
                        {isLimited && direction !== "I_BLOCKED" && (
                            <Badge
                                variant="secondary"
                                className="gap-1 bg-amber-100 px-1.5 py-0 text-amber-700"
                            >
                                <ShieldOff size={12} /> Limited
                            </Badge>
                        )}
                        {contactStatus === "ACCEPTED" && !direction && (
                            <Badge variant="secondary" className="gap-1 px-1.5 py-0">
                                <Check size={12} /> Friends
                            </Badge>
                        )}
                    </h1>

                    <div className="flex flex-wrap items-center gap-2">
                        {isOwnProfile ? (
                            <EditProfileModal username={displayUsername} />
                        ) : (
                            <>
                                {direction === "I_BLOCKED" && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onSetConfirmDialog("unblock")}
                                        disabled={actionLoading}
                                    >
                                        <Unlock size={15} className="mr-2" /> Unblock
                                    </Button>
                                )}

                                {!direction && (
                                    <>
                                        {!contactStatus && (
                                            <Button
                                                size="sm"
                                                onClick={onSendFriendRequest}
                                                disabled={actionLoading}
                                            >
                                                {actionLoading ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <UserPlus size={15} className="mr-2" />
                                                )}
                                                Add Friend
                                            </Button>
                                        )}

                                        {iSentRequest && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={onCancelRequest}
                                                disabled={actionLoading}
                                            >
                                                <X size={15} className="mr-2" /> Cancel Request
                                            </Button>
                                        )}

                                        {theySentRequest && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    onClick={onAcceptRequest}
                                                    disabled={actionLoading}
                                                >
                                                    <Check size={15} className="mr-2" /> Accept
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={onCancelRequest}
                                                    disabled={actionLoading}
                                                >
                                                    <X size={15} className="mr-2" /> Decline
                                                </Button>
                                            </>
                                        )}

                                        {contactStatus === "ACCEPTED" && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    onClick={onMessage}
                                                    disabled={actionLoading}
                                                >
                                                    <MessageCircle size={15} className="mr-2" /> Message
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => onSetConfirmDialog("remove")}
                                                    disabled={actionLoading}
                                                >
                                                    <UserMinus size={15} className="mr-2" /> Remove Friend
                                                </Button>
                                            </>
                                        )}
                                    </>
                                )}

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="px-2">
                                            <MoreHorizontal size={16} />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-52">
                                        <DropdownMenuItem onClick={onCopyLink}>
                                            <LinkIcon size={14} className="mr-2" /> Copy profile link
                                        </DropdownMenuItem>
                                        {contactStatus === "ACCEPTED" && !direction && (
                                            <DropdownMenuItem onClick={onMessage}>
                                                <MessageCircle size={14} className="mr-2" /> Send message
                                            </DropdownMenuItem>
                                        )}
                                        {contactStatus === "ACCEPTED" && !direction && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => onSetConfirmDialog("remove")}
                                                    className="text-destructive focus:text-destructive"
                                                >
                                                    <UserMinus size={14} className="mr-2" /> Remove friend
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                        {!direction && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => onSetConfirmDialog("block")}
                                                    className="text-destructive focus:text-destructive"
                                                >
                                                    <Ban size={14} className="mr-2" /> Block user
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                        {direction === "I_BLOCKED" && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => onSetConfirmDialog("unblock")}
                                                >
                                                    <Unlock size={14} className="mr-2" /> Unblock user
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                        )}
                    </div>
                </div>

                <ProfileStats
                    postCount={postCount}
                    friendCount={friendCount}
                    onOpenFriends={onOpenFriends}
                />

                <ProfileBioSection
                    displayUsername={displayUsername}
                    bio={bio}
                    isLimited={isLimited}
                />
            </div>
        </section>
    );
}
