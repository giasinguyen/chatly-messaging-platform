import { useRef, useCallback, useState, useEffect } from "react";
import type { CallType } from "@/types/call";

const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        // Free public TURN relay — required for cross-network calls (different NAT/ISP)
        {
            urls: [
                "turn:openrelay.metered.ca:80",
                "turn:openrelay.metered.ca:443",
                "turn:openrelay.metered.ca:443?transport=tcp",
            ],
            username: "openrelayproject",
            credential: "openrelayproject",
        },
    ],
    iceCandidatePoolSize: 10,
};

interface UseWebRTCCallbacks {
    onIceCandidate: (candidate: RTCIceCandidate) => void;
    onRemoteStream: (stream: MediaStream) => void;
    onConnectionStateChange: (state: RTCPeerConnectionState) => void;
}

export function useWebRTC() {
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    // Callback refs — consumer gán trước khi gọi các method
    const callbacksRef = useRef<Partial<UseWebRTCCallbacks>>({});

    // Buffer ICE candidates that arrive before setRemoteDescription is called
    const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
    const remoteDescriptionSet = useRef(false);

    // Stable refs for streams — avoids stale closures in cleanup/toggleCamera
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteStreamRef = useRef<MediaStream | null>(null);

    // Keep refs in sync with state
    useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
    useEffect(() => { remoteStreamRef.current = remoteStream; }, [remoteStream]);

    // Auto-attach local stream to video element
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // Auto-attach remote stream to video element
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    const createPeerConnection = useCallback(() => {
        if (peerConnection.current) return peerConnection.current;

        const pc = new RTCPeerConnection(ICE_SERVERS);

        // Xử lý ICE candidate
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                callbacksRef.current.onIceCandidate?.(event.candidate);
            }
        };

        // Xử lý remote stream — build a persistent MediaStream from individual tracks
        // event.streams[0] can be undefined when peer uses replaceTrack without a stream
        const remoteMediaStream = new MediaStream();
        pc.ontrack = (event) => {
            console.log("[WebRTC] ontrack:", event.track.kind, "streams:", event.streams.length);
            if (event.streams[0]) {
                // Peer attached track to a stream — use it directly
                setRemoteStream(event.streams[0]);
                remoteStreamRef.current = event.streams[0];
                callbacksRef.current.onRemoteStream?.(event.streams[0]);
            } else {
                // No stream attached (e.g. replaceTrack) — collect tracks manually
                remoteMediaStream.addTrack(event.track);
                setRemoteStream(new MediaStream(remoteMediaStream.getTracks()));
                remoteStreamRef.current = remoteMediaStream;
                callbacksRef.current.onRemoteStream?.(remoteMediaStream);
            }

            // Re-fire when track becomes live (handles delayed video tracks)
            event.track.onunmute = () => {
                console.log("[WebRTC] track unmuted:", event.track.kind);
                const current = remoteStreamRef.current;
                if (current) {
                    setRemoteStream(new MediaStream(current.getTracks()));
                }
            };
        };

        // Theo dõi trạng thái kết nối
        pc.onconnectionstatechange = () => {
            console.log("[WebRTC] connectionState:", pc.connectionState);
            callbacksRef.current.onConnectionStateChange?.(pc.connectionState);
        };

        pc.oniceconnectionstatechange = () => {
            console.log("[WebRTC] iceConnectionState:", pc.iceConnectionState);
        };

        pc.onicegatheringstatechange = () => {
            console.log("[WebRTC] iceGatheringState:", pc.iceGatheringState);
        };

        peerConnection.current = pc;
        return pc;
    }, []);

    // Khởi tạo local stream (camera/mic)
    // Lưu ý: getUserMedia yêu cầu HTTPS hoặc localhost
    const initLocalStream = useCallback(
        async (type: CallType): Promise<MediaStream> => {
            let stream: MediaStream;

            if (type === "VIDEO") {
                try {
                    // Try full video+audio first
                    stream = await navigator.mediaDevices.getUserMedia({
                        audio: true,
                        video: { facingMode: "user", width: 640, height: 480 },
                    });
                } catch (videoErr) {
                    const name = videoErr instanceof DOMException ? videoErr.name : "";
                    if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "NotReadableError") {
                        // No camera — fall back to audio-only and continue the video call
                        console.warn("[WebRTC] No camera found, falling back to audio-only for video call");
                        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    } else if (name === "NotAllowedError") {
                        throw new Error("Please grant microphone/camera permission to make the call.");
                    } else {
                        throw new Error("Unable to access media device.");
                    }
                }
            } else {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                } catch (audioErr) {
                    const name = audioErr instanceof DOMException ? audioErr.name : "";
                    if (name === "NotAllowedError") {
                        throw new Error("Please grant microphone permission to make the call.");
                    }
                    throw new Error("Microphone is inaccessible.");
                }
            }

            setLocalStream(stream);

            const pc = createPeerConnection();
            stream.getTracks().forEach((track) => {
                pc.addTrack(track, stream);
            });

            return stream;
        },
        [createPeerConnection],
    );

    // Tạo offer SDP
    const createOffer = useCallback(async (): Promise<RTCSessionDescriptionInit> => {
        const pc = createPeerConnection();
        const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);
        return offer;
    }, [createPeerConnection]);

    // Tạo answer SDP (cho callee)
    const createAnswer = useCallback(async (): Promise<RTCSessionDescriptionInit> => {
        const pc = createPeerConnection();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        return answer;
    }, [createPeerConnection]);

    // Set remote description (offer hoặc answer từ peer)
    const handleRemoteDescription = useCallback(
        async (sdp: RTCSessionDescriptionInit): Promise<void> => {
            const pc = createPeerConnection();
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            remoteDescriptionSet.current = true;

            // Drain buffered ICE candidates now that remote description is set
            const buffered = pendingCandidates.current.splice(0);
            if (buffered.length > 0) {
                console.log(`[WebRTC] Draining ${buffered.length} buffered ICE candidate(s)`);
                for (const candidate of buffered) {
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch (err) {
                        console.warn("[WebRTC] Failed to add buffered ICE candidate:", err);
                    }
                }
            }
        },
        [createPeerConnection],
    );

    // Thêm ICE candidate từ peer (buffer if remote description not yet set)
    const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit): Promise<void> => {
        const pc = peerConnection.current;
        if (!pc || !remoteDescriptionSet.current) {
            console.log("[WebRTC] Remote description not set yet, buffering ICE candidate");
            pendingCandidates.current.push(candidate);
            return;
        }
        try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
            console.error("[WebRTC] Failed to add ICE candidate:", error);
        }
    }, []);

    // Dọn dẹp tất cả streams và connections
    // Uses refs (not state) so this callback is never stale
    const cleanup = useCallback(() => {
        localStreamRef.current?.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
        localStreamRef.current = null;

        remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
        setRemoteStream(null);
        remoteStreamRef.current = null;

        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }

        // Reset ICE candidate buffer
        pendingCandidates.current = [];
        remoteDescriptionSet.current = false;

        // Reset video elements
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    }, []); // no deps — uses stable refs, never stale

    // Cleanup on unmount + beforeunload
    useEffect(() => {
        const handleBeforeUnload = () => {
            cleanup();
        };
        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            cleanup();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Toggle audio track (mute/unmute thực sự)
    const toggleMute = useCallback(() => {
        if (!peerConnection.current) return;
        peerConnection.current.getSenders().forEach((sender) => {
            if (sender.track?.kind === "audio") {
                sender.track.enabled = !sender.track.enabled;
            }
        });
    }, []);

    // Toggle camera: stops track (turns off LED) when disabling; re-acquires via getUserMedia when re-enabling
    const toggleCamera = useCallback(async (): Promise<boolean> => {
        const stream = localStreamRef.current;
        const pc = peerConnection.current;
        if (!stream) return false;

        const videoTracks = stream.getVideoTracks();
        const cameraIsOn = videoTracks.some((t) => t.readyState === "live");

        if (cameraIsOn) {
            // Stop tracks — turns off the camera LED
            videoTracks.forEach((t) => t.stop());
            if (pc) {
                for (const sender of pc.getSenders()) {
                    if (sender.track?.kind === "video") {
                        await sender.replaceTrack(null);
                    }
                }
            }
            return false; // camera is now OFF
        } else {
            // Re-acquire camera
            try {
                const vs = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "user", width: 640, height: 480 },
                });
                const newTrack = vs.getVideoTracks()[0];

                if (pc) {
                    const sender = pc.getSenders().find(
                        (s) => s.track?.kind === "video" || s.track === null,
                    );
                    if (sender) {
                        await sender.replaceTrack(newTrack);
                    } else {
                        pc.addTrack(newTrack, stream);
                    }
                }

                // Merge new video track into existing audio stream
                const newStream = new MediaStream([...stream.getAudioTracks(), newTrack]);
                setLocalStream(newStream);
                localStreamRef.current = newStream;
                return true; // camera is now ON
            } catch (err) {
                console.error("[WebRTC] Failed to re-acquire camera:", err);
                return false;
            }
        }
    }, []);

    // Upgrade a voice call to video via renegotiation
    const upgradeToVideo = useCallback(async (): Promise<RTCSessionDescriptionInit> => {
        const pc = peerConnection.current;
        if (!pc) throw new Error("No active peer connection");

        const videoStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user", width: 640, height: 480 },
        });
        const videoTrack = videoStream.getVideoTracks()[0];

        // Add video track to the peer connection
        pc.addTrack(videoTrack, videoStream);

        // Merge video track into localStream for display
        setLocalStream((prev) => {
            if (prev) {
                return new MediaStream([...prev.getTracks(), videoTrack]);
            }
            return videoStream;
        });

        // Create renegotiation offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        return offer;
    }, []);

    return {
        localStream,
        remoteStream,
        localVideoRef,
        remoteVideoRef,
        callbacksRef,
        initLocalStream,
        createOffer,
        createAnswer,
        handleRemoteDescription,
        addIceCandidate,
        cleanup,
        toggleMute,
        toggleCamera,
        upgradeToVideo,
    };
}
