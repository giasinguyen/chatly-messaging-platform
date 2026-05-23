import { useCallback, useMemo, useState } from "react";
import type { ChatUser, Message } from "@/types/message";
import { useChatConversationData } from "./useChatConversationData";
import { useChatMessageActions } from "./useChatMessageActions";
import { useChatMessageExtras } from "./useChatMessageExtras";
import { useChatProfileActions } from "./useChatProfileActions";

export function useChatWindowState(id: string) {
    const [showProfileDialog, setShowProfileDialog] = useState(false);
    const [showGroupPanel, setShowGroupPanel] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [showInfoPanel, setShowInfoPanel] = useState(true);
    const [showPinnedDialog, setShowPinnedDialog] = useState(false);
    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
    const [highlightKeyword, setHighlightKeyword] = useState("");
    const [groupPanelDefaultTab, setGroupPanelDefaultTab] = useState<"members" | "settings">("members");
    const [createGroupFromPrivateOpen, setCreateGroupFromPrivateOpen] = useState(false);
    const [dismissedPollIds, setDismissedPollIds] = useState<Set<string>>(new Set());
    const [selectedProfileUser, setSelectedProfileUser] = useState<ChatUser | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const data = useChatConversationData({ id });

    const messageActions = useChatMessageActions({
        id,
        currentUserId: data.currentUser?.id,
        replyingTo: data.replyingTo,
        setReplyingTo: data.setReplyingTo,
        setMessages: data.setMessages,
        failedMessages: data.failedMessages,
        setFailedMessages: data.setFailedMessages,
        sendMessage: data.sendMessage,
    });

    const messageExtras = useChatMessageExtras({
        id,
        currentUserId: data.currentUser?.id,
        conversation: data.conversation,
        messages: data.messages,
        setMessages: data.setMessages,
        setPinnedMessages: data.setPinnedMessages,
        setCurrentPinnedIdx: data.setCurrentPinnedIdx,
        participantDirectory: data.participantDirectory,
        allContacts: data.allContacts,
        setAllContacts: data.setAllContacts,
        setContactStatus: data.setContactStatus,
        setSelectedProfileUser,
        setShowProfileDialog,
    });

    const profileActions = useChatProfileActions({
        conversation: data.conversation,
        setConversation: data.setConversation,
        participant: data.participant,
        setParticipant: data.setParticipant,
        selectedProfileUser,
        currentUserId: data.currentUser?.id,
        contactStatus: data.contactStatus,
        setContactStatus: data.setContactStatus,
        setBlockStatus: data.setBlockStatus,
        showProfileDialog,
    });

    const activePoll = useMemo<Message | null>(() => {
        for (let i = data.messages.length - 1; i >= 0; i--) {
            const m = data.messages[i];
            if (m.type === "POLL" && m.poll && !m.poll.closed) return m;
        }
        return null;
    }, [data.messages]);

    const messageUserDirectory = useMemo(
        () => ({
            ...data.userDirectory,
            ...data.participantDirectory,
        }),
        [data.userDirectory, data.participantDirectory],
    );

    const dismissActivePoll = useCallback((pollId: string) => {
        setDismissedPollIds((prev) => new Set(prev).add(pollId));
    }, []);

    const handlePinnedPrev = useCallback(() => {
        data.setCurrentPinnedIdx(
            (i) => (i - 1 + data.pinnedMessages.length) % data.pinnedMessages.length,
        );
    }, [data]);

    const handlePinnedNext = useCallback(() => {
        data.setCurrentPinnedIdx((i) => (i + 1) % data.pinnedMessages.length);
    }, [data]);

    const toggleSearch = useCallback(() => {
        setShowSearch((prev) => {
            if (prev) {
                setHighlightedMessageId(null);
                setHighlightKeyword("");
            }
            return !prev;
        });
    }, []);

    const closeSearch = useCallback(() => {
        setShowSearch(false);
        setHighlightedMessageId(null);
        setHighlightKeyword("");
    }, []);

    const toggleInfoPanel = useCallback(() => {
        setShowInfoPanel((prev) => !prev);
    }, []);

    const openGroupPanel = useCallback(() => setShowGroupPanel(true), []);
    const openProfileDialog = useCallback(() => {
        setSelectedProfileUser(null);
        setShowProfileDialog(true);
    }, []);

    const closeProfileDialog = useCallback(() => {
        setShowProfileDialog(false);
        setSelectedProfileUser(null);
    }, []);

    return {
        ...data,
        ...messageActions,
        ...messageExtras,
        ...profileActions,
        showProfileDialog,
        setShowProfileDialog,
        showGroupPanel,
        setShowGroupPanel,
        showSearch,
        setShowSearch,
        showInfoPanel,
        setShowInfoPanel,
        showPinnedDialog,
        setShowPinnedDialog,
        highlightedMessageId,
        setHighlightedMessageId,
        highlightKeyword,
        setHighlightKeyword,
        groupPanelDefaultTab,
        setGroupPanelDefaultTab,
        createGroupFromPrivateOpen,
        setCreateGroupFromPrivateOpen,
        dismissedPollIds,
        selectedProfileUser,
        setSelectedProfileUser,
        isDragging,
        setIsDragging,
        activePoll,
        messageUserDirectory,
        dismissActivePoll,
        handlePinnedPrev,
        handlePinnedNext,
        toggleSearch,
        closeSearch,
        toggleInfoPanel,
        openGroupPanel,
        openProfileDialog,
        closeProfileDialog,
    };
}

export type ChatWindowState = ReturnType<typeof useChatWindowState>;
