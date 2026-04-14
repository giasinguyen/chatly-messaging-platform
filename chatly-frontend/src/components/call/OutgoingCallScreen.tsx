import { PhoneOff } from "lucide-react";
import { useCallStore } from "@/store/call.store";

interface OutgoingCallScreenProps {
    onCancel: () => void;
}

export function OutgoingCallScreen({ onCancel }: OutgoingCallScreenProps) {
    const { callStatus, outgoingCallTarget } = useCallStore();

    // Chỉ hiển thị khi đang gọi đi (caller side) — không phải IDLE và không phải ONGOING
    if (!outgoingCallTarget || callStatus === "IDLE" || callStatus === "ONGOING") return null;

    const { name, avatarUrl, type } = outgoingCallTarget;
    const initial = name.charAt(0).toUpperCase();
    const isRinging = callStatus === "RINGING";
    const isRejected = callStatus === "REJECTED";

    let statusText = "The phone is ringing...";
    if (isRejected) statusText = "The call was rejected.";
    if (callStatus === "ENDED") statusText = "The call has ended.";
    if (callStatus === "MISSED") statusText = "No response";

    const callLabel = type === "VIDEO" ? "Video call" : "Voice call";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-6 text-center">
                {/* Avatar */}
                <div className="relative h-32 w-32">
                    {isRinging && (
                        <div className="absolute inset-0 animate-ping rounded-full bg-white/20" />
                    )}
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={name}
                            className="relative h-32 w-32 rounded-full object-cover"
                        />
                    ) : (
                        <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gray-600">
                            <span className="text-4xl font-bold text-white">{initial}</span>
                        </div>
                    )}
                </div>

                {/* Tên + loại cuộc gọi + trạng thái */}
                <div>
                    <p className="text-sm text-gray-400">{callLabel}</p>
                    <h2 className="mt-1 text-2xl font-semibold text-white">{name}</h2>
                    <p className="mt-2 text-sm text-gray-300">{statusText}</p>
                </div>

                {/* Nút hủy — chỉ hiển thị khi đang đổ chuông */}
                {!isRejected && callStatus !== "ENDED" && callStatus !== "MISSED" && (
                    <div className="mt-8">
                        <div className="flex flex-col items-center gap-2">
                            <button
                                onClick={onCancel}
                                className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 transition-colors hover:bg-red-600"
                            >
                                <PhoneOff size={24} className="text-white" />
                            </button>
                            <span className="text-xs text-gray-400">Hủy cuộc gọi</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
