import { PhoneOff, Phone, Video } from "lucide-react";
import type { IncomingCall } from "@/types/call";

interface CallScreenProps {
    visible: boolean;
    incomingCall: IncomingCall | null;
    onAccept: () => void;
    onReject: () => void;
}

export function CallScreen({ visible, incomingCall, onAccept, onReject }: CallScreenProps) {
    if (!visible || !incomingCall) return null;

    const callLabel =
        incomingCall.type === "VIDEO" ? "Cuộc gọi video đến" : "Cuộc gọi thoại đến";

    const initial = incomingCall.callerName.charAt(0).toUpperCase();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-6">
                {/* Avatar với hiệu ứng pulsing */}
                <div className="relative h-32 w-32">
                    <div className="absolute inset-0 animate-ping rounded-full bg-white/20" />
                    {incomingCall.callerAvatar ? (
                        <img
                            src={incomingCall.callerAvatar}
                            alt={incomingCall.callerName}
                            className="relative h-32 w-32 rounded-full object-cover"
                        />
                    ) : (
                        <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gray-600">
                            <span className="text-4xl font-bold text-white">{initial}</span>
                        </div>
                    )}
                </div>

                {/* Tên và trạng thái */}
                <div className="text-center">
                    <h2 className="text-2xl font-semibold text-white">
                        {incomingCall.callerName}
                    </h2>
                    <p className="mt-1 text-sm text-gray-300">{callLabel}</p>
                </div>

                {/* Nút chấp nhận / từ chối */}
                <div className="mt-8 flex justify-center gap-16">
                    {/* Từ chối */}
                    <div className="flex flex-col items-center gap-2">
                        <button
                            onClick={onReject}
                            className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 transition-colors hover:bg-red-600"
                        >
                            <PhoneOff size={24} className="text-white" />
                        </button>
                        <span className="text-xs text-gray-400">Từ chối</span>
                    </div>

                    {/* Chấp nhận */}
                    <div className="flex flex-col items-center gap-2">
                        <button
                            onClick={onAccept}
                            className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 transition-colors hover:bg-green-600"
                        >
                            {incomingCall.type === "VIDEO" ? (
                                <Video size={24} className="text-white" />
                            ) : (
                                <Phone size={24} className="text-white" />
                            )}
                        </button>
                        <span className="text-xs text-gray-400">Chấp nhận</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
