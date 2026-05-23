import { useRef, useCallback, useEffect, useState } from "react";
import type { CallType } from "@/types/call";
import { WEBRTC_ICE_CONFIG } from "@/constants/webrtc";
import { requestMicrophoneStream } from "@/utils/call/audioMedia";
import { requestCameraTrack, requestVideoCallStream } from "@/utils/call/videoMedia";

function ensureReceiveOnlyVideo(connection: RTCPeerConnection): void {
    const videoTransceiver = connection
        .getTransceivers()
        .find((transceiver) =>
            transceiver.sender.track?.kind === "video"
            || transceiver.receiver.track?.kind === "video",
        );

    if (!videoTransceiver) {
        connection.addTransceiver("video", { direction: "recvonly" });
        return;
    }

    videoTransceiver.sender.replaceTrack(null).catch(() => {});
    videoTransceiver.direction = "recvonly";
}

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

    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

    useEffect(() => {
        callbacksRef.current = callbacks;
    }, [callbacks]);

    const initLocalStream = useCallback(async (type: CallType): Promise<MediaStream> => {
        const stream = type === "VIDEO"
            ? await requestVideoCallStream()
            : await requestMicrophoneStream();

        localStreamRef.current = stream;
        setLocalStream(stream);
        return stream;
    }, []);

    const addPeer = useCallback((peerId: string): RTCPeerConnection => {
        const existing = peers.current.get(peerId);
        if (existing) return existing.connection;

        const pc = new RTCPeerConnection(WEBRTC_ICE_CONFIG);

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
            const videoTrack = await requestCameraTrack();
            stream.addTrack(videoTrack);
            setLocalStream(new MediaStream(stream.getTracks()));

            peers.current.forEach(({ connection }) => {
                connection.addTrack(videoTrack, stream);
            });
        }
    }, []);

    const enableLocalVideoTrack = useCallback(async (): Promise<boolean> => {
        const stream = localStreamRef.current;
        if (!stream) {
            throw new Error("No local stream available for camera upgrade.");
        }

        const existingVideoTrack = stream
            .getVideoTracks()
            .find((track) => track.enabled && track.readyState !== "ended");

        if (existingVideoTrack) {
            existingVideoTrack.enabled = true;
            return true;
        }

        let videoTrack: MediaStreamTrack | null = null;
        try {
            videoTrack = await requestCameraTrack();
        } catch (error) {
            console.warn("[GroupWebRTC] Camera unavailable, switching to receive-only video.", error);
        }

        if (!videoTrack) {
            peers.current.forEach(({ connection }) => {
                ensureReceiveOnlyVideo(connection);
            });
            return false;
        }

        stream.addTrack(videoTrack);
        setLocalStream(new MediaStream(stream.getTracks()));

        peers.current.forEach(({ connection }) => {
            const existingVideoSender = connection
                .getSenders()
                .find((sender) => sender.track?.kind === "video");

            if (existingVideoSender) {
                existingVideoSender.replaceTrack(videoTrack).catch(() => {});
            } else {
                connection.addTrack(videoTrack, stream);
            }
        });

        return true;
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
        enableLocalVideoTrack,
    };
}
