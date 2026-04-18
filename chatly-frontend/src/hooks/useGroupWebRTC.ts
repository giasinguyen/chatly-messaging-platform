import { useRef, useCallback, useState } from "react";
import type { CallType } from "@/types/call";

const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
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

interface GroupWebRTCCallbacks {
    onIceCandidate?: (peerId: string, candidate: RTCIceCandidateInit) => void;
    onPeerConnectionFailed?: (peerId: string) => void;
}

interface PeerEntry {
    connection: RTCPeerConnection;
    pendingCandidates: RTCIceCandidateInit[];
    remoteDescriptionSet: boolean;
}

export function useGroupWebRTC(callbacks?: GroupWebRTCCallbacks) {
    const peers = useRef<Map<string, PeerEntry>>(new Map());
    const localStreamRef = useRef<MediaStream | null>(null);
    const callbacksRef = useRef(callbacks);
    callbacksRef.current = callbacks;

    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

    const initLocalStream = useCallback(async (type: CallType): Promise<MediaStream> => {
        const constraints: MediaStreamConstraints = {
            audio: true,
            video: type === "VIDEO" ? { facingMode: "user", width: 640, height: 480 } : false,
        };

        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
            if (type === "VIDEO") {
                // Fall back to audio-only if camera unavailable
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } else {
                throw err;
            }
        }

        localStreamRef.current = stream;
        setLocalStream(stream);
        return stream;
    }, []);

    const addPeer = useCallback((peerId: string): RTCPeerConnection => {
        const existing = peers.current.get(peerId);
        if (existing) return existing.connection;

        const pc = new RTCPeerConnection(ICE_SERVERS);

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                callbacksRef.current?.onIceCandidate?.(peerId, event.candidate.toJSON());
            }
        };

        pc.ontrack = (event) => {
            const remote = event.streams[0];
            if (remote) {
                setRemoteStreams((prev) => ({ ...prev, [peerId]: remote }));
            } else {
                // Build stream from individual tracks
                setRemoteStreams((prev) => {
                    const existing = prev[peerId];
                    const ms = existing ? new MediaStream(existing.getTracks()) : new MediaStream();
                    ms.addTrack(event.track);
                    return { ...prev, [peerId]: new MediaStream(ms.getTracks()) };
                });
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === "failed" || pc.connectionState === "closed") {
                callbacksRef.current?.onPeerConnectionFailed?.(peerId);
            }
        };

        const stream = localStreamRef.current;
        if (stream) {
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        }

        peers.current.set(peerId, {
            connection: pc,
            pendingCandidates: [],
            remoteDescriptionSet: false,
        });
        return pc;
    }, []);

    const createOfferForPeer = useCallback(
        async (peerId: string): Promise<RTCSessionDescriptionInit> => {
            const pc = addPeer(peerId);
            const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            });
            await pc.setLocalDescription(offer);
            return offer;
        },
        [addPeer],
    );

    const handleOfferFromPeer = useCallback(
        async (peerId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> => {
            const pc = addPeer(peerId);
            await pc.setRemoteDescription(new RTCSessionDescription(offer));

            const entry = peers.current.get(peerId);
            if (entry) {
                entry.remoteDescriptionSet = true;
                // Drain buffered ICE candidates
                for (const candidate of entry.pendingCandidates.splice(0)) {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
                }
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            return answer;
        },
        [addPeer],
    );

    const handleAnswerFromPeer = useCallback(
        async (peerId: string, answer: RTCSessionDescriptionInit): Promise<void> => {
            const entry = peers.current.get(peerId);
            if (!entry) return;
            await entry.connection.setRemoteDescription(new RTCSessionDescription(answer));
            entry.remoteDescriptionSet = true;

            // Drain buffered ICE candidates
            for (const candidate of entry.pendingCandidates.splice(0)) {
                await entry.connection.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
            }
        },
        [],
    );

    const addIceCandidateForPeer = useCallback(
        async (peerId: string, candidate: RTCIceCandidateInit): Promise<void> => {
            const entry = peers.current.get(peerId);
            if (!entry) return;

            if (!entry.remoteDescriptionSet) {
                entry.pendingCandidates.push(candidate);
                return;
            }

            await entry.connection.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        },
        [],
    );

    const removePeer = useCallback((peerId: string) => {
        const entry = peers.current.get(peerId);
        if (!entry) return;
        entry.connection.close();
        peers.current.delete(peerId);
        setRemoteStreams((prev) => {
            const next = { ...prev };
            delete next[peerId];
            return next;
        });
    }, []);

    const endAll = useCallback(() => {
        peers.current.forEach((entry) => entry.connection.close());
        peers.current.clear();
        localStreamRef.current?.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
        setLocalStream(null);
        setRemoteStreams({});
    }, []);

    const toggleMute = useCallback((muted: boolean) => {
        localStreamRef.current?.getAudioTracks().forEach((track) => {
            track.enabled = !muted;
        });
    }, []);

    const toggleCamera = useCallback(async (cameraOff: boolean) => {
        const stream = localStreamRef.current;
        if (!stream) return;

        const videoTracks = stream.getVideoTracks();
        if (videoTracks.length > 0) {
            videoTracks.forEach((track) => {
                track.enabled = !cameraOff;
            });
        } else if (!cameraOff) {
            // Voice call → add video track to stream and all peer connections
            const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
            const videoTrack = videoStream.getVideoTracks()[0];
            stream.addTrack(videoTrack);
            setLocalStream(new MediaStream(stream.getTracks()));

            peersRef.current.forEach(({ connection }) => {
                connection.addTrack(videoTrack, stream);
            });
        }
    }, []);

    return {
        localStream,
        remoteStreams,
        initLocalStream,
        addPeer,
        createOfferForPeer,
        handleOfferFromPeer,
        handleAnswerFromPeer,
        addIceCandidateForPeer,
        removePeer,
        endAll,
        toggleMute,
        toggleCamera,
    };
}
