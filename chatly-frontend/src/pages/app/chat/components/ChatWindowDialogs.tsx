import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { ForwardMessageDialog } from "./ForwardMessageDialog";
import { ForwardToAiDialog } from "./ForwardToAiDialog";
import { PinnedMessagesDialog } from "./PinnedMessagesDialog";
import { ChatProfileDialog } from "./ChatProfileDialog";
import { GroupManagementPanel } from "./GroupManagementPanel";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { BlockConfirmDialog } from "./ChatWindowOverlays";
import type { ChatUser, Message } from "@/types/message";
import type { BlockStatusResponse, ContactStatus } from "@/types/contact";
import type { ConversationResponse } from "@/types/conversation";

export interface ChatWindowDialogsProps {
    id: string;
    conversation: ConversationResponse;
    participant: ChatUser;
    profileUser: ChatUser | null;
    currentUserId: string | undefined;
    groupMembers: ChatUser[];
    inviteLink: string;
    isGroup: boolean;
    participantPresence?: { status: string; lastSeen: string | null };
    contactStatus: ContactStatus | null;
    blockStatus: BlockStatusResponse | null;
    canAddFriend: boolean;
    sendingContact: boolean;
    blockActionLoading: boolean;
    blockConfirmAction: "block" | "unblock" | null;
    isEditingGroup: boolean;
    groupNameDraft: string;
    groupAvatarDraft: string;
    groupAvatarUploading: boolean;
    groupProfileSaving: boolean;
    groupPanelDefaultTab: "members" | "settings";
    createGroupFromPrivateOpen: boolean;
    forwardingMessage: Message | null;
    forwardingToAiMessage: Message | null;
    showProfileDialog: boolean;
    showGroupPanel: boolean;
    showPinnedDialog: boolean;
    setForwardingMessage: (msg: Message | null) => void;
    setForwardingToAiMessage: (msg: Message | null) => void;
    setShowPinnedDialog: (open: boolean) => void;
    setShowGroupPanel: (open: boolean) => void;
    setCreateGroupFromPrivateOpen: (open: boolean) => void;
    setHighlightedMessageId: (id: string | null) => void;
    setConversation: React.Dispatch<React.SetStateAction<ConversationResponse | null>>;
    setParticipant: React.Dispatch<React.SetStateAction<ChatUser | null>>;
    setBlockConfirmAction: (action: "block" | "unblock" | null) => void;
    setIsEditingGroup: React.Dispatch<React.SetStateAction<boolean>>;
    setGroupNameDraft: (value: string) => void;
    setGroupAvatarDraft: (value: string) => void;
    closeProfileDialog: () => void;
    handleForwardConfirm: (ids: string[]) => Promise<void>;
    handleForwardToAiConfirm: (sessionId: string | null) => Promise<void>;
    handleTogglePin: (messageId: string) => Promise<void>;
    handleSendFriendRequest: () => void;
    handleGroupAvatarFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSaveGroupProfile: () => void;
    handleBlockContact: () => void;
    handleUnblockContact: () => void;
    handleLeaveGroup: () => void;
}

