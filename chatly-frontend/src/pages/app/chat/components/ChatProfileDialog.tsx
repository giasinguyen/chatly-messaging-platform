import { memo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { ChatUser } from "@/types/message";
import type { BlockStatusResponse, ContactStatus } from "@/types/contact";
import type { ConversationResponse } from "@/types/conversation";
import { ChatPrivateProfileContent } from "./ChatPrivateProfileContent";
import { ChatGroupProfileContent } from "./ChatGroupProfileContent";

export interface ChatProfileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    profileUser: ChatUser | null;
    participant: ChatUser;
    conversation: ConversationResponse;
    groupMembers: ChatUser[];
    inviteLink: string;
    isGroup: boolean;
    participantPresence?: { status: string; lastSeen: string | null };
    contactStatus: ContactStatus | null;
    blockStatus: BlockStatusResponse | null;
    canAddFriend: boolean;
    currentUserId: string | undefined;
    sendingContact: boolean;
    blockActionLoading: boolean;
    isEditingGroup: boolean;
    groupNameDraft: string;
    groupAvatarDraft: string;
    groupAvatarUploading: boolean;
    groupProfileSaving: boolean;
    onAddFriend: () => void;
    onRequestBlockAction: (action: "block" | "unblock") => void;
    onToggleEditing: () => void;
    onChangeGroupName: (value: string) => void;
    onChangeGroupAvatarDraft: (value: string) => void;
    onAvatarFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSaveGroupProfile: () => void;
    onOpenGroupPanel: () => void;
    onLeaveGroup: () => void;
}

export const ChatProfileDialog = memo(function ChatProfileDialog({
    open,
    onOpenChange,
    profileUser,
    participant,
    conversation,
    groupMembers,
    inviteLink,
    isGroup,
    participantPresence,
    contactStatus,
    blockStatus,
    canAddFriend,
    currentUserId,
    sendingContact,
    blockActionLoading,
    isEditingGroup,
    groupNameDraft,
    groupAvatarDraft,
    groupAvatarUploading,
    groupProfileSaving,
    onAddFriend,
    onRequestBlockAction,
    onToggleEditing,
    onChangeGroupName,
    onChangeGroupAvatarDraft,
    onAvatarFileChange,
    onSaveGroupProfile,
    onOpenGroupPanel,
    onLeaveGroup,
}: ChatProfileDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={
                    conversation.type === "GROUP"
                        ? "sm:max-w-md border-border/70 bg-background dark:bg-[#1b1c1d]"
                        : "sm:max-w-md border-border/70"
                }
            >
                {profileUser ? (
                    <ChatPrivateProfileContent
                        profileUser={profileUser}
                        participantId={participant.id}
                        isGroup={isGroup}
                        participantPresence={participantPresence}
                        blockStatus={blockStatus}
                        contactStatus={contactStatus}
                        canAddFriend={canAddFriend}
                        currentUserId={currentUserId}
                        sendingContact={sendingContact}
                        blockActionLoading={blockActionLoading}
                        onAddFriend={onAddFriend}
                        onRequestBlockAction={onRequestBlockAction}
                        onClose={() => onOpenChange(false)}
                    />
                ) : (
                    <ChatGroupProfileContent
                        participant={participant}
                        conversation={conversation}
                        groupMembers={groupMembers}
                        inviteLink={inviteLink}
                        isEditingGroup={isEditingGroup}
                        groupNameDraft={groupNameDraft}
                        groupAvatarDraft={groupAvatarDraft}
                        groupAvatarUploading={groupAvatarUploading}
                        groupProfileSaving={groupProfileSaving}
                        onToggleEditing={onToggleEditing}
                        onChangeName={onChangeGroupName}
                        onChangeAvatarDraft={onChangeGroupAvatarDraft}
                        onAvatarFileChange={onAvatarFileChange}
                        onSaveGroupProfile={onSaveGroupProfile}
                        onOpenGroupPanel={onOpenGroupPanel}
                        onLeaveGroup={onLeaveGroup}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
});
