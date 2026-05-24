import { useEffect, useCallback, useRef, useState } from "react";
import type React from "react";
import { socketService } from "@/services/socket.service";
import { useAuthStore } from "@/store/auth.store";
import { useCallStore } from "@/store/call.store";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useAgoraMediaCall } from "@/hooks/useAgoraMediaCall";
import type {
    CallType,
    CallSignal,
    CallSession,
    CallMediaProvider,
} from "@/types/call";

function generateCallId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Hook for handling WebRTC signaling via STOMP WebSocket.
 * Subscribes to /user/queue/calls to receive call signals.
 */
export function useCallSocket(
    groupSignalRef?: React.MutableRefObject<
        ((signal: CallSignal) => void) | null
    >,
) {
    const user = useAuthStore((s) => s.user);
    const {
        setIncomingCall,
        setCallStatus,
        setOutgoingCallTarget,
        setPendingOffer,
        setCameraOff,
        startCall,
        endCall: endCallStore,
        upgradeCall,
    } = useCallStore();

    const webrtc = useWebRTC();
    const webrtcRef = useRef(webrtc);
    webrtcRef.current = webrtc;

    const agoraMediaCall = useAgoraMediaCall();
    const agoraMediaCallRef = useRef(agoraMediaCall);
    agoraMediaCallRef.current = agoraMediaCall;

    // Ringtone for incoming calls
    const ringtoneRef = useRef<HTMLAudioElement | null>(null);

    const playRingtone = useCallback(() => {
        if (ringtoneRef.current) return; // already playing
        const audio = new Audio("/sounds/call-sound.mp3");
        audio.loop = true;
        audio.play().catch(() => {
            /* autoplay may be blocked */
        });
        ringtoneRef.current = audio;
    }, []);

    const stopRingtone = useCallback(() => {
        if (!ringtoneRef.current) return;
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
        ringtoneRef.current = null;
    }, []);

    const pendingVideoUpgradeDecisionRef = useRef<{
        resolve: (accepted: boolean) => void;
        timeoutId: ReturnType<typeof window.setTimeout>;
    } | null>(null);

    const resolvePendingVideoUpgradeDecision = useCallback(
        (accepted: boolean) => {
            const pending = pendingVideoUpgradeDecisionRef.current;
            if (!pending) return;

            window.clearTimeout(pending.timeoutId);
            pendingVideoUpgradeDecisionRef.current = null;
            pending.resolve(accepted);
        },
        [],
    );

    const waitForVideoUpgradeDecision = useCallback((): Promise<boolean> => {
        if (pendingVideoUpgradeDecisionRef.current) {
            throw new Error("A video upgrade request is already pending.");
        }

        return new Promise<boolean>((resolve, reject) => {
            const timeoutId = window.setTimeout(() => {
                pendingVideoUpgradeDecisionRef.current = null;
                reject(
                    new Error(
                        "Peer did not respond to the video call request.",
                    ),
                );
            }, 20000);

            pendingVideoUpgradeDecisionRef.current = {
                resolve,
                timeoutId,
            };
        });
    }, []);

    const pendingIncomingVideoUpgradeRequesterIdRef = useRef<string | null>(
        null,
    );
    const [incomingVideoUpgradeRequest, setIncomingVideoUpgradeRequest] =
        useState<{
            requesterName: string;
        } | null>(null);

    const respondToVideoUpgradeRequest = useCallback(
        async (accept: boolean) => {
            const activeCall = useCallStore.getState().activeCall;
            const client = socketService.getClient();
            if (!activeCall || !client?.connected || !user) {
                setIncomingVideoUpgradeRequest(null);
                pendingIncomingVideoUpgradeRequesterIdRef.current = null;
                return;
            }

            if (accept) {
                const hasLocalVideoTrack =
                    await agoraMediaCallRef.current.enableVideo();
                setCameraOff(!hasLocalVideoTrack);
                upgradeCall();
            }

            const receiverId =
                pendingIncomingVideoUpgradeRequesterIdRef.current ??
                activeCall.participants.find((id) => id !== user.id);

            if (receiverId) {
                client.publish({
                    destination: "/app/call.renegotiate",
                    body: JSON.stringify({
                        type: accept
                            ? "VIDEO_UPGRADE_ACCEPT"
                            : "VIDEO_UPGRADE_REJECT",
                        callId: activeCall.callId,
                        senderId: user.id,
                        receiverId,
                    }),
                });
            }

            setIncomingVideoUpgradeRequest(null);
            pendingIncomingVideoUpgradeRequesterIdRef.current = null;
        },
        [setCameraOff, upgradeCall, user],
    );

    // Offer SDP stored in Zustand store for persistence across re-renders

    // Send ICE candidate to peer via STOMP
    const sendIceCandidate = useCallback(
        (candidate: RTCIceCandidate) => {
            const activeCall = useCallStore.getState().activeCall;
            if (!activeCall || !user) return;

            const receiverId = activeCall.participants.find(
                (id) => id !== user.id,
            );
            if (!receiverId) return;

            const client = socketService.getClient();
            if (!client?.connected) return;

            console.log(`[CallSocket] Sending ICE candidate to ${receiverId}`);
            client.publish({
                destination: "/app/call.ice-candidate",
                body: JSON.stringify({
                    type: "ICE_CANDIDATE",
                    callId: activeCall.callId,
                    senderId: user.id,
                    receiverId,
                    payload: { candidate: candidate.toJSON() },
                }),
            });
        },
        [user],
    );

    // Assign callbacks for WebRTC
    useEffect(() => {
        webrtcRef.current.callbacksRef.current = {
            onIceCandidate: sendIceCandidate,
            onConnectionStateChange: (state) => {
                console.log("[CallSocket] connection state:", state);
                // Only end call on permanent failure — "disconnected" is temporary and can self-heal
                if (state === "failed" || state === "closed") {
                    console.warn(
                        "[CallSocket] Permanent connection failure, ending call:",
                        state,
                    );
                    handleEndCall();
                }
            },
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sendIceCandidate]);

    // Handle incoming signal from server
    const handleSignal = useCallback(
        async (signal: CallSignal) => {
            switch (signal.type) {
                case "INITIATE": {
                    // Incoming call
                    const payload = signal.payload as {
                        callerName: string;
                        callerAvatar: string | null;
                        callType: CallType;
                        conversationId: string;
                        mediaProvider?: CallMediaProvider;
                        offer?: RTCSessionDescriptionInit;
                    };
                    const mediaProvider = payload.mediaProvider ?? "WEBRTC";
                    setPendingOffer(
                        mediaProvider === "AGORA"
                            ? null
                            : (payload.offer ?? null),
                    );
                    setIncomingCall({
                        callId: signal.callId,
                        conversationId: payload.conversationId,
                        callerId: signal.senderId,
                        callerName: payload.callerName,
                        callerAvatar: payload.callerAvatar,
                        type: payload.callType,
                        mediaProvider,
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
                    if (payload.accepted) {
                        if (payload.sdp) {
                            await webrtcRef.current.handleRemoteDescription(
                                payload.sdp,
                            );
                            setCallStatus("ONGOING");
                            stopRingtone();
                            break;
                        }

                        const activeCall = useCallStore.getState().activeCall;
                        if (activeCall) {
                            try {
                                if (activeCall.type === "VIDEO") {
                                    webrtcRef.current.cleanup();
                                }
                                const result =
                                    await agoraMediaCallRef.current.joinCall({
                                        conversationId:
                                            activeCall.conversationId,
                                        callId: activeCall.callId,
                                        type: activeCall.type,
                                    });
                                setCameraOff(!result.hasLocalVideoTrack);
                                setCallStatus("ONGOING");
                                stopRingtone();
                            } catch {
                                endCallStore();
                            }
                            break;
                        }
                    } else {
                        // Peer rejected the call
                        agoraMediaCallRef.current.leaveCall();
                        webrtcRef.current.cleanup();
                        setCallStatus("REJECTED");
                        setTimeout(() => endCallStore(), 2000);
                    }
                    stopRingtone();
                    break;
                }

                case "ICE_CANDIDATE": {
                    const payload = signal.payload as {
                        candidate: RTCIceCandidateInit;
                    };
                    if (payload.candidate) {
                        console.log(
                            `[CallSocket] Received ICE candidate from ${signal.senderId}`,
                        );
                        webrtcRef.current.addIceCandidate(payload.candidate);
                    }
                    break;
                }

                case "END": {
                    // Peer ended the call
                    agoraMediaCallRef.current.leaveCall();
                    webrtcRef.current.cleanup();
                    stopRingtone();
                    resolvePendingVideoUpgradeDecision(false);
                    setIncomingVideoUpgradeRequest(null);
                    pendingIncomingVideoUpgradeRequesterIdRef.current = null;
                    setCallStatus("ENDED");
                    setTimeout(() => endCallStore(), 2000);
                    break;
                }

                case "VIDEO_UPGRADE_REQUEST": {
                    const payload = signal.payload as
                        | { requesterName?: unknown }
                        | undefined;
                    const fallbackRequesterName =
                        useCallStore.getState().outgoingCallTarget?.name ??
                        useCallStore.getState().incomingCall?.callerName ??
                        "Peer";
                    const requesterName =
                        typeof payload?.requesterName === "string" &&
                        payload.requesterName.trim().length > 0
                            ? payload.requesterName
                            : fallbackRequesterName;

                    pendingIncomingVideoUpgradeRequesterIdRef.current =
                        signal.senderId;
                    setIncomingVideoUpgradeRequest({ requesterName });
                    break;
                }

                case "VIDEO_UPGRADE_ACCEPT": {
                    resolvePendingVideoUpgradeDecision(true);
                    break;
                }

                case "VIDEO_UPGRADE_REJECT": {
                    resolvePendingVideoUpgradeDecision(false);
                    break;
                }

                case "RENEGOTIATE_OFFER": {
                    // Remote is upgrading the call (e.g. voice → video)
                    // Receiver should switch to video layout to see peer, but keep own camera off.
                    setCameraOff(true);
                    upgradeCall();

                    const renoPayload = signal.payload as {
                        sdp: RTCSessionDescriptionInit;
                    };
                    await webrtcRef.current.handleRemoteDescription(
                        renoPayload.sdp,
                    );
                    const answer = await webrtcRef.current.createAnswer();

                    const client = socketService.getClient();
                    const activeCall = useCallStore.getState().activeCall;
                    if (client?.connected && activeCall && user) {
                        const receiverId = activeCall.participants.find(
                            (id) => id !== user.id,
                        );
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
                    break;
                }

                case "RENEGOTIATE_ANSWER": {
                    // Remote accepted our upgrade offer
                    const renoPayload = signal.payload as {
                        sdp: RTCSessionDescriptionInit;
                    };
                    await webrtcRef.current.handleRemoteDescription(
                        renoPayload.sdp,
                    );
                    upgradeCall();
                    break;
                }

                default:
                    console.warn("Unknown call signal type:", signal.type);
            }
        },
        [
            setIncomingCall,
            setCallStatus,
            endCallStore,
            setPendingOffer,
            setCameraOff,
            upgradeCall,
            playRingtone,
            stopRingtone,
            resolvePendingVideoUpgradeDecision,
            setIncomingVideoUpgradeRequest,
            user,
        ],
    );

    // Subscribe to call queue — re-subscribe every time STOMP connects/reconnects
    useEffect(() => {
        if (!user) return;

        let subscription: { unsubscribe: () => void } | null = null;

        const unregister = socketService.onConnect(() => {
            // Unsubscribe previous subscription before creating a new one
            subscription?.unsubscribe();

            const client = socketService.getClient();
            if (!client?.connected) return;

            subscription = client.subscribe(`/user/queue/calls`, (message) => {
                const signal = JSON.parse(message.body) as CallSignal;
                if (
                    signal.type.startsWith("GROUP_") ||
                    (signal.type === "ICE_CANDIDATE" &&
                        useCallStore.getState().isGroupCall)
                ) {
                    groupSignalRef?.current?.(signal);
                    return;
                }

                // Some brokers can echo signaling back to sender; ignore our own 1-1 signals.
                if (user && signal.senderId === user.id) {
                    return;
                }

                handleSignal(signal);
            });
        });

        return () => {
            unregister();
            subscription?.unsubscribe();
        };
    }, [user, handleSignal, groupSignalRef]);

    // Initiate a call.
    const initiateCall = useCallback(
        async (
            receiverId: string,
            conversationId: string,
            type: CallType,
            calleeName?: string,
            calleeAvatar?: string | null,
        ) => {
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

                // startCall BEFORE initLocalStream so activeCall is set
                // before ICE candidates start firing
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
                setCallStatus("RINGING"); // override 'ONGOING' from startCall back to RINGING

                let offer: RTCSessionDescriptionInit | undefined;
                if (type === "VIDEO") {
                    await webrtcRef.current.initLocalStream(type);
                    offer = await webrtcRef.current.createOffer();
                }

                // Send INITIATE signal via STOMP
                client.publish({
                    destination: "/app/call.initiate",
                    body: JSON.stringify({
                        type: "INITIATE",
                        callId,
                        senderId: user.id,
                        receiverId,
                        payload: {
                            callerName: user.displayName,
                            callerAvatar: user.avatarUrl ?? null,
                            callType: type,
                            conversationId,
                            ...(type === "VIDEO"
                                ? { mediaProvider: "AGORA" }
                                : {}),
                            ...(offer ? { offer } : {}),
                        },
                    }),
                });
            } catch {
                endCallStore();
            }
        },
        [user, setCallStatus, setOutgoingCallTarget, startCall, endCallStore],
    );

    // Answer a call (accept or reject)
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
                    // startCall BEFORE initLocalStream so activeCall is set
                    // before ICE candidates start firing
                    const session: CallSession = {
                        callId: incoming.callId,
                        conversationId: incoming.conversationId,
                        initiatorId: incoming.callerId,
                        participants: [incoming.callerId, user.id],
                        type: incoming.type,
                        status: "ONGOING",
                        startedAt: new Date().toISOString(),
                    };
                    startCall(session);

                    if (
                        incoming.type === "VIDEO" &&
                        incoming.mediaProvider !== "AGORA"
                    ) {
                        await webrtcRef.current.initLocalStream(incoming.type);

                        const pendingOffer =
                            useCallStore.getState().pendingOffer;
                        if (!pendingOffer) {
                            endCallStore();
                            return;
                        }

                        await webrtcRef.current.handleRemoteDescription(
                            pendingOffer,
                        );
                        setPendingOffer(null);

                        const answer = await webrtcRef.current.createAnswer();
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
                        return;
                    }

                    const result = await agoraMediaCallRef.current.joinCall({
                        conversationId: incoming.conversationId,
                        callId: incoming.callId,
                        type: incoming.type,
                    });
                    setCameraOff(!result.hasLocalVideoTrack);

                    client.publish({
                        destination: "/app/call.answer",
                        body: JSON.stringify({
                            type: "ANSWER",
                            callId: incoming.callId,
                            senderId: user.id,
                            receiverId: incoming.callerId,
                            payload: { accepted: true },
                        }),
                    });

                    // incomingCall kept — ActiveCallOverlay uses callerName
                } catch {
                    endCallStore(); // endCallStore auto-resets incomingCall
                    return;
                }
            } else {
                // Reject the call
                agoraMediaCallRef.current.leaveCall();
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
                setIncomingCall(null); // only clear when rejecting
                setTimeout(() => endCallStore(), 1000);
            }
        },
        [
            user,
            setIncomingCall,
            setCallStatus,
            setCameraOff,
            setPendingOffer,
            startCall,
            endCallStore,
            stopRingtone,
        ],
    );

    // End an ongoing call
    const handleEndCall = useCallback(() => {
        if (!user) return;

        const client = socketService.getClient();
        const activeCall = useCallStore.getState().activeCall;

        if (activeCall && client?.connected) {
            const receiverId = activeCall.participants.find(
                (id) => id !== user.id,
            );
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

        resolvePendingVideoUpgradeDecision(false);
        setIncomingVideoUpgradeRequest(null);
        pendingIncomingVideoUpgradeRequesterIdRef.current = null;
        agoraMediaCallRef.current.leaveCall();
        webrtcRef.current.cleanup();
        setCallStatus("ENDED");
        setTimeout(() => endCallStore(), 1500);
    }, [user, setCallStatus, endCallStore, resolvePendingVideoUpgradeDecision]);

    // Wrap toggleCamera: ties WebRTC track changes to store state
    const handleToggleCamera = useCallback(async (): Promise<void> => {
        const activeCall = useCallStore.getState().activeCall;
        if (activeCall?.type === "VIDEO") {
            const cameraOn = await agoraMediaCallRef.current.toggleCamera();
            useCallStore.getState().setCameraOff(!cameraOn);
            return;
        }

        const cameraOn = await webrtcRef.current.toggleCamera();
        useCallStore.getState().setCameraOff(!cameraOn);
    }, []);

    // Upgrade an active voice call to video.
    const upgradeToVideo = useCallback(async (): Promise<{
        hasLocalVideoTrack: boolean;
    }> => {
        if (!user) throw new Error("Unable to request video call upgrade.");

        const activeCall = useCallStore.getState().activeCall;
        if (!activeCall) throw new Error("No active call to upgrade");
        if (activeCall.type === "VIDEO") {
            return { hasLocalVideoTrack: true };
        }

        const receiverId = activeCall.participants.find((id) => id !== user.id);
        if (!receiverId)
            throw new Error("Cannot identify the peer for upgrade request.");

        const requestingClient = socketService.getClient();
        if (!requestingClient?.connected) {
            throw new Error("Signaling is disconnected. Please retry.");
        }

        try {
            requestingClient.publish({
                destination: "/app/call.renegotiate",
                body: JSON.stringify({
                    type: "VIDEO_UPGRADE_REQUEST",
                    callId: activeCall.callId,
                    senderId: user.id,
                    receiverId,
                    payload: {
                        requesterName: user.displayName,
                    },
                }),
            });

            const accepted = await waitForVideoUpgradeDecision();
            if (!accepted) {
                throw new Error("Peer declined the video call request.");
            }

            const hasLocalVideoTrack =
                await agoraMediaCallRef.current.enableVideo();
            setCameraOff(!hasLocalVideoTrack);
            upgradeCall();

            return { hasLocalVideoTrack };
        } catch (error) {
            console.error("Failed to upgrade to video:", error);
            throw error; // Re-throw so caller knows upgrade failed
        }
    }, [user, setCameraOff, upgradeCall, waitForVideoUpgradeDecision]);

    const handleToggleMute = useCallback((muted: boolean): void => {
        const activeCall = useCallStore.getState().activeCall;
        if (activeCall?.type === "VOICE" || activeCall?.type === "VIDEO") {
            agoraMediaCallRef.current.toggleMute(muted);
            return;
        }

        webrtcRef.current.toggleMute();
    }, []);

    return {
        initiateCall,
        answerCall,
        endCall: handleEndCall,
        upgradeToVideo,
        incomingVideoUpgradeRequest,
        respondToVideoUpgradeRequest,
        localStream: agoraMediaCall.localStream ?? webrtc.localStream,
        remoteStream: agoraMediaCall.remoteStream ?? webrtc.remoteStream,
        localVideoRef: webrtc.localVideoRef,
        remoteVideoRef: webrtc.remoteVideoRef,
        toggleMute: handleToggleMute,
        toggleCamera: handleToggleCamera,
    };
}
