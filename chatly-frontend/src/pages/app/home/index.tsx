import { Plus } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { CreatePostModal } from "@/components/app/CreatePostModal";
import { CreateOptionsModal } from "@/components/app/CreateOptionsModal";
import { CreateStoryModal } from "@/components/app/CreateStoryModal";
import { HOME_FEED_ROOT_MARGIN } from "@/constants/feed";
import { FeedList } from "@/pages/app/feed/components/FeedList";
import { NewPostBanner } from "@/pages/app/feed/components/NewPostBanner";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { socketService } from "@/services/socket.service";
import { useFeedStore } from "@/store/feed.store";
import { storyService } from "@/services/story.service";
import type { Story } from "@/types/story";
import type { Post } from "@/types/post";

export default function HomePage() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [showOptionsModal, setShowOptionsModal] = useState(false);
    const [showPostModal, setShowPostModal] = useState(false);
    const [showStoryModal, setShowStoryModal] = useState(false);
    const [stories, setStories] = useState<Story[]>([]);
    const [isLoadingStories, setIsLoadingStories] = useState(true);

    const posts = useFeedStore((s) => s.posts);
    const nextCursor = useFeedStore((s) => s.nextCursor);
    const hasMore = useFeedStore((s) => s.hasMore);
    const pendingNewPosts = useFeedStore((s) => s.pendingNewPosts);
    const isLoading = useFeedStore((s) => s.isLoading);
    const isLoadingMore = useFeedStore((s) => s.isLoadingMore);
    const loadInitialFeed = useFeedStore((s) => s.loadInitialFeed);
    const loadMore = useFeedStore((s) => s.loadMore);
    const flushPendingPosts = useFeedStore((s) => s.flushPendingPosts);
    const addPendingPost = useFeedStore((s) => s.addPendingPost);
    const updatePost = useFeedStore((s) => s.updatePost);
    const removePost = useFeedStore((s) => s.removePost);

    const pendingCount = pendingNewPosts.length;

    useEffect(() => {
        const fetchStories = async () => {
            try {
                const res = await storyService.getFeed();
                if (res.code === 1000) {
                    setStories(res.result);
                }
            } catch (error) {
                console.error("Failed to fetch stories", error);
            } finally {
                setIsLoadingStories(false);
            }
        };
        fetchStories();
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

        let isMounted = true;

        const setup = async () => {
            const token = localStorage.getItem("access_token");
            if (!token) return;

            await socketService.connect(token);
            const client = socketService.getClient();
            if (!client || !isMounted) return;

            const subscription = client.subscribe(
                `/topic/feed/${user.id}`,
                (payload) => {
                    try {
                        const post = JSON.parse(payload.body) as Post;
                        addPendingPost(post);
                    } catch (_error: unknown) {
                        return;
                    }
                },
            );

            return () => subscription.unsubscribe();
        };

        const cleanupPromise = setup();

        return () => {
            isMounted = false;
            cleanupPromise.then((cleanup) => {
                if (cleanup) cleanup();
            });
        };
    }, [user?.id, addPendingPost]);

    const groupedStories = useMemo(() => {
        const groups: Record<string, { user: any; stories: Story[] }> = {};
        stories.forEach((s) => {
            if (!groups[s.userId]) {
                groups[s.userId] = { user: s.user, stories: [] };
            }
            groups[s.userId].stories.push(s);
        });

        return Object.values(groups).sort((a, b) => {
            if (a.user?.id === user?.id) return -1;
            if (b.user?.id === user?.id) return 1;
            return 0;
        });
    }, [stories, user?.id]);

    const hasMyStories = useMemo(() => {
        return stories.some(s => s.userId === user?.id);
    }, [stories, user?.id]);

    return (
        <div className="w-full h-full flex justify-center overflow-y-auto bg-background relative hide-scrollbar">
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
                            <span className="text-sm text-muted-foreground truncate w-16 text-center">News</span>
                        </div>

                        {/* Real Stories */}
                        {groupedStories.map((group) => (
                            <div key={group.user?.id} className="flex flex-col items-center gap-1 snap-start cursor-pointer group">
                                <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-brand via-blue-500 to-cyan-400 group-hover:scale-105 transition-transform shadow-sm">
                                    <div className="bg-background p-[2px] rounded-full">
                                        <img
                                            alt={group.user?.displayName}
                                            className="w-14 h-14 rounded-full object-cover"
                                            src={group.user?.avatarUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuDiWCK8eU36XEfrbqiJZBRgtZo4ia0h9UnSXoPZ6TmLd4c4bnTZxeOvu2ljozhYxj1cqN-Bqe6tSMDXNN1cPILsBFaTHYMRgbCV8EtOGgUw__L2SKT-4GmCmoVeLhJKUY5liFTwxe43Uh2O-4ldLr1mADZ06-fj83LbDdgrW8_4LTYCsQ2VgEKOKWAUe52M1waBRbx4qnQ9wdWhwC7nkVKwJemA4vh0ZQqk6HaLqWGMi0r9mE0PNFXfQoBfYJqvLYY8UmWwrNcSfMY"}
                                        />
                                    </div>
                                </div>
                                <span className="text-sm text-muted-foreground truncate w-16 text-center">
                                    {group.user?.id === user?.id ? "Your story" : group.user?.displayName}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Feed Posts */}
                <div className="flex flex-col gap-6">
                    <NewPostBanner count={pendingCount} onClick={handleFlushPending} />
                    <FeedList
                        posts={posts}
                        hasMore={hasMore}
                        isLoading={isLoading}
                        isLoadingMore={isLoadingMore}
                        sentinelRef={sentinelRef}
                        onPostUpdate={updatePost}
                        onPostRemove={removePost}
                    />
                </div>
            </div>

            {/* Right Sidebar (Suggested & Profile) */}
            <aside className="w-[400px] flex-shrink-0 pt-8 pr-8 pl-6 hidden xl:block sticky top-0 h-screen overflow-y-auto hide-scrollbar">
                {/* Current User Snippet */}
                <div className="flex items-center justify-between mb-8 bg-card p-3 rounded-xl shadow-sm border border-border">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/${user?.username}`)}>
                        <div className={cn(
                            "p-[2px] rounded-full",
                            hasMyStories ? "bg-gradient-to-tr from-brand via-blue-500 to-cyan-400" : "bg-transparent"
                        )}>
                            <div className="bg-background p-[2px] rounded-full">
                                <img
                                    alt="Your Profile"
                                    className="w-12 h-12 rounded-full object-cover"
                                    src={user?.avatarUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuA6GOYxKIO701rlif0eWimmBX2cov4Sz8bRW3su9fX6rJ0e5HYGbclNYHKzX5vPO5YO5_Wu3dKmSy3449c1CgC2kwjLcNDacsfbPddRBdjVpbD8512XIVJjgm2hpLUFryte8vP9uSsZX8XCiy9hKrMM9smEJ6Dl8RKg2VqQw-1kOFgtQARcci75AJG4iHsCf9jntmetpFMfJLSJGY_aUucGrhfd9oBtz1qTd_HkxqYbUbytZrW1QkuPCL7BqWT2828-TlIOIA_lDo4"}
                                />
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold text-foreground">{user?.displayName || "current_user"}</h4>
                            <p className="text-[13px] text-muted-foreground">{user?.email || "user@example.com"}</p>
                        </div>
                    </div>
                    <button className="text-brand font-semibold text-[12px] hover:text-brand-dark transition-colors bg-transparent border-none">Switch</button>
                </div>

                {/* Suggestions Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-muted-foreground">Suggested for you</h3>
                    <button className="text-foreground hover:text-brand font-semibold text-[12px] transition-colors">See All</button>
                </div>

                {/* Suggestions List */}
                <div className="flex flex-col gap-4">
                    {/* Suggestion Item */}
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3 cursor-pointer">
                            <img alt="Suggestion" className="w-10 h-10 rounded-full object-cover group-hover:scale-105 transition-transform" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCtQbmCncraFATDL2rxq57BOBFRSyd3MM8ggKQ3XyiZGjSA_rQAnnvxPVB6HrHTQzuTMv1k8275EYSSs6hbO79oyWmM6r_Lu2hkiNf7Ls50D0A8a_Pjnok0z2jyuLVeGd7HBdT43zHFPYChfO08rlcS5ZHYcEcYN2Mws9LzVSvITUKouS3ZOb6HkvIxcnWCj2mxpcbZW5YMEB1AWQlOjsvjUHledXgfndVs8w9QU28RsbMTFDZht_nOpeowT1XFHS-slxGTHcFTDKU" />
                            <div>
                                <h4 className="font-semibold text-foreground">lisa.style</h4>
                                <p className="text-[12px] text-muted-foreground truncate w-32">Followed by sarah.j + 2 more</p>
                            </div>
                        </div>
                        <button className="text-brand font-semibold text-[12px] hover:text-brand-dark transition-colors">Follow</button>
                    </div>

                    {/* Suggestion Item */}
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3 cursor-pointer">
                            <img alt="Suggestion" className="w-10 h-10 rounded-full object-cover group-hover:scale-105 transition-transform" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCr8ocsQzubPBaF5JcApmNLdblgg5aNPduaOqmWc9OgoTL1JURALgMri90c1BR2h6DDIXodl0dhfiKonU-t7HF2l3T8X5VQTygdJv75Qe3hzyb1nbo6SqdCQS7B9AdXg1ENvJNf_KPpRy0XfEfyX-JHKpOty-AHyaU9n1i-cGTqXs_HpeKjhgft83bZMqt9e4UI93aVaZb3VEuzV4N8nzgBk5cBdZ3tkwQo4rzcuSho2OWhm_TPMsJQBF6adK05CuBS-8Hjg7HlQLI" />
                            <div>
                                <h4 className="font-semibold text-foreground">dave_travels</h4>
                                <p className="text-[12px] text-muted-foreground truncate w-32">New to ChatLy</p>
                            </div>
                        </div>
                        <button className="text-brand font-semibold text-[12px] hover:text-brand-dark transition-colors">Follow</button>
                    </div>

                    {/* Suggestion Item */}
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3 cursor-pointer">
                            <img alt="Suggestion" className="w-10 h-10 rounded-full object-cover group-hover:scale-105 transition-transform" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDWXD73dDQiY-5BdmjbK7M8JU_533AFMvS0dCbSUPWVMvl1pJsj8-qbKgIzBv9QdirT7Y2QSaJi5tUVLL4dKlWVwtR1xt2HTDFeSVeVw19w84VuDS47Rf659j2IUh_ART6HTcFYl4CYkBvi35EDT7pxYck-sA5hcknUgjfd5ZmREd_iozO5q1T5d2TgwA5Pbn4bY90b7xgaqov2W2mFd2qnPkOquRY1qpG6ikAefVc2Qsr-IAKWi9KNx6CJHMuKvAH1G0DrREttu_w" />
                            <div>
                                <h4 className="font-semibold text-foreground">photo_art</h4>
                                <p className="text-[12px] text-muted-foreground truncate w-32">Suggested for you</p>
                            </div>
                        </div>
                        <button className="text-brand font-semibold text-[12px] hover:text-brand-dark transition-colors">Follow</button>
                    </div>
                </div>

                <p className="mt-4 text-[11px] text-muted-foreground text-center">© 2027 ChatLy - The Challenger Team</p>
            </aside>

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
        </div>
    );
}
