import {
    Ban,
    Bookmark,
    Check,
    Clapperboard,
    Heart,
    Grid,
    Link as LinkIcon,
    Loader2,
    MessageCircle,
    MoreHorizontal,
    ShieldOff,
    Unlock,
    UserMinus,
    UserPlus,
    UserSquare,
    X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { StoryViewer } from "@/components/app/StoryViewer";
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
import { storyService } from "@/services/story.service";
import { postService } from "@/services/post.service";
import { useAuthStore } from "@/store/auth.store";
import { useContactStore } from "@/store/contact.store";
import type { UserResponse } from "@/types/auth";
import type { ContactResponse } from "@/types/contact";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Post } from "@/types/post";
import type { Story } from "@/types/story";
import { HOME_FEED_PAGE_SIZE } from "@/constants/feed";

type ConfirmDialogType = "block" | "unblock" | "remove";

const GRID_PREVIEW_LIMIT = 80;

function formatGridCaption(post: Post): string {
    const text = post.content.trim().replace(/\s+/g, " ");
    if (!text) {
        return "";
    }
    return text.length > GRID_PREVIEW_LIMIT
        ? `${text.slice(0, GRID_PREVIEW_LIMIT - 1)}…`
        : text;
}

function getGridMediaUrl(post: Post): string | null {
    return post.mediaUrls[0] ?? null;
}

