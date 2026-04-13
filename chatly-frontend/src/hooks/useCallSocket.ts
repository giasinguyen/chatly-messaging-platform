import { useEffect, useCallback, useRef } from "react";
import { socketService } from "@/services/socket.service";
import { useAuthStore } from "@/store/auth.store";
import { useCallStore } from "@/store/call.store";
import { useWebRTC } from "@/hooks/useWebRTC";
import type { CallType, CallSignal, CallSession } from "@/types/call";

function generateCallId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Hook xử lý signaling WebRTC qua STOMP WebSocket.
 * Subscribe /user/{userId}/queue/calls để nhận tín hiệu cuộc gọi.
 */
export function useCallSocket() {
    const user = useAuthStore((s) => s.user);
    const {
        setIncomingCall,
        setCallStatus,
        setOutgoingCallTarget,
        setPendingOffer,
        startCall,
        endCall: endCallStore,
        upgradeCall,
    } = useCallStore();

    const webrtc = useWebRTC();
    const webrtcRef = useRef(webrtc);
    webrtcRef.current = webrtc;

    // Ringtone for incoming calls
    const ringtoneRef = useRef<HTMLAudioElement | null>(null);

    const playRingtone = useCallback(() => {
        if (ringtoneRef.current) return; // already playing
        const audio = new Audio('/sounds/call-sound.mp3');
        audio.loop = true;
        audio.play().catch(() => { /* autoplay may be blocked */ });
        ringtoneRef.current = audio;
    }, []);

    const stopRingtone = useCallback(() => {
        if (!ringtoneRef.current) return;
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
        ringtoneRef.current = null;
    }, []);

    // Offer SDP lưu trong Zustand store để bền vững hơn hook-local ref

    // Gửi ICE candidate đến peer qua STOMP
    const sendIceCandidate = useCallback(
        (candidate: RTCIceCandidate) => {
            const activeCall = useCallStore.getState().activeCall;
            if (!activeCall || !user) return;

            const receiverId = activeCall.participants.find((id) => id !== user.id);
            if (!receiverId) return;

            const client = socketService.getClient();
            if (!client?.connected) return;

            client.publish({
                destination: "/app/call.ice-candidate",
                body: JSON.stringify({
                    type: "ICE_CANDIDATE",
                    callId: activeCall.callId,
                    senderId: user.id,
                    receiverId,
                    payload: { candidate },
                }),
            });
        },
        [user],
    );

    // Gán callback cho WebRTC
    useEffect(() => {
        webrtcRef.current.callbacksRef.current = {
            onIceCandidate: sendIceCandidate,
            onConnectionStateChange: (state) => {
                console.log("[CallSocket] connection state:", state);
                // Only end call on permanent failure — "disconnected" is temporary and can self-heal
                if (state === "failed" || state === "closed") {
                    console.warn("[CallSocket] Permanent connection failure, ending call:", state);
                    handleEndCall();
                }
            },
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sendIceCandidate]);

    // Xử lý tín hiệu nhận được từ server
    const handleSignal = useCallback(
        async (signal: CallSignal) => {
            switch (signal.type) {
                case "INITIATE": {
                    // Cuộc gọi đến
                    const payload = signal.payload as {
                        callerName: string;
                        callerAvatar: string;
                        callType: CallType;
                        offer: RTCSessionDescriptionInit;
                    };
                    setPendingOffer(payload.offer);
                    setIncomingCall({
                        callId: signal.callId,
                        callerId: signal.senderId,
                        callerName: payload.callerName,
                        callerAvatar: payload.callerAvatar,
                        type: payload.callType,
                    });
                    setCallStatus("RINGING");
                    playRingtone();
                    break;
                }

                case "ANSWER": {
                    const payload = signal.payload as {
                        accepted: boolean;
                        sdp?: RTCSessionDescriptionInit;
                    };
                    if (payload.accepted && payload.sdp) {
                        // Đối phương chấp nhận cuộc gọi
                        webrtcRef.current.handleRemoteDescription(payload.sdp);
                        setCallStatus("ONGOING");
                    } else {
                        // Đối phương từ chối cuộc gọi
                        webrtcRef.current.cleanup();
                        setCallStatus("REJECTED");
                        setTimeout(() => endCallStore(), 2000);
                    }
                    stopRingtone();
                    break;
                }

                case "ICE_CANDIDATE": {
                    const payload = signal.payload as { candidate: RTCIceCandidateInit };
                    if (payload.candidate) {
                        webrtcRef.current.addIceCandidate(payload.candidate);
                    }
                    break;
                }

                case "END": {
                    // Đối phương kết thúc cuộc gọi
                    webrtcRef.current.cleanup();
                    stopRingtone();
                    setCallStatus("ENDED");
                    setTimeout(() => endCallStore(), 2000);
                    break;
                }

                case "RENEGOTIATE_OFFER": {
                    // Remote is upgrading the call (e.g. voice → video)
                    const renoPayload = signal.payload as { sdp: RTCSessionDescriptionInit };
                    await webrtcRef.current.handleRemoteDescription(renoPayload.sdp);
                    const answer = await webrtcRef.current.createAnswer();

                    const client = socketService.getClient();
                    const activeCall = useCallStore.getState().activeCall;
                    if (client?.connected && activeCall && user) {
                        const receiverId = activeCall.participants.find((id) => id !== user.id);
                        if (receiverId) {
                            client.publish({
                                destination: "/app/call.renegotiate",
                                body: JSON.stringify({
                                    type: "RENEGOTIATE_ANSWER",
                                    callId: activeCall.callId,
                                    senderId: user.id,
                                    receiverId,
                                    payload: { sdp: answer },
                                }),
                            });
                        }
                    }
                    upgradeCall();
                    break;
                }

                case "RENEGOTIATE_ANSWER": {
                    // Remote accepted our upgrade offer
                    const renoPayload = signal.payload as { sdp: RTCSessionDescriptionInit };
                    await webrtcRef.current.handleRemoteDescription(renoPayload.sdp);
                    upgradeCall();
                    break;
                }

                default:
                    console.warn("Unknown call signal type:", signal.type);
            }
        },
        [setIncomingCall, setCallStatus, endCallStore, setPendingOffer, upgradeCall, playRingtone, stopRingtone],
    );

    // Subscribe vào queue calls — re-subscribe every time STOMP connects/reconnects
    useEffect(() => {
        if (!user) return;

        let subscription: { unsubscribe: () => void } | null = null;

        const unregister = socketService.onConnect(() => {
            // Unsubscribe previous subscription before creating a new one
            subscription?.unsubscribe();

            const client = socketService.getClient();
            if (!client?.connected) return;

            subscription = client.subscribe(
                `/user/queue/calls`,
                (message) => {
                    const signal = JSON.parse(message.body) as CallSignal;
                    handleSignal(signal);
                },
            );
            console.log("[CallSocket] Subscribed to /user/queue/calls");
        });

        return () => {
            unregister();
            subscription?.unsubscribe();
        };
    }, [user, handleSignal]);

    // Bắt đầu cuộc gọi (caller gửi offer)
    const initiateCall = useCallback(
        async (receiverId: string, conversationId: string, type: CallType, calleeName?: string, calleeAvatar?: string) => {
            if (!user) return;

            const client = socketService.getClient();
            if (!client?.connected) return;

            try {
                setCallStatus("RINGING");
                setOutgoingCallTarget({
                    name: calleeName ?? receiverId,
                    avatarUrl: calleeAvatar,
                    type,
                });

                // startCall TRƯỚC initLocalStream để activeCall được set
                // trước khi ICE candidates bắt đầu fire
                const callId = generateCallId();
                const session: CallSession = {
                    callId,
                    conversationId,
                    initiatorId: user.id,
                    participants: [user.id, receiverId],
                    type,
                    status: "RINGING",
                };
                startCall(session);
                setCallStatus("RINGING"); // override 'ONGOING' từ startCall về RINGING

                await webrtcRef.current.initLocalStream(type);
                const offer = await webrtcRef.current.createOffer();

                // Gửi tín hiệu INITIATE qua STOMP
                client.publish({
                    destination: "/app/call.initiate",
                    body: JSON.stringify({
                        type: "INITIATE",
                        callId,
                        senderId: user.id,
                        receiverId,
                        payload: {
                            callerName: user.displayName,
                            callerAvatar: user.avatarUrl ?? "",
                            callType: type,
                            conversationId,
                            offer,
                        },
                    }),
                });
            } catch (error) {
                console.error("Failed to initiate call:", error);
                endCallStore();
            }
        },
        [user, setCallStatus, setOutgoingCallTarget, setPendingOffer, startCall, endCallStore],
    );

    // Trả lời cuộc gọi (accept hoặc reject)
    const answerCall = useCallback(
        async (accept: boolean) => {
            if (!user) return;

            const client = socketService.getClient();
            if (!client?.connected) return;

            const incoming = useCallStore.getState().incomingCall;
            if (!incoming) return;

            if (accept) {
                try {
                    stopRingtone();
                    // startCall TRƯỚC initLocalStream để activeCall được set
                    // trước khi ICE candidates bắt đầu fire
                    const session: CallSession = {
                        callId: incoming.callId,
                        conversationId: "",
                        initiatorId: incoming.callerId,
                        participants: [incoming.callerId, user.id],
                        type: incoming.type,
                        status: "ONGOING",
                        startedAt: new Date().toISOString(),
                    };
                    startCall(session);

                    await webrtcRef.current.initLocalStream(incoming.type);

                    const pendingOffer = useCallStore.getState().pendingOffer;
                    if (!pendingOffer) {
                        console.error("No pending offer found");
                        endCallStore();
                        return;
                    }

                    // Set remote description (offer) trước khi tạo answer
                    await webrtcRef.current.handleRemoteDescription(pendingOffer);
                    setPendingOffer(null);

                    const answer = await webrtcRef.current.createAnswer();

                    // Gửi answer chấp nhận
                    client.publish({
                        destination: "/app/call.answer",
                        body: JSON.stringify({
                            type: "ANSWER",
                            callId: incoming.callId,
                            senderId: user.id,
                            receiverId: incoming.callerId,
                            payload: { accepted: true, sdp: answer },
                        }),
                    });
                    // incomingCall giữ nguyên → ActiveCallOverlay dùng callerName
                } catch (error) {
                    console.error("Failed to answer call:", error);
                    endCallStore(); // endCallStore tự reset incomingCall
                    return;
                }
            } else {
                // Từ chối cuộc gọi
                stopRingtone();
                setPendingOffer(null);

                client.publish({
                    destination: "/app/call.answer",
                    body: JSON.stringify({
                        type: "ANSWER",
                        callId: incoming.callId,
                        senderId: user.id,
                        receiverId: incoming.callerId,
                        payload: { accepted: false },
                    }),
                });

                setCallStatus("REJECTED");
                setIncomingCall(null); // chỉ clear khi reject
                setTimeout(() => endCallStore(), 1000);
            }
        },
        [user, setIncomingCall, setCallStatus, setPendingOffer, startCall, endCallStore, stopRingtone],
    );

    // Kết thúc cuộc gọi đang diễn ra
    const handleEndCall = useCallback(() => {        if (!user) return;

        const client = socketService.getClient();
        const activeCall = useCallStore.getState().activeCall;

        if (activeCall && client?.connected) {
            const receiverId = activeCall.participants.find((id) => id !== user.id);
            if (receiverId) {
                client.publish({
                    destination: "/app/call.end",
                    body: JSON.stringify({
                        type: "END",
                        callId: activeCall.callId,
                        senderId: user.id,
                        receiverId,
                    }),
                });
            }
        }

        webrtcRef.current.cleanup();
        setCallStatus("ENDED");
        setTimeout(() => endCallStore(), 1500);
    }, [user, setCallStatus, endCallStore]);

    // Wrap toggleCamera: ties WebRTC track changes to store state
    const handleToggleCamera = useCallback(async (): Promise<void> => {
        const cameraOn = await webrtcRef.current.toggleCamera();
        useCallStore.getState().setCameraOff(!cameraOn);
    }, []);

    // Upgrade an active voice call to video (sends RENEGOTIATE_OFFER to peer)
    const upgradeToVideo = useCallback(async () => {        if (!user) return;
        const client = socketService.getClient();
        const activeCall = useCallStore.getState().activeCall;
        if (!client?.connected || !activeCall) return;

        try {
            const offer = await webrtcRef.current.upgradeToVideo();
            const receiverId = activeCall.participants.find((id) => id !== user.id);
            if (!receiverId) return;

            client.publish({
                destination: "/app/call.renegotiate",
                body: JSON.stringify({
                    type: "RENEGOTIATE_OFFER",
                    callId: activeCall.callId,
                    senderId: user.id,
                    receiverId,
                    payload: { sdp: offer },
                }),
            });
        } catch (error) {
            console.error("Failed to upgrade to video:", error);
        }
    }, [user]);

    return {
        initiateCall,
        answerCall,
        endCall: handleEndCall,
        upgradeToVideo,
        localStream: webrtc.localStream,
        remoteStream: webrtc.remoteStream,
        localVideoRef: webrtc.localVideoRef,
        remoteVideoRef: webrtc.remoteVideoRef,
        toggleMute: webrtc.toggleMute,
        toggleCamera: handleToggleCamera,
    };
}
