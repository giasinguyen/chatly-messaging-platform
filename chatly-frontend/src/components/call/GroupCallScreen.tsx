import { PhoneOff, Phone, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { IncomingGroupCall } from "@/types/call";

interface GroupCallScreenProps {
    visible: boolean;
    incomingGroupCall: IncomingGroupCall | null;
    onJoin: () => void;
    onDecline: () => void;
}

export function GroupCallScreen({
    visible,
    incomingGroupCall,
    onJoin,
    onDecline,
}: GroupCallScreenProps) {
    const { t } = useTranslation();

    if (!visible || !incomingGroupCall) return null;

    const callLabel =
        incomingGroupCall.type === "VIDEO"
            ? t("chat.group_video_call")
            : t("chat.group_voice_call");
    const initial = incomingGroupCall.groupName.charAt(0).toUpperCase();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-6">
                {/* Avatar with pulsing effect */}
                <div className="relative h-32 w-32">
                    <div className="absolute inset-0 animate-ping rounded-full bg-white/20" />
                    <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gray-600 overflow-hidden">
                        {incomingGroupCall.groupAvatarUrl ? (
                            <img
                                src={incomingGroupCall.groupAvatarUrl}
                                alt={incomingGroupCall.groupName}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <span className="text-4xl font-bold text-white">
                                {initial}
                            </span>
                        )}
                    </div>
                </div>

                {/* Group info */}
                <div className="text-center">
                    <h2 className="text-2xl font-semibold text-white">
                        {incomingGroupCall.groupName}
                    </h2>
                    <p className="mt-1 text-sm text-gray-300">{callLabel}</p>
                    <p className="mt-1 text-xs text-gray-400">
                        {t("chat.call_group_incoming_summary", {
                            name: incomingGroupCall.initiatorName,
                            count: incomingGroupCall.participantCount,
                        })}
                    </p>
                </div>

                {/* Action buttons */}
                <div className="mt-8 flex justify-center gap-16">
                    {/* Decline */}
                    <div className="flex flex-col items-center gap-2">
                        <button
                            onClick={onDecline}
                            className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 transition-colors hover:bg-red-600"
                        >
                            <PhoneOff size={24} className="text-white" />
                        </button>
                        <span className="text-xs text-gray-400">
                            {t("chat.call_decline")}
                        </span>
                    </div>

                    {/* Join */}
                    <div className="flex flex-col items-center gap-2">
                        <button
                            onClick={onJoin}
                            className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 transition-colors hover:bg-green-600"
                        >
                            {incomingGroupCall.type === "VIDEO" ? (
                                <Video size={24} className="text-white" />
                            ) : (
                                <Phone size={24} className="text-white" />
                            )}
                        </button>
                        <span className="text-xs text-gray-400">
                            {t("chat.call_join")}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
