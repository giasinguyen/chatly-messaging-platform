import { Loader2 } from "lucide-react";
import { StoryViewer } from "@/components/app/StoryViewer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileDialogs } from "./components/ProfileDialogs";
import { ProfileHeader } from "./components/ProfileHeader";
import { ProfilePostGrid } from "./components/ProfilePostGrid";
import { ProfileTabs } from "./components/ProfileTabs";
import { useUsernameProfilePage } from "./hooks/useUsernameProfilePage";
import { SocialErrorBoundary } from "@/features/social/components/SocialErrorBoundary";

export default function UsernameProfilePage() {
    const {
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
        friends,
        loadingFriends,
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
        loadPosts,
        loadData,
        handleTabChange,
        handleOpenFriends,
        handleSendFriendRequest,
        handleCancelRequest,
        handleAcceptRequest,
        handleMessage,
        handleCopyLink,
        handleBlock,
        handleUnblock,
        handleRemoveFriend,
    } = useUsernameProfilePage();

    if (loading) {
        return (
            <div className="h-full w-full bg-background p-6">
                <Skeleton className="mx-auto h-48 w-full max-w-4xl rounded-3xl" />
            </div>
        );
    }

    if (loadError && !profile) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-background px-6">
                <div className="w-full max-w-md rounded-2xl border border-dashed border-border bg-card/70 p-6 text-center">
                    <p className="text-sm font-semibold text-foreground">
                        Could not load profile
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{loadError}</p>
                    <Button className="mt-4" variant="outline" onClick={() => void loadData()}>
                        Try again
                    </Button>
                </div>
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

    return (
        <SocialErrorBoundary
            title="Profile is unavailable"
            message="This profile section failed to render. Try again."
        >
            <div className="h-full w-full overflow-y-auto bg-background hide-scrollbar">
            <header className="sticky top-0 z-40 flex w-full items-center justify-between border-b border-border bg-background/80 px-6 py-3 font-inter text-foreground shadow-sm backdrop-blur-md antialiased md:hidden">
                <div className="text-2xl font-black tracking-tight text-foreground">
                    {displayUsername}
                </div>
            </header>

            <div className="mx-auto max-w-4xl px-4 pb-10 pt-8 md:px-10">
                <ProfileHeader
                    fullName={fullName}
                    displayUsername={displayUsername}
                    userInitial={userInitial}
                    avatarUrl={profile.avatarUrl}
                    hasActiveStories={hasActiveStories}
                    isOwnProfile={Boolean(isOwnProfile)}
                    isLimited={isLimited}
                    contactStatus={contactStatus}
                    direction={direction}
                    iSentRequest={iSentRequest}
                    theySentRequest={theySentRequest}
                    bio={profile.bio}
                    postCount={postCount}
                    friendCount={friendCount}
                    actionLoading={actionLoading}
                    onOpenStoryViewer={() => setShowStoryViewer(true)}
                    onOpenFriends={handleOpenFriends}
                    onSendFriendRequest={handleSendFriendRequest}
                    onCancelRequest={handleCancelRequest}
                    onAcceptRequest={handleAcceptRequest}
                    onMessage={handleMessage}
                    onCopyLink={handleCopyLink}
                    onSetConfirmDialog={setConfirmDialog}
                />

                <ProfileTabs
                    activeTab={activeTab}
                    isOwnProfile={Boolean(isOwnProfile)}
                    onChange={handleTabChange}
                />

                <div className="flex flex-col gap-4">
                    {activeTab === "posts" &&
                        (isLimited ? (
                            <div className="py-10 text-center text-muted-foreground">
                                Posts are hidden due to privacy settings.
                            </div>
                        ) : posts.length === 0 && !loadingPosts ? (
                            <div className="py-10 text-center text-muted-foreground">
                                No posts to display yet.
                            </div>
                        ) : (
                            <ProfilePostGrid
                                posts={posts}
                                onNavigate={(id) => navigate(`/post/${id}`)}
                            />
                        ))}

                    {activeTab === "posts" && loadingPosts && (
                        <div className="flex justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    )}

                    {activeTab === "posts" &&
                        !isLimited &&
                        hasMorePosts &&
                        !loadingPosts &&
                        postCursor && (
                            <div className="flex justify-center py-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void loadPosts(postCursor)}
                                >
                                    Load more
                                </Button>
                            </div>
                        )}

                    {activeTab === "reels" && (
                        <div className="py-10 text-center text-muted-foreground">
                            Reels coming soon.
                        </div>
                    )}

                    {activeTab === "saved" &&
                        isOwnProfile &&
                        (loadingSaved ? (
                            <div className="flex justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : savedPosts.length === 0 ? (
                            <div className="py-10 text-center text-muted-foreground">
                                No saved posts yet.
                            </div>
                        ) : (
                            <ProfilePostGrid
                                posts={savedPosts}
                                onNavigate={(id) => navigate(`/post/${id}`)}
                            />
                        ))}

                    {activeTab === "tagged" && (
                        <div className="py-10 text-center text-muted-foreground">
                            Tagged posts coming soon.
                        </div>
                    )}
                </div>
            </div>

            {showStoryViewer && userStories.length > 0 && profile && (
                <StoryViewer
                    groups={[
                        {
                            user: {
                                id: profile.id,
                                displayName: profile.displayName,
                                avatarUrl: profile.avatarUrl,
                                username: profile.username,
                            },
                            stories: userStories,
                        },
                    ]}
                    initialGroupIndex={0}
                    onClose={() => setShowStoryViewer(false)}
                />
            )}

            <ProfileDialogs
                confirmDialog={confirmDialog}
                fullName={fullName}
                actionLoading={actionLoading}
                onSetConfirmDialog={setConfirmDialog}
                onBlock={handleBlock}
                onUnblock={handleUnblock}
                onRemove={handleRemoveFriend}
                showFriendsModal={showFriendsModal}
                onShowFriendsModalChange={setShowFriendsModal}
                friendCount={friendCount}
                loadingFriends={loadingFriends}
                friends={friends}
                targetUserId={targetUserId}
            />
            </div>
        </SocialErrorBoundary>
    );
}
