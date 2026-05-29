import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, Video, Users, ChevronLeft, Search, Pin, BellOff, PanelRightOpen, PanelRightClose } from "lucide-react";
import { CustomAiIcon } from "@/components/customize/CustomAiIcon";
import { AdminBadge } from "@/components/customize/AdminBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PresenceIndicator } from "@/components/customize/PresenceIndicator";
import { GroupCallMemberPicker } from "@/components/call/GroupCallMemberPicker";
import { useCallContext } from "@/contexts/CallContext";
import { useCallStore } from "@/store/call.store";
import { agentService } from "@/services/agent.service";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { ChatUser } from "@/types/message";
import type { CallType } from "@/types/call";

interface ChatHeaderProps {
    user: ChatUser;
    onOpenProfile: () => void;
    isGroup?: boolean;
    conversationId?: string;
    otherUserId?: string;
    onOpenGroupPanel?: () => void;
    onToggleSearch?: () => void;
    onToggleInfoPanel?: () => void;
    isInfoPanelOpen?: boolean;
    presenceStatus?: "ONLINE" | "OFFLINE" | string;
    lastSeen?: string | null;
    onBack?: () => void;
    isPinned?: boolean;
    isMuted?: boolean;
    nickname?: string | null;
    memberCount?: number;
}

export function ChatHeader({ user, onOpenProfile, isGroup, conversationId, otherUserId, onOpenGroupPanel, onToggleSearch, onToggleInfoPanel, isInfoPanelOpen, presenceStatus, lastSeen, onBack, isPinned, isMuted, nickname }: ChatHeaderProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { initiateCall, initiateGroupCall } = useCallContext();
    const callStatus = useCallStore((s) => s.callStatus);
    const [memberPicker, setMemberPicker] = useState<{ visible: boolean; callType: CallType }>({ visible: false, callType: "VOICE" });
    const [isAiStarting, setIsAiStarting] = useState(false);

    const showCallButtons = !isGroup && !!conversationId && !!otherUserId;
    const callDisabled = callStatus !== "IDLE";

    const handleAskAi = async () => {
        if (!conversationId) return;
        setIsAiStarting(true);
        try {
            const session = await agentService.createSession({
                title: user.displayName,
                context_conversation_id: conversationId,
            });
            navigate(`/chatbot/${session.id}`);
        } catch {
            toast.error(t("chat.ai_open_failed"));
        } finally {
            setIsAiStarting(false);
        }
    };

    return (
        <header className="h-16 border-b border-border flex items-center justify-between px-2 sm:px-4 shrink-0 bg-background dark:bg-[#22252b]">
            <div className="flex items-center">
                {onBack && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onBack}
                        className="md:hidden h-9 w-9 mr-1"
                    >
                        <ChevronLeft size={24} />
                    </Button>
                )}
                <button
                    type="button"
                    onClick={onOpenProfile}
                    className="flex items-center gap-3 rounded-md px-2 py-1 text-left transition hover:bg-muted/60"
                >
                    <div className="relative">
                        <Avatar className="h-10 w-10 border border-border/50">
                            <AvatarImage src={user.avatarUrl} />
                            <AvatarFallback>
                                {user.displayName.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-foreground line-clamp-1">
                                {nickname || user.displayName}
                            </h3>
                            {!isGroup && user.role === "ADMIN" && (
                                <AdminBadge className="size-3.5" />
                            )}
                            {isPinned && (
                                <Pin
                                    size={14}
                                    className="text-[#1a146b] shrink-0"
                                />
                            )}
                            {isMuted && (
                                <BellOff
                                    size={14}
                                    className="text-muted-foreground shrink-0"
                                />
                            )}
                        </div>
                        {!isGroup && presenceStatus && (
                            <PresenceIndicator
                                status={presenceStatus}
                                lastSeen={lastSeen}
                                showLabel
                                className="mt-0.5"
                            />
                        )}
                    </div>
                </button>
            </div>

            <div className="flex items-center gap-1 text-muted-foreground">
                {isGroup && onOpenGroupPanel && (
                    <Button
                        onClick={onOpenGroupPanel}
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        title={t("chat.group_management")}
                    >
                        <Users size={18} />
                    </Button>
                )}
                {isGroup && conversationId && (
                    <Button
                        onClick={handleAskAi}
                        disabled={isAiStarting}
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={t("chat.ask_ai_about_group")}
                    >
                        <CustomAiIcon />
                    </Button>
                )}
                <Button
                    onClick={onToggleSearch}
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    title={t("chat.search_messages")}
                >
                    <Search size={18} />
                </Button>
                {showCallButtons ? (
                    <>
                        <Button
                            onClick={() =>
                                initiateCall(
                                    otherUserId!,
                                    conversationId!,
                                    "VIDEO",
                                    user.displayName,
                                    user.avatarUrl,
                                )
                            }
                            disabled={callDisabled}
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={t("chat.video_call_btn")}
                        >
                            <Video size={18} />
                        </Button>
                        <Button
                            onClick={() =>
                                initiateCall(
                                    otherUserId!,
                                    conversationId!,
                                    "VOICE",
                                    user.displayName,
                                    user.avatarUrl,
                                )
                            }
                            disabled={callDisabled}
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={t("chat.voice_call_btn")}
                        >
                            <Phone size={18} />
                        </Button>
                    </>
                ) : isGroup ? (
                    <>
                        <Button
                            onClick={() =>
                                setMemberPicker({
                                    visible: true,
                                    callType: "VIDEO",
                                })
                            }
                            disabled={callDisabled}
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={t("chat.group_video_call")}
                        >
                            <Video size={18} />
                        </Button>
                        <Button
                            onClick={() =>
                                setMemberPicker({
                                    visible: true,
                                    callType: "VOICE",
                                })
                            }
                            disabled={callDisabled}
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={t("chat.group_voice_call")}
                        >
                            <Phone size={18} />
                        </Button>
                    </>
                ) : null}
                {onToggleInfoPanel && (
                    <Button
                        onClick={onToggleInfoPanel}
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 hidden lg:inline-flex"
                        title={
                            isInfoPanelOpen
                                ? t("chat.close_info_panel")
                                : t("chat.open_info_panel")
                        }
                    >
                        {isInfoPanelOpen ? (
                            <PanelRightClose size={18} />
                        ) : (
                            <PanelRightOpen size={18} />
                        )}
                    </Button>
                )}
            </div>

            {conversationId && (
                <GroupCallMemberPicker
                    visible={memberPicker.visible}
                    conversationId={conversationId}
                    groupName={user.displayName}
                    groupAvatar={user.avatarUrl}
                    callType={memberPicker.callType}
                    onCall={(selectedIds) => {
                        setMemberPicker({ visible: false, callType: "VOICE" });
                        initiateGroupCall(
                            conversationId,
                            memberPicker.callType,
                            user.displayName,
                            selectedIds.length,
                            selectedIds,
                            user.avatarUrl,
                        );
                    }}
                    onClose={() =>
                        setMemberPicker({ visible: false, callType: "VOICE" })
                    }
                />
            )}
        </header>
    );
}
