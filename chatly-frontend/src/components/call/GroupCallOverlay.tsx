import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
    Mic,
    MicOff,
    Video,
    VideoOff,
    Volume2,
    VolumeX,
    PhoneOff,
    Maximize2,
    Minimize2,
} from "lucide-react";
import { useCallStore } from "@/store/call.store";

function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

interface GroupCallOverlayProps {
    groupLocalStream: MediaStream | null;
    groupRemoteStreams: Record<string, MediaStream>;
    onLeave: () => void;
    onToggleMute: (muted: boolean) => void;
    onToggleCamera: (cameraOff: boolean) => void;
    onUpgradeToVideo?: () => Promise<void>;
}

function ParticipantTile({
    name,
    avatar,
    stream,
    isVideoCall,
    isLocal,
}: {
    name: string;
    avatar: string | null;
    stream: MediaStream | null;
    isVideoCall: boolean;
    isLocal?: boolean;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hasLiveVideoTrack = Boolean(
        stream?.getVideoTracks().some((track) => track.readyState === "live"),
    );

    useEffect(() => {
        if (videoRef.current) {
            if (!stream) {
                videoRef.current.srcObject = null;
                return;
            }

            videoRef.current.srcObject = stream;
            // Audio is rendered by hidden <audio> elements; keep all video tags muted for autoplay reliability.
            videoRef.current.muted = true;
            videoRef.current.play().catch(() => {});
        }
    }, [stream]);

    const initial = name.charAt(0).toUpperCase();

    return (
        <div
            className={`relative flex items-center justify-center overflow-hidden rounded-xl bg-gray-800 w-full h-full ${
                isLocal ? "ring-2 ring-blue-500" : ""
            }`}
        >
            {hasLiveVideoTrack ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                />
            ) : (
                <div className="flex flex-col items-center justify-center gap-2 p-3">
                    {avatar ? (
                        <img
                            src={avatar}
                            alt={name}
                            className="h-14 w-14 rounded-full object-cover"
                        />
                    ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-600">
                            <span className="text-xl font-bold text-white">{initial}</span>
                        </div>
                    )}
                    <p className="text-xs font-medium text-white truncate max-w-full">
                        {isLocal ? "You" : name}
                    </p>
                </div>
            )}
            {/* Name badge */}
            <div className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5">
                <span className="text-[10px] text-white">{isLocal ? "You" : name}</span>
            </div>
        </div>
    );
}

