import { useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
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
    setCameraOff,
    upgradeCall,
    setGroupCallRealtimeState,
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

  const pendingGroupVideoUpgradeDecisionRef = useRef<{
    remainingPeerIds: Set<string>;
    resolve: () => void;
    reject: (error: Error) => void;
    timeoutId: ReturnType<typeof setTimeout>;
  } | null>(null);

  const shouldAutoEnableCameraForRequesterRef = useRef<Set<string>>(new Set());

  const cancelPendingGroupVideoUpgradeDecision = useCallback((message: string) => {
    const pending = pendingGroupVideoUpgradeDecisionRef.current;
    if (!pending) return;

    clearTimeout(pending.timeoutId);
    pendingGroupVideoUpgradeDecisionRef.current = null;
    pending.reject(new Error(message));
  }, []);

  const resolveGroupVideoUpgradeDecision = useCallback((peerId: string, accepted: boolean) => {
    const pending = pendingGroupVideoUpgradeDecisionRef.current;
    if (!pending || !pending.remainingPeerIds.has(peerId)) return;

    if (!accepted) {
      clearTimeout(pending.timeoutId);
      pendingGroupVideoUpgradeDecisionRef.current = null;
      pending.reject(new Error('A participant declined the video call request.'));
      return;
    }

    pending.remainingPeerIds.delete(peerId);
    if (pending.remainingPeerIds.size === 0) {
      clearTimeout(pending.timeoutId);
      pendingGroupVideoUpgradeDecisionRef.current = null;
      pending.resolve();
    }
  }, []);

  const waitForGroupVideoUpgradeDecision = useCallback((peerIds: string[]): Promise<void> => {
    if (peerIds.length === 0) return Promise.resolve();

    if (pendingGroupVideoUpgradeDecisionRef.current) {
      throw new Error('A group video upgrade request is already pending.');
    }

    return new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        pendingGroupVideoUpgradeDecisionRef.current = null;
        reject(new Error('Some participants did not respond to the video call request.'));
      }, 20000);

      pendingGroupVideoUpgradeDecisionRef.current = {
        remainingPeerIds: new Set(peerIds),
        resolve,
        reject,
        timeoutId,
      };
    });
  }, []);

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
          setGroupCallRealtimeState(signal.callId, false, 1);
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
          const knownRemoteCount = Object.keys(useCallStore.getState().groupParticipantInfo).length;
          setGroupCallRealtimeState(signal.callId, false, Math.max(2, knownRemoteCount + 1));

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

        case 'GROUP_VIDEO_UPGRADE_REQUEST': {
          const activeCall = useCallStore.getState().activeCall;
          if (!activeCall || !user || signal.senderId === user.id) break;

          const requesterId = signal.senderId;
          const fallbackName = useCallStore.getState().groupParticipantInfo[requesterId]?.name ?? 'A participant';
          const payload = signal.payload as { requesterName?: unknown } | undefined;
          const requesterName =
            typeof payload?.requesterName === 'string' && payload.requesterName.trim().length > 0
              ? payload.requesterName
              : fallbackName;

          Alert.alert(
            'Video call request',
            `${requesterName} wants to upgrade this group voice call to video.`,
            [
              {
                text: 'Decline',
                style: 'cancel',
                onPress: () => {
                  shouldAutoEnableCameraForRequesterRef.current.delete(requesterId);
                  socketService.publish('/app/call.group.signal', {
                    type: 'GROUP_VIDEO_UPGRADE_REJECT',
                    callId: activeCall.callId,
                    senderId: user.id,
                    receiverId: requesterId,
                  });
                },
              },
              {
                text: 'Accept',
                onPress: () => {
                  shouldAutoEnableCameraForRequesterRef.current.add(requesterId);
                  socketService.publish('/app/call.group.signal', {
                    type: 'GROUP_VIDEO_UPGRADE_ACCEPT',
                    callId: activeCall.callId,
                    senderId: user.id,
                    receiverId: requesterId,
                  });
                },
              },
            ],
            { cancelable: false },
          );
          break;
        }

        case 'GROUP_VIDEO_UPGRADE_ACCEPT': {
          resolveGroupVideoUpgradeDecision(signal.senderId, true);
          break;
        }

        case 'GROUP_VIDEO_UPGRADE_REJECT': {
          resolveGroupVideoUpgradeDecision(signal.senderId, false);
          break;
        }

        case 'GROUP_RENEGOTIATE_OFFER': {
          const activeCall = useCallStore.getState().activeCall;
          if (!activeCall || !user) break;

          const payload = signal.payload as { offer: RTCSessionDescriptionInit };
          const shouldAutoEnable = shouldAutoEnableCameraForRequesterRef.current.has(signal.senderId);
          shouldAutoEnableCameraForRequesterRef.current.delete(signal.senderId);

          const prepareLocalVideo = shouldAutoEnable
            ? groupWebRTCRef.current
              .enableLocalVideoTrack()
              .then((enabled) => {
                setCameraOff(!enabled);
              })
              .catch((error: unknown) => {
                console.warn('Unable to auto-enable camera after accepting group upgrade:', error);
                setCameraOff(true);
              })
            : Promise.resolve();

          prepareLocalVideo
            .then(() => {
              upgradeCall();
              if (!shouldAutoEnable) {
                setCameraOff(true);
              }
              return groupWebRTCRef.current.handleOfferFromPeer(signal.senderId, payload.offer);
            })
            .then((answer) => {
              socketService.publish('/app/call.group.signal', {
                type: 'GROUP_RENEGOTIATE_ANSWER',
                callId: activeCall.callId,
                senderId: user.id,
                receiverId: signal.senderId,
                payload: { answer },
              });
            })
            .catch(console.error);
          break;
        }

        case 'GROUP_RENEGOTIATE_ANSWER': {
          const payload = signal.payload as { answer: RTCSessionDescriptionInit };
          groupWebRTCRef.current.handleAnswerFromPeer(signal.senderId, payload.answer).catch(console.error);
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

          const leavePayload = signal.payload as {
            callEnded?: unknown;
            activeParticipantCount?: unknown;
          } | undefined;

          const isCallEnded = leavePayload?.callEnded === true;
          const activeParticipantCount = typeof leavePayload?.activeParticipantCount === 'number'
            ? leavePayload.activeParticipantCount
            : (isCallEnded ? 1 : Math.max(1, Object.keys(useCallStore.getState().groupParticipantInfo).length));

          setGroupCallRealtimeState(signal.callId, isCallEnded, activeParticipantCount);

          if (pendingGroupVideoUpgradeDecisionRef.current?.remainingPeerIds.has(leavingId)) {
            cancelPendingGroupVideoUpgradeDecision('A participant left before responding to the video call request.');
          }

          if (isCallEnded) {
            const currentIncoming = useCallStore.getState().incomingGroupCall;
            const activeCall = useCallStore.getState().activeCall;
            if ((currentIncoming && currentIncoming.callId === signal.callId) || (activeCall && activeCall.callId === signal.callId)) {
              stopRingtone();
              groupWebRTCRef.current.endAll();
              endCallStore();
            }
            shouldAutoEnableCameraForRequesterRef.current.clear();
            break;
          }

          // If we haven't joined yet (still on the incoming call screen), the call was
          // cancelled by the initiator before we answered — just dismiss the overlay.
          const currentIncoming = useCallStore.getState().incomingGroupCall;
          const currentStatus = useCallStore.getState().callStatus;
          if (currentIncoming && currentStatus === 'RINGING') {
            stopRingtone();
            endCallStore();
            break;
          }

          groupWebRTCRef.current.removePeer(leavingId);
          removeGroupParticipant(leavingId);

          // Auto-end when no remote peers remain (only current user left)
          const remaining = Object.keys(useCallStore.getState().groupParticipantInfo);
          if (remaining.length === 0) {
            cancelPendingGroupVideoUpgradeDecision('Group call ended before video upgrade completed.');
            shouldAutoEnableCameraForRequesterRef.current.clear();
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
      setCameraOff,
      upgradeCall,
      resolveGroupVideoUpgradeDecision,
      cancelPendingGroupVideoUpgradeDecision,
    ],
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
        setGroupCallRealtimeState(callId, false, 1);
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
    [user, setCallStatus, setRemoteParticipant, startGroupCall, endCallStore, stopRingtone, setGroupCallRealtimeState],
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
        setGroupCallRealtimeState(incoming.callId, false, Math.max(2, Object.keys(useCallStore.getState().groupParticipantInfo).length + 1));
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
    [user, setCallStatus, setIncomingGroupCall, startGroupCall, setGroupParticipantInfo, endCallStore, stopRingtone, setGroupCallRealtimeState],
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

    cancelPendingGroupVideoUpgradeDecision('You left the group call before video upgrade completed.');
    shouldAutoEnableCameraForRequesterRef.current.clear();
    stopRingtone();
    groupWebRTCRef.current.endAll();
    endCallStore();
  }, [user, endCallStore, stopRingtone, cancelPendingGroupVideoUpgradeDecision]);

  const upgradeGroupCallToVideo = useCallback(async (): Promise<void> => {
    if (!user) throw new Error('Unable to upgrade group call: user not found.');

    const activeCall = useCallStore.getState().activeCall;
    if (!activeCall || !useCallStore.getState().isGroupCall) {
      throw new Error('Unable to upgrade group call: no active group call.');
    }

    if (!socketService.isConnected()) {
      throw new Error('Signaling is disconnected. Please retry.');
    }

    const peerIds = Object.keys(useCallStore.getState().groupParticipantInfo)
      .filter((peerId) => peerId !== user.id);

    const isAlreadyVideoCall = activeCall.type === 'VIDEO';

    if (!isAlreadyVideoCall) {
      peerIds.forEach((peerId) => {
        socketService.publish('/app/call.group.signal', {
          type: 'GROUP_VIDEO_UPGRADE_REQUEST',
          callId: activeCall.callId,
          senderId: user.id,
          receiverId: peerId,
          payload: {
            requesterName: user.displayName,
          },
        });
      });

      await waitForGroupVideoUpgradeDecision(peerIds);
    }

    const hasLocalVideoTrack = await groupWebRTCRef.current.enableLocalVideoTrack();
    setCameraOff(!hasLocalVideoTrack);
    upgradeCall();

    await Promise.all(
      peerIds.map(async (peerId) => {
        const offer = await groupWebRTCRef.current.createOfferForPeer(peerId);
        socketService.publish('/app/call.group.signal', {
          type: 'GROUP_RENEGOTIATE_OFFER',
          callId: activeCall.callId,
          senderId: user.id,
          receiverId: peerId,
          payload: { offer },
        });
      }),
    );
  }, [user, waitForGroupVideoUpgradeDecision, setCameraOff, upgradeCall]);

  return {
    initiateGroupCall,
    joinGroupCall,
    leaveGroupCall,
    upgradeGroupCallToVideo,
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
