import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { ConversationInfoPanel } from "./ConversationInfoPanel";
import type { ChatUser } from "@/types/message";
import type { ConversationResponse } from "@/types/conversation";

interface ChatInfoPanelWrapperProps {
    conversation: ConversationResponse;
    participant: ChatUser;
    currentUserId: string;
    isGroup: boolean;
    setConversation: React.Dispatch<React.SetStateAction<ConversationResponse | null>>;
    setParticipant: React.Dispatch<React.SetStateAction<ChatUser | null>>;
    onOpenMembersPanel: () => void;
    onCreateGroupFromPrivate: () => void;
    onConversationUpdated?: (updated: ConversationResponse) => void;
}

export const ChatInfoPanelWrapper = memo(function ChatInfoPanelWrapper({
    conversation,
    participant,
    currentUserId,
    isGroup,
    setConversation,
    setParticipant,
    onOpenMembersPanel,
    onCreateGroupFromPrivate,
    onConversationUpdated,
}: ChatInfoPanelWrapperProps) {
    const navigate = useNavigate();

    return (
        <ConversationInfoPanel
            conversation={conversation}
            participant={participant}
            currentUserId={currentUserId}
            onDeleteConversation={() => navigate("/chat")}
            onOpenGroupPanel={isGroup ? onOpenMembersPanel : undefined}
            onCreateGroup={!isGroup ? onCreateGroupFromPrivate : undefined}
            onNicknameChange={(nick) => {
                setParticipant((prev) =>
                    prev ? { ...prev, displayName: nick } : prev,
                );
            }}
            onGroupUpdated={(name, avatarUrl) => {
                setConversation((prev) =>
                    prev
                        ? { ...prev, name, avatarUrl: avatarUrl ?? prev.avatarUrl }
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
            onConversationUpdate={(updated) => {
                setConversation(updated);
                onConversationUpdated?.(updated);
            }}
        />
    );
});
