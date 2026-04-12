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

        // Xử lý remote stream
        pc.ontrack = (event) => {
            const remote = event.streams[0];
            if (remote) {
                setRemoteStream(remote);
                callbacksRef.current.onRemoteStream?.(remote);
            }
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
            try {
                const constraints: MediaStreamConstraints = {
                    audio: true,
                    video: type === "VIDEO" ? { facingMode: "user", width: 640, height: 480 } : false,
                };

                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                setLocalStream(stream);

                const pc = createPeerConnection();
                stream.getTracks().forEach((track) => {
                    pc.addTrack(track, stream);
                });

                return stream;
            } catch (error) {
                if (error instanceof DOMException) {
                    if (error.name === "NotAllowedError") {
                        throw new Error("Vui lòng cấp quyền mic/camera để thực hiện cuộc gọi.");
                    }
                    if (error.name === "NotFoundError") {
                        throw new Error("Không tìm thấy thiết bị mic/camera.");
                    }
                }
                throw new Error("Không thể truy cập thiết bị media.");
            }
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
        },
        [createPeerConnection],
    );

    // Thêm ICE candidate từ peer
    const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit): Promise<void> => {
        const pc = peerConnection.current;
        if (!pc) return;
        try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
            console.error("Failed to add ICE candidate:", error);
        }
    }, []);

    // Dọn dẹp tất cả streams và connections
    const cleanup = useCallback(() => {
        if (localStream) {
            localStream.getTracks().forEach((track) => track.stop());
        }
        setLocalStream(null);

        if (remoteStream) {
            remoteStream.getTracks().forEach((track) => track.stop());
        }
        setRemoteStream(null);

        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }

        // Reset video elements
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
        }
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }
    }, [localStream, remoteStream]);

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

    // Toggle video track (bật/tắt camera thực sự)
    const toggleCamera = useCallback(() => {
        if (!peerConnection.current) return;
        peerConnection.current.getSenders().forEach((sender) => {
            if (sender.track?.kind === "video") {
                sender.track.enabled = !sender.track.enabled;
            }
        });
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