export function GroupCallOverlay({
    groupLocalStream,
    groupRemoteStreams,
    onLeave,
    onToggleMute,
    onToggleCamera,
    onUpgradeToVideo,
}: GroupCallOverlayProps) {
    const {
        callStatus,
        activeCall,
        isMuted,
        isCameraOff,
        callDuration,
        isGroupCall,
        groupParticipantInfo,
        toggleMute,
        toggleCamera,
        incrementDuration,
    } = useCallStore();

    const [isExpanded, setIsExpanded] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Remote audio elements for all peers
    const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

    // Call duration timer
    useEffect(() => {
        if (callStatus === "ONGOING" && isGroupCall) {
            timerRef.current = setInterval(() => incrementDuration(), 1000);
        }
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [callStatus, isGroupCall, incrementDuration]);

    // Attach audio streams for remote peers
    useEffect(() => {
        Object.entries(groupRemoteStreams).forEach(([peerId, stream]) => {
            let audio = audioRefs.current.get(peerId);
            if (!audio) {
                audio = document.createElement("audio");
                audio.autoplay = true;
                audio.playsInline = true;
                audio.style.display = "none";
                document.body.appendChild(audio);
                audioRefs.current.set(peerId, audio);
            }
            if (audio.srcObject !== stream) {
                audio.srcObject = stream;
                audio.play().catch(() => {});
            }
        });

        // Remove audio elements for peers that left
        audioRefs.current.forEach((audio, peerId) => {
            if (!groupRemoteStreams[peerId]) {
                audio.srcObject = null;
                audio.remove();
                audioRefs.current.delete(peerId);
            }
        });
    }, [groupRemoteStreams]);

    // Cleanup audio elements on unmount
    useEffect(() => {
        return () => {
            audioRefs.current.forEach((audio) => {
                audio.srcObject = null;
                audio.remove();
            });
            audioRefs.current.clear();
        };
    }, []);

    if ((callStatus !== "ONGOING" && callStatus !== "RINGING") || !activeCall || !isGroupCall) return null;

    const isVideoCall = activeCall.type === "VIDEO";

    const remotePeers = Object.entries(groupRemoteStreams).map(([peerId, stream]) => ({
        peerId,
        stream,
        name: groupParticipantInfo[peerId]?.name ?? peerId.substring(0, 8),
        avatar: groupParticipantInfo[peerId]?.avatar ?? null,
    }));

    const totalParticipants = remotePeers.length + 1;
    const gridCols = totalParticipants <= 1 ? 1 : totalParticipants <= 4 ? 2 : 3;
    const gridRows = Math.ceil(totalParticipants / gridCols);

    const handleToggleMute = () => {
        const next = !isMuted;
        onToggleMute(next);
        toggleMute();
    };

    const handleToggleCamera = async () => {
        const nextCameraOff = !isCameraOff;
        const hasLocalVideoTrack = Boolean(
            groupLocalStream?.getVideoTracks().some((track) => track.readyState === "live"),
        );

        if (!nextCameraOff && !hasLocalVideoTrack && onUpgradeToVideo) {
            try {
                await onUpgradeToVideo();
            } catch (error) {
                const message = error instanceof Error
                    ? error.message
                    : "Failed to upgrade group call to video.";
                toast.error(message);
            }
            return;
        }

        onToggleCamera(nextCameraOff);
        toggleCamera();
    };

    const handleToggleSpeaker = () => {
        setIsSpeakerOn((prev) => {
            const next = !prev;
            audioRefs.current.forEach((audio) => {
                audio.muted = !next;
            });
            return next;
        });
    };

    const durationText = remotePeers.length === 0 ? "Waiting..." : formatDuration(callDuration);

    // Expanded mode (full screen)
    if (isExpanded) {
        return (
            <div className="fixed inset-0 z-40 flex flex-col bg-gray-900 text-white">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-3">
                    <span className="rounded-full bg-black/40 px-4 py-1.5 text-sm font-medium">
                        {durationText}
                    </span>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-400">
                            {totalParticipants} participant{totalParticipants !== 1 ? "s" : ""}
                        </span>
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
                        >
                            <Minimize2 size={18} />
                        </button>
                    </div>
                </div>

                {/* Participant grid */}
                <div
                    className="flex-1 overflow-hidden p-2"
                    style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                        gridTemplateRows: `repeat(${gridRows}, 1fr)`,
                        gap: "8px",
                    }}
                >
                    <ParticipantTile
                        name="You"
                        avatar={null}
                        stream={groupLocalStream}
                        isVideoCall={isVideoCall}
                        isLocal
                    />
                    {remotePeers.map(({ peerId, stream, name, avatar }) => (
                        <ParticipantTile
                            key={peerId}
                            name={name}
                            avatar={avatar}
                            stream={stream}
                            isVideoCall={isVideoCall}
                        />
                    ))}
                </div>

                {/* Waiting banner */}
                {remotePeers.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <div className="animate-ping mb-3 h-3 w-3 rounded-full bg-white/50" />
                        <p className="text-sm text-gray-300">Waiting for others to join...</p>
                    </div>
                )}

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

                    <button
                        onClick={handleToggleCamera}
                        className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                            isCameraOff ? "bg-red-500 hover:bg-red-600" : "bg-white/20 hover:bg-white/30"
                        }`}
                    >
                        {isCameraOff ? <VideoOff size={22} /> : <Video size={22} />}
                    </button>

                    <button
                        onClick={handleToggleSpeaker}
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
                    >
                        {isSpeakerOn ? <Volume2 size={22} /> : <VolumeX size={22} />}
                    </button>

                    <button
                        onClick={onLeave}
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 transition-colors hover:bg-red-600"
                    >
                        <PhoneOff size={22} />
                    </button>
                </div>
            </div>
        );
    }

    // Floating mode (collapsed — bottom-right PIP)
    return (
        <div className="fixed bottom-6 right-6 z-40 w-72 overflow-hidden rounded-2xl bg-gray-900 text-white shadow-2xl">
            {/* Participant preview */}
            <div className="relative">
                <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-gray-800">
                    {remotePeers.length > 0 ? (
                        <div className="flex items-center -space-x-2">
                            {remotePeers.slice(0, 3).map(({ peerId, name, avatar }) => (
                                avatar ? (
                                    <img key={peerId} src={avatar} alt={name} className="h-10 w-10 rounded-full border-2 border-gray-800 object-cover" />
                                ) : (
                                    <div key={peerId} className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-800 bg-gray-600">
                                        <span className="text-sm font-bold">{name.charAt(0).toUpperCase()}</span>
                                    </div>
                                )
                            ))}
                            {remotePeers.length > 3 && (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-800 bg-gray-600">
                                    <span className="text-xs font-bold">+{remotePeers.length - 3}</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-1">
                            <div className="animate-ping h-2 w-2 rounded-full bg-white/50" />
                            <p className="text-xs text-gray-400">Waiting...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Call info */}
            <div className="px-3 pt-2">
                <p className="text-sm font-semibold truncate">Group call</p>
                <p className="text-xs text-gray-400">
                    {durationText} &bull; {totalParticipants} participant{totalParticipants !== 1 ? "s" : ""}
                </p>
            </div>

            {/* Controls bar */}
            <div className="flex items-center justify-around p-3">
                <button
                    onClick={handleToggleMute}
                    className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
                >
                    {isMuted ? <MicOff size={18} className="text-red-400" /> : <Mic size={18} />}
                </button>

                <button
                    onClick={handleToggleCamera}
                    className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
                >
                    {isCameraOff ? <VideoOff size={18} className="text-red-400" /> : <Video size={18} />}
                </button>

                <button
                    onClick={handleToggleSpeaker}
                    className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
                >
                    {isSpeakerOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>

                <button
                    onClick={() => setIsExpanded(true)}
                    className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
                >
                    <Maximize2 size={18} />
                </button>

                <button
                    onClick={onLeave}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 transition-colors hover:bg-red-600"
                >
                    <PhoneOff size={16} />
                </button>
            </div>
        </div>
    );
}
