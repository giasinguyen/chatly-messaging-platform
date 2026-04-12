import { useEffect, useRef, useState } from "react";
import {
    Mic,
    MicOff,
    Video,
    VideoOff,
    Volume2,
    VolumeX,
    Maximize2,
    Minimize2,
    PhoneOff,
    VideoIcon,
} from "lucide-react";
import { useCallStore } from "@/store/call.store";

function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

interface ActiveCallOverlayProps {
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    onEndCall: () => void;
    onUpgradeToVideo?: () => void;
}

export function ActiveCallOverlay({
    localStream,
    remoteStream,
    onEndCall,
    onUpgradeToVideo,
}: ActiveCallOverlayProps) {
    // Video refs nội bộ — đảm bảo stream được attach đúng thời điểm overlay mount
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
        // Also pipe audio to the hidden <audio> element (covers voice-only calls)
        if (remoteAudioRef.current && remoteStream) {
            remoteAudioRef.current.srcObject = remoteStream;
            // Ensure audio has volume (browser autoplay policy may mute it initially)
            remoteAudioRef.current.volume = 1.0;
            remoteAudioRef.current.muted = false;
        }
    }, [remoteStream]);
    const {
        callStatus,
        activeCall,
        isMuted,
        isCameraOff,
        callDuration,
        toggleMute,
        toggleCamera,
        incrementDuration,
        outgoingCallTarget,
        incomingCall,
    } = useCallStore();

    // Tên và avatar của người bên kia:
    // - Caller (gọi đi): dùng outgoingCallTarget
    // - Callee (nhận): dùng incomingCall (callerName/callerAvatar)
    const peerName = outgoingCallTarget?.name ?? incomingCall?.callerName ?? "Người dùng";
    const peerAvatar = outgoingCallTarget?.avatarUrl ?? incomingCall?.callerAvatar ?? null;
    const peerInitial = peerName.charAt(0).toUpperCase();

    const [isExpanded, setIsExpanded] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Sync speaker state with actual remoteAudioRef muted status
    useEffect(() => {
        if (remoteAudioRef.current) {
            setIsSpeakerOn(!remoteAudioRef.current.muted);
        }
    }, [remoteStream]);

    // Try to play audio explicitly when stream is set (bypass autoplay policy if user interacted)
    useEffect(() => {
        if (remoteAudioRef.current && callStatus === "ONGOING") {
            remoteAudioRef.current.play().catch((err) => {
                console.warn("Audio autoplay failed (likely browser policy), user can click speaker to unmute:", err);
            });
        }
    }, [remoteStream, callStatus]);

    // Fix mute: toggle audio tracks on localStream directly (reliable)
    const handleToggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
        }
        toggleMute();
    };

    // Fix camera: toggle video tracks on localStream directly
    const handleToggleCamera = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
        }
        toggleCamera();
    };

    // Fix speaker: wire isSpeakerOn to the remoteAudio element
    const handleToggleSpeaker = () => {
        setIsSpeakerOn((prev) => {
            const next = !prev;
            if (remoteAudioRef.current) {
                remoteAudioRef.current.muted = !next;
            }
            return next;
        });
    };

    // Timer đếm thời gian cuộc gọi
    useEffect(() => {
        if (callStatus === "ONGOING") {
            timerRef.current = setInterval(() => {
                incrementDuration();
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [callStatus, incrementDuration]);

    if (callStatus !== "ONGOING" || !activeCall) return null;

    const isVideoCall = activeCall.type === "VIDEO";

    // Hidden audio element — plays remote stream for both voice and video calls
    const remoteAudioEl = (
        <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />
    );

    // Chế độ mở rộng (full screen)
    if (isExpanded) {
        return (
            <div className="fixed inset-0 z-40 flex flex-col bg-gray-900 text-white">
                {remoteAudioEl}
                {/* Video area */}
                <div className="relative flex-1">
                    {/* Remote video */}
                    {isVideoCall && remoteStream ? (
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center bg-gray-800 gap-4">
                            {peerAvatar ? (
                                <img src={peerAvatar} alt={peerName} className="h-24 w-24 rounded-full object-cover" />
                            ) : (
                                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-600">
                                    <span className="text-3xl font-bold">{peerInitial}</span>
                                </div>
                            )}
                            <p className="text-lg font-semibold">{peerName}</p>
                        </div>
                    )}

                    {/* Local video PiP */}
                    {isVideoCall && (
                        <div className="absolute bottom-4 right-4 overflow-hidden rounded-lg border-2 border-white">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className="h-auto w-32 bg-gray-700 object-cover"
                            />
                        </div>
                    )}

                    {/* Thời gian */}
                    <div className="absolute left-0 right-0 top-6 text-center">
                        <span className="rounded-full bg-black/40 px-4 py-1.5 text-sm font-medium">
                            {formatDuration(callDuration)}
                        </span>
                    </div>

                    {/* Nút thu nhỏ */}
                    <button
                        onClick={() => setIsExpanded(false)}
                        className="absolute left-4 top-6 rounded-lg bg-black/40 p-2 transition-colors hover:bg-black/60"
                    >
                        <Minimize2 size={20} />
                    </button>
                </div>

                {/* Controls bar */}
                <div className="flex items-center justify-center gap-5 bg-black/50 px-6 py-5">
                    <button
                        onClick={handleToggleMute}
                        className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                            isMuted ? "bg-red-500 hover:bg-red-600" : "bg-white/20 hover:bg-white/30"
                        }`}
                    >
                        {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                    </button>

                    {isVideoCall && (
                        <button
                            onClick={handleToggleCamera}
                            className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                                isCameraOff ? "bg-red-500 hover:bg-red-600" : "bg-white/20 hover:bg-white/30"
                            }`}
                        >
                            {isCameraOff ? <VideoOff size={22} /> : <Video size={22} />}
                        </button>
                    )}

                    <button
                        onClick={handleToggleSpeaker}
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
                    >
                        {isSpeakerOn ? <Volume2 size={22} /> : <VolumeX size={22} />}
                    </button>

                    {!isVideoCall && onUpgradeToVideo && (
                        <button
                            onClick={onUpgradeToVideo}
                            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
                            title="Upgrade to video call"
                        >
                            <VideoIcon size={22} />
                        </button>
                    )}

                    <button
                        onClick={onEndCall}
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 transition-colors hover:bg-red-600"
                    >
                        <PhoneOff size={22} />
                    </button>
                </div>
            </div>
        );
    }

    // Chế độ thu nhỏ (floating)
    return (
        <div className="fixed bottom-6 right-6 z-40 w-72 overflow-hidden rounded-2xl bg-gray-900 text-white shadow-2xl">
            {remoteAudioEl}
            {/* Video hoặc avatar */}
            <div className="relative">
                {isVideoCall && remoteStream ? (
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="aspect-video w-full bg-gray-800 object-cover"
                    />
                ) : (
                    <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-gray-800">
                        {peerAvatar ? (
                            <img src={peerAvatar} alt={peerName} className="h-14 w-14 rounded-full object-cover" />
                        ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-600">
                                <span className="text-xl font-bold">{peerInitial}</span>
                            </div>
                        )}
                        <p className="text-xs font-medium text-gray-300">{peerName}</p>
                    </div>
                )}

                {/* Local video PiP */}
                {isVideoCall && (
                    <div className="absolute bottom-2 right-2 overflow-hidden rounded-lg">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="h-auto w-20 bg-gray-700 object-cover"
                        />
                    </div>
                )}
            </div>

            {/* Thông tin cuộc gọi */}
            <div className="px-3 pt-2">
                <p className="text-sm font-semibold truncate">{peerName}</p>
                <p className="text-xs text-gray-400">{formatDuration(callDuration)}</p>
            </div>

            {/* Thanh điều khiển */}
            <div className="flex items-center justify-around p-3">
                <button
                    onClick={handleToggleMute}
                    className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
                >
                    {isMuted ? (
                        <MicOff size={18} className="text-red-400" />
                    ) : (
                        <Mic size={18} />
                    )}
                </button>

                {isVideoCall && (
                    <button
                        onClick={handleToggleCamera}
                        className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
                    >
                        {isCameraOff ? (
                            <VideoOff size={18} className="text-red-400" />
                        ) : (
                            <Video size={18} />
                        )}
                    </button>
                )}

                <button
                    onClick={handleToggleSpeaker}
                    className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
                >
                    {isSpeakerOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>

                {!isVideoCall && onUpgradeToVideo && (
                    <button
                        onClick={onUpgradeToVideo}
                        className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
                        title="Upgrade to video call"
                    >
                        <VideoIcon size={18} />
                    </button>
                )}

                <button
                    onClick={() => setIsExpanded(true)}
                    className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
                >
                    <Maximize2 size={18} />
                </button>

                <button
                    onClick={onEndCall}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 transition-colors hover:bg-red-600"
                >
                    <PhoneOff size={16} />
                </button>
            </div>
        </div>
    );
}