export default function UsernameProfilePage() {
    const { username } = useParams<{ username: string }>();
    const navigate = useNavigate();
    const currentUser = useAuthStore((s) => s.user);
    const invalidateContacts = useContactStore((s) => s.invalidate);

    const [profile, setProfile] = useState<UserResponse | null>(null);
    const [contactRecord, setContactRecord] = useState<ContactResponse | null>(null);
    const [targetUserId, setTargetUserId] = useState<string | null>(null);
    const [friendCount, setFriendCount] = useState(0);
    const [postCount, setPostCount] = useState(0);
    const [hasActiveStories, setHasActiveStories] = useState(false);
    const [userStories, setUserStories] = useState<Story[]>([]);
    const [showStoryViewer, setShowStoryViewer] = useState(false);
    const [posts, setPosts] = useState<Post[]>([]);
    const [postCursor, setPostCursor] = useState<string | null>(null);
    const [hasMorePosts, setHasMorePosts] = useState(false);
    const [loadingPosts, setLoadingPosts] = useState(false);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogType | null>(null);

    // Redirect to own profile if viewing self by id initially? No, we view by username.
    // If the username is the current user's ID, we might want to redirect, but here it's fine.

    const loadData = useCallback(async () => {
        if (!username) return;
        setLoading(true);
        try {
            // Find user by username
            const searchRes = await userService.search(username, 0, 10);
            const foundUser = searchRes.result?.items.find(u => u.username === username);

            if (!foundUser) {
                setProfile(null);
                return;
            }

            const resolvedId = foundUser.id;
            setTargetUserId(resolvedId);

            // Fetch fully blocked-aware profile and contact records
            const [profileRes, contactRes, storiesRes, friendCountRes, postCountRes] = await Promise.all([
                userService.getUserById(resolvedId),
                contactService.getByUser(resolvedId),
                storyService.getUserStories(resolvedId),
                contactService.getFriendCount(resolvedId),
                postService.getByAuthor(resolvedId, 0, 1),
            ]);
            setProfile(profileRes.result);
            setContactRecord(contactRes.result ?? null);
            setFriendCount(friendCountRes.result ?? 0);
            setPostCount(postCountRes.result?.totalElements ?? 0);
            setHasActiveStories((storiesRes.result?.length ?? 0) > 0);
            setUserStories(storiesRes.result ?? []);
        } catch {
            toast.error("Could not load profile");
        } finally {
            setLoading(false);
        }
    }, [username]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const loadPosts = useCallback(
        async (cursor: string | null = null) => {
            if (!targetUserId) return;
            if (loadingPosts) return;
            setLoadingPosts(true);
            try {
                const res = await postService.getUserFeed(targetUserId, cursor, HOME_FEED_PAGE_SIZE);
                if (res.code !== 1000 || !res.result) return;

                const incoming = res.result.items;
                setPosts((prev) => {
                    if (!cursor) {
                        return incoming;
                    }
                    const ids = new Set(prev.map((post) => post.id));
                    const unique = incoming.filter((post) => !ids.has(post.id));
                    return [...prev, ...unique];
                });
                setPostCursor(res.result.nextCursor);
                setHasMorePosts(res.result.hasMore);
            } finally {
                setLoadingPosts(false);
            }
        },
        [targetUserId, loadingPosts],
    );

    const isOwnProfile = currentUser?.id === targetUserId;

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

    useEffect(() => {
        if (!targetUserId || isLimited) {
            setPosts([]);
            setPostCursor(null);
            setHasMorePosts(false);
            return;
        }
        void loadPosts(null);
    }, [targetUserId, isLimited, loadPosts]);

    // ── Action handlers ───────────────────────────────────────────────────────
    const handleSendFriendRequest = async () => {
        if (!targetUserId) return;
        setActionLoading(true);
        try {
            await contactService.sendRequest({ contactId: targetUserId });
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
        if (!targetUserId) return;
        setActionLoading(true);
        try {
            const res = await contactService.blockByUser(targetUserId);
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
        if (!targetUserId) return;
        setActionLoading(true);
        try {
            const res = await contactService.unblockByUser(targetUserId);
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
        if (!targetUserId) return;
        try {
            const convsRes = await conversationService.getMyConversations();
            const existing = convsRes.result?.find(
                (c) =>
                    c.type === "PRIVATE" &&
                    c.participantIds.includes(targetUserId) &&
                    c.participantIds.includes(currentUser!.id),
            );
            if (existing) {
                navigate(`/chat/${existing.id}`);
                return;
            }
            const res = await conversationService.create({
                type: "PRIVATE",
                participantIds: [targetUserId],
            });
            if (res.result) navigate(`/chat/${res.result.id}`);
        } catch {
            toast.error("Could not open conversation");
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(`${window.location.origin}/${username}`);
        toast.success("Profile link copied!");
    };

    if (loading) {
        return (
            <div className="w-full h-full bg-background p-6">
                <Skeleton className="h-48 w-full max-w-4xl mx-auto rounded-3xl" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <p className="text-sm">Profile not found.</p>
                </div>
            </div>
        );
    }

    const fullName = profile.displayName || "User";
    const displayUsername = profile.username || username;
    const userInitial = fullName.charAt(0).toUpperCase() || "U";

    return (
        <div className="w-full h-full overflow-y-auto bg-background hide-scrollbar">
            {/* Mobile Top Nav */}
            <header className="md:hidden bg-background/80 backdrop-blur-md text-foreground font-inter antialiased top-0 sticky z-40 shadow-sm flex justify-between items-center px-6 py-3 w-full border-b border-border">
                <div className="text-2xl font-black tracking-tight text-foreground">{displayUsername}</div>
            </header>

            <div className="max-w-4xl mx-auto pt-8 px-4 md:px-10 pb-10">
                {/* Profile Header Section */}
                <section className="flex flex-col md:flex-row items-start md:items-center gap-10 mb-10">
                    {/* Avatar */}
                    <div className={cn(
                        "shrink-0 rounded-full relative",
                        hasActiveStories && "p-1 bg-linear-to-tr from-brand via-blue-500 to-cyan-400 cursor-pointer"
                    )}
                        onClick={hasActiveStories ? () => setShowStoryViewer(true) : undefined}
                    >
                        <div className={cn(
                            "rounded-full",
                            hasActiveStories && "p-1 bg-background"
                        )}>
                            <Avatar className="w-24 h-24 md:w-36 md:h-36 rounded-full border-4 border-background shadow-lg">
                                <AvatarImage src={profile.avatarUrl} className="object-cover" />
                                <AvatarFallback className="text-4xl font-semibold bg-linear-to-tr from-pink-400 to-indigo-500 text-white">
                                    {userInitial}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </div>

                    {/* Profile Info */}
                    <div className="flex-1 flex flex-col gap-3 w-full">
                        <div className="flex flex-col md:flex-row md:items-center gap-6">
                            <div className="flex flex-col">
                                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                                    {fullName}
                                    {direction === "I_BLOCKED" && (
                                        <Badge variant="destructive" className="gap-1 px-1.5 py-0">
                                            <Ban size={12} /> Blocked
                                        </Badge>
                                    )}
                                    {isLimited && direction !== "I_BLOCKED" && (
                                        <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-700 px-1.5 py-0">
                                            <ShieldOff size={12} /> Limited
                                        </Badge>
                                    )}
                                    {contactStatus === "ACCEPTED" && !direction && (
                                        <Badge variant="secondary" className="gap-1 px-1.5 py-0">
                                            <Check size={12} /> Friends
                                        </Badge>
                                    )}
                                </h1>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {isOwnProfile ? (
                                    <>
                                        <button
                                            onClick={() => navigate(`/u/${displayUsername}/edit`)}
                                            className="bg-muted text-foreground py-2 px-4 rounded-lg font-semibold hover:bg-muted/80 transition-colors"
                                        >
                                            Edit Profile
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {/* Action Buttons for other users */}
                                        {direction === "I_BLOCKED" && (
                                            <Button variant="outline" size="sm" onClick={() => setConfirmDialog("unblock")} disabled={actionLoading}>
                                                <Unlock size={15} className="mr-2" /> Unblock
                                            </Button>
                                        )}
                                        
                                        {!direction && (
                                            <>
                                                {!contactStatus && (
                                                    <Button size="sm" onClick={handleSendFriendRequest} disabled={actionLoading}>
                                                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus size={15} className="mr-2" />}
                                                        Add Friend
                                                    </Button>
                                                )}
                                                {iSentRequest && (
                                                    <Button size="sm" variant="outline" onClick={handleCancelRequest} disabled={actionLoading}>
                                                        <X size={15} className="mr-2" /> Cancel Request
                                                    </Button>
                                                )}
                                                {theySentRequest && (
                                                    <>
                                                        <Button size="sm" onClick={handleAcceptRequest} disabled={actionLoading}>
                                                            <Check size={15} className="mr-2" /> Accept
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={handleCancelRequest} disabled={actionLoading}>
                                                            <X size={15} className="mr-2" /> Decline
                                                        </Button>
                                                    </>
                                                )}
                                                {contactStatus === "ACCEPTED" && (
                                                    <Button size="sm" onClick={handleMessage} disabled={actionLoading}>
                                                        <MessageCircle size={15} className="mr-2" /> Message
                                                    </Button>
                                                )}
                                            </>
                                        )}

                                        {/* Always show dropdown for others */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="sm" className="px-2">
                                                    <MoreHorizontal size={16} />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuItem onClick={handleCopyLink}>
                                                    <LinkIcon size={14} className="mr-2" /> Copy link
                                                </DropdownMenuItem>
                                                {contactStatus === "ACCEPTED" && !direction && (
                                                    <>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => setConfirmDialog("remove")} className="text-destructive focus:text-destructive">
                                                            <UserMinus size={14} className="mr-2" /> Remove friend
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                                {!direction && (
                                                    <>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => setConfirmDialog("block")} className="text-destructive focus:text-destructive">
                                                            <Ban size={14} className="mr-2" /> Block user
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-6 my-3">
                            <div>
                                <div className="text-base font-semibold text-foreground">{postCount}</div>
                                <div className="text-xs text-muted-foreground">Posts</div>
                            </div>
                            <div>
                                <div className="text-base font-semibold text-foreground">{friendCount}</div>
                                <div className="text-xs text-muted-foreground">Friends</div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1 max-w-lg">
                            <p className="text-sm font-bold text-foreground">@{displayUsername}</p>
                            {!isLimited ? (
                                <p className="text-sm text-muted-foreground whitespace-pre-line">
                                    {profile.bio || "No bio yet."}
                                </p>
                            ) : (
                                <p className="text-sm text-muted-foreground italic">
                                    This user has restricted their profile.
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                {/* Profile Tabs */}
                <div className="border-t border-border mb-6">
                    <nav className="flex justify-center gap-10">
                        <button className="flex items-center gap-1 py-4 border-t border-foreground text-foreground font-semibold uppercase tracking-widest text-sm">
                            <Grid className="w-4 h-4" />
                            Posts
                        </button>
                        <button className="flex items-center gap-1 py-4 border-t border-transparent text-muted-foreground hover:text-foreground transition-colors font-semibold uppercase tracking-widest text-sm">
                            <Clapperboard className="w-4 h-4" />
                            Reels
                        </button>
                        <button className="flex items-center gap-1 py-4 border-t border-transparent text-muted-foreground hover:text-foreground transition-colors font-semibold uppercase tracking-widest text-sm">
                            <Bookmark className="w-4 h-4" />
                            Saved
                        </button>
                        <button className="flex items-center gap-1 py-4 border-t border-transparent text-muted-foreground hover:text-foreground transition-colors font-semibold uppercase tracking-widest text-sm">
                            <UserSquare className="w-4 h-4" />
                            Tagged
                        </button>
                    </nav>
                </div>

                {/* Posts */}
                <div className="flex flex-col gap-4">
                    {isLimited ? (
                        <div className="py-10 text-center text-muted-foreground">
                            Posts are hidden due to privacy settings.
                        </div>
                    ) : posts.length === 0 && !loadingPosts ? (
                        <div className="py-10 text-center text-muted-foreground">
                            No posts to display yet.
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-1 md:gap-2">
                            {posts.map((post) => {
                                const mediaUrl = getGridMediaUrl(post);
                                const previewCaption = formatGridCaption(post);
                                const previewImage = mediaUrl && !/\.(mp4|webm)$/i.test(mediaUrl);

                                return (
                                    <button
                                        key={post.id}
                                        type="button"
                                        onClick={() => navigate(`/post/${post.id}`)}
                                        className="group relative aspect-square overflow-hidden rounded-none bg-muted"
                                        title={previewCaption || "Open post"}
                                    >
                                        {mediaUrl ? (
                                            previewImage ? (
                                                <img
                                                    src={mediaUrl}
                                                    alt={previewCaption || "Post preview"}
                                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                />
                                            ) : (
                                                <video
                                                    src={mediaUrl}
                                                    className="h-full w-full object-cover"
                                                    muted
                                                    playsInline
                                                />
                                            )
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-pink-100 via-white to-indigo-100 text-center text-xs font-medium text-foreground/70 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-800">
                                                <span className="line-clamp-3 px-3">{previewCaption || "Open post"}</span>
                                            </div>
                                        )}

                                        <div className="absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/25" />
                                        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-linear-to-t from-black/65 via-black/20 to-transparent px-2 py-2 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                            <div className="flex items-center gap-3 text-xs font-semibold">
                                                <span className="flex items-center gap-1">
                                                    <Heart className="h-3.5 w-3.5 fill-white" />
                                                    {post.reactions.reduce((acc, reaction) => acc + reaction.count, 0)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <MessageCircle className="h-3.5 w-3.5" />
                                                    {post.commentCount}
                                                </span>
                                            </div>
                                            {post.mediaUrls.length > 1 && (
                                                <span className="rounded-full bg-black/35 px-2 py-0.5 text-[10px] font-semibold">
                                                    +{post.mediaUrls.length - 1}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {loadingPosts && (
                        <div className="flex justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    )}

                    {!isLimited && hasMorePosts && !loadingPosts && postCursor && (
                        <div className="flex justify-center py-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void loadPosts(postCursor)}
                            >
                                Load more posts
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirmation dialogs */}
            <AlertDialog open={confirmDialog === "block"} onOpenChange={(open) => !open && setConfirmDialog(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Block {fullName}?</AlertDialogTitle>
                        <AlertDialogDescription>They won't be able to send you messages or view your profile.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBlock} disabled={actionLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Block
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={confirmDialog === "unblock"} onOpenChange={(open) => !open && setConfirmDialog(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Unblock {fullName}?</AlertDialogTitle>
                        <AlertDialogDescription>They will be able to send you messages and view your profile again.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleUnblock} disabled={actionLoading}>
                            {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Unblock
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={confirmDialog === "remove"} onOpenChange={(open) => !open && setConfirmDialog(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove {fullName}?</AlertDialogTitle>
                        <AlertDialogDescription>They will be removed from your friends list.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRemoveFriend} disabled={actionLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {showStoryViewer && userStories.length > 0 && profile && (
                <StoryViewer
                    groups={[{
                        user: {
                            id: profile.id,
                            displayName: profile.displayName,
                            avatarUrl: profile.avatarUrl,
                            username: profile.username,
                        },
                        stories: userStories,
                    }]}
                    initialGroupIndex={0}
                    onClose={() => setShowStoryViewer(false)}
                />
            )}
        </div>
    );
}
