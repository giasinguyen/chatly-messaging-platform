import { useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { socketService } from '@/services/socket.service';
import { useAuthStore } from '@/store/auth.store';
import { useCallStore } from '@/store/call.store';
import { useAgoraMediaCall } from '@/hooks/useAgoraMediaCall';
import type { CallType, CallSignal, CallSession } from '@/types/call';

/**
 * Hook for handling 1:1 call signaling via STOMP WebSocket.
 * All media is delivered via Agora — WebRTC signaling (SDP/ICE) is no longer used.
 */
interface GroupSignalRef {
  current: ((signal: CallSignal) => void) | null;
}

export function useCallSocket(groupSignalRef?: GroupSignalRef) {
  const user = useAuthStore((s) => s.user);
  const {
    setIncomingCall,
    setCallStatus,
    setPendingOffer,
    setRemoteParticipant,
    setCameraOff,
    startCall,
    endCall: endCallStore,
    upgradeCall,
  } = useCallStore();

  const agoraMediaCall = useAgoraMediaCall();
  const agoraMediaCallRef = useRef(agoraMediaCall);
  agoraMediaCallRef.current = agoraMediaCall;

  const pendingVideoUpgradeDecisionRef = useRef<{
    resolve: (accepted: boolean) => void;
    timeoutId: ReturnType<typeof setTimeout>;
  } | null>(null);

  const resolvePendingVideoUpgradeDecision = useCallback((accepted: boolean) => {
    const pending = pendingVideoUpgradeDecisionRef.current;
    if (!pending) return;

    clearTimeout(pending.timeoutId);
    pendingVideoUpgradeDecisionRef.current = null;
    pending.resolve(accepted);
  }, []);

  const waitForVideoUpgradeDecision = useCallback((): Promise<boolean> => {
    if (pendingVideoUpgradeDecisionRef.current) {
      throw new Error('A video upgrade request is already pending.');
    }

    return new Promise<boolean>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        pendingVideoUpgradeDecisionRef.current = null;
        reject(new Error('Peer did not respond to the video call request.'));
      }, 20000);

      pendingVideoUpgradeDecisionRef.current = {
        resolve,
        timeoutId,
      };
    });
  }, []);

  const handleSignalRef = useRef<((signal: CallSignal) => void) | null>(null);

  useEffect(() => {
    if (!user) return;

    let subscription: ReturnType<typeof socketService.subscribe> = null;

    const unregister = socketService.onConnect(() => {
      subscription?.unsubscribe();
      subscription = socketService.subscribe('/user/queue/calls', (message) => {
        const signal = JSON.parse(message.body) as CallSignal;
        const shouldHandleAsGroupSignal =
          signal.type.startsWith('GROUP_') ||
          (signal.type === 'ICE_CANDIDATE' && useCallStore.getState().isGroupCall);

        if (shouldHandleAsGroupSignal) {
          groupSignalRef?.current?.(signal);
          return;
        }

        if (signal.senderId === user.id) return;
        handleSignalRef.current?.(signal);
      });
    });

    return () => {
      unregister();
      subscription?.unsubscribe();
    };
  }, [user, groupSignalRef]);

  const handleSignal = useCallback(
    (signal: CallSignal) => {
      switch (signal.type) {
        case 'INITIATE': {
          const payload = signal.payload as {
            callerName: string;
            callerAvatar: string | null;
            callType: CallType;
            conversationId: string;
          };
          setPendingOffer(null);
          setRemoteParticipant({ name: payload.callerName, avatar: payload.callerAvatar });
          setIncomingCall({
            callId: signal.callId,
            conversationId: payload.conversationId,
            callerId: signal.senderId,
            callerName: payload.callerName,
            callerAvatar: payload.callerAvatar,
            type: payload.callType,
            mediaProvider: 'AGORA',
          });
          setCallStatus('RINGING');
          break;
        }

        case 'ANSWER': {
          const payload = signal.payload as { accepted: boolean };
          if (payload.accepted) {
            const activeCall = useCallStore.getState().activeCall;
            if (activeCall) {
              agoraMediaCallRef.current
                .joinCall({
                  conversationId: activeCall.conversationId,
                  callId: activeCall.callId,
                  type: activeCall.type,
                })
                .then((result) => {
                  setCameraOff(!result.hasLocalVideo);
                  setCallStatus('ONGOING');
                })
                .catch((error: unknown) => {
                  const message =
                    error instanceof Error ? error.message : 'Unable to join the call.';
                  Alert.alert('Call Error', message);
                  endCallStore();
                });
            }
          } else {
            agoraMediaCallRef.current.leaveCall();
            setCallStatus('REJECTED');
            setTimeout(() => endCallStore(), 2000);
          }
          break;
        }

        case 'END': {
          agoraMediaCallRef.current.leaveCall();
          resolvePendingVideoUpgradeDecision(false);
          setCallStatus('ENDED');
          setTimeout(() => endCallStore(), 1500);
          break;
        }

        case 'VIDEO_UPGRADE_REQUEST': {
          const activeCall = useCallStore.getState().activeCall;
          if (!activeCall || !user) break;

          const receiverId = activeCall.participants.find((id) => id !== user.id);
          if (!receiverId) break;

          const remoteName =
            useCallStore.getState().remoteParticipant?.name ?? 'The other participant';

          Alert.alert(
            'Video call request',
            `${remoteName} wants to switch to a video call.`,
            [
              {
                text: 'Decline',
                style: 'cancel',
                onPress: () => {
                  socketService.publish('/app/call.renegotiate', {
                    type: 'VIDEO_UPGRADE_REJECT',
                    callId: activeCall.callId,
                    senderId: user.id,
                    receiverId,
                  });
                },
              },
              {
                text: 'Accept',
                onPress: async () => {
                  const hasLocalVideo = await agoraMediaCallRef.current.enableVideo();
                  setCameraOff(!hasLocalVideo);
                  upgradeCall();
                  socketService.publish('/app/call.renegotiate', {
                    type: 'VIDEO_UPGRADE_ACCEPT',
                    callId: activeCall.callId,
                    senderId: user.id,
                    receiverId,
                  });
                },
              },
            ],
            { cancelable: false }
          );
          break;
        }

        case 'VIDEO_UPGRADE_ACCEPT': {
          resolvePendingVideoUpgradeDecision(true);
          break;
        }

        case 'VIDEO_UPGRADE_REJECT': {
          resolvePendingVideoUpgradeDecision(false);
          break;
        }

        default:
          break;
      }
    },
    [
      setPendingOffer,
      setIncomingCall,
      setRemoteParticipant,
      setCallStatus,
      setCameraOff,
      endCallStore,
      upgradeCall,
      resolvePendingVideoUpgradeDecision,
      user,
    ]
  );

  handleSignalRef.current = handleSignal;

  const initiateCall = useCallback(
    async (
      receiverId: string,
      conversationId: string,
      type: CallType,
      calleeName?: string,
      calleeAvatar?: string | null
    ) => {
      if (!user) return;

      try {
        setCallStatus('RINGING');
        if (calleeName !== undefined) {
          setRemoteParticipant({ name: calleeName, avatar: calleeAvatar ?? null });
        }

        const callId = generateCallId();
        const session: CallSession = {
          callId,
          conversationId,
          initiatorId: user.id,
          participants: [user.id, receiverId],
          type,
          status: 'RINGING',
          mediaProvider: 'AGORA',
        };
        startCall(session);
        setCallStatus('RINGING');

        socketService.publish('/app/call.initiate', {
          type: 'INITIATE',
          callId,
          senderId: user.id,
          receiverId,
          payload: {
            callerName: user.displayName,
            callerAvatar: user.avatarUrl ?? null,
            callType: type,
            conversationId,
            mediaProvider: 'AGORA',
          },
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to initiate call.';
        Alert.alert('Call Error', message);
        endCallStore();
      }
    },
    [user, setCallStatus, setRemoteParticipant, startCall, endCallStore]
  );

  const answerCall = useCallback(
    async (accept: boolean) => {
      if (!user) return;

      const incoming = useCallStore.getState().incomingCall;
      if (!incoming) return;

      if (accept) {
        try {
          const session: CallSession = {
            callId: incoming.callId,
            conversationId: incoming.conversationId,
            initiatorId: incoming.callerId,
            participants: [incoming.callerId, user.id],
            type: incoming.type,
            status: 'ONGOING',
            mediaProvider: 'AGORA',
            startedAt: new Date().toISOString(),
          };
          startCall(session);

          const result = await agoraMediaCallRef.current.joinCall({
            conversationId: incoming.conversationId,
            callId: incoming.callId,
            type: incoming.type,
          });
          setCameraOff(!result.hasLocalVideo);

          socketService.publish('/app/call.answer', {
            type: 'ANSWER',
            callId: incoming.callId,
            senderId: user.id,
            receiverId: incoming.callerId,
            payload: { accepted: true },
          });
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Failed to answer call.';
          Alert.alert('Call Error', message);
          endCallStore();
        }
      } else {
        agoraMediaCallRef.current.leaveCall();
        setPendingOffer(null);

        socketService.publish('/app/call.answer', {
          type: 'ANSWER',
          callId: incoming.callId,
          senderId: user.id,
          receiverId: incoming.callerId,
          payload: { accepted: false },
        });

        setCallStatus('REJECTED');
        setIncomingCall(null);
        setTimeout(() => endCallStore(), 1000);
      }
    },
    [user, setIncomingCall, setCallStatus, setCameraOff, setPendingOffer, startCall, endCallStore]
  );

  const handleEndCall = useCallback(() => {
    if (!user) return;

    const activeCall = useCallStore.getState().activeCall;
    if (activeCall) {
      const receiverId = activeCall.participants.find((id) => id !== user.id);
      if (receiverId) {
        socketService.publish('/app/call.end', {
          type: 'END',
          callId: activeCall.callId,
          senderId: user.id,
          receiverId,
        });
      }
    }

    resolvePendingVideoUpgradeDecision(false);
    agoraMediaCallRef.current.leaveCall();
    setCallStatus('ENDED');
    setTimeout(() => endCallStore(), 1500);
  }, [user, setCallStatus, endCallStore, resolvePendingVideoUpgradeDecision]);

  const upgradeToVideo = useCallback(async (): Promise<void> => {
    if (!user) throw new Error('Unable to upgrade call: user not found.');

    const activeCall = useCallStore.getState().activeCall;
    if (!activeCall) throw new Error('Unable to upgrade call: no active call.');

    const receiverId = activeCall.participants.find((id) => id !== user.id);
    if (!receiverId) throw new Error('Unable to upgrade call: peer not found.');

    if (!socketService.isConnected()) {
      throw new Error('Signaling is disconnected. Please retry.');
    }

    if (activeCall.type !== 'VIDEO') {
      socketService.publish('/app/call.renegotiate', {
        type: 'VIDEO_UPGRADE_REQUEST',
        callId: activeCall.callId,
        senderId: user.id,
        receiverId,
      });

      const accepted = await waitForVideoUpgradeDecision();
      if (!accepted) {
        throw new Error('Peer declined the video call request.');
      }
    }

    const hasLocalVideo = await agoraMediaCallRef.current.enableVideo();
    setCameraOff(!hasLocalVideo);
    upgradeCall();
  }, [user, setCameraOff, upgradeCall, waitForVideoUpgradeDecision]);

  const toggleMute = useCallback((muted: boolean) => {
    agoraMediaCallRef.current.toggleMute(muted);
  }, []);

  const toggleCamera = useCallback(
    (cameraOff: boolean) => {
      agoraMediaCallRef.current
        .toggleCamera(cameraOff)
        .then((cameraOn) => setCameraOff(!cameraOn))
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : 'Failed to toggle camera.';
          Alert.alert('Camera Error', message);
        });
    },
    [setCameraOff]
  );

  return {
    initiateCall,
    answerCall,
    endCall: handleEndCall,
    upgradeToVideo,
    localStream: null,
    remoteStream: null,
    remoteStreamKey: 0,
    agoraLocalUid: agoraMediaCall.localUid,
    agoraRemoteUid: agoraMediaCall.remoteUid,
    agoraHasLocalVideo: agoraMediaCall.hasLocalVideo,
    agoraHasRemoteVideo: agoraMediaCall.hasRemoteVideo,
    agoraRemoteVideoKey: agoraMediaCall.remoteVideoKey,
    toggleMute,
    toggleCamera,
  };
}

function generateCallId(): string {
  return `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
