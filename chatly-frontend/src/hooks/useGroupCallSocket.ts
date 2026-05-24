import { useCallback, useEffect, useRef, useState } from "react";
import { socketService } from "@/services/socket.service";
import { useAuthStore } from "@/store/auth.store";
import { useCallStore } from "@/store/call.store";
import { useGroupWebRTC } from "@/hooks/useGroupWebRTC";
import { useAgoraGroupCall } from "@/hooks/useAgoraGroupCall";
import type {
    CallMediaProvider,
    CallType,
    CallSignal,
    CallSession,
    IncomingGroupCall,
} from "@/types/call";

function generateCallId(): string {
    return `gcall_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Manages group call signaling via STOMP WebSocket using full-mesh WebRTC topology.
 * Every participant creates a peer connection to every other participant.
 */
export function useGroupCallSocket() {
    const user = useAuthStore((s) => s.user);
    const activeGroupCall = useCallStore((s) => s.activeCall);
    const {
        setCallStatus,
        setIncomingGroupCall,
        startGroupCall,
        endCall: endCallStore,
        setGroupParticipantInfo,
        removeGroupParticipant,
        setOutgoingCallTarget,
        setCameraOff,
        upgradeCall,
        setGroupCallRealtimeState,
    } = useCallStore();

    // Ringtone shared between incoming and outgoing group calls
    const ringtoneRef = useRef<HTMLAudioElement | null>(null);

    const playRingtone = useCallback(() => {
        if (ringtoneRef.current) return;
        const audio = new Audio("/sounds/call-sound.mp3");
        audio.loop = true;
        audio.play().catch(() => {});
        ringtoneRef.current = audio;
    }, []);

    const stopRingtone = useCallback(() => {
        if (!ringtoneRef.current) return;
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
        ringtoneRef.current = null;
    }, []);

    const groupWebRTC = useGroupWebRTC({
        onIceCandidate: (peerId, candidate) => {
            const activeCall = useCallStore.getState().activeCall;
            if (!activeCall || !user) return;
            const client = socketService.getClient();
            if (!client?.connected) return;

            client.publish({
                destination: "/app/call.group.signal",
                body: JSON.stringify({
                    type: "ICE_CANDIDATE",
                    callId: activeCall.callId,
                    senderId: user.id,
                    receiverId: peerId,
                    payload: { candidate },
                }),
            });
        },
        onPeerConnectionFailed: (peerId) => {
            console.warn(
                `[GroupCallSocket] Peer connection failed for ${peerId}`,
            );
        },
    });

    const groupWebRTCRef = useRef(groupWebRTC);

    const groupAgoraCall = useAgoraGroupCall();
    const groupAgoraCallRef = useRef(groupAgoraCall);

    useEffect(() => {
        groupWebRTCRef.current = groupWebRTC;
    }, [groupWebRTC]);

    useEffect(() => {
        groupAgoraCallRef.current = groupAgoraCall;
    }, [groupAgoraCall]);

    const handleSignalRef = useRef<((signal: CallSignal) => void) | null>(null);

    const pendingGroupVideoUpgradeDecisionRef = useRef<{
        remainingPeerIds: Set<string>;
        resolve: () => void;
        reject: (error: Error) => void;
        timeoutId: ReturnType<typeof window.setTimeout>;
    } | null>(null);

    const shouldAutoEnableCameraForRequesterRef = useRef<Set<string>>(
        new Set(),
    );
    const pendingIncomingGroupVideoUpgradeRequesterIdRef = useRef<
        string | null
    >(null);

    const [
        incomingGroupVideoUpgradeRequest,
        setIncomingGroupVideoUpgradeRequest,
    ] = useState<{
        requesterName: string;
    } | null>(null);

    const cancelPendingGroupVideoUpgradeDecision = useCallback(
        (message: string) => {
            const pending = pendingGroupVideoUpgradeDecisionRef.current;
            if (!pending) return;

            window.clearTimeout(pending.timeoutId);
            pendingGroupVideoUpgradeDecisionRef.current = null;
            pending.reject(new Error(message));
        },
        [],
    );

    const resolveGroupVideoUpgradeDecision = useCallback(
        (peerId: string, accepted: boolean) => {
            const pending = pendingGroupVideoUpgradeDecisionRef.current;
            if (!pending || !pending.remainingPeerIds.has(peerId)) return;

            if (!accepted) {
                window.clearTimeout(pending.timeoutId);
                pendingGroupVideoUpgradeDecisionRef.current = null;
                pending.reject(
                    new Error("A participant declined the video call request."),
                );
                return;
            }

            pending.remainingPeerIds.delete(peerId);
            if (pending.remainingPeerIds.size === 0) {
                window.clearTimeout(pending.timeoutId);
                pendingGroupVideoUpgradeDecisionRef.current = null;
                pending.resolve();
            }
        },
        [],
    );

    const respondToGroupVideoUpgradeRequest = useCallback(
        (accept: boolean) => {
            const activeCall = useCallStore.getState().activeCall;
            const requesterId =
                pendingIncomingGroupVideoUpgradeRequesterIdRef.current;
            const client = socketService.getClient();

            if (!activeCall || !client?.connected || !user || !requesterId) {
                setIncomingGroupVideoUpgradeRequest(null);
                pendingIncomingGroupVideoUpgradeRequesterIdRef.current = null;
                return;
            }

            if (accept) {
                shouldAutoEnableCameraForRequesterRef.current.add(requesterId);
            } else {
                shouldAutoEnableCameraForRequesterRef.current.delete(
                    requesterId,
                );
            }

            client.publish({
                destination: "/app/call.group.signal",
                body: JSON.stringify({
                    type: accept
                        ? "GROUP_VIDEO_UPGRADE_ACCEPT"
                        : "GROUP_VIDEO_UPGRADE_REJECT",
                    callId: activeCall.callId,
                    senderId: user.id,
                    receiverId: requesterId,
                }),
            });

            setIncomingGroupVideoUpgradeRequest(null);
            pendingIncomingGroupVideoUpgradeRequesterIdRef.current = null;
        },
        [user],
    );

    const handleSignal = useCallback(
        (signal: CallSignal) => {
            switch (signal.type) {
                case "GROUP_INITIATE": {
                    const p = signal.payload as {
                        initiatorName: string;
                        initiatorAvatar?: string | null;
                        groupName: string;
                        groupAvatarUrl?: string | null;
                        callType: CallType;
                        mediaProvider?: CallMediaProvider;
                        participantCount: number;
                        conversationId: string;
                    };
                    const mediaProvider = p.mediaProvider ?? "WEBRTC";
                    const incoming: IncomingGroupCall = {
                        callId: signal.callId,
                        conversationId: p.conversationId,
                        initiatorId: signal.senderId,
                        initiatorName: p.initiatorName,
                        initiatorAvatar: p.initiatorAvatar ?? null,
                        groupName: p.groupName,
                        groupAvatarUrl: p.groupAvatarUrl ?? null,
                        type: p.callType,
                        participantCount: p.participantCount,
                        mediaProvider,
                    };
                    setGroupCallRealtimeState(signal.callId, false, 1);
                    setIncomingGroupCall(incoming);
                    setCallStatus("RINGING");
                    playRingtone();
                    break;
                }

                case "GROUP_JOIN": {
                    const newPeerId = signal.senderId;
                    if (!user || newPeerId === user.id) break;

                    const p = signal.payload as {
                        displayName?: string;
                        avatarUrl?: string | null;
                    };
                    setGroupParticipantInfo(newPeerId, {
                        name: p.displayName ?? newPeerId,
                        avatar: p.avatarUrl ?? null,
                    });
                    const knownRemoteCount = Object.keys(
                        useCallStore.getState().groupParticipantInfo,
                    ).length;
                    setGroupCallRealtimeState(
                        signal.callId,
                        false,
                        Math.max(2, knownRemoteCount + 1),
                    );

                    // Transition initiator from RINGING → ONGOING when first person joins
                    const currentStatus = useCallStore.getState().callStatus;
                    if (currentStatus === "RINGING") {
                        stopRingtone();
                        setCallStatus("ONGOING");
                        setOutgoingCallTarget(null);
                    }

                    const activeCall = useCallStore.getState().activeCall;
                    if (!activeCall) break;
                    if (activeCall.mediaProvider === "AGORA") break;

                    groupWebRTCRef.current
                        .createOfferForPeer(newPeerId)
                        .then((offer) => {
                            const client = socketService.getClient();
                            if (!client?.connected) return;
                            client.publish({
                                destination: "/app/call.group.signal",
                                body: JSON.stringify({
                                    type: "GROUP_OFFER",
                                    callId: activeCall.callId,
                                    senderId: user!.id,
                                    receiverId: newPeerId,
                                    payload: {
                                        offer,
                                        displayName: user!.displayName,
                                        avatarUrl: user!.avatarUrl ?? null,
                                    },
                                }),
                            });
                        })
                        .catch(console.error);
                    break;
                }

                case "GROUP_OFFER": {
                    const peerId = signal.senderId;
                    const p = signal.payload as {
                        offer: RTCSessionDescriptionInit;
                        displayName?: string;
                        avatarUrl?: string | null;
                    };
                    if (p.displayName) {
                        setGroupParticipantInfo(peerId, {
                            name: p.displayName,
                            avatar: p.avatarUrl ?? null,
                        });
                    }
                    const activeCall = useCallStore.getState().activeCall;
                    if (!activeCall || !user) break;
                    if (activeCall.mediaProvider === "AGORA") break;

                    groupWebRTCRef.current
                        .handleOfferFromPeer(peerId, p.offer)
                        .then((answer) => {
                            const client = socketService.getClient();
                            if (!client?.connected) return;
                            client.publish({
                                destination: "/app/call.group.signal",
                                body: JSON.stringify({
                                    type: "GROUP_ANSWER",
                                    callId: activeCall.callId,
                                    senderId: user!.id,
                                    receiverId: peerId,
                                    payload: { answer },
                                }),
                            });
                        })
                        .catch(console.error);
                    break;
                }

                case "GROUP_VIDEO_UPGRADE_REQUEST": {
                    const activeCall = useCallStore.getState().activeCall;
                    if (!activeCall || !user || signal.senderId === user.id)
                        break;

                    // Keep backward compatibility with older clients that still request consent.
                    // New flow upgrades group calls directly without prompting other participants.
                    const client = socketService.getClient();
                    if (!client?.connected) break;

                    client.publish({
                        destination: "/app/call.group.signal",
                        body: JSON.stringify({
                            type: "GROUP_VIDEO_UPGRADE_ACCEPT",
                            callId: activeCall.callId,
                            senderId: user.id,
                            receiverId: signal.senderId,
                        }),
                    });
                    break;
                }

                case "GROUP_VIDEO_UPGRADE_ACCEPT": {
                    resolveGroupVideoUpgradeDecision(signal.senderId, true);
                    break;
                }

                case "GROUP_VIDEO_UPGRADE_REJECT": {
                    resolveGroupVideoUpgradeDecision(signal.senderId, false);
                    break;
                }

                case "GROUP_RENEGOTIATE_OFFER": {
                    const activeCall = useCallStore.getState().activeCall;
                    if (!activeCall || !user) break;
                    if (activeCall.mediaProvider === "AGORA") break;

                    const payload = signal.payload as {
                        offer: RTCSessionDescriptionInit;
                    };
                    const shouldAutoEnable =
                        shouldAutoEnableCameraForRequesterRef.current.has(
                            signal.senderId,
                        );
                    shouldAutoEnableCameraForRequesterRef.current.delete(
                        signal.senderId,
                    );

                    const prepareLocalVideo = shouldAutoEnable
                        ? groupWebRTCRef.current
                              .enableLocalVideoTrack()
                              .then((enabled) => {
                                  setCameraOff(!enabled);
                              })
                              .catch((error: unknown) => {
                                  console.warn(
                                      "Unable to auto-enable camera after accepting group upgrade:",
                                      error,
                                  );
                                  setCameraOff(true);
                              })
                        : Promise.resolve();

                    prepareLocalVideo
                        .then(() => {
                            upgradeCall();
                            if (!shouldAutoEnable) {
                                setCameraOff(true);
                            }
                            return groupWebRTCRef.current.handleOfferFromPeer(
                                signal.senderId,
                                payload.offer,
                            );
                        })
                        .then((answer) => {
                            const client = socketService.getClient();
                            if (!client?.connected) return;

                            client.publish({
                                destination: "/app/call.group.signal",
                                body: JSON.stringify({
                                    type: "GROUP_RENEGOTIATE_ANSWER",
                                    callId: activeCall.callId,
                                    senderId: user.id,
                                    receiverId: signal.senderId,
                                    payload: { answer },
                                }),
                            });
                        })
                        .catch(console.error);
                    break;
                }

                case "GROUP_RENEGOTIATE_ANSWER": {
                    if (
                        useCallStore.getState().activeCall?.mediaProvider ===
                        "AGORA"
                    )
                        break;
                    const payload = signal.payload as {
                        answer: RTCSessionDescriptionInit;
                    };
                    groupWebRTCRef.current
                        .handleAnswerFromPeer(signal.senderId, payload.answer)
                        .catch(console.error);
                    break;
                }

                case "GROUP_ANSWER": {
                    if (
                        useCallStore.getState().activeCall?.mediaProvider ===
                        "AGORA"
                    )
                        break;
                    const peerId = signal.senderId;
                    const p = signal.payload as {
                        answer: RTCSessionDescriptionInit;
                    };
                    groupWebRTCRef.current
                        .handleAnswerFromPeer(peerId, p.answer)
                        .catch(console.error);
                    break;
                }

                case "ICE_CANDIDATE": {
                    if (!useCallStore.getState().isGroupCall) break;
                    if (
                        useCallStore.getState().activeCall?.mediaProvider ===
                        "AGORA"
                    )
                        break;
                    const p = signal.payload as {
                        candidate: RTCIceCandidateInit;
                    };
                    if (p.candidate) {
                        groupWebRTCRef.current
                            .addIceCandidateForPeer(
                                signal.senderId,
                                p.candidate,
                            )
                            .catch(console.error);
                    }
                    break;
                }

                case "GROUP_LEAVE": {
                    const leavingId = signal.senderId;

                    const leavePayload = signal.payload as
                        | {
                              callEnded?: unknown;
                              activeParticipantCount?: unknown;
                          }
                        | undefined;

                    const isCallEnded = leavePayload?.callEnded === true;
                    const activeParticipantCount =
                        typeof leavePayload?.activeParticipantCount === "number"
                            ? leavePayload.activeParticipantCount
                            : isCallEnded
                              ? 1
                              : Math.max(
                                    1,
                                    Object.keys(
                                        useCallStore.getState()
                                            .groupParticipantInfo,
                                    ).length,
                                );

                    setGroupCallRealtimeState(
                        signal.callId,
                        isCallEnded,
                        activeParticipantCount,
                    );

                    if (
                        pendingGroupVideoUpgradeDecisionRef.current?.remainingPeerIds.has(
                            leavingId,
                        )
                    ) {
                        cancelPendingGroupVideoUpgradeDecision(
                            "A participant left before responding to the video call request.",
                        );
                    }

                    if (isCallEnded) {
                        const currentIncoming =
                            useCallStore.getState().incomingGroupCall;
                        const activeCall = useCallStore.getState().activeCall;
                        if (
                            (currentIncoming &&
                                currentIncoming.callId === signal.callId) ||
                            (activeCall && activeCall.callId === signal.callId)
                        ) {
                            stopRingtone();
                            groupAgoraCallRef.current.leaveCall();
                            groupWebRTCRef.current.endAll();
                            setCallStatus("ENDED");
                            setTimeout(() => endCallStore(), 1500);
                        }
                        pendingIncomingGroupVideoUpgradeRequesterIdRef.current =
                            null;
                        setIncomingGroupVideoUpgradeRequest(null);
                        shouldAutoEnableCameraForRequesterRef.current.clear();
                        break;
                    }

                    // If we haven't joined yet (still on the incoming call screen), the call was
                    // cancelled by the initiator before we answered — just dismiss the overlay.
                    const currentIncoming =
                        useCallStore.getState().incomingGroupCall;
                    const currentStatus = useCallStore.getState().callStatus;
                    if (currentIncoming && currentStatus === "RINGING") {
                        stopRingtone();
                        endCallStore();
                        break;
                    }

                    groupWebRTCRef.current.removePeer(leavingId);
                    removeGroupParticipant(leavingId);

                    // Auto-end call when no remote peers remain
                    const remainingPeerCount = Object.keys(
                        useCallStore.getState().groupParticipantInfo,
                    ).filter((peerId) => peerId !== leavingId).length;
                    if (remainingPeerCount === 0) {
                        cancelPendingGroupVideoUpgradeDecision(
                            "Group call ended before video upgrade completed.",
                        );
                        pendingIncomingGroupVideoUpgradeRequesterIdRef.current =
                            null;
                        setIncomingGroupVideoUpgradeRequest(null);
                        shouldAutoEnableCameraForRequesterRef.current.clear();
                        stopRingtone();
                        groupAgoraCallRef.current.leaveCall();
                        groupWebRTCRef.current.endAll();
                        setCallStatus("ENDED");
                        setTimeout(() => endCallStore(), 1500);
                    }
                    break;
                }

                default:
                    break;
            }
        },
        [
            user,
            setCallStatus,
            setOutgoingCallTarget,
            setIncomingGroupCall,
            setGroupParticipantInfo,
            removeGroupParticipant,
            endCallStore,
            playRingtone,
            stopRingtone,
            setGroupCallRealtimeState,
            resolveGroupVideoUpgradeDecision,
            setIncomingGroupVideoUpgradeRequest,
            cancelPendingGroupVideoUpgradeDecision,
            setCameraOff,
            upgradeCall,
        ],
    );

    useEffect(() => {
        handleSignalRef.current = handleSignal;
    }, [handleSignal]);

    const initiateGroupCall = useCallback(
        async (
            conversationId: string,
            type: CallType,
            groupName: string,
            participantCount: number,
            inviteeIds?: string[],
            groupAvatarUrl?: string | null,
        ) => {
            if (!user) return;

            const client = socketService.getClient();
            if (!client?.connected) return;

            try {
                setOutgoingCallTarget({
                    name: groupName,
                    type,
                    avatarUrl: groupAvatarUrl ?? undefined,
                });
                const callId = generateCallId();
                const { hasLocalVideoTrack } =
                    await groupAgoraCallRef.current.joinCall({
                        conversationId,
                        callId,
                        type,
                    });
                setCameraOff(!hasLocalVideoTrack);

                const session: CallSession = {
                    callId,
                    conversationId,
                    initiatorId: user.id,
                    participants: [user.id],
                    type,
                    status: "RINGING",
                    isGroup: true,
                    mediaProvider: "AGORA",
                };
                setGroupCallRealtimeState(callId, false, 1);
                startGroupCall(session);

                client.publish({
                    destination: "/app/call.group.initiate",
                    body: JSON.stringify({
                        type: "GROUP_INITIATE",
                        callId,
                        senderId: user.id,
                        payload: {
                            conversationId,
                            callType: type,
                            mediaProvider: "AGORA",
                            initiatorName: user.displayName,
                            initiatorAvatar: user.avatarUrl ?? null,
                            groupName,
                            groupAvatarUrl: groupAvatarUrl ?? null,
                            participantCount,
                            inviteeIds: inviteeIds ?? [],
                        },
                    }),
                });
            } catch (error) {
                console.error("Failed to initiate group call:", error);
                stopRingtone();
                endCallStore();
            }
        },
        [
            user,
            startGroupCall,
            endCallStore,
            setOutgoingCallTarget,
            setCameraOff,
            stopRingtone,
            setGroupCallRealtimeState,
        ],
    );

    const joinGroupCall = useCallback(
        async (accept: boolean) => {
            if (!user) return;

            const incoming = useCallStore.getState().incomingGroupCall;
            if (!incoming) return;

            const realtimeState =
                useCallStore.getState().groupCallRealtimeState[incoming.callId];
            if (realtimeState?.ended) {
                stopRingtone();
                setCallStatus("IDLE");
                setIncomingGroupCall(null);
                return;
            }

            if (!accept) {
                stopRingtone();
                setCallStatus("IDLE");
                setIncomingGroupCall(null);
                return;
            }

            const client = socketService.getClient();
            if (!client?.connected) return;

            try {
                const isAgoraGroupCall = incoming.mediaProvider === "AGORA";
                if (isAgoraGroupCall) {
                    const { hasLocalVideoTrack } =
                        await groupAgoraCallRef.current.joinCall({
                            conversationId: incoming.conversationId,
                            callId: incoming.callId,
                            type: incoming.type,
                        });
                    setCameraOff(!hasLocalVideoTrack);
                } else {
                    await groupWebRTCRef.current.initLocalStream(incoming.type);
                }

                const session: CallSession = {
                    callId: incoming.callId,
                    conversationId: incoming.conversationId,
                    initiatorId: incoming.initiatorId,
                    participants: [incoming.initiatorId, user.id],
                    type: incoming.type,
                    status: "ONGOING",
                    isGroup: true,
                    mediaProvider: incoming.mediaProvider ?? "WEBRTC",
                    startedAt: new Date().toISOString(),
                };
                stopRingtone();
                startGroupCall(session);
                setCallStatus("ONGOING");
                setGroupCallRealtimeState(
                    incoming.callId,
                    false,
                    Math.max(
                        2,
                        Object.keys(
                            useCallStore.getState().groupParticipantInfo,
                        ).length + 1,
                    ),
                );

                setGroupParticipantInfo(incoming.initiatorId, {
                    name: incoming.initiatorName,
                    avatar: incoming.initiatorAvatar,
                });

                client.publish({
                    destination: "/app/call.group.join",
                    body: JSON.stringify({
                        type: "GROUP_JOIN",
                        callId: incoming.callId,
                        senderId: user.id,
                        payload: {
                            displayName: user.displayName,
                            avatarUrl: user.avatarUrl ?? null,
                        },
                    }),
                });
            } catch (error) {
                console.error("Failed to join group call:", error);
                stopRingtone();
                endCallStore();
            }
        },
        [
            user,
            setCallStatus,
            setIncomingGroupCall,
            startGroupCall,
            setGroupParticipantInfo,
            setCameraOff,
            endCallStore,
            stopRingtone,
            setGroupCallRealtimeState,
        ],
    );

    const leaveGroupCall = useCallback(() => {
        if (!user) return;

        const client = socketService.getClient();
        const activeCall = useCallStore.getState().activeCall;
        if (activeCall && client?.connected) {
            client.publish({
                destination: "/app/call.group.signal",
                body: JSON.stringify({
                    type: "GROUP_LEAVE",
                    callId: activeCall.callId,
                    senderId: user.id,
                }),
            });
        }

        cancelPendingGroupVideoUpgradeDecision(
            "You left the group call before video upgrade completed.",
        );
        pendingIncomingGroupVideoUpgradeRequesterIdRef.current = null;
        setIncomingGroupVideoUpgradeRequest(null);
        shouldAutoEnableCameraForRequesterRef.current.clear();
        stopRingtone();
        groupAgoraCallRef.current.leaveCall();
        groupWebRTCRef.current.endAll();
        endCallStore();
    }, [
        user,
        endCallStore,
        stopRingtone,
        cancelPendingGroupVideoUpgradeDecision,
    ]);

    const upgradeGroupCallToVideo = useCallback(async (): Promise<void> => {
        if (!user)
            throw new Error("Unable to upgrade group call: user not found.");

        const activeCall = useCallStore.getState().activeCall;
        if (!activeCall || !useCallStore.getState().isGroupCall) {
            throw new Error(
                "Unable to upgrade group call: no active group call.",
            );
        }

        const client = socketService.getClient();
        if (!client?.connected) {
            throw new Error("Signaling is disconnected. Please retry.");
        }

        const peerIds = Object.keys(
            useCallStore.getState().groupParticipantInfo,
        ).filter((peerId) => peerId !== user.id);

        if (activeCall.mediaProvider === "AGORA") {
            const hasLocalVideoTrack =
                await groupAgoraCallRef.current.enableVideo();
            setCameraOff(!hasLocalVideoTrack);
            if (activeCall.type !== "VIDEO") {
                upgradeCall();
            }
            return;
        }

        const isAlreadyVideoCall = activeCall.type === "VIDEO";

        const hasLocalVideoTrack =
            await groupWebRTCRef.current.enableLocalVideoTrack();
        setCameraOff(!hasLocalVideoTrack);
        if (!isAlreadyVideoCall) {
            upgradeCall();
        }

        await Promise.all(
            peerIds.map(async (peerId) => {
                const offer =
                    await groupWebRTCRef.current.createOfferForPeer(peerId);
                client.publish({
                    destination: "/app/call.group.signal",
                    body: JSON.stringify({
                        type: "GROUP_RENEGOTIATE_OFFER",
                        callId: activeCall.callId,
                        senderId: user.id,
                        receiverId: peerId,
                        payload: { offer },
                    }),
                });
            }),
        );
    }, [user, setCameraOff, upgradeCall]);

    const isAgoraGroupCall = activeGroupCall?.mediaProvider === "AGORA";

    const groupToggleMute = (muted: boolean): void => {
        if (isAgoraGroupCall) {
            groupAgoraCallRef.current.toggleMute(muted);
            return;
        }

        groupWebRTC.toggleMute(muted);
    };

    const groupToggleCamera = (cameraOff: boolean): void => {
        if (isAgoraGroupCall) {
            void groupAgoraCallRef.current.toggleCamera().then((cameraOn) => {
                useCallStore.getState().setCameraOff(!cameraOn);
            });
            return;
        }

        groupWebRTC.toggleCamera(cameraOff);
    };

    const groupToggleSpeaker = (enabled: boolean): void => {
        if (isAgoraGroupCall) {
            groupAgoraCallRef.current.toggleSpeaker(enabled);
        }
    };

    return {
        initiateGroupCall,
        joinGroupCall,
        leaveGroupCall,
        upgradeGroupCallToVideo,
        incomingGroupVideoUpgradeRequest,
        respondToGroupVideoUpgradeRequest,
        handleGroupSignal: handleSignalRef,
        groupLocalStream: isAgoraGroupCall
            ? groupAgoraCall.localStream
            : groupWebRTC.localStream,
        groupRemoteStreams: isAgoraGroupCall
            ? groupAgoraCall.remoteStreams
            : groupWebRTC.remoteStreams,
        groupToggleMute,
        groupToggleCamera,
        groupToggleSpeaker,
    };
}
