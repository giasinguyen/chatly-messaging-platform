import { useCallback, useRef } from 'react';
import { socketService } from '@/services/socket.service';
import { useAuthStore } from '@/store/auth.store';
import { useCallStore } from '@/store/call.store';
import { useAgoraGroupCall } from '@/hooks/useAgoraGroupCall';
import type { CallType, CallSignal, CallSession, IncomingGroupCall } from '@/types/call';

/**
 * Manages group call signaling via STOMP WebSocket using Agora as the media provider.
 * Subscribes to /user/queue/calls and processes GROUP_* signal types.
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
    setRemoteParticipant,
    setCameraOff,
    upgradeCall,
    setGroupCallRealtimeState,
  } = useCallStore();

  const playRingtone = useCallback(() => {}, []);
  const stopRingtone = useCallback(() => {}, []);

  const groupAgoraCall = useAgoraGroupCall();
  const groupAgoraCallRef = useRef(groupAgoraCall);
  groupAgoraCallRef.current = groupAgoraCall;

  const handleSignalRef = useRef<((signal: CallSignal) => void) | null>(null);

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
            agoraUid?: number | null;
          };
          const incoming: IncomingGroupCall = {
            callId: signal.callId,
            conversationId: p.conversationId,
            initiatorId: signal.senderId,
            initiatorName: p.initiatorName,
            initiatorAvatar: p.initiatorAvatar ?? null,
            initiatorAgoraUid: p.agoraUid ?? null,
            groupName: p.groupName,
            groupAvatarUrl: p.groupAvatarUrl ?? null,
            type: p.callType,
            mediaProvider: 'AGORA',
            participantCount: p.participantCount,
          };
          setGroupCallRealtimeState(signal.callId, false, 1);
          setIncomingGroupCall(incoming);
          setCallStatus('RINGING');
          playRingtone();
          break;
        }

        case 'GROUP_JOIN': {
          const newPeerId = signal.senderId;
          if (!user || newPeerId === user.id) break;

          const p = signal.payload as {
            displayName?: string;
            avatarUrl?: string | null;
            agoraUid?: number | null;
          };
          setGroupParticipantInfo(newPeerId, {
            name: p.displayName ?? newPeerId,
            avatar: p.avatarUrl ?? null,
            agoraUid: p.agoraUid ?? null,
          });
          const knownRemoteCount = Object.keys(useCallStore.getState().groupParticipantInfo).length;
          setGroupCallRealtimeState(signal.callId, false, Math.max(2, knownRemoteCount + 1));

          const currentStatus = useCallStore.getState().callStatus;
          if (currentStatus === 'RINGING') {
            stopRingtone();
            setCallStatus('ONGOING');
            setRemoteParticipant(null);
          }
          break;
        }

        case 'GROUP_LEAVE': {
          const leavingId = signal.senderId;

          const leavePayload = signal.payload as
            | {
                callEnded?: unknown;
                activeParticipantCount?: unknown;
              }
            | undefined;

          const isCallEnded = leavePayload?.callEnded === true || leavingId === 'system';
          const activeParticipantCount =
            typeof leavePayload?.activeParticipantCount === 'number'
              ? leavePayload.activeParticipantCount
              : isCallEnded
                ? 0
                : Math.max(1, Object.keys(useCallStore.getState().groupParticipantInfo).length);

          setGroupCallRealtimeState(signal.callId, isCallEnded, activeParticipantCount);

          if (isCallEnded) {
            const currentIncoming = useCallStore.getState().incomingGroupCall;
            const activeCall = useCallStore.getState().activeCall;
            if (
              (currentIncoming && currentIncoming.callId === signal.callId) ||
              (activeCall && activeCall.callId === signal.callId)
            ) {
              stopRingtone();
              groupAgoraCallRef.current.leaveCall();
              endCallStore();
            }
            break;
          }

          const currentIncoming = useCallStore.getState().incomingGroupCall;
          const currentStatus = useCallStore.getState().callStatus;
          if (currentIncoming && currentStatus === 'RINGING') {
            stopRingtone();
            endCallStore();
            break;
          }

          removeGroupParticipant(leavingId);
          break;
        }

        default:
          break;
      }
    },
    [
      user,
      setCallStatus,
      setRemoteParticipant,
      setGroupCallRealtimeState,
      setIncomingGroupCall,
      setGroupParticipantInfo,
      removeGroupParticipant,
      endCallStore,
      playRingtone,
      stopRingtone,
    ]
  );

  handleSignalRef.current = handleSignal;

  const initiateGroupCall = useCallback(
    async (
      conversationId: string,
      type: CallType,
      groupName: string,
      participantCount: number,
      inviteeIds?: string[],
      groupAvatarUrl?: string | null
    ) => {
      if (!user) return;

      try {
        if (!socketService.isConnected()) {
          throw new Error('Signaling is disconnected. Please retry.');
        }

        setRemoteParticipant({ name: groupName, avatar: null });
        const callId = generateCallId();
        const { hasLocalVideoTrack } = await groupAgoraCallRef.current.joinCall({
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
          status: 'RINGING',
          isGroup: true,
          mediaProvider: 'AGORA',
        };
        setGroupCallRealtimeState(callId, false, 1);
        startGroupCall(session);
        setCallStatus('RINGING');

        const isPublished = socketService.publish('/app/call.group.initiate', {
          type: 'GROUP_INITIATE',
          callId,
          senderId: user.id,
          payload: {
            conversationId,
            callType: type,
            mediaProvider: 'AGORA',
            initiatorName: user.displayName,
            initiatorAvatar: user.avatarUrl ?? null,
            groupName,
            groupAvatarUrl: groupAvatarUrl ?? null,
            participantCount,
            inviteeIds: inviteeIds ?? [],
            agoraUid: groupAgoraCallRef.current.localUid,
          },
        });

        if (!isPublished) {
          throw new Error('Signaling is disconnected. Please retry.');
        }
      } catch (error) {
        console.error('Failed to initiate group call:', error);
        groupAgoraCallRef.current.leaveCall();
        stopRingtone();
        endCallStore();
      }
    },
    [
      user,
      setCallStatus,
      setRemoteParticipant,
      startGroupCall,
      endCallStore,
      stopRingtone,
      setGroupCallRealtimeState,
      setCameraOff,
    ]
  );

  const joinGroupCall = useCallback(
    async (accept: boolean) => {
      if (!user) return;

      const incoming = useCallStore.getState().incomingGroupCall;
      if (!incoming) return;

      const realtimeState = useCallStore.getState().groupCallRealtimeState[incoming.callId];
      if (realtimeState?.ended) {
        stopRingtone();
        setCallStatus('IDLE');
        setIncomingGroupCall(null);
        return;
      }

      if (!accept) {
        stopRingtone();
        setCallStatus('IDLE');
        setIncomingGroupCall(null);
        return;
      }

      try {
        if (!socketService.isConnected()) {
          throw new Error('Signaling is disconnected. Please retry.');
        }

        stopRingtone();
        const { hasLocalVideoTrack } = await groupAgoraCallRef.current.joinCall({
          conversationId: incoming.conversationId,
          callId: incoming.callId,
          type: incoming.type,
        });
        setCameraOff(!hasLocalVideoTrack);

        const session: CallSession = {
          callId: incoming.callId,
          conversationId: incoming.conversationId,
          initiatorId: incoming.initiatorId,
          participants: [incoming.initiatorId, user.id],
          type: incoming.type,
          status: 'ONGOING',
          isGroup: true,
          mediaProvider: 'AGORA',
          startedAt: new Date().toISOString(),
        };
        startGroupCall(session);
        setGroupCallRealtimeState(
          incoming.callId,
          false,
          Math.max(2, Object.keys(useCallStore.getState().groupParticipantInfo).length + 1)
        );
        setIncomingGroupCall(null);

        setGroupParticipantInfo(incoming.initiatorId, {
          name: incoming.initiatorName,
          avatar: incoming.initiatorAvatar,
          agoraUid: incoming.initiatorAgoraUid ?? null,
        });

        const isPublished = socketService.publish('/app/call.group.join', {
          type: 'GROUP_JOIN',
          callId: incoming.callId,
          senderId: user.id,
          payload: {
            displayName: user.displayName,
            avatarUrl: user.avatarUrl ?? null,
            agoraUid: groupAgoraCallRef.current.localUid,
          },
        });

        if (!isPublished) {
          throw new Error('Signaling is disconnected. Please retry.');
        }
      } catch (error) {
        console.error('Failed to join group call:', error);
        groupAgoraCallRef.current.leaveCall();
        endCallStore();
      }
    },
    [
      user,
      setCallStatus,
      setIncomingGroupCall,
      startGroupCall,
      setGroupParticipantInfo,
      endCallStore,
      stopRingtone,
      setGroupCallRealtimeState,
      setCameraOff,
    ]
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
    groupAgoraCallRef.current.leaveCall();
    endCallStore();
  }, [user, endCallStore, stopRingtone]);

  const upgradeGroupCallToVideo = useCallback(async (): Promise<void> => {
    if (!user) throw new Error('Unable to upgrade group call: user not found.');

    const activeCall = useCallStore.getState().activeCall;
    if (!activeCall || !useCallStore.getState().isGroupCall) {
      throw new Error('Unable to upgrade group call: no active group call.');
    }

    if (!socketService.isConnected()) {
      throw new Error('Signaling is disconnected. Please retry.');
    }

    const hasLocalVideoTrack = await groupAgoraCallRef.current.enableVideo();
    setCameraOff(!hasLocalVideoTrack);
    if (activeCall.type !== 'VIDEO') {
      upgradeCall();
    }
  }, [user, setCameraOff, upgradeCall]);

  const isAgoraGroupCall =
    activeGroupCall?.isGroup === true && activeGroupCall.mediaProvider === 'AGORA';

  const groupToggleMute = useCallback((muted: boolean): void => {
    groupAgoraCallRef.current.toggleMute(muted);
  }, []);

  const groupToggleCamera = useCallback((cameraOff: boolean): void => {
    groupAgoraCallRef.current
      .toggleCamera(cameraOff)
      .then((cameraOn) => useCallStore.getState().setCameraOff(!cameraOn))
      .catch(console.error);
  }, []);

  const groupToggleSpeaker = useCallback(
    (enabled: boolean): void => {
      if (isAgoraGroupCall) {
        groupAgoraCallRef.current.toggleSpeaker(enabled);
      }
    },
    [isAgoraGroupCall]
  );

  return {
    initiateGroupCall,
    joinGroupCall,
    leaveGroupCall,
    upgradeGroupCallToVideo,
    handleGroupSignal: handleSignalRef,
    groupLocalStream: null,
    groupRemoteStreams: {},
    groupAgoraLocalUid: groupAgoraCall.localUid,
    groupAgoraHasLocalVideo: groupAgoraCall.hasLocalVideo,
    groupAgoraRemoteUids: groupAgoraCall.remoteUids,
    groupAgoraRemoteVideoUids: groupAgoraCall.remoteVideoUids,
    groupAgoraRemoteVideoKey: groupAgoraCall.remoteVideoKey,
    groupToggleMute,
    groupToggleCamera,
    groupToggleSpeaker,
  };
}

function generateCallId(): string {
  return `gcall_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
