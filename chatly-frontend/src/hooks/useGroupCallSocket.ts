import { useEffect, useCallback, useRef } from "react";
import { socketService } from "@/services/socket.service";
import { useAuthStore } from "@/store/auth.store";
import { useCallStore } from "@/store/call.store";
import { useGroupWebRTC } from "@/hooks/useGroupWebRTC";
import type { CallType, CallSignal, CallSession, IncomingGroupCall } from "@/types/call";

function generateCallId(): string {
    return `gcall_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Manages group call signaling via STOMP WebSocket using full-mesh WebRTC topology.
 * Every participant creates a peer connection to every other participant.
 */
export function useGroupCallSocket() {
    const user = useAuthStore((s) => s.user);
    const {
        setCallStatus,
        setIncomingGroupCall,
        startGroupCall,
        endCall: endCallStore,
        setGroupParticipantInfo,
        removeGroupParticipant,
        setOutgoingCallTarget,
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
            groupWebRTCRef.current.removePeer(peerId);
            removeGroupParticipant(peerId);
        },
    });

    const groupWebRTCRef = useRef(groupWebRTC);
    groupWebRTCRef.current = groupWebRTC;

    const handleSignalRef = useRef<((signal: CallSignal) => void) | null>(null);

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
                        participantCount: number;
                        conversationId: string;
                    };
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
                    };
                    setIncomingGroupCall(incoming);
                    setCallStatus("RINGING");
                    playRingtone();
                    break;
                }

                case "GROUP_JOIN": {
                    const newPeerId = signal.senderId;
                    if (!user || newPeerId === user.id) break;

                    const p = signal.payload as { displayName?: string; avatarUrl?: string | null };
                    setGroupParticipantInfo(newPeerId, {
                        name: p.displayName ?? newPeerId,
                        avatar: p.avatarUrl ?? null,
                    });

                    // Transition initiator from RINGING → ONGOING when first person joins
                    const currentStatus = useCallStore.getState().callStatus;
                    if (currentStatus === "RINGING") {
                        stopRingtone();
                        setCallStatus("ONGOING");
                        setOutgoingCallTarget(null);
                    }

                    const activeCall = useCallStore.getState().activeCall;
                    if (!activeCall) break;

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
                    const p = signal.payload as { offer: RTCSessionDescriptionInit; displayName?: string; avatarUrl?: string | null };
                    if (p.displayName) {
                        setGroupParticipantInfo(peerId, {
                            name: p.displayName,
                            avatar: p.avatarUrl ?? null,
                        });
                    }
                    const activeCall = useCallStore.getState().activeCall;
                    if (!activeCall || !user) break;

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

                case "GROUP_ANSWER": {
                    const peerId = signal.senderId;
                    const p = signal.payload as { answer: RTCSessionDescriptionInit };
                    groupWebRTCRef.current.handleAnswerFromPeer(peerId, p.answer).catch(console.error);
                    break;
                }

                case "ICE_CANDIDATE": {
                    if (!useCallStore.getState().isGroupCall) break;
                    const p = signal.payload as { candidate: RTCIceCandidateInit };
                    if (p.candidate) {
                        groupWebRTCRef.current
                            .addIceCandidateForPeer(signal.senderId, p.candidate)
                            .catch(console.error);
                    }
                    break;
                }

                case "GROUP_LEAVE": {
                    const leavingId = signal.senderId;

                    // If we haven't joined yet (still on the incoming call screen), the call was
                    // cancelled by the initiator before we answered — just dismiss the overlay.
                    const currentIncoming = useCallStore.getState().incomingGroupCall;
                    const currentStatus = useCallStore.getState().callStatus;
                    if (currentIncoming && currentStatus === "RINGING") {
                        stopRingtone();
                        endCallStore();
                        break;
                    }

                    groupWebRTCRef.current.removePeer(leavingId);
                    removeGroupParticipant(leavingId);

                    // Auto-end call when no remote peers remain
                    const remainingPeers = Object.keys(useCallStore.getState().groupParticipantInfo);
                    if (remainingPeers.length === 0) {
                        stopRingtone();
                        groupWebRTCRef.current.endAll();
                        endCallStore();
                    }
                    break;
                }

                default:
                    break;
            }
        },
        [user, setCallStatus, setOutgoingCallTarget, setIncomingGroupCall, setGroupParticipantInfo, removeGroupParticipant, endCallStore, playRingtone, stopRingtone],
    );

    handleSignalRef.current = handleSignal;

    const initiateGroupCall = useCallback(
        async (conversationId: string, type: CallType, groupName: string, participantCount: number, inviteeIds?: string[], groupAvatarUrl?: string | null) => {
            if (!user) return;

            const client = socketService.getClient();
            if (!client?.connected) return;

            try {
                setOutgoingCallTarget({ name: groupName, type, avatarUrl: groupAvatarUrl ?? undefined });
                await groupWebRTCRef.current.initLocalStream(type);

                const callId = generateCallId();
                const session: CallSession = {
                    callId,
                    conversationId,
                    initiatorId: user.id,
                    participants: [user.id],
                    type,
                    status: "RINGING",
                    isGroup: true,
                };
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
        [user, setCallStatus, startGroupCall, endCallStore, setOutgoingCallTarget, stopRingtone],
    );

    const joinGroupCall = useCallback(
        async (accept: boolean) => {
            if (!user) return;

            const incoming = useCallStore.getState().incomingGroupCall;
            if (!incoming) return;

            if (!accept) {
                stopRingtone();
                setCallStatus("IDLE");
                setIncomingGroupCall(null);
                return;
            }

            const client = socketService.getClient();
            if (!client?.connected) return;

            try {
                await groupWebRTCRef.current.initLocalStream(incoming.type);

                const session: CallSession = {
                    callId: incoming.callId,
                    conversationId: incoming.conversationId,
                    initiatorId: incoming.initiatorId,
                    participants: [incoming.initiatorId, user.id],
                    type: incoming.type,
                    status: "ONGOING",
                    isGroup: true,
                    startedAt: new Date().toISOString(),
                };
                stopRingtone();
                startGroupCall(session);
                setCallStatus("ONGOING");

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
        [user, setCallStatus, setIncomingGroupCall, startGroupCall, setGroupParticipantInfo, endCallStore, stopRingtone],
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

        stopRingtone();
        groupWebRTCRef.current.endAll();
        endCallStore();
    }, [user, endCallStore, stopRingtone]);

    return {
        initiateGroupCall,
        joinGroupCall,
        leaveGroupCall,
        handleGroupSignal: handleSignalRef,
        groupLocalStream: groupWebRTC.localStream,
        groupRemoteStreams: groupWebRTC.remoteStreams,
        groupToggleMute: groupWebRTC.toggleMute,
        groupToggleCamera: groupWebRTC.toggleCamera,
    };
}

function isGroupIceCandidate(signal: CallSignal): boolean {
    return signal.type === "ICE_CANDIDATE" && useCallStore.getState().isGroupCall;
}