export const ChatWindowDialogs = memo(function ChatWindowDialogs(
    props: ChatWindowDialogsProps,
) {
    const navigate = useNavigate();
    const {
        id,
        conversation,
        participant,
        profileUser,
        currentUserId,
        groupMembers,
        inviteLink,
        isGroup,
        participantPresence,
        contactStatus,
        blockStatus,
        canAddFriend,
        sendingContact,
        blockActionLoading,
        blockConfirmAction,
        isEditingGroup,
        groupNameDraft,
        groupAvatarDraft,
        groupAvatarUploading,
        groupProfileSaving,
        groupPanelDefaultTab,
        createGroupFromPrivateOpen,
        forwardingMessage,
        forwardingToAiMessage,
        showProfileDialog,
        showGroupPanel,
        showPinnedDialog,
        setForwardingMessage,
        setForwardingToAiMessage,
        setShowPinnedDialog,
        setShowGroupPanel,
        setCreateGroupFromPrivateOpen,
        setHighlightedMessageId,
        setConversation,
        setParticipant,
        setBlockConfirmAction,
        setIsEditingGroup,
        setGroupNameDraft,
        setGroupAvatarDraft,
        closeProfileDialog,
        handleForwardConfirm,
        handleForwardToAiConfirm,
        handleTogglePin,
        handleSendFriendRequest,
        handleGroupAvatarFileChange,
        handleSaveGroupProfile,
        handleBlockContact,
        handleUnblockContact,
        handleLeaveGroup,
    } = props;

    return (
        <>  
            <ForwardMessageDialog
                open={!!forwardingMessage}
                currentConversationId={id}
                currentUserId={currentUserId ?? ""}
                onOpenChange={(open) => {
                    if (!open) setForwardingMessage(null);
                }}
                onConfirm={handleForwardConfirm}
            />

            <ForwardToAiDialog
                open={!!forwardingToAiMessage}
                onOpenChange={(open) => {
                    if (!open) setForwardingToAiMessage(null);
                }}
                onConfirm={handleForwardToAiConfirm}
            />

            <PinnedMessagesDialog
                conversationId={id}
                open={showPinnedDialog}
                onOpenChange={setShowPinnedDialog}
                onUnpin={handleTogglePin}
                onScrollToMessage={setHighlightedMessageId}
            />

            <ChatProfileDialog
                open={showProfileDialog}
                onOpenChange={(open) => {
                    if (!open) closeProfileDialog();
                }}
                profileUser={profileUser}
                participant={participant}
                conversation={conversation}
                groupMembers={groupMembers}
                inviteLink={inviteLink}
                isGroup={isGroup}
                participantPresence={participantPresence}
                contactStatus={contactStatus}
                blockStatus={blockStatus}
                canAddFriend={canAddFriend}
                currentUserId={currentUserId}
                sendingContact={sendingContact}
                blockActionLoading={blockActionLoading}
                isEditingGroup={isEditingGroup}
                groupNameDraft={groupNameDraft}
                groupAvatarDraft={groupAvatarDraft}
                groupAvatarUploading={groupAvatarUploading}
                groupProfileSaving={groupProfileSaving}
                onAddFriend={handleSendFriendRequest}
                onRequestBlockAction={setBlockConfirmAction}
                onToggleEditing={() => setIsEditingGroup((prev) => !prev)}
                onChangeGroupName={setGroupNameDraft}
                onChangeGroupAvatarDraft={setGroupAvatarDraft}
                onAvatarFileChange={handleGroupAvatarFileChange}
                onSaveGroupProfile={handleSaveGroupProfile}
                onOpenGroupPanel={() => {
                    closeProfileDialog();
                    setShowGroupPanel(true);
                }}
                onLeaveGroup={handleLeaveGroup}
            />

            {isGroup && (
                <GroupManagementPanel
                    conversationId={id}
                    open={showGroupPanel}
                    onOpenChange={setShowGroupPanel}
                    initialGroupName={conversation.name ?? ""}
                    initialGroupAvatar={conversation.avatarUrl ?? ""}
                    initialRequireApproval={conversation.requireApproval ?? false}
                    initialAllowMembersUpdate={
                        conversation.allowMembersUpdateInfo !== false
                    }
                    initialAiProactiveEnabled={conversation.aiProactiveEnabled ?? false}
                    defaultTab={groupPanelDefaultTab}
                    onGroupUpdated={(name, avatarUrl) => {
                        setConversation((prev) =>
                            prev
                                ? {
                                      ...prev,
                                      name,
                                      avatarUrl: avatarUrl ?? prev.avatarUrl,
                                  }
                                : prev,
                        );
                        setParticipant((prev) =>
                            prev
                                ? {
                                      ...prev,
                                      displayName: name,
                                      avatarUrl: avatarUrl ?? prev.avatarUrl,
                                  }
                                : prev,
                        );
                    }}
                />
            )}

            <CreateGroupDialog
                open={createGroupFromPrivateOpen}
                onOpenChange={setCreateGroupFromPrivateOpen}
                onCreated={(conv) => navigate(`/chat/${conv.id}`)}
            />

            <BlockConfirmDialog
                action={blockConfirmAction}
                loading={blockActionLoading}
                onOpenChange={(open) => !open && setBlockConfirmAction(null)}
                onConfirm={
                    blockConfirmAction === "block"
                        ? handleBlockContact
                        : handleUnblockContact
                }
            />
        </>
    );
});
