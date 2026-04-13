import {
    ArrowLeft,
    Ban,
    CalendarDays,
    Check,
    Flag,
    Link as LinkIcon,
    Loader2,
    Mail,
    MapPin,
    MessageCircle,
    MoreHorizontal,
    Phone,
    ShieldCheck,
    ShieldOff,
    Unlock,
    UserMinus,
    UserPlus,
    X,
} from "lucide-react";
import { type ComponentType, useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { contactService } from "@/services/contact.service";
import { conversationService } from "@/services/conversation.service";
import { userService } from "@/services/user.service";
import { useAuthStore } from "@/store/auth.store";
import { useContactStore } from "@/store/contact.store";
import type { UserResponse } from "@/types/auth";
import type { ContactResponse } from "@/types/contact";
import { toast } from "sonner";

type ConfirmDialogType = "block" | "unblock" | "remove";

function formatJoinedAt(createdAt?: string) {
    if (!createdAt) return "-";
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
    }).format(date);
}

function formatDob(dob?: string) {
    if (!dob) return "-";
    const date = new Date(dob);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date);
}

export default function UserProfilePage() {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const currentUser = useAuthStore((s) => s.user);
    const invalidateContacts = useContactStore((s) => s.invalidate);

    const [profile, setProfile] = useState<UserResponse | null>(null);
    const [contactRecord, setContactRecord] = useState<ContactResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogType | null>(null);

    // Redirect to own profile if viewing self
    useEffect(() => {
        if (userId && currentUser?.id && userId === currentUser.id) {
            navigate("/profile", { replace: true });
        }
    }, [userId, currentUser?.id, navigate]);

    const loadData = useCallback(async () => {
        if (!userId || userId === currentUser?.id) return;
        setLoading(true);
        try {
            const [profileRes, contactRes] = await Promise.all([
                userService.getUserById(userId),
                contactService.getByUser(userId),
            ]);
            setProfile(profileRes.result);
            setContactRecord(contactRes.result ?? null);
        } catch {
            toast.error("Could not load profile");
        } finally {
            setLoading(false);
        }
    }, [userId, currentUser?.id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // ── Derived state ────────────────────────────────────────────────────────
    const contactStatus = contactRecord?.status ?? null;
    const blockedByField = contactRecord?.blockedBy ?? null;
    const direction =
        contactStatus !== "BLOCKED"
            ? null
            : blockedByField === currentUser?.id
              ? "I_BLOCKED"
              : "BLOCKED_ME";

    const isLimited = profile?.limited === true || direction === "BLOCKED_ME";
    const iSentRequest =
        contactStatus === "PENDING" && contactRecord?.user.id === currentUser?.id;
    const theySentRequest =
        contactStatus === "PENDING" && contactRecord?.contact.id === currentUser?.id;

    // ── Action handlers ───────────────────────────────────────────────────────
    const handleSendFriendRequest = async () => {
        if (!userId) return;
        setActionLoading(true);
        try {
            await contactService.sendRequest({ contactId: userId });
            toast.success("Friend request sent!");
            await loadData();
        } catch {
            toast.error("Could not send friend request");
        } finally {
            setActionLoading(false);
        }
    };

    const handleAcceptRequest = async () => {
        if (!contactRecord) return;
        setActionLoading(true);
        try {
            await contactService.accept(contactRecord.id);
            toast.success("Friend request accepted!");
            invalidateContacts();
            await loadData();
        } catch {
            toast.error("Could not accept friend request");
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelRequest = async () => {
        if (!contactRecord) return;
        setActionLoading(true);
        try {
            await contactService.delete(contactRecord.id);
            toast.success("Request cancelled");
            await loadData();
        } catch {
            toast.error("Could not cancel request");
        } finally {
            setActionLoading(false);
        }
    };

    const handleRemoveFriend = async () => {
        if (!contactRecord) return;
        setActionLoading(true);
        try {
            await contactService.delete(contactRecord.id);
            toast.success(`Removed ${profile?.displayName} from friends`);
            invalidateContacts();
            await loadData();
        } catch {
            toast.error("Could not remove friend");
        } finally {
            setActionLoading(false);
            setConfirmDialog(null);
        }
    };

    const handleBlock = async () => {
        if (!userId) return;
        setActionLoading(true);
        try {
            const res = await contactService.blockByUser(userId);
            setContactRecord(res.result);
            invalidateContacts();
            toast.success(`Blocked ${profile?.displayName}`);
        } catch {
            toast.error("Could not block user");
        } finally {
            setActionLoading(false);
            setConfirmDialog(null);
        }
    };

    const handleUnblock = async () => {
        if (!userId) return;
        setActionLoading(true);
        try {
            const res = await contactService.unblockByUser(userId);
            setContactRecord(res.result);
            invalidateContacts();
            toast.success(`Unblocked ${profile?.displayName}`);
        } catch {
            toast.error("Could not unblock user");
        } finally {
            setActionLoading(false);
            setConfirmDialog(null);
        }
    };

    const handleMessage = async () => {
        if (!userId) return;
        try {
            const convsRes = await conversationService.getMyConversations();
            const existing = convsRes.result?.find(
                (c) =>
                    c.type === "PRIVATE" &&
                    c.participantIds.includes(userId) &&
                    c.participantIds.includes(currentUser!.id),
            );
            if (existing) {
                navigate(`/chat/${existing.id}`);
                return;
            }
            const res = await conversationService.create({
                type: "PRIVATE",
                participantIds: [userId],
            });
            if (res.result) navigate(`/chat/${res.result.id}`);
        } catch {
            toast.error("Could not open conversation");
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(`${window.location.origin}/profile/${userId}`);
        toast.success("Profile link copied!");
    };

    const fullName = profile?.displayName || "User";
    const userInitial = fullName.charAt(0).toUpperCase() || "U";
    const joinedAt = formatJoinedAt(profile?.createdAt);

    // ── Loading state ────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="h-full w-full overflow-y-auto bg-[linear-gradient(145deg,#f8fbff_0%,#edf5ff_55%,#ffffff_100%)] px-6 py-8 dark:bg-[linear-gradient(145deg,#0b1220_0%,#0f1e38_55%,#111827_100%)] md:px-10">
                <div className="mx-auto w-full max-w-5xl space-y-6">
                    <Skeleton className="h-56 w-full rounded-3xl" />
                    <div className="grid gap-4 md:grid-cols-2">
                        <Skeleton className="h-64 w-full rounded-2xl" />
                        <Skeleton className="h-64 w-full rounded-2xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <p className="text-sm">Profile not found.</p>
                    <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                        <ArrowLeft size={14} className="mr-2" /> Go back
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full overflow-y-auto bg-[linear-gradient(145deg,#f8fbff_0%,#edf5ff_55%,#ffffff_100%)] px-6 py-8 dark:bg-[linear-gradient(145deg,#0b1220_0%,#0f1e38_55%,#111827_100%)] md:px-10">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 animate-in fade-in duration-300">
                {/* Back button */}
                <div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-muted-foreground hover:text-foreground"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft size={16} />
                        Back
                    </Button>
                </div>

                {/* Hero section */}
                <section className="overflow-hidden rounded-3xl border border-brand/10 bg-card shadow-[0_20px_60px_-35px_rgba(0,113,227,0.45)] dark:border-brand/25 dark:shadow-[0_24px_70px_-40px_rgba(52,170,220,0.45)]">
                    <div className="h-28 w-full bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.4)_0%,rgba(255,255,255,0)_35%),linear-gradient(110deg,#0a1628_0%,#0d3b7a_40%,#0071e3_75%,#34aadc_100%)]" />

                    <div className="relative grid gap-5 px-6 pb-7 pt-0 md:grid-cols-[auto_1fr_auto] md:items-end md:gap-6 md:px-8">
                        <div className="-mt-12">
                            <Avatar className="h-24 w-24 border-4 border-background shadow-lg md:h-28 md:w-28">
                                <AvatarImage src={profile.avatarUrl} className="object-cover" />
                                <AvatarFallback className="text-2xl font-semibold">
                                    {userInitial}
                                </AvatarFallback>
                            </Avatar>
                        </div>

                        {/* Name + bio */}
                        <div className="space-y-2 md:pb-1">
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                                    {fullName}
                                </h1>
                                {direction === "I_BLOCKED" && (
                                    <Badge
                                        variant="destructive"
                                        className="gap-1"
                                    >
                                        <Ban size={12} />
                                        Blocked
                                    </Badge>
                                )}
                                {isLimited && direction !== "I_BLOCKED" && (
                                    <Badge
                                        variant="secondary"
                                        className="gap-1 bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                                    >
                                        <ShieldOff size={12} />
                                        Limited profile
                                    </Badge>
                                )}
                                {contactStatus === "ACCEPTED" && !direction && (
                                    <Badge variant="secondary" className="gap-1">
                                        <Check size={12} />
                                        Friends
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">
                                @{profile.username || "username"}
                            </p>
                            {!isLimited && profile.bio && (
                                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                                    {profile.bio}
                                </p>
                            )}
                            {isLimited && direction !== "I_BLOCKED" && (
                                <p className="max-w-2xl text-sm text-muted-foreground italic">
                                    This user has restricted their profile.
                                </p>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center gap-2 md:pb-1">
                            {/* ── I BLOCKED ── */}
                            {direction === "I_BLOCKED" && (
                                <>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setConfirmDialog("unblock")}
                                        disabled={actionLoading}
                                    >
                                        <Unlock size={15} className="mr-2" />
                                        Unblock
                                    </Button>
                                    <MoreActionsMenu onCopyLink={handleCopyLink} />
                                </>
                            )}

                            {/* ── BLOCKED ME — no actions (just copy link) ── */}
                            {direction === "BLOCKED_ME" && (
                                <MoreActionsMenu onCopyLink={handleCopyLink} />
                            )}

                            {/* ── NORMAL (not blocked) ── */}
                            {!direction && (
                                <>
                                    {/* No existing relation */}
                                    {!contactStatus && (
                                        <Button
                                            size="sm"
                                            onClick={handleSendFriendRequest}
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

                                    {/* I sent a pending request */}
                                    {iSentRequest && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleCancelRequest}
                                            disabled={actionLoading}
                                        >
                                            <X size={15} className="mr-2" />
                                            Cancel Request
                                        </Button>
                                    )}

                                    {/* They sent a pending request */}
                                    {theySentRequest && (
                                        <>
                                            <Button
                                                size="sm"
                                                onClick={handleAcceptRequest}
                                                disabled={actionLoading}
                                            >
                                                <Check size={15} className="mr-2" />
                                                Accept
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={handleCancelRequest}
                                                disabled={actionLoading}
                                            >
                                                <X size={15} className="mr-2" />
                                                Decline
                                            </Button>
                                        </>
                                    )}

                                    {/* Already friends */}
                                    {contactStatus === "ACCEPTED" && (
                                        <Button
                                            size="sm"
                                            onClick={handleMessage}
                                            disabled={actionLoading}
                                        >
                                            <MessageCircle size={15} className="mr-2" />
                                            Message
                                        </Button>
                                    )}

                                    {/* More actions dropdown */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm" className="px-2">
                                                <MoreHorizontal size={16} />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            <DropdownMenuItem onClick={handleCopyLink}>
                                                <LinkIcon size={14} className="mr-2" />
                                                Copy profile link
                                            </DropdownMenuItem>
                                            {contactStatus === "ACCEPTED" && (
                                                <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => setConfirmDialog("remove")}
                                                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                                    >
                                                        <UserMinus size={14} className="mr-2" />
                                                        Remove friend
                                                    </DropdownMenuItem>
                                                </>
                                            )}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => setConfirmDialog("block")}
                                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                            >
                                                <Ban size={14} className="mr-2" />
                                                Block user
                                            </DropdownMenuItem>
                                            <DropdownMenuItem disabled>
                                                <Flag size={14} className="mr-2" />
                                                Report
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </>
                            )}
                        </div>
                    </div>
                </section>

                {/* Block status banners */}
                {direction === "I_BLOCKED" && (
                    <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700/40 dark:bg-amber-500/10 dark:text-amber-300">
                        <Ban size={16} className="shrink-0" />
                        <span>
                            You have blocked this user. They cannot send you messages or view your profile.
                        </span>
                    </div>
                )}
                {direction === "BLOCKED_ME" && (
                    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground dark:border-border/60">
                        <ShieldOff size={16} className="shrink-0" />
                        <span>This user has restricted their profile.</span>
                    </div>
                )}

                {/* Info section */}
                <section className="grid gap-4 md:grid-cols-2">
                    {/* Contact Information */}
                    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-brand/20 dark:shadow-[0_16px_45px_-32px_rgba(52,170,220,0.5)] md:p-6">
                        <h2 className="mb-4 text-base font-semibold text-foreground md:text-lg">
                            Contact Information
                        </h2>

                        {isLimited ? (
                            <div className="flex flex-col items-center gap-3 py-6 text-muted-foreground">
                                <ShieldOff size={32} className="text-muted-foreground/50" />
                                <p className="text-center text-sm">
                                    Contact details are not available.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <InfoRow icon={Mail} label="Email" value={profile.email || "-"} />
                                <InfoRow icon={Phone} label="Phone" value={profile.phone || "-"} />
                                <InfoRow icon={MapPin} label="Username" value={profile.username || "-"} />
                            </div>
                        )}
                    </article>

                    {/* Account Status */}
                    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-brand/20 dark:shadow-[0_16px_45px_-32px_rgba(52,170,220,0.5)] md:p-6">
                        <h2 className="mb-4 text-base font-semibold text-foreground md:text-lg">
                            Account Status
                        </h2>

                        <div className="space-y-3">
                            {!isLimited && (
                                <InfoRow
                                    icon={CalendarDays}
                                    label="Date of birth"
                                    value={formatDob(profile.dob)}
                                />
                            )}
                            <InfoRow icon={CalendarDays} label="Joined on" value={joinedAt} />

                            <div className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3 dark:bg-muted/40">
                                <div className="flex items-center gap-3 text-foreground">
                                    <ShieldCheck className="text-brand" size={18} />
                                    <span className="text-sm font-medium">Account Status</span>
                                </div>
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/20">
                                    {profile.status || "Active"}
                                </Badge>
                            </div>
                        </div>
                    </article>
                </section>
            </div>

            {/* Confirmation dialogs */}
            <AlertDialog
                open={confirmDialog === "block"}
                onOpenChange={(open) => !open && setConfirmDialog(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Block {fullName}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            They won't be able to send you messages or view your profile.
                            You can unblock them at any time.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBlock}
                            disabled={actionLoading}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Block
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={confirmDialog === "unblock"}
                onOpenChange={(open) => !open && setConfirmDialog(null)}
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
                        <AlertDialogAction onClick={handleUnblock} disabled={actionLoading}>
                            {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Unblock
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={confirmDialog === "remove"}
                onOpenChange={(open) => !open && setConfirmDialog(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove {fullName}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            They will be removed from your friends list. You can send them a new
                            friend request later.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemoveFriend}
                            disabled={actionLoading}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

interface MoreActionsMenuProps {
    onCopyLink: () => void;
}

function MoreActionsMenu({ onCopyLink }: MoreActionsMenuProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="px-2">
                    <MoreHorizontal size={16} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onCopyLink}>
                    <LinkIcon size={14} className="mr-2" />
                    Copy profile link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                    <Flag size={14} className="mr-2" />
                    Report
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

interface InfoRowProps {
    icon: ComponentType<{ className?: string; size?: number }>;
    label: string;
    value: string;
}

function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
    return (
        <div className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3 dark:bg-muted/40">
            <div className="flex items-center gap-3 text-foreground">
                <Icon className="text-brand" size={18} />
                <span className="text-sm font-medium">{label}</span>
            </div>
            <span className="text-sm text-muted-foreground">{value}</span>
        </div>
    );
}
