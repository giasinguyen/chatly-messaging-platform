import { useRef, useCallback, useState, useEffect } from "react";
import type { CallType } from "@/types/call";
import { requestMicrophoneStream } from "@/utils/call/audioMedia";
import { requestCameraTrack, requestVideoCallStream } from "@/utils/call/videoMedia";

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

    // Callback refs — consumer assigns before calling methods
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

        // Handle ICE candidate
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                callbacksRef.current.onIceCandidate?.(event.candidate);
            }
        };

        // Handle remote stream — build a persistent MediaStream from individual tracks
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

        // Monitor connection state
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

    // Initialize local stream (camera/mic)
    // Note: getUserMedia requires HTTPS or localhost
    const initLocalStream = useCallback(
        async (type: CallType): Promise<MediaStream> => {
            let stream: MediaStream;

            if (type === "VIDEO") {
                stream = await requestVideoCallStream();
            } else {
                stream = await requestMicrophoneStream();
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

    // Create offer SDP
    const createOffer = useCallback(async (): Promise<RTCSessionDescriptionInit> => {
        const pc = createPeerConnection();
        const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);
        return offer;
    }, [createPeerConnection]);

    // Create answer SDP (for callee)
    const createAnswer = useCallback(async (): Promise<RTCSessionDescriptionInit> => {
        const pc = createPeerConnection();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        return answer;
    }, [createPeerConnection]);

    // Set remote description (offer or answer from peer)
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

    // Add ICE candidate from peer (buffer if remote description not yet set)
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

    // Cleanup all streams and connections
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

    // Toggle audio track (true mute/unmute)
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
                const newTrack = await requestCameraTrack();

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

    // Upgrade a voice call to video via renegotiation.
    // If local camera is unavailable, fall back to recv-only video so call flow can still upgrade.
    const upgradeToVideo = useCallback(async (): Promise<{
        offer: RTCSessionDescriptionInit;
        hasLocalVideoTrack: boolean;
    }> => {
        const pc = peerConnection.current;
        if (!pc) throw new Error("No active peer connection");

        let videoTrack: MediaStreamTrack | null = null;
        try {
            videoTrack = await requestCameraTrack();
        } catch (error) {
            console.warn("[WebRTC] Camera unavailable during upgrade, switching to receive-only video.", error);
        }

        const videoTransceiver = pc
            .getTransceivers()
            .find((transceiver) =>
                transceiver.sender.track?.kind === "video"
                || transceiver.receiver.track?.kind === "video",
            );

        if (videoTrack) {
            if (videoTransceiver) {
                await videoTransceiver.sender.replaceTrack(videoTrack);
                videoTransceiver.direction = "sendrecv";
            } else {
                const baseStream = localStreamRef.current ?? new MediaStream([videoTrack]);
                pc.addTrack(videoTrack, baseStream);
            }

            // Merge video track into localStream for display
            const nextStream = localStreamRef.current
                ? new MediaStream([...localStreamRef.current.getAudioTracks(), videoTrack])
                : new MediaStream([videoTrack]);
            setLocalStream(nextStream);
            localStreamRef.current = nextStream;
        } else {
            // Camera is unavailable: keep local camera off but still negotiate video receiver capability.
            if (videoTransceiver) {
                await videoTransceiver.sender.replaceTrack(null);
                videoTransceiver.direction = "recvonly";
            } else {
                pc.addTransceiver("video", { direction: "recvonly" });
            }
        }

        // Create renegotiation offer
        const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);
        return { offer, hasLocalVideoTrack: Boolean(videoTrack) };
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
