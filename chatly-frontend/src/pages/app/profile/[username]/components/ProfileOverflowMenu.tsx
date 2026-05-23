import {
    Ban,
    Link as LinkIcon,
    MessageCircle,
    MoreHorizontal,
    Siren,
    Unlock,
    UserMinus,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProfileOverflowMenuProps {
    contactStatus: string | null;
    direction: "I_BLOCKED" | "BLOCKED_ME" | null;
    onCopyLink: () => void;
    onMessage: () => void;
    onReportUser: () => void;
    onSetConfirmDialog: (value: "block" | "unblock" | "remove") => void;
}

export function ProfileOverflowMenu({
    contactStatus,
    direction,
    onCopyLink,
    onMessage,
    onReportUser,
    onSetConfirmDialog,
}: ProfileOverflowMenuProps) {
    const canMessage = contactStatus === "ACCEPTED" && !direction;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                aria-label="Profile actions"
                className={buttonVariants({
                    variant: "outline",
                    size: "icon",
                    className: "shrink-0",
                })}
            >
                <MoreHorizontal className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={onCopyLink}>
                    <LinkIcon className="mr-2 size-4" /> Copy profile link
                </DropdownMenuItem>
                {canMessage && (
                    <DropdownMenuItem onClick={onMessage}>
                        <MessageCircle className="mr-2 size-4" /> Send message
                    </DropdownMenuItem>
                )}
                {canMessage && (
                    <DropdownMenuItem
                        onClick={() => onSetConfirmDialog("remove")}
                        className="text-destructive focus:text-destructive"
                    >
                        <UserMinus className="mr-2 size-4" /> Remove friend
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={onReportUser}
                    className="text-destructive focus:text-destructive"
                >
                    <Siren className="mr-2 size-4" /> Report user
                </DropdownMenuItem>
                {!direction && (
                    <DropdownMenuItem
                        onClick={() => onSetConfirmDialog("block")}
                        className="text-destructive focus:text-destructive"
                    >
                        <Ban className="mr-2 size-4" /> Block user
                    </DropdownMenuItem>
                )}
                {direction === "I_BLOCKED" && (
                    <DropdownMenuItem onClick={() => onSetConfirmDialog("unblock")}>
                        <Unlock className="mr-2 size-4" /> Unblock user
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
