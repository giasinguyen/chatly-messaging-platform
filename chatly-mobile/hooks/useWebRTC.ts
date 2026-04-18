import { useRef, useCallback, useState } from 'react';
import type { CallType } from '@/types/call';

let RTCPeerConnection: any;
let RTCSessionDescription: any;
let RTCIceCandidate: any;
let mediaDevices: any;
let MediaStream: any;

try {
    const webrtc = require('react-native-webrtc');
    RTCPeerConnection = webrtc.RTCPeerConnection;
    RTCSessionDescription = webrtc.RTCSessionDescription;
    RTCIceCandidate = webrtc.RTCIceCandidate;
    mediaDevices = webrtc.mediaDevices;
    MediaStream = webrtc.MediaStream;
} catch (e) {
    console.warn('react-native-webrtc is not available (Expo Go?)');
}

const ICE_SERVERS = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

interface UseWebRTCCallbacks {
    onRemoteStream?: (stream: MediaStream) => void;
    onIceCandidate?: (candidate: RTCIceCandidateInit) => void;
    onConnectionStateChange?: (state: string) => void;
}

export function useWebRTC(callbacks?: UseWebRTCCallbacks) {
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [remoteStreamKey, setRemoteStreamKey] = useState(0);

    // Refs cho callbacks để tránh re-create peer connection khi callback thay đổi
    const callbacksRef = useRef(callbacks);
    callbacksRef.current = callbacks;

    const createPeerConnection = useCallback(() => {
        if (peerConnection.current) return peerConnection.current;

        const pc = new RTCPeerConnection(ICE_SERVERS);

        // Xử lý ICE candidate
        pc.onicecandidate = (event: { candidate: RTCIceCandidateInit | null }) => {
            if (event.candidate) {
                callbacksRef.current?.onIceCandidate?.(event.candidate);
            }
        };

        // Xử lý remote stream
        pc.ontrack = (event: { streams: MediaStream[] }) => {
            const remote = event.streams[0];
            if (remote) {
                setRemoteStream(remote);
                // Always increment key to force RTCView re-render when tracks change
                setRemoteStreamKey((k) => k + 1);
                callbacksRef.current?.onRemoteStream?.(remote);
            }
        };

        // Theo dõi trạng thái kết nối
        pc.onconnectionstatechange = () => {
            // Only treat 'failed' as a hard error; 'disconnected' can be transient (e.g. renegotiation)
            callbacksRef.current?.onConnectionStateChange?.(pc.connectionState);
        };

        peerConnection.current = pc;
        return pc;
    }, []);

    // Khởi tạo local stream (camera/mic)
    const initLocalStream = useCallback(
        async (type: CallType): Promise<MediaStream> => {
            try {
                const constraints = {
                    audio: true,
                    video: type === 'VIDEO' ? { facingMode: 'user', width: 640, height: 480 } : false,
                };

                const stream = await mediaDevices.getUserMedia(constraints);
                setLocalStream(stream);

                const pc = createPeerConnection();
                stream.getTracks().forEach((track) => {
                    pc.addTrack(track, stream);
                });

                return stream;
            } catch (error) {
                console.error('Failed to get media devices:', error);
                throw new Error('Camera/microphone cannot be accessed. Please grant permission.');
            }
        },
        [createPeerConnection],
    );

    // Tạo offer SDP
    const createOffer = useCallback(async (): Promise<RTCSessionDescriptionInit> => {
        const pc = createPeerConnection();
        try {
            const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            });
            await pc.setLocalDescription(new RTCSessionDescription(offer));
            return offer;
        } catch (error) {
            console.error('Failed to create offer:', error);
            throw new Error('Unable to establish a call connection.');
        }
    }, [createPeerConnection]);

    // Tạo answer SDP (cho callee)
    const createAnswer = useCallback(
        async (offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> => {
            const pc = createPeerConnection();
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(new RTCSessionDescription(answer));
                return answer;
            } catch (error) {
                console.error('Failed to create answer:', error);
                throw new Error('Unable to accept the call.');
            }
        },
        [createPeerConnection],
    );

    // Xử lý answer từ peer (cho caller)
    const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit): Promise<void> => {
        const pc = peerConnection.current;
        if (!pc) return;
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (error) {
            console.error('Failed to set remote description:', error);
        }
    }, []);

    // Set remote description (offer hoặc answer) — dùng khi renegotiate
    const handleRemoteDescription = useCallback(
        async (sdp: RTCSessionDescriptionInit): Promise<void> => {
            const pc = createPeerConnection();
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        },
        [createPeerConnection],
    );

    // Tạo answer không có offer arg — dùng sau khi setRemoteDescription
    const createAnswerFromRemote = useCallback(async (): Promise<RTCSessionDescriptionInit> => {
        const pc = createPeerConnection();
        try {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(new RTCSessionDescription(answer));
            return answer;
        } catch (error) {
            console.error('Failed to create answer:', error);
            throw new Error('Unable to accept the call.');
        }
    }, [createPeerConnection]);

    // Nâng cấp cuộc gọi voice → video (renegotiation)
    const upgradeToVideo = useCallback(async (): Promise<RTCSessionDescriptionInit> => {
        const pc = peerConnection.current;
        if (!pc) throw new Error('No active peer connection');

        const stream = await mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: 640, height: 480 },
            audio: false,
        });
        const videoTrack = stream.getVideoTracks()[0];

        // Thêm video track vào peer connection
        const currentStream = localStream;
        if (currentStream) {
            pc.addTrack(videoTrack, currentStream);
            currentStream.addTrack(videoTrack);
        } else {
            pc.addTrack(videoTrack, stream);
        }
        setLocalStream((prev) => {
            if (prev) { prev.addTrack(videoTrack); return prev; }
            return stream;
        });

        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await pc.setLocalDescription(new RTCSessionDescription(offer));
        return offer;
    }, [localStream]);

    // Xử lý ICE candidate từ peer
    const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit): Promise<void> => {
        const pc = peerConnection.current;
        if (!pc) return;
        try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
            console.error('Failed to add ICE candidate:', error);
        }
    }, []);

    // Thêm ICE candidate (alias cho handleIceCandidate)
    const addIceCandidate = handleIceCandidate;

    // Dọn dẹp tất cả streams và connections
    const endCall = useCallback(() => {
        // Dừng tất cả track của local stream
        if (localStream) {
            localStream.getTracks().forEach((track) => track.stop());
            setLocalStream(null);
        }

        // Dừng tất cả track của remote stream
        if (remoteStream) {
            remoteStream.getTracks().forEach((track) => track.stop());
            setRemoteStream(null);
        }

        // Đóng peer connection
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }
    }, [localStream, remoteStream]);

    // Toggle mute (bật/tắt mic)
    const toggleMute = useCallback(
        (muted: boolean) => {
            if (localStream) {
                localStream.getAudioTracks().forEach((track) => {
                    track.enabled = !muted;
                });
            }
        },
        [localStream],
    );

    // Toggle camera (bật/tắt camera)
    const toggleCamera = useCallback(
        (cameraOff: boolean) => {
            if (localStream) {
                localStream.getVideoTracks().forEach((track) => {
                    track.enabled = !cameraOff;
                });
            }
        },
        [localStream],
    );

    return {
        localStream,
        remoteStream,
        remoteStreamKey,
        initLocalStream,
        createOffer,
        createAnswer,
        createAnswerFromRemote,
        handleAnswer,
        handleRemoteDescription,
        upgradeToVideo,
        handleIceCandidate,
        addIceCandidate,
        endCall,
        toggleMute,
        toggleCamera,
    };
}
