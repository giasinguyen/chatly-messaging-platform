import { useState, useEffect } from "react";
import { Phone, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { groupService } from "@/services/group.service";
import { useAuthStore } from "@/store/auth.store";
import { PresenceIndicator } from "@/components/customize/PresenceIndicator";
import type { CallType } from "@/types/call";
import type { GroupMemberResponse } from "@/types/group";

interface GroupCallMemberPickerProps {
    visible: boolean;
    conversationId: string;
    groupName: string;
    groupAvatar?: string;
    callType: CallType;
    onCall: (selectedMemberIds: string[]) => void;
    onClose: () => void;
}

export function GroupCallMemberPicker({
    visible,
    conversationId,
    groupName,
    groupAvatar,
    callType,
    onCall,
    onClose,
}: GroupCallMemberPickerProps) {
    const { t } = useTranslation();
    const currentUser = useAuthStore((s) => s.user);
    const [members, setMembers] = useState<GroupMemberResponse[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!visible || !conversationId) return;
        setLoading(true);

        groupService
            .getMembers(conversationId)
            .then((res) => {
                const others = (res.result ?? []).filter(
                    (m) => m.userId !== currentUser?.id,
                );
                setMembers(others);
                // Select all by default
                setSelectedIds(new Set(others.map((m) => m.userId)));
            })
            .catch(() => setMembers([]))
            .finally(() => setLoading(false));
    }, [visible, conversationId, currentUser?.id]);

    if (!visible) return null;

    const toggleMember = (userId: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(userId)) {
                next.delete(userId);
            } else {
                next.add(userId);
            }
            return next;
        });
    };

    const selectedMembers = members.filter((m) => selectedIds.has(m.userId));
    const callLabel =
        callType === "VIDEO" ? t("chat.call_video") : t("chat.call_voice");

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-2xl flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
                    <h3 className="text-base font-semibold text-foreground">
                        {t("chat.call_members_title")}
                    </h3>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-muted-foreground hover:bg-muted transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Group info */}
                <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
                    <Avatar className="h-10 w-10 border border-border/50">
                        <AvatarImage src={groupAvatar} />
                        <AvatarFallback>{groupName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-sm font-medium text-foreground">
                            {groupName}
                        </p>
                        <PresenceIndicator
                            status="ONLINE"
                            showLabel
                            className="mt-0.5"
                        />
                    </div>
                </div>

                {/* Selected tags */}
                {selectedMembers.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 px-5 py-2.5 border-b border-border">
                        <span className="text-xs text-muted-foreground mr-1">
                            {t("chat.call_ringing_label")}
                        </span>
                        {selectedMembers.map((m) => (
                            <span
                                key={m.userId}
                                className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand"
                            >
                                {m.displayName.split(" ").slice(-1)[0]}
                                <button
                                    onClick={() => toggleMember(m.userId)}
                                    className="rounded-full hover:bg-brand/20 p-0.5"
                                >
                                    <X size={12} />
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                {/* Member list */}
                <div className="flex-1 overflow-y-auto px-2 py-2">
                    <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t("chat.call_members")}
                    </p>
                    {loading ? (
                        <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                            {t("common.loading")}
                        </p>
                    ) : (
                        members.map((m) => {
                            const isSelected = selectedIds.has(m.userId);
                            return (
                                <button
                                    key={m.userId}
                                    type="button"
                                    onClick={() => toggleMember(m.userId)}
                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
                                >
                                    <div className="relative">
                                        <Avatar className="h-10 w-10 border border-border/50">
                                            <AvatarImage
                                                src={m.avatar ?? undefined}
                                            />
                                            <AvatarFallback>
                                                {m.displayName.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {m.displayName}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {m.username}
                                        </p>
                                    </div>
                                    <div
                                        className={`h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                                            isSelected
                                                ? "bg-brand border-brand"
                                                : "border-muted-foreground/40"
                                        }`}
                                    >
                                        {isSelected && (
                                            <svg
                                                width="12"
                                                height="12"
                                                viewBox="0 0 12 12"
                                                fill="none"
                                                className="text-white"
                                            >
                                                <path
                                                    d="M2.5 6L5 8.5L9.5 3.5"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                        )}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Call button */}
                <div className="px-5 pb-5 pt-3 border-t border-border">
                    <button
                        disabled={selectedIds.size === 0}
                        onClick={() => onCall(Array.from(selectedIds))}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Phone size={16} />
                        {callLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
