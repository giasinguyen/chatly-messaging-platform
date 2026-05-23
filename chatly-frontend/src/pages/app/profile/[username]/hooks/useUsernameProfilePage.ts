import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { HOME_FEED_PAGE_SIZE } from "@/constants/feed";
import { contactService } from "@/services/contact.service";
import { conversationService } from "@/services/conversation.service";
import { postService } from "@/services/post.service";
import { storyService } from "@/services/story.service";
import { userService } from "@/services/user.service";
import { userReportService } from "@/services/userReport.service";
import { useAuthStore } from "@/store/auth.store";
import { useContactStore } from "@/store/contact.store";
import type { UserResponse } from "@/types/auth";
import type { ContactResponse } from "@/types/contact";
import type { Post } from "@/types/post";
import type { Story } from "@/types/story";
import type { CreateUserReportRequest } from "@/types/userReport";
import type { ConfirmDialogType, ProfileTab } from "../components/profile.types";

export function useUsernameProfilePage() {
    const { username } = useParams<{ username: string }>();
    const navigate = useNavigate();
    const currentUser = useAuthStore((state) => state.user);
    const invalidateContacts = useContactStore((state) => state.invalidate);

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
    const [savedPosts, setSavedPosts] = useState<Post[]>([]);
    const [loadingSaved, setLoadingSaved] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogType | null>(null);
    const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
    const [showFriendsModal, setShowFriendsModal] = useState(false);
    const [friends, setFriends] = useState<ContactResponse[]>([]);
    const [loadingFriends, setLoadingFriends] = useState(false);
    const [friendListMessage, setFriendListMessage] = useState<string | null>(null);
    const [showReportUserDialog, setShowReportUserDialog] = useState(false);
    const [isSubmittingUserReport, setIsSubmittingUserReport] = useState(false);

    const loadingPostsRef = useRef(false);

    const loadData = useCallback(async () => {
        if (!username) return;

        setLoading(true);
        setLoadError(null);
        try {
            const searchRes = await userService.search(username, 0, 10);
            const foundUser = searchRes.result?.items.find(
                (user) => user.username === username,
            );

            if (!foundUser) {
                setProfile(null);
                return;
            }

            const resolvedId = foundUser.id;
            setTargetUserId(resolvedId);

            const [
                profileRes,
                contactRes,
                storiesRes,
                friendCountRes,
                postCountRes,
            ] = await Promise.all([
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
            setLoadError("Could not load profile information.");
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
            if (!targetUserId || loadingPostsRef.current) return;

            loadingPostsRef.current = true;
            setLoadingPosts(true);
            try {
                const response = await postService.getUserFeed(
                    targetUserId,
                    cursor,
                    HOME_FEED_PAGE_SIZE,
                );
                if (response.code !== 1000 || !response.result) return;

                const incoming = response.result.items;
                setPosts((previous) => {
                    if (!cursor) {
                        return incoming;
                    }
                    const ids = new Set(previous.map((post) => post.id));
                    const unique = incoming.filter((post) => !ids.has(post.id));
                    return [...previous, ...unique];
                });
                setPostCursor(response.result.nextCursor);
                setHasMorePosts(response.result.hasMore);
            } finally {
                loadingPostsRef.current = false;
                setLoadingPosts(false);
            }
        },
        [targetUserId],
    );

    const isOwnProfile = currentUser?.id === targetUserId;
    const contactStatus = contactRecord?.status ?? null;
    const blockedByField = contactRecord?.blockedBy ?? null;
    const direction: "I_BLOCKED" | "BLOCKED_ME" | null =
        contactStatus !== "BLOCKED"
            ? null
            : blockedByField === currentUser?.id
              ? "I_BLOCKED"
              : "BLOCKED_ME";

    const isLimited = profile?.limited === true || direction === "BLOCKED_ME";
    const iSentRequest =
        contactStatus === "PENDING" && contactRecord?.user.id === currentUser?.id;
    const theySentRequest =
        contactStatus === "PENDING" &&
        contactRecord?.contact.id === currentUser?.id;

    useEffect(() => {
        if (!targetUserId || isLimited) {
            setPosts([]);
            setPostCursor(null);
            setHasMorePosts(false);
            return;
        }
        void loadPosts(null);
    }, [targetUserId, isLimited, loadPosts]);

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
            const response = await contactService.blockByUser(targetUserId);
            setContactRecord(response.result);
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
            const response = await contactService.unblockByUser(targetUserId);
            setContactRecord(response.result);
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
        if (!targetUserId || !currentUser?.id) return;

        try {
            const convsRes = await conversationService.getMyConversations();
            const existing = convsRes.result?.find(
                (conversation) =>
                    conversation.type === "PRIVATE" &&
                    conversation.participantIds.includes(targetUserId) &&
                    conversation.participantIds.includes(currentUser.id),
            );

            if (existing) {
                navigate(`/chat/${existing.id}`);
                return;
            }

            const response = await conversationService.create({
                type: "PRIVATE",
                participantIds: [targetUserId],
            });
            if (response.result) {
                navigate(`/chat/${response.result.id}`);
            }
        } catch {
            toast.error("Could not open conversation");
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(`${window.location.origin}/u/${username}`);
        toast.success("Profile link copied!");
    };

    const handleReportUser = async (payload: CreateUserReportRequest) => {
        if (!targetUserId) return;

        setIsSubmittingUserReport(true);
        try {
            const response = await userReportService.create(targetUserId, payload);
            if (response.code !== 1000) {
                toast.error(response.message || "Could not report user");
                return;
            }
            toast.success("User report submitted");
            setShowReportUserDialog(false);
        } catch {
            toast.error("Could not report user");
        } finally {
            setIsSubmittingUserReport(false);
        }
    };

    const handleOpenFriends = useCallback(async () => {
        if (!targetUserId) return;

        setShowFriendsModal(true);
        setFriendListMessage(null);
        setFriends([]);

        setLoadingFriends(true);
        try {
            const response = await contactService.getFriendsForUser(targetUserId);
            setFriends(response.result ?? []);
        } catch (error: unknown) {
            setFriends([]);
            const message = axios.isAxiosError(error)
                ? error.response?.data?.message
                : null;
            setFriendListMessage(
                message === "This user has hidden their friend list"
                    ? "This user does not allow others to view their friend list."
                    : "Could not load this friend list.",
            );
        } finally {
            setLoadingFriends(false);
        }
    }, [targetUserId]);

    const handleLoadSaved = useCallback(async () => {
        if (savedPosts.length > 0) return;

        setLoadingSaved(true);
        try {
            const response = await postService.getSavedPosts(0, 30);
            setSavedPosts(response.result?.content ?? []);
        } catch {
            toast.error("Could not load saved posts");
        } finally {
            setLoadingSaved(false);
        }
    }, [savedPosts.length]);

    const handleTabChange = (tab: ProfileTab) => {
        setActiveTab(tab);
        if (tab === "saved" && isOwnProfile) {
            void handleLoadSaved();
        }
    };

    const fullName = profile?.displayName || "User";
    const displayUsername = profile?.username || username || "profile";
    const userInitial = fullName.charAt(0).toUpperCase() || "U";

    return {
        username,
        navigate,
        profile,
        targetUserId,
        friendCount,
        postCount,
        hasActiveStories,
        userStories,
        showStoryViewer,
        posts,
        postCursor,
        hasMorePosts,
        loadingPosts,
        savedPosts,
        loadingSaved,
        loadError,
        loading,
        actionLoading,
        confirmDialog,
        activeTab,
        showFriendsModal,
        showReportUserDialog,
        friends,
        loadingFriends,
        friendListMessage,
        isSubmittingUserReport,
        isOwnProfile,
        contactStatus,
        direction,
        isLimited,
        iSentRequest,
        theySentRequest,
        fullName,
        displayUsername,
        userInitial,
        setShowStoryViewer,
        setConfirmDialog,
        setShowFriendsModal,
        setShowReportUserDialog,
        loadPosts,
        loadData,
        handleTabChange,
        handleOpenFriends,
        handleSendFriendRequest,
        handleCancelRequest,
        handleAcceptRequest,
        handleMessage,
        handleCopyLink,
        handleReportUser,
        handleBlock,
        handleUnblock,
        handleRemoveFriend,
    };
}
