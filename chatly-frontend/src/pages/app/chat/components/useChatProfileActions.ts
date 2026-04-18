import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { contactService } from "@/services/contact.service";
import { fileService } from "@/services/file.service";
import { groupService } from "@/services/group.service";
import type { ChatUser } from "@/types/message";
import type {
    BlockStatusResponse,
    ContactStatus,
} from "@/types/contact";
import type { ConversationResponse } from "@/types/conversation";

interface UseChatProfileActionsOptions {
    conversation: ConversationResponse | null;
    setConversation: React.Dispatch<React.SetStateAction<ConversationResponse | null>>;
    participant: ChatUser | null;
    setParticipant: React.Dispatch<React.SetStateAction<ChatUser | null>>;
    selectedProfileUser: ChatUser | null;
    currentUserId: string | undefined;
    contactStatus: ContactStatus | null;
    setContactStatus: React.Dispatch<React.SetStateAction<ContactStatus | null>>;
    setBlockStatus: React.Dispatch<React.SetStateAction<BlockStatusResponse | null>>;
    showProfileDialog: boolean;
}

export function useChatProfileActions({
    conversation,
    setConversation,
    participant,
    setParticipant,
    selectedProfileUser,
    currentUserId,
    contactStatus,
    setContactStatus,
    setBlockStatus,
    showProfileDialog,
}: UseChatProfileActionsOptions) {
    const [sendingContact, setSendingContact] = useState(false);
    const [blockConfirmAction, setBlockConfirmAction] = useState<"block" | "unblock" | null>(null);
    const [blockActionLoading, setBlockActionLoading] = useState(false);

    const [isEditingGroup, setIsEditingGroup] = useState(false);
    const [groupNameDraft, setGroupNameDraft] = useState("");
    const [groupAvatarDraft, setGroupAvatarDraft] = useState("");
    const [groupAvatarUploading, setGroupAvatarUploading] = useState(false);
    const [groupProfileSaving, setGroupProfileSaving] = useState(false);

    useEffect(() => {
        if (
            !showProfileDialog ||
            conversation?.type !== "GROUP" ||
            !participant
        ) {
            setIsEditingGroup(false);
            return;
        }

        setGroupNameDraft(
            participant.displayName || conversation.name || "Chat group",
        );
        setGroupAvatarDraft(
            participant.avatarUrl || conversation.avatarUrl || "",
        );
    }, [
        showProfileDialog,
        conversation?.type,
        conversation?.name,
        conversation?.avatarUrl,
        participant,
    ]);

    useEffect(() => {
        if (
            !selectedProfileUser ||
            !currentUserId ||
            selectedProfileUser.id === currentUserId
        ) {
            return;
        }
        contactService
            .blockStatus(selectedProfileUser.id)
            .then((res) => setBlockStatus(res.result ?? null))
            .catch(() => setBlockStatus(null));
    }, [selectedProfileUser, currentUserId, setBlockStatus]);

    const handleSendFriendRequest = useCallback(async () => {
        const targetUser =
            selectedProfileUser ??
            (conversation?.type === "PRIVATE" ? participant : null);
        if (!targetUser) return;
        if (contactStatus === "ACCEPTED" || contactStatus === "PENDING") return;

        try {
            setSendingContact(true);
            await contactService.sendRequest({ contactId: targetUser.id });
            setContactStatus("PENDING");
            toast.success("Friend request sent");
        } catch {
            toast.error("Could not send friend request");
        } finally {
            setSendingContact(false);
        }
    }, [
        selectedProfileUser,
        conversation?.type,
        participant,
        contactStatus,
        setContactStatus,
    ]);

    const handleBlockContact = useCallback(async () => {
        const targetUser =
            selectedProfileUser ??
            (conversation?.type === "PRIVATE" ? participant : null);
        if (!targetUser) return;
        setBlockActionLoading(true);
        try {
            await contactService.blockByUser(targetUser.id);
            setContactStatus("BLOCKED");
            setBlockStatus({
                blocked: true,
                blockedBy: currentUserId ?? null,
                direction: "I_BLOCKED",
            });
            toast.success(`Blocked ${targetUser.displayName}`);
        } catch {
            toast.error("Could not block user");
        } finally {
            setBlockActionLoading(false);
            setBlockConfirmAction(null);
        }
    }, [
        selectedProfileUser,
        conversation?.type,
        participant,
        currentUserId,
        setBlockStatus,
        setContactStatus,
    ]);

    const handleUnblockContact = useCallback(async () => {
        const targetUser =
            selectedProfileUser ??
            (conversation?.type === "PRIVATE" ? participant : null);
        if (!targetUser) return;
        setBlockActionLoading(true);
        try {
            await contactService.unblockByUser(targetUser.id);
            setContactStatus("ACCEPTED");
            setBlockStatus(null);
            toast.success(`Unblocked ${targetUser.displayName}`);
        } catch {
            toast.error("Could not unblock user");
        } finally {
            setBlockActionLoading(false);
            setBlockConfirmAction(null);
        }
    }, [
        selectedProfileUser,
        conversation?.type,
        participant,
        setBlockStatus,
        setContactStatus,
    ]);

    const handleGroupAvatarFileChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setGroupAvatarUploading(true);
            try {
                const res = await fileService.upload(file);
                setGroupAvatarDraft(res.url);
                toast.success("Image uploaded");
            } catch {
                toast.error("Could not upload image");
            } finally {
                setGroupAvatarUploading(false);
                if (e.target) e.target.value = "";
            }
        },
        [],
    );

    const handleSaveGroupProfile = useCallback(async () => {
        if (conversation?.type !== "GROUP" || !conversation?.id) return;

        const nextName = groupNameDraft.trim();
        if (!nextName) {
            toast.error("Group name cannot be empty");
            return;
        }

        const nextAvatar = groupAvatarDraft.trim();
        setGroupProfileSaving(true);
        try {
            await groupService.updateGroup(conversation.id, {
                name: nextName,
                avatar: nextAvatar || undefined,
            });
            setParticipant((prev) =>
                prev
                    ? {
                          ...prev,
                          displayName: nextName,
                          avatarUrl: nextAvatar || prev.avatarUrl,
                      }
                    : prev,
            );
            setConversation((prev) =>
                prev
                    ? { ...prev, name: nextName, avatarUrl: nextAvatar || prev.avatarUrl }
                    : prev,
            );
            setIsEditingGroup(false);
            toast.success("Group information updated");
        } catch {
            toast.error("Could not update group information");
        } finally {
            setGroupProfileSaving(false);
        }
    }, [
        conversation?.type,
        conversation?.id,
        groupAvatarDraft,
        groupNameDraft,
        setConversation,
        setParticipant,
    ]);

    return {
        sendingContact,
        blockConfirmAction,
        setBlockConfirmAction,
        blockActionLoading,
        isEditingGroup,
        setIsEditingGroup,
        groupNameDraft,
        setGroupNameDraft,
        groupAvatarDraft,
        setGroupAvatarDraft,
        groupAvatarUploading,
        groupProfileSaving,
        handleSendFriendRequest,
        handleBlockContact,
        handleUnblockContact,
        handleGroupAvatarFileChange,
        handleSaveGroupProfile,
    };
}
