import { memo, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInput, type ChatInputRef } from "./ChatInput";
import { MessageSearch } from "./MessageSearch";
import { ActivePollBanner, PinnedMessagesBanner } from "./ChatWindowBanners";
import {
    BlockedConversationBanner,
    ChatLoadingSkeleton,
    ChatNotFound,
    DragDropOverlay,
    TypingIndicator,
} from "./ChatWindowOverlays";
import { ChatWindowDialogs } from "./ChatWindowDialogs";
import { ChatInfoPanelWrapper } from "./ChatInfoPanelWrapper";
import { useChatWindowState } from "./useChatWindowState";
import { useFileDropHandlers } from "./useFileDropHandlers";
import type { ConversationResponse } from "@/types/conversation";
import type { Attachment } from "@/types/message";
import { AI_TYPING_USER_ID } from "@/constants/ai";

interface ChatWindowProps {
    id: string;
    onConversationUpdated?: (updated: ConversationResponse) => void;
}

export const ChatWindow = memo(({ id, onConversationUpdated }: ChatWindowProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const chatInputRef = useRef<ChatInputRef>(null);
    const prefillRef = useRef<{ content?: string; attachments?: Attachment[] } | null>(null);
    const s = useChatWindowState(id);
    const drop = useFileDropHandlers({ chatInputRef, setIsDragging: s.setIsDragging });

    // Capture prefill data from navigation state immediately (before it is lost)
    useEffect(() => {
        const state = location.state as {
            prefillContent?: string;
            prefillAttachments?: Attachment[];
        } | null;
        if (state?.prefillContent || state?.prefillAttachments?.length) {
            prefillRef.current = { content: state.prefillContent, attachments: state.prefillAttachments };
            navigate(location.pathname, { replace: true, state: null });
        }
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Apply prefill once ChatInput is mounted (loading finished)
    useEffect(() => {
        if (s.loading || !prefillRef.current) return;
        const { content, attachments } = prefillRef.current;
        if (content) chatInputRef.current?.setText(content);
        if (attachments?.length) chatInputRef.current?.addAttachments(attachments);
        prefillRef.current = null;
    }, [s.loading, id]);

    if (s.loading) return <ChatLoadingSkeleton />;
    if (s.notFound || !s.conversation || !s.participant) return <ChatNotFound />;

    const { conversation, participant, currentUser } = s;
    const isGroup = conversation.type === "GROUP";
    const isTyping = s.typingUserIds.size > 0;
    const typingUserId = Array.from(s.typingUserIds)[0];
    const participantPresence = !isGroup ? s.presenceMap[participant.id] : undefined;

    const replyingSenderName =
        s.replyingTo?.senderId === currentUser?.id
            ? "You"
            : (s.participantDirectory[s.replyingTo?.senderId ?? ""]?.displayName ??
              participant.displayName)
                  .split(" ")
                  .slice(-1)[0];

    const typingDisplayName = typingUserId === AI_TYPING_USER_ID
        ? "AI"
        : typingUserId
            ? (s.participantDirectory[typingUserId]?.displayName ?? participant.displayName)
                  .split(" ")
                  .slice(-1)[0]
            : participant.displayName.split(" ").slice(-1)[0];

    const profileUser =
        s.selectedProfileUser ?? (conversation.type === "PRIVATE" ? participant : null);
    const groupMembers = Object.values(s.participantDirectory);
    const inviteLink = `https://chatly.app/group/${conversation.id}`;
    const canAddFriend =
        !!profileUser?.id &&
        profileUser.id !== currentUser?.id &&
        !["ACCEPTED", "PENDING"].includes(s.contactStatus ?? "");

    const prefs = s.getPrefs(id);
    const isPinned = prefs.isPinned ?? conversation.isPinned ?? false;
    const isMuted = prefs.isMuted ?? conversation.isMuted ?? false;
    const nickname = prefs.nickname ?? conversation.nickname;

    return (
        <div className="flex-1 flex flex-row overflow-hidden">
            <div
                className="flex-1 flex flex-col overflow-hidden bg-background dark:bg-[#16191f] relative min-w-0"
                onDragEnter={drop.handleDragEnter}
                onDragOver={drop.handleDragOver}
                onDragLeave={drop.handleDragLeave}
                onDrop={drop.handleDrop}
            >
                {s.isDragging && <DragDropOverlay />}

                <ChatHeader
                    user={participant}
                    onOpenProfile={s.openProfileDialog}
                    isGroup={isGroup}
                    conversationId={id}
                    otherUserId={!isGroup ? participant.id : undefined}
                    onOpenGroupPanel={isGroup ? s.openGroupPanel : undefined}
                    onToggleSearch={s.toggleSearch}
                    onToggleInfoPanel={s.toggleInfoPanel}
                    isInfoPanelOpen={s.showInfoPanel}
                    presenceStatus={participantPresence?.status}
                    lastSeen={participantPresence?.lastSeen}
                    onBack={() => navigate("/chat")}
                    isPinned={isPinned}
                    isMuted={isMuted}
                    nickname={nickname}
                    memberCount={conversation?.participantIds?.length}
                />

                <PinnedMessagesBanner
                    pinnedMessages={s.pinnedMessages}
                    currentPinnedIdx={s.currentPinnedIdx}
                    onPrev={s.handlePinnedPrev}
                    onNext={s.handlePinnedNext}
                    onHighlight={s.setHighlightedMessageId}
                    onUnpin={s.handleTogglePin}
                    onShowAll={() => s.setShowPinnedDialog(true)}
                />

                {s.activePoll && !s.dismissedPollIds.has(s.activePoll.id) && (
                    <ActivePollBanner
                        activePoll={s.activePoll}
                        onHighlight={s.setHighlightedMessageId}
                        onDismiss={s.dismissActivePoll}
                    />
                )}

                {s.showSearch && (
                    <MessageSearch
                        conversationId={id}
                        onClose={s.closeSearch}
                        onNavigateToMessage={s.setHighlightedMessageId}
                        onKeywordChange={s.setHighlightKeyword}
                    />
                )}

                <MessageList
                    messages={s.messages}
                    participant={participant}
                    conversationType={conversation.type}
                    participantDirectory={s.messageUserDirectory}
                    currentUserId={currentUser?.id ?? ""}
                    onReply={s.handleReply}
                    onForward={s.handleForward}
                    onForwardToAi={s.handleForwardToAi}
                    onRecall={s.handleRecall}
                    onEdit={s.handleEdit}
                    onDelete={s.handleDelete}
                    onReact={s.handleReact}
                    onOpenSenderProfile={s.handleOpenSenderProfile}
                    onLoadMore={s.handleLoadMore}
                    isLoadingMore={s.isLoadingMore}
                    hasMore={s.hasMore}
                    failedMessages={s.failedMessages}
                    onRetryMessage={s.handleRetryMessage}
                    onRemoveFailedMessage={(fid) =>
                        s.setFailedMessages((p) => p.filter((m) => m.id !== fid))
                    }
                    highlightedMessageId={s.highlightedMessageId}
                    highlightKeyword={s.highlightKeyword}
                    onVotePoll={s.handleVotePoll}
                    onClosePoll={s.handleClosePoll}
                    onTogglePin={s.handleTogglePin}
                    onCallAgain={s.handleCallAgain}
                    onJoinGroupCall={s.handleJoinGroupCall}
                    onTagPriority={s.handleTagPriority}
                    contacts={s.allContacts}
                    onAddFriend={s.handleAddFriendInline}
                />

                {isTyping && <TypingIndicator typingDisplayName={typingDisplayName} isAi={typingUserId === AI_TYPING_USER_ID} />}

                {!isGroup && s.blockStatus?.blocked ? (
                    <BlockedConversationBanner
                        direction={s.blockStatus.direction}
                        onUnblock={() => s.setBlockConfirmAction("unblock")}
                    />
                ) : (
                    <ChatInput
                        ref={chatInputRef}
                        conversationId={id}
                        conversationType={conversation.type}
                        replyingTo={s.replyingTo}
                        senderName={replyingSenderName}
                        onCancelReply={s.handleCancelReply}
                        onSendMessage={s.handleSendMessage}
                        onSendVCard={s.handleSendVCard}
                        onTyping={s.sendTyping}
                        groupMembers={groupMembers}
                        currentUserId={currentUser?.id}
                        isAiProactiveEnabled={conversation.aiProactiveEnabled ?? false}
                    />
                )}

                <ChatWindowDialogs
                    id={id}
                    conversation={conversation}
                    participant={participant}
                    profileUser={profileUser}
                    currentUserId={currentUser?.id}
                    groupMembers={groupMembers}
                    inviteLink={inviteLink}
                    isGroup={isGroup}
                    participantPresence={participantPresence}
                    contactStatus={s.contactStatus}
                    blockStatus={s.blockStatus}
                    canAddFriend={canAddFriend}
                    sendingContact={s.sendingContact}
                    blockActionLoading={s.blockActionLoading}
                    blockConfirmAction={s.blockConfirmAction}
                    isEditingGroup={s.isEditingGroup}
                    groupNameDraft={s.groupNameDraft}
                    groupAvatarDraft={s.groupAvatarDraft}
                    groupAvatarUploading={s.groupAvatarUploading}
                    groupProfileSaving={s.groupProfileSaving}
                    groupPanelDefaultTab={s.groupPanelDefaultTab}
                    createGroupFromPrivateOpen={s.createGroupFromPrivateOpen}
                    forwardingMessage={s.forwardingMessage}
                    forwardingToAiMessage={s.forwardingToAiMessage}
                    showProfileDialog={s.showProfileDialog}
                    showGroupPanel={s.showGroupPanel}
                    showPinnedDialog={s.showPinnedDialog}
                    setForwardingMessage={s.setForwardingMessage}
                    setForwardingToAiMessage={s.setForwardingToAiMessage}
                    setShowPinnedDialog={s.setShowPinnedDialog}
                    setShowGroupPanel={s.setShowGroupPanel}
                    setCreateGroupFromPrivateOpen={s.setCreateGroupFromPrivateOpen}
                    setHighlightedMessageId={s.setHighlightedMessageId}
                    setConversation={s.setConversation}
                    setParticipant={s.setParticipant}
                    setBlockConfirmAction={s.setBlockConfirmAction}
                    setIsEditingGroup={s.setIsEditingGroup}
                    setGroupNameDraft={s.setGroupNameDraft}
                    setGroupAvatarDraft={s.setGroupAvatarDraft}
                    closeProfileDialog={s.closeProfileDialog}
                    handleForwardConfirm={s.handleForwardConfirm}
                    handleForwardToAiConfirm={s.handleForwardToAiConfirm}
                    handleTogglePin={s.handleTogglePin}
                    handleSendFriendRequest={s.handleSendFriendRequest}
                    handleGroupAvatarFileChange={s.handleGroupAvatarFileChange}
                    handleSaveGroupProfile={s.handleSaveGroupProfile}
                    handleBlockContact={s.handleBlockContact}
                    handleUnblockContact={s.handleUnblockContact}
                    handleLeaveGroup={s.handleLeaveGroup}
                />
            </div>

            {s.showInfoPanel && (
                <ChatInfoPanelWrapper
                    conversation={conversation}
                    participant={participant}
                    currentUserId={currentUser?.id ?? ""}
                    messages={s.messages}
                    isGroup={isGroup}
                    setConversation={s.setConversation}
                    setParticipant={s.setParticipant}
                    onOpenMembersPanel={() => {
                        s.setGroupPanelDefaultTab("members");
                        s.setShowGroupPanel(true);
                    }}
                    onCreateGroupFromPrivate={() => s.setCreateGroupFromPrivateOpen(true)}
                    onConversationUpdated={onConversationUpdated}
                />
            )}
        </div>
    );
});
