import { useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { socketService } from '@/services/socket.service';
import { useAuthStore } from '@/store/auth.store';
import { useCallStore } from '@/store/call.store';
import { useWebRTC } from '@/hooks/useWebRTC';
import type { CallType, CallSignal, CallSession } from '@/types/call';

/**
 * Hook for handling WebRTC signaling via STOMP WebSocket.
 * Subscribes to /user/queue/calls to receive call signals.
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

  const webrtc = useWebRTC({
    onIceCandidate: (candidate) => {
      // Send ICE candidate to peer via STOMP
      const activeCall = useCallStore.getState().activeCall;
      if (!activeCall || !user) return;

      const receiverId = activeCall.participants.find((id) => id !== user.id);
      if (receiverId) {
        socketService.publish('/app/call.ice-candidate', {
          type: 'ICE_CANDIDATE',
          callId: activeCall.callId,
          senderId: user.id,
          receiverId,
          payload: { candidate },
        });
      }
    },
    onConnectionStateChange: (state) => {
      // Only treat 'failed' as a hard error — 'disconnected' can be transient during renegotiation
      if (state === 'failed') {
        console.warn('WebRTC connection failed');
        handleEndCall();
      }
    },
  });

  const webrtcRef = useRef(webrtc);
  webrtcRef.current = webrtc;

  const pendingVideoUpgradeDecisionRef = useRef<{
    resolve: (accepted: boolean) => void;
    timeoutId: ReturnType<typeof setTimeout>;
  } | null>(null);
  const shouldAutoEnableCameraOnRenegotiateRef = useRef(false);

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

  // handleSignal ref for subscription callback to avoid stale closures
  const handleSignalRef = useRef<((signal: CallSignal) => void) | null>(null);

  useEffect(() => {
    if (!user) return;

    let subscription: ReturnType<typeof socketService.subscribe> = null;

    const unregister = socketService.onConnect(() => {
      subscription?.unsubscribe();
      subscription = socketService.subscribe('/user/queue/calls', (message) => {
        const signal = JSON.parse(message.body) as CallSignal;
        const shouldHandleAsGroupSignal =
          signal.type.startsWith('GROUP_')
          || (signal.type === 'ICE_CANDIDATE' && useCallStore.getState().isGroupCall);

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

  // Handle incoming signal from server
  const handleSignal = useCallback(
    (signal: CallSignal) => {
      switch (signal.type) {
        case 'INITIATE': {
          // Incoming call
          const payload = signal.payload as {
            callerName: string;
            callerAvatar: string | null;
            callType: CallType;
            offer: RTCSessionDescriptionInit;
          };
          // Store offer in store to persist across component re-renders
          setPendingOffer(payload.offer);
          setRemoteParticipant({ name: payload.callerName, avatar: payload.callerAvatar });
          setIncomingCall({
            callId: signal.callId,
            callerId: signal.senderId,
            callerName: payload.callerName,
            callerAvatar: payload.callerAvatar,
            type: payload.callType,
          });
          setCallStatus('RINGING');
          break;
        }

        case 'ANSWER': {
          const payload = signal.payload as {
            accepted: boolean;
            sdp?: RTCSessionDescriptionInit;
          };
          if (payload.accepted && payload.sdp) {
            // Peer accepted the call
            webrtcRef.current.handleAnswer(payload.sdp);
            setCallStatus('ONGOING');
          } else {
            // Peer rejected the call
            webrtcRef.current.endCall();
            setCallStatus('REJECTED');
            setTimeout(() => endCallStore(), 2000);
          }
          break;
        }

        case 'ICE_CANDIDATE': {
          const payload = signal.payload as { candidate: RTCIceCandidateInit };
          if (payload.candidate) {
            webrtcRef.current.addIceCandidate(payload.candidate);
          }
          break;
        }

        case 'END': {
          // Peer ended the call
          webrtcRef.current.endCall();
          shouldAutoEnableCameraOnRenegotiateRef.current = false;
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

          const remoteName = useCallStore.getState().remoteParticipant?.name ?? 'The other participant';

          Alert.alert(
            'Video call request',
            `${remoteName} wants to switch to a video call.`,
            [
              {
                text: 'Decline',
                style: 'cancel',
                onPress: () => {
                  shouldAutoEnableCameraOnRenegotiateRef.current = false;
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
                onPress: () => {
                  shouldAutoEnableCameraOnRenegotiateRef.current = true;
                  socketService.publish('/app/call.renegotiate', {
                    type: 'VIDEO_UPGRADE_ACCEPT',
                    callId: activeCall.callId,
                    senderId: user.id,
                    receiverId,
                  });
                },
              },
            ],
            { cancelable: false },
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

        case 'RENEGOTIATE_OFFER': {
          // Remote is upgrading the call (e.g. voice → video)
          const renoPayload = signal.payload as { sdp: RTCSessionDescriptionInit };
          const activeCall = useCallStore.getState().activeCall;
          if (!activeCall || !user) break;

          const shouldAutoEnableCamera = shouldAutoEnableCameraOnRenegotiateRef.current;
          shouldAutoEnableCameraOnRenegotiateRef.current = false;

          if (!shouldAutoEnableCamera) {
            // If this side did not explicitly accept an upgrade request, stay camera-off by default.
            setCameraOff(true);
          }
          upgradeCall();

          const prepareLocalVideo = shouldAutoEnableCamera
            ? webrtcRef.current
              .enableLocalVideoTrack()
              .then((enabled) => {
                setCameraOff(!enabled);
              })
              .catch((error: unknown) => {
                console.warn('Unable to auto-enable camera after accepting upgrade:', error);
                setCameraOff(true);
              })
            : Promise.resolve();

          prepareLocalVideo
            .then(() => webrtcRef.current.handleRemoteDescription(renoPayload.sdp))
            .then(() => webrtcRef.current.createAnswerFromRemote())
            .then((answer) => {
              const receiverId = activeCall.participants.find((id) => id !== user.id);
              if (!receiverId) return;
              socketService.publish('/app/call.renegotiate', {
                type: 'RENEGOTIATE_ANSWER',
                callId: activeCall.callId,
                senderId: user.id,
                receiverId,
                payload: { sdp: answer },
              });
            })
            .catch((err) => console.error('Renegotiation failed:', err));
          break;
        }

        case 'RENEGOTIATE_ANSWER': {
          // Remote accepted our upgrade offer
          const renoPayload = signal.payload as { sdp: RTCSessionDescriptionInit };
          webrtcRef.current
            .handleRemoteDescription(renoPayload.sdp)
            .then(() => upgradeCall())
            .catch((err) => console.error('Renegotiation answer failed:', err));
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
    ],
  );

  // Update ref so subscription callback always calls the latest version
  handleSignalRef.current = handleSignal;

  // Initiate a call (caller sends offer)
  const initiateCall = useCallback(
    async (receiverId: string, conversationId: string, type: CallType, calleeName?: string, calleeAvatar?: string | null) => {
      if (!user) return;

      try {
        setCallStatus('RINGING');
        if (calleeName !== undefined) {
          setRemoteParticipant({ name: calleeName, avatar: calleeAvatar ?? null });
        }

        // startCall BEFORE initLocalStream so activeCall is set
        // before ICE candidates start firing
        const callId = generateCallId();
        const session: CallSession = {
          callId,
          conversationId,
          initiatorId: user.id,
          participants: [user.id, receiverId],
          type,
          status: 'RINGING',
        };
        startCall(session);
        setCallStatus('RINGING'); // override 'ONGOING' from startCall back to RINGING

        // Initialize local stream and create offer
        await webrtcRef.current.initLocalStream(type);
        const offer = await webrtcRef.current.createOffer();

        // Send INITIATE signal via STOMP
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
            offer,
          },
        });
      } catch (error) {
        console.error('Failed to initiate call:', error);
        endCallStore();
      }
    },
    [user, setCallStatus, setRemoteParticipant, startCall, endCallStore],
  );

  // Answer a call (accept or reject)
  const answerCall = useCallback(
    async (accept: boolean) => {
      if (!user) return;

      const incoming = useCallStore.getState().incomingCall;
      if (!incoming) return;

      if (accept) {
        try {
          // startCall BEFORE initLocalStream so activeCall is set
          // before ICE candidates start firing
          const session: CallSession = {
            callId: incoming.callId,
            conversationId: '',
            initiatorId: incoming.callerId,
            participants: [incoming.callerId, user.id],
            type: incoming.type,
            status: 'ONGOING',
            startedAt: new Date().toISOString(),
          };
          startCall(session);

          // Accept: initialize stream, create answer from stored offer
          await webrtcRef.current.initLocalStream(incoming.type);

          const pendingOffer = useCallStore.getState().pendingOffer;
          if (!pendingOffer) {
            console.error('No pending offer found');
            endCallStore();
            return;
          }

          const answer = await webrtcRef.current.createAnswer(pendingOffer);
          setPendingOffer(null);

          // Send accept answer
          socketService.publish('/app/call.answer', {
            type: 'ANSWER',
            callId: incoming.callId,
            senderId: user.id,
            receiverId: incoming.callerId,
            payload: { accepted: true, sdp: answer },
          });
          // incomingCall kept — ActiveCallOverlay uses remoteParticipant
        } catch (error) {
          console.error('Failed to answer call:', error);
          endCallStore(); // endCallStore auto-resets incomingCall
          return;
        }
      } else {
        // Reject the call
        setPendingOffer(null);

        socketService.publish('/app/call.answer', {
          type: 'ANSWER',
          callId: incoming.callId,
          senderId: user.id,
          receiverId: incoming.callerId,
          payload: { accepted: false },
        });

        setCallStatus('REJECTED');
        setIncomingCall(null); // only clear when rejecting
        setTimeout(() => endCallStore(), 1000);
      }
    },
    [user, setIncomingCall, setCallStatus, setPendingOffer, startCall, endCallStore],
  );

  // End an ongoing call
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

    shouldAutoEnableCameraOnRenegotiateRef.current = false;
    resolvePendingVideoUpgradeDecision(false);
    webrtcRef.current.endCall();
    setCallStatus('ENDED');
    setTimeout(() => endCallStore(), 1500);
  }, [user, setCallStatus, endCallStore, resolvePendingVideoUpgradeDecision]);

  const upgradeToVideo = useCallback(async (): Promise<void> => {
    if (!user) throw new Error('Unable to upgrade call: user not found.');

    const activeCall = useCallStore.getState().activeCall;
    if (!activeCall) throw new Error('Unable to upgrade call: no active call.');

    const receiverId = activeCall.participants.find((id) => id !== user.id);
    if (!receiverId) throw new Error('Unable to upgrade call: peer not found.');

    const connected = socketService.isConnected();
    if (!connected) {
      throw new Error('Signaling is disconnected. Please retry.');
    }

    const isAlreadyVideoCall = activeCall.type === 'VIDEO';

    if (!isAlreadyVideoCall) {
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

    const offer = await webrtcRef.current.upgradeToVideo();
    setCameraOff(false);
    upgradeCall();

    socketService.publish('/app/call.renegotiate', {
      type: 'RENEGOTIATE_OFFER',
      callId: activeCall.callId,
      senderId: user.id,
      receiverId,
      payload: { sdp: offer },
    });
  }, [user, setCameraOff, upgradeCall, waitForVideoUpgradeDecision]);

  return {
    initiateCall,
    answerCall,
    endCall: handleEndCall,
    upgradeToVideo,
    localStream: webrtc.localStream,
    remoteStream: webrtc.remoteStream,
    remoteStreamKey: webrtc.remoteStreamKey,
    toggleMute: webrtc.toggleMute,
    toggleCamera: webrtc.toggleCamera,
  };
}

function generateCallId(): string {
  return `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
