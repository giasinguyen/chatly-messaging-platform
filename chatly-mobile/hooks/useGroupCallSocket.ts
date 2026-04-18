import { useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { socketService } from '@/services/socket.service';
import { useAuthStore } from '@/store/auth.store';
import { useCallStore } from '@/store/call.store';
import { useGroupWebRTC } from '@/hooks/useGroupWebRTC';
import type { CallType, CallSignal, CallSession, IncomingGroupCall } from '@/types/call';

/**
 * Manages group call signaling via STOMP WebSocket using full-mesh WebRTC topology.
 * Every participant creates a peer connection to every other participant.
 * Subscribes to /user/queue/calls and processes GROUP_* signal types.
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
    setRemoteParticipant,
  } = useCallStore();

  // Ringtone is best-effort — no-op when sound asset is unavailable.
  const playRingtone = useCallback(() => {}, []);
  const stopRingtone = useCallback(() => {}, []);

  const groupWebRTC = useGroupWebRTC({
    onIceCandidate: (peerId, candidate) => {
      const activeCall = useCallStore.getState().activeCall;
      if (!activeCall || !user) return;
      socketService.publish('/app/call.group.signal', {
        type: 'ICE_CANDIDATE',
        callId: activeCall.callId,
        senderId: user.id,
        receiverId: peerId,
        payload: { candidate },
      });
    },
    onPeerConnectionFailed: (peerId) => {
      groupWebRTC.removePeer(peerId);
      removeGroupParticipant(peerId);
    },
  });

  const groupWebRTCRef = useRef(groupWebRTC);
  groupWebRTCRef.current = groupWebRTC;

  const handleSignalRef = useRef<((signal: CallSignal) => void) | null>(null);

  useEffect(() => {
    if (!user) return;

    const doSubscribe = () =>
      socketService.subscribe('/user/queue/calls', (message) => {
        const signal = JSON.parse(message.body) as CallSignal;
        if (signal.type.startsWith('GROUP_') || isGroupIceCandidate(signal)) {
          handleSignalRef.current?.(signal);
        }
      });

    if (socketService.isConnected()) {
      const sub = doSubscribe();
      return () => { sub?.unsubscribe(); };
    }

    let sub: ReturnType<typeof socketService.subscribe> = null;
    let cancelled = false;
    AsyncStorage.getItem('access_token').then((token) => {
      if (!token || cancelled) return;
      socketService.connect(token).then(() => {
        if (!cancelled) sub = doSubscribe();
      }).catch(console.error);
    });

    return () => {
      cancelled = true;
      sub?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSignal = useCallback(
    (signal: CallSignal) => {
      switch (signal.type) {
        case 'GROUP_INITIATE': {
          const p = signal.payload as {
            initiatorName: string;
            initiatorAvatar?: string | null;
            groupName: string;
            groupAvatarUrl?: string | null;
            callType: CallType;
            participantCount: number;
            conversationId: string;
            inviteeIds?: string[];
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
          setCallStatus('RINGING');
          playRingtone();
          break;
        }

        case 'GROUP_JOIN': {
          const newPeerId = signal.senderId;
          if (!user || newPeerId === user.id) break;

          const p = signal.payload as { displayName?: string; avatarUrl?: string | null };
          setGroupParticipantInfo(newPeerId, {
            name: p.displayName ?? newPeerId,
            avatar: p.avatarUrl ?? null,
          });

          // Initiator transitions RINGING → ONGOING when first peer joins
          const currentStatus = useCallStore.getState().callStatus;
          if (currentStatus === 'RINGING') {
            stopRingtone();
            setCallStatus('ONGOING');
            setRemoteParticipant(null);
          }

          const activeCall = useCallStore.getState().activeCall;
          if (!activeCall) break;

          groupWebRTCRef.current
            .createOfferForPeer(newPeerId)
            .then((offer) => {
              socketService.publish('/app/call.group.signal', {
                type: 'GROUP_OFFER',
                callId: activeCall.callId,
                senderId: user!.id,
                receiverId: newPeerId,
                payload: {
                  offer,
                  displayName: user!.displayName,
                  avatarUrl: user!.avatarUrl ?? null,
                },
              });
            })
            .catch(console.error);
          break;
        }

        case 'GROUP_OFFER': {
          const peerId = signal.senderId;
          const p = signal.payload as { offer: RTCSessionDescriptionInit; displayName?: string; avatarUrl?: string | null };
          const activeCall = useCallStore.getState().activeCall;
          if (!activeCall || !user) break;

          // Register peer info sent alongside the offer
          if (p.displayName) {
            setGroupParticipantInfo(peerId, {
              name: p.displayName,
              avatar: p.avatarUrl ?? null,
            });
          }

          groupWebRTCRef.current.handleOfferFromPeer(peerId, p.offer).then((answer) => {
            socketService.publish('/app/call.group.signal', {
              type: 'GROUP_ANSWER',
              callId: activeCall.callId,
              senderId: user!.id,
              receiverId: peerId,
              payload: { answer },
            });
          }).catch(console.error);
          break;
        }

        case 'GROUP_ANSWER': {
          const peerId = signal.senderId;
          const p = signal.payload as { answer: RTCSessionDescriptionInit };
          groupWebRTCRef.current.handleAnswerFromPeer(peerId, p.answer).catch(console.error);
          break;
        }

        case 'ICE_CANDIDATE': {
          // Group ICE candidate (routed when isGroupCall is true)
          if (!useCallStore.getState().isGroupCall) break;
          const p = signal.payload as { candidate: RTCIceCandidateInit };
          if (p.candidate) {
            groupWebRTCRef.current.addIceCandidateForPeer(signal.senderId, p.candidate).catch(console.error);
          }
          break;
        }

        case 'GROUP_LEAVE': {
          const leavingId = signal.senderId;
          groupWebRTCRef.current.removePeer(leavingId);
          removeGroupParticipant(leavingId);

          // Auto-end when no remote peers remain (only current user left)
          const remaining = Object.keys(useCallStore.getState().groupParticipantInfo);
          if (remaining.length === 0) {
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
    [user, setCallStatus, setRemoteParticipant, setIncomingGroupCall, setGroupParticipantInfo, removeGroupParticipant, endCallStore, playRingtone, stopRingtone],
  );

  handleSignalRef.current = handleSignal;

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

      try {
        setRemoteParticipant({ name: groupName, avatar: null });
        await groupWebRTCRef.current.initLocalStream(type);

        const callId = generateCallId();
        const session: CallSession = {
          callId,
          conversationId,
          initiatorId: user.id,
          participants: [user.id],
          type,
          status: 'RINGING',
          isGroup: true,
        };
        startGroupCall(session);
        setCallStatus('RINGING');

        socketService.publish('/app/call.group.initiate', {
          type: 'GROUP_INITIATE',
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
        });
      } catch (error) {
        console.error('Failed to initiate group call:', error);
        stopRingtone();
        endCallStore();
      }
    },
    [user, setCallStatus, setRemoteParticipant, startGroupCall, endCallStore, stopRingtone],
  );

  const joinGroupCall = useCallback(
    async (accept: boolean) => {
      if (!user) return;

      const incoming = useCallStore.getState().incomingGroupCall;
      if (!incoming) return;

      if (!accept) {
        stopRingtone();
        setCallStatus('IDLE');
        setIncomingGroupCall(null);
        return;
      }

      try {
        stopRingtone();
        await groupWebRTCRef.current.initLocalStream(incoming.type);

        const session: CallSession = {
          callId: incoming.callId,
          conversationId: incoming.conversationId,
          initiatorId: incoming.initiatorId,
          participants: [incoming.initiatorId, user.id],
          type: incoming.type,
          status: 'ONGOING',
          isGroup: true,
          startedAt: new Date().toISOString(),
        };
        startGroupCall(session);
        setIncomingGroupCall(null);

        // Register initiator info
        setGroupParticipantInfo(incoming.initiatorId, {
          name: incoming.initiatorName,
          avatar: incoming.initiatorAvatar,
        });

        socketService.publish('/app/call.group.join', {
          type: 'GROUP_JOIN',
          callId: incoming.callId,
          senderId: user.id,
          payload: {
            displayName: user.displayName,
            avatarUrl: user.avatarUrl ?? null,
          },
        });
      } catch (error) {
        console.error('Failed to join group call:', error);
        endCallStore();
      }
    },
    [user, setCallStatus, setIncomingGroupCall, startGroupCall, setGroupParticipantInfo, endCallStore, stopRingtone],
  );

  const leaveGroupCall = useCallback(() => {
    if (!user) return;

    const activeCall = useCallStore.getState().activeCall;
    if (activeCall) {
      socketService.publish('/app/call.group.signal', {
        type: 'GROUP_LEAVE',
        callId: activeCall.callId,
        senderId: user.id,
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
    groupLocalStream: groupWebRTC.localStream,
    groupRemoteStreams: groupWebRTC.remoteStreams,
    groupToggleMute: groupWebRTC.toggleMute,
    groupToggleCamera: groupWebRTC.toggleCamera,
  };
}

function isGroupIceCandidate(signal: CallSignal): boolean {
  return signal.type === 'ICE_CANDIDATE' && useCallStore.getState().isGroupCall;
}

function generateCallId(): string {
  return `gcall_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
