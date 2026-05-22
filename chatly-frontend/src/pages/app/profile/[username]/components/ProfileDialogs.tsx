import { Loader2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { ContactResponse } from "@/types/contact";
import type { CreateUserReportRequest } from "@/types/userReport";
import type { ConfirmDialogType } from "./profile.types";
import { ReportUserDialog } from "./ReportUserDialog";

interface ProfileDialogsProps {
    confirmDialog: ConfirmDialogType | null;
    fullName: string;
    actionLoading: boolean;
    onSetConfirmDialog: (value: ConfirmDialogType | null) => void;
    onBlock: () => void;
    onUnblock: () => void;
    onRemove: () => void;
    showFriendsModal: boolean;
    onShowFriendsModalChange: (open: boolean) => void;
    friendCount: number;
    loadingFriends: boolean;
    friends: ContactResponse[];
    targetUserId: string | null;
    showReportUserDialog: boolean;
    isSubmittingUserReport: boolean;
    onShowReportUserDialogChange: (open: boolean) => void;
    onReportUser: (payload: CreateUserReportRequest) => void | Promise<void>;
}

export function ProfileDialogs({
    confirmDialog,
    fullName,
    actionLoading,
    onSetConfirmDialog,
    onBlock,
    onUnblock,
    onRemove,
    showFriendsModal,
    onShowFriendsModalChange,
    friendCount,
    loadingFriends,
    friends,
    targetUserId,
    showReportUserDialog,
    isSubmittingUserReport,
    onShowReportUserDialogChange,
    onReportUser,
}: ProfileDialogsProps) {
    const navigate = useNavigate();

    return (
        <>
            <AlertDialog
                open={confirmDialog === "block"}
                onOpenChange={(open) => !open && onSetConfirmDialog(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Block {fullName}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            They will not be able to send you messages or view your profile.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={onBlock}
                            disabled={actionLoading}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Block
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={confirmDialog === "unblock"}
                onOpenChange={(open) => !open && onSetConfirmDialog(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Unblock {fullName}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            They will be able to send you messages and view your profile again.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onUnblock} disabled={actionLoading}>
                            {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Unblock
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={confirmDialog === "remove"}
                onOpenChange={(open) => !open && onSetConfirmDialog(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove {fullName}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            They will be removed from your friends list.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={onRemove}
                            disabled={actionLoading}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={showFriendsModal} onOpenChange={onShowFriendsModalChange}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users size={18} /> Friends ({friendCount})
                        </DialogTitle>
                    </DialogHeader>

                    <div className="max-h-96 overflow-y-auto">
                        {loadingFriends ? (
                            <div className="flex justify-center py-6">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : friends.length === 0 ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">
                                No friends to display.
                            </p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {friends.map((record) => {
                                    const friend =
                                        record.user.id === targetUserId
                                            ? record.contact
                                            : record.user;

                                    return (
                                        <button
                                            key={record.id}
                                            type="button"
                                            className="flex items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted"
                                            onClick={() => {
                                                onShowFriendsModalChange(false);
                                                navigate(`/u/${friend.username}`);
                                            }}
                                        >
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage
                                                    src={friend.avatarUrl}
                                                    className="object-cover"
                                                />
                                                <AvatarFallback className="bg-linear-to-tr from-pink-400 to-indigo-500 text-sm font-semibold text-white">
                                                    {friend.displayName?.charAt(0)?.toUpperCase() ?? "U"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="text-sm font-semibold">
                                                    {friend.displayName}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    @{friend.username}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <ReportUserDialog
                open={showReportUserDialog}
                displayName={fullName}
                isSubmitting={isSubmittingUserReport}
                onOpenChange={onShowReportUserDialogChange}
                onSubmit={onReportUser}
            />
        </>
    );
}
