import { Plus } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { AdminBadge } from "@/components/customize/AdminBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreatePostModal } from "@/components/app/CreatePostModal";
import { CreateOptionsModal } from "@/components/app/CreateOptionsModal";
import { CreateStoryModal } from "@/components/app/CreateStoryModal";
import { CreateReelModal } from "@/components/app/CreateReelModal";
import { StoryViewer } from "@/components/app/StoryViewer";
import { HOME_FEED_ROOT_MARGIN } from "@/constants/feed";
import { FeedList } from "@/pages/app/feed/components/FeedList";
import { NewPostBanner } from "@/pages/app/feed/components/NewPostBanner";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { socketService } from "@/services/socket.service";
import {
    userRoleService,
    type UserRoleMap,
} from "@/services/userRoleService";
import { useFeedStore } from "@/store/feed.store";
import { storyService } from "@/services/story.service";
import type { Story } from "@/types/story";
import { SocialErrorBoundary } from "@/features/social/components/SocialErrorBoundary";
import { HomeLeftSidebar } from "@/pages/app/home/components/HomeLeftSidebar";
import { HomeRightSidebar } from "@/pages/app/home/components/HomeRightSidebar";

export default function HomePage() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [showOptionsModal, setShowOptionsModal] = useState(false);
    const [showPostModal, setShowPostModal] = useState(false);
    const [showStoryModal, setShowStoryModal] = useState(false);
    const [showReelModal, setShowReelModal] = useState(false);
    const [storyViewerIndex, setStoryViewerIndex] = useState<number | null>(
        null,
    );
    const [stories, setStories] = useState<Story[]>([]);
    const [userRolesById, setUserRolesById] = useState<UserRoleMap>({});

    const posts = useFeedStore((s) => s.posts);
    const nextCursor = useFeedStore((s) => s.nextCursor);
    const hasMore = useFeedStore((s) => s.hasMore);
    const pendingNewPosts = useFeedStore((s) => s.pendingNewPosts);
    const isLoading = useFeedStore((s) => s.isLoading);
    const isLoadingMore = useFeedStore((s) => s.isLoadingMore);
    const feedError = useFeedStore((s) => s.error);
    const loadInitialFeed = useFeedStore((s) => s.loadInitialFeed);
    const loadMore = useFeedStore((s) => s.loadMore);
    const flushPendingPosts = useFeedStore((s) => s.flushPendingPosts);
    const addPendingPost = useFeedStore((s) => s.addPendingPost);
    const updatePost = useFeedStore((s) => s.updatePost);
    const removePost = useFeedStore((s) => s.removePost);

    const pendingCount = pendingNewPosts.length;
    const resolvedUserRolesById = useMemo(() => {
        if (!user?.role) {
            return userRolesById;
        }

        return {
            ...userRolesById,
            [user.id]: user.role,
        };
    }, [user?.id, user?.role, userRolesById]);

    useEffect(() => {
        const fetchStories = async () => {
            try {
                const res = await storyService.getFeed();
                if (res.code === 1000) {
                    setStories(res.result);
                }
            } catch {
                setStories([]);
            }
        };
        fetchStories();
    }, []);

    useEffect(() => {
        let isActive = true;

        userRoleService
            .getRolesById()
            .then((rolesById) => {
                if (isActive) {
                    setUserRolesById(rolesById);
                }
            })
            .catch(() => {
                if (isActive) {
                    setUserRolesById({});
                }
            });

        return () => {
            isActive = false;
        };
    }, []);

    useEffect(() => {
        loadInitialFeed();
    }, [loadInitialFeed]);

    const handleLoadMore = useCallback(
        (cursor: string | null) => {
            loadMore(cursor);
        },
        [loadMore],
    );

    const { sentinelRef } = useInfiniteScroll(handleLoadMore, nextCursor, {
        hasMore,
        isLoading: isLoading || isLoadingMore,
        rootMargin: HOME_FEED_ROOT_MARGIN,
        threshold: 0,
    });

    const handleFlushPending = useCallback(() => {
        if (pendingCount === 0) return;
        flushPendingPosts();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [pendingCount, flushPendingPosts]);

    useEffect(() => {
        if (!user?.id) return;

        let isActive = true;
        let unsubscribe: (() => void) | null = null;

        const setup = async () => {
            const token = localStorage.getItem("access_token");
            if (!token) return;

            await socketService.connect(token);
            if (!isActive) return;
            unsubscribe = socketService.subscribeToFeed(
                user.id,
                addPendingPost,
            );
        };

        setup().catch(() => undefined);

        return () => {
            isActive = false;
            unsubscribe?.();
        };
    }, [user?.id, addPendingPost]);

    const groupedStories = useMemo(() => {
        const groups: Record<
            string,
            { user: NonNullable<Story["user"]>; stories: Story[] }
        > = {};
        stories.forEach((s) => {
            if (!s.user) return;
            if (!groups[s.userId]) {
                groups[s.userId] = {
                    user: {
                        ...s.user,
                        role: s.user.role ?? resolvedUserRolesById[s.userId],
                    },
                    stories: [],
                };
            }
            groups[s.userId].stories.push(s);
        });

        return Object.values(groups).sort((a, b) => {
            if (a.user?.id === user?.id) return -1;
            if (b.user?.id === user?.id) return 1;
            return 0;
        });
    }, [resolvedUserRolesById, stories, user?.id]);

    const hasMyStories = useMemo(() => {
        return stories.some((s) => s.userId === user?.id);
    }, [stories, user?.id]);

    const handleStoryViewed = useCallback((storyId: string) => {
        setStories((prev) =>
            prev.map((s) =>
                s.id === storyId ? { ...s, viewedByMe: true } : s,
            ),
        );
    }, []);

    return (
        <SocialErrorBoundary
            title="Home feed is unavailable"
            message="This social feed failed to render. Try again."
        >
            <div className="w-full h-full overflow-y-auto bg-background relative hide-scrollbar">
                <div className="flex w-full justify-center">
                    <HomeLeftSidebar />
                    {/* Central Feed Area */}
                    <div className="w-full max-w-2xl px-4 py-8 flex flex-col gap-3 pb-32">
                        {/* Stories Carousel */}
                        <div className="w-full relative">
                            <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-3 pt-1 snap-x">
                                {/* Create */}
                                <div
                                    className="flex flex-col items-center gap-1 snap-start cursor-pointer group"
                                    onClick={() => setShowOptionsModal(true)}
                                >
                                    <div className="relative w-16 h-16 rounded-full bg-muted flex items-center justify-center border-2 border-background shadow-sm group-hover:scale-105 transition-transform">
                                        <Plus className="text-muted-foreground w-8 h-8" />
                                        <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center border-2 border-background">
                                            <Plus className="w-3 h-3 font-bold" />
                                        </div>
                                    </div>
                                    <span className="text-sm text-muted-foreground truncate w-16 text-center">
                                        News
                                    </span>
                                </div>

                                {/* Real Stories */}
                                {groupedStories.map((group, groupIdx) => {
                                    const allViewed = group.stories.every(
                                        (s) => s.viewedByMe,
                                    );
                                    return (
                                        <div
                                            key={group.user?.id}
                                            className="flex flex-col items-center gap-1 snap-start cursor-pointer group"
                                            onClick={() =>
                                                setStoryViewerIndex(groupIdx)
                                            }
                                        >
                                            <div
                                                className={cn(
                                                    "p-[2.5px] rounded-full group-hover:scale-105 transition-transform shadow-sm",
                                                    allViewed
                                                        ? "bg-muted"
                                                        : "bg-linear-to-tr from-brand via-blue-500 to-cyan-400",
                                                )}
                                            >
                                                <div className="bg-background p-0.5 rounded-full">
                                                    <Avatar className="w-14 h-14 border-2 border-background">
                                                        <AvatarImage
                                                            src={group.user?.avatarUrl}
                                                            alt={group.user?.displayName}
                                                            className="object-cover"
                                                        />
                                                        <AvatarFallback className="bg-linear-to-tr from-pink-400 to-indigo-500 text-white text-base font-semibold">
                                                            {group.user?.displayName?.charAt(0)?.toUpperCase() ?? "U"}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </div>
                                            </div>
                                            <span
                                                className={cn(
                                                    "flex w-16 items-center justify-center gap-0.5 text-sm",
                                                    allViewed
                                                        ? "text-muted-foreground/50"
                                                        : "text-muted-foreground",
                                                )}
                                            >
                                                <span className="truncate">
                                                    {group.user?.id === user?.id
                                                        ? "Your story"
                                                        : group.user?.displayName}
                                                </span>
                                                {group.user?.role === "ADMIN" && (
                                                    <AdminBadge className="size-3" />
                                                )}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Feed Posts */}
                        <div className="flex flex-col gap-6">
                            <NewPostBanner
                                count={pendingCount}
                                onClick={handleFlushPending}
                            />
                            <FeedList
                                posts={posts}
                                hasMore={hasMore}
                                isLoading={isLoading}
                                isLoadingMore={isLoadingMore}
                                error={feedError}
                                sentinelRef={sentinelRef}
                                onPostUpdate={updatePost}
                                onPostRemove={removePost}
                            />
                        </div>
                    </div>

                    <HomeRightSidebar
                        user={user}
                        hasMyStories={hasMyStories}
                        userRolesById={resolvedUserRolesById}
                        onOpenProfile={() => navigate(`/u/${user?.username}`)}
                    />
                </div>

                <CreateOptionsModal
                    isOpen={showOptionsModal}
                    onClose={() => setShowOptionsModal(false)}
                    onSelectPost={() => {
                        setShowOptionsModal(false);
                        setShowPostModal(true);
                    }}
                    onSelectStory={() => {
                        setShowOptionsModal(false);
                        setShowStoryModal(true);
                    }}
                    onSelectReel={() => {
                        setShowOptionsModal(false);
                        setShowReelModal(true);
                    }}
                />

                <CreatePostModal
                    isOpen={showPostModal}
                    onClose={() => setShowPostModal(false)}
                    user={user}
                />

                <CreateStoryModal
                    isOpen={showStoryModal}
                    onClose={() => setShowStoryModal(false)}
                />

                <CreateReelModal
                    isOpen={showReelModal}
                    onClose={() => setShowReelModal(false)}
                    user={user}
                    onCreated={() => navigate("/reels")}
                />

                {storyViewerIndex !== null && groupedStories.length > 0 && (
                    <StoryViewer
                        groups={groupedStories}
                        initialGroupIndex={storyViewerIndex}
                        onClose={() => setStoryViewerIndex(null)}
                        onStoryViewed={handleStoryViewed}
                    />
                )}
            </div>
        </SocialErrorBoundary>
    );
}
