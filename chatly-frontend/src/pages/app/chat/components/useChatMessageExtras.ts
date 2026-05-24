import { useCallback } from "react";
import { toast } from "sonner";
import { contactService } from "@/services/contact.service";
import { messageService } from "@/services/message.service";
import { userService } from "@/services/user.service";
import { useCallStore } from "@/store/call.store";
import { useCallContext } from "@/contexts/CallContext";
import type { ChatUser, Message } from "@/types/message";
import type { ContactResponse, ContactStatus } from "@/types/contact";
import type { ConversationResponse } from "@/types/conversation";
import { getErrorMessage } from "./chatWindow.utils";

interface UseChatMessageExtrasOptions {
    id: string;
    currentUserId: string | undefined;
    conversation: ConversationResponse | null;
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    setPinnedMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    setCurrentPinnedIdx: React.Dispatch<React.SetStateAction<number>>;
    participantDirectory: Record<string, ChatUser>;
    allContacts: ContactResponse[];
    setAllContacts: React.Dispatch<React.SetStateAction<ContactResponse[]>>;
    setContactStatus: React.Dispatch<React.SetStateAction<ContactStatus | null>>;
    setSelectedProfileUser: React.Dispatch<React.SetStateAction<ChatUser | null>>;
    setShowProfileDialog: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useChatMessageExtras({
    id,
    currentUserId,
    conversation,
    messages,
    setMessages,
    setPinnedMessages,
    setCurrentPinnedIdx,
    participantDirectory,
    allContacts,
    setAllContacts,
    setContactStatus,
    setSelectedProfileUser,
    setShowProfileDialog,
}: UseChatMessageExtrasOptions) {
    const { initiateCall, joinGroupCall } = useCallContext();

    const handleReact = useCallback(
        async (messageId: string, emoji: string) => {
            try {
                const res = await messageService.react(messageId, emoji);
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === messageId ? { ...m, reactions: res.result.reactions } : m,
                    ),
                );
            } catch (error) {
                toast.error(getErrorMessage(error, "Could not react to message"));
            }
        },
        [setMessages],
    );

    const handleVotePoll = useCallback(
        async (messageId: string, optionIndex: number) => {
            try {
                const res = await messageService.votePoll(messageId, optionIndex);
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === messageId ? { ...m, poll: res.result.poll } : m,
                    ),
                );
            } catch (error) {
                toast.error(getErrorMessage(error, "Could not vote"));
            }
        },
        [setMessages],
    );

    const handleClosePoll = useCallback(
        async (messageId: string) => {
            try {
                const res = await messageService.closePoll(messageId);
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === messageId ? { ...m, poll: res.result.poll } : m,
                    ),
                );
            } catch (error) {
                toast.error(getErrorMessage(error, "Could not end poll"));
            }
        },
        [setMessages],
    );

    const handleTogglePin = useCallback(
        async (messageId: string) => {
            try {
                const res = await messageService.togglePin(messageId);
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === messageId
                            ? {
                                  ...m,
                                  pinned: res.result.pinned,
                                  pinnedAt: res.result.pinnedAt,
                                  pinnedBy: res.result.pinnedBy,
                              }
                            : m,
                    ),
                );
                const pinned = await messageService.getPinnedMessages(id);
                setPinnedMessages(pinned.result);
                setCurrentPinnedIdx(0);
                toast.success(res.result.pinned ? "Message pinned" : "Message unpinned");
            } catch (error) {
                toast.error(getErrorMessage(error, "Could not pin message"));
            }
        },
        [id, setMessages, setPinnedMessages, setCurrentPinnedIdx],
    );

    const handleTagPriority = useCallback(
        async (messageId: string, priority: string) => {
            try {
                const res = await messageService.tagPriority(messageId, priority);
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === messageId ? { ...m, priority: res.result.priority } : m,
                    ),
                );
                toast.success(
                    res.result.priority
                        ? `Marked as ${res.result.priority.toLowerCase()}`
                        : "Priority removed",
                );
            } catch (error) {
                toast.error(getErrorMessage(error, "Could not tag priority"));
            }
        },
        [setMessages],
    );

    const handleCallAgain = useCallback(
        (calleeId: string, calleeName: string, calleeAvatar?: string) => {
            initiateCall(calleeId, id, "VOICE", calleeName, calleeAvatar);
        },
        [id, initiateCall],
    );

    const handleJoinGroupCall = useCallback(
        (callId: string) => {
            if (!conversation) return;

            const realtimeState = useCallStore.getState().groupCallRealtimeState[callId];
            if (realtimeState?.ended) {
                toast.error("This call has ended.");
                return;
            }

            const ringingMsg = messages.find((m) => {
                if (m.type !== "CALL") return false;
                try {
                    const d = JSON.parse(m.content);
                    return d.callId === callId && (d.status === "RINGING" || d.status === "ONGOING");
                } catch {
                    return false;
                }
            });
            let callType: "VOICE" | "VIDEO" = "VOICE";
            let initiatorId = "";
            if (ringingMsg) {
                try {
                    const d = JSON.parse(ringingMsg.content);
                    callType = d.callType === "VIDEO" ? "VIDEO" : "VOICE";
                } catch {
                    /* ignore */
                }
                initiatorId = ringingMsg.senderId;
            }

            const initiatorInfo = participantDirectory[initiatorId];
            const initiatorName = initiatorInfo?.displayName ?? "Group member";
            const initiatorAvatar = initiatorInfo?.avatarUrl ?? null;

            useCallStore.getState().setIncomingGroupCall({
                callId,
                conversationId: id,
                initiatorId,
                initiatorName,
                initiatorAvatar,
                groupName: conversation.name ?? "Group",
                groupAvatarUrl: conversation.avatarUrl ?? null,
                type: callType,
                participantCount: 0,
                mediaProvider: "AGORA",
            });
            useCallStore.getState().setCallStatus("RINGING");
            joinGroupCall(true);
        },
        [messages, id, conversation, participantDirectory, joinGroupCall],
    );

    const handleOpenSenderProfile = useCallback(
        async (senderId: string) => {
            let user = participantDirectory[senderId];
            if (!user) {
                try {
                    const res = await userService.getById(senderId);
                    const u = res.result;
                    user = {
                        id: u.id,
                        displayName: u.displayName,
                        username: u.username,
                        avatarUrl: u.avatarUrl,
                        phone: u.phone,
                        dob: u.dob,
                        role: u.role,
                    };
                } catch {
                    return;
                }
            }
            setSelectedProfileUser(user);

            const relation = allContacts.find(
                (c) =>
                    (c.user.id === currentUserId && c.contact.id === senderId) ||
                    (c.user.id === senderId && c.contact.id === currentUserId),
            );
            setContactStatus(relation?.status ?? null);
            setShowProfileDialog(true);
        },
        [
            participantDirectory,
            allContacts,
            currentUserId,
            setContactStatus,
            setSelectedProfileUser,
            setShowProfileDialog,
        ],
    );

    const handleAddFriendInline = useCallback(
        async (userId: string) => {
            const existing = allContacts.find(
                (c) => c.contact.id === userId || c.user.id === userId,
            );
            if (existing?.status === "ACCEPTED" || existing?.status === "PENDING") return;
            try {
                await contactService.sendRequest({ contactId: userId });
                setAllContacts((prev) =>
                    prev.map((c) =>
                        c.contact.id === userId || c.user.id === userId
                            ? { ...c, status: "PENDING" as const }
                            : c,
                    ),
                );
                toast.success("Friend request sent");
            } catch {
                toast.error("Unable to send friend requests.");
            }
        },
        [allContacts, setAllContacts],
    );

    return {
        handleReact,
        handleVotePoll,
        handleClosePoll,
        handleTogglePin,
        handleTagPriority,
        handleCallAgain,
        handleJoinGroupCall,
        handleOpenSenderProfile,
        handleAddFriendInline,
    };
}
