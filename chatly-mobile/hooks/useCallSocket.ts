import { useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { socketService } from '@/services/socket.service';
import { useAuthStore } from '@/store/auth.store';
import { useCallStore } from '@/store/call.store';
import { useWebRTC } from '@/hooks/useWebRTC';
import type { CallType, CallSignal, CallSession } from '@/types/call';

/**
 * Hook xử lý signaling WebRTC qua STOMP WebSocket.
 * Subscribe /user/{userId}/queue/calls để nhận tín hiệu cuộc gọi.
 */
export function useCallSocket() {
  const user = useAuthStore((s) => s.user);
  const {
    setIncomingCall,
    setCallStatus,
    setPendingOffer,
    setRemoteParticipant,
    startCall,
    endCall: endCallStore,
  } = useCallStore();

  const webrtc = useWebRTC({
    onIceCandidate: (candidate) => {
      // Gửi ICE candidate đến peer qua STOMP
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
      // Xử lý khi kết nối WebRTC thất bại
      if (state === 'failed' || state === 'disconnected') {
        console.warn('WebRTC connection state:', state);
        handleEndCall();
      }
    },
  });

  const webrtcRef = useRef(webrtc);
  webrtcRef.current = webrtc;

  // handleSignal ref để dùng trong subscription callback mà không bị stale closure
  const handleSignalRef = useRef<((signal: CallSignal) => void) | null>(null);

  useEffect(() => {
    if (!user) return;

    const doSubscribe = () => {
      return socketService.subscribe(
        `/user/queue/calls`,
        (message) => {
          const signal = JSON.parse(message.body) as CallSignal;
          // Dùng ref để luôn gọi phiên bản mới nhất của handleSignal
          handleSignalRef.current?.(signal);
        },
      );
    };

    // Nếu socket đã connected thì subscribe ngay
    // Nếu chưa thì chờ connect xong (socketService.connect trả về Promise)
    if (socketService.isConnected()) {
      const subscription = doSubscribe();
      return () => { subscription?.unsubscribe(); };
    }

    // Chờ socket connect rồi mới subscribe
    let subscription: ReturnType<typeof socketService.subscribe> = null;
    let cancelled = false;
    AsyncStorage.getItem('access_token').then((token) => {
      if (!token || cancelled) return;
      socketService.connect(token).then(() => {
        if (!cancelled) {
          subscription = doSubscribe();
        }
      }).catch(console.error);
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Xử lý tín hiệu nhận được từ server
  const handleSignal = useCallback(
    (signal: CallSignal) => {
      switch (signal.type) {
        case 'INITIATE': {
          // Nhận cuộc gọi đến
          const payload = signal.payload as {
            callerName: string;
            callerAvatar: string | null;
            callType: CallType;
            offer: RTCSessionDescriptionInit;
          };
          // Lưu offer vào store để tránh mất khi component re-render
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
            // Đối phương chấp nhận cuộc gọi
            webrtcRef.current.handleAnswer(payload.sdp);
            setCallStatus('ONGOING');
          } else {
            // Đối phương từ chối cuộc gọi
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
          // Đối phương kết thúc cuộc gọi
          webrtcRef.current.endCall();
          setCallStatus('ENDED');
          setTimeout(() => endCallStore(), 1500);
          break;
        }

        default:
          console.warn('Unknown call signal type:', signal.type);
      }
    },
    [setPendingOffer, setIncomingCall, setCallStatus, endCallStore],
  );

  // Cập nhật ref để subscription callback luôn gọi phiên bản mới nhất
  handleSignalRef.current = handleSignal;

  // Bắt đầu cuộc gọi (caller gửi offer)
  const initiateCall = useCallback(
    async (receiverId: string, conversationId: string, type: CallType, calleeName?: string, calleeAvatar?: string | null) => {
      if (!user) return;

      try {
        setCallStatus('RINGING');
        if (calleeName !== undefined) {
          setRemoteParticipant({ name: calleeName, avatar: calleeAvatar ?? null });
        }

        // startCall TRƯỚC initLocalStream để activeCall được set
        // trước khi ICE candidates bắt đầu fire
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
        setCallStatus('RINGING'); // override 'ONGOING' từ startCall về RINGING

        // Khởi tạo local stream và tạo offer
        await webrtcRef.current.initLocalStream(type);
        const offer = await webrtcRef.current.createOffer();

        // Gửi tín hiệu INITIATE qua STOMP
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

  // Trả lời cuộc gọi (accept hoặc reject)
  const answerCall = useCallback(
    async (accept: boolean) => {
      if (!user) return;

      const incoming = useCallStore.getState().incomingCall;
      if (!incoming) return;

      if (accept) {
        try {
          // startCall TRƯỚC initLocalStream để activeCall được set
          // trước khi ICE candidates bắt đầu fire
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

          // Chấp nhận: khởi tạo stream, tạo answer từ offer đã lưu trong store
          await webrtcRef.current.initLocalStream(incoming.type);

          const pendingOffer = useCallStore.getState().pendingOffer;
          if (!pendingOffer) {
            console.error('No pending offer found');
            endCallStore();
            return;
          }

          const answer = await webrtcRef.current.createAnswer(pendingOffer);
          setPendingOffer(null);

          // Gửi answer chấp nhận
          socketService.publish('/app/call.answer', {
            type: 'ANSWER',
            callId: incoming.callId,
            senderId: user.id,
            receiverId: incoming.callerId,
            payload: { accepted: true, sdp: answer },
          });
          // incomingCall giữ nguyên → ActiveCallOverlay dùng remoteParticipant
        } catch (error) {
          console.error('Failed to answer call:', error);
          endCallStore(); // endCallStore tự reset incomingCall
          return;
        }
      } else {
        // Từ chối cuộc gọi
        setPendingOffer(null);

        socketService.publish('/app/call.answer', {
          type: 'ANSWER',
          callId: incoming.callId,
          senderId: user.id,
          receiverId: incoming.callerId,
          payload: { accepted: false },
        });

        setCallStatus('REJECTED');
        setIncomingCall(null); // chỉ clear khi reject
        setTimeout(() => endCallStore(), 1000);
      }
    },
    [user, setIncomingCall, setCallStatus, setPendingOffer, startCall, endCallStore],
  );

  // Kết thúc cuộc gọi đang diễn ra
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

    webrtcRef.current.endCall();
    setCallStatus('ENDED');
    setTimeout(() => endCallStore(), 1500);
  }, [user, setCallStatus, endCallStore]);

  return {
    initiateCall,
    answerCall,
    endCall: handleEndCall,
    localStream: webrtc.localStream,
    remoteStream: webrtc.remoteStream,
    toggleMute: webrtc.toggleMute,
    toggleCamera: webrtc.toggleCamera,
  };
}

function generateCallId(): string {
  return `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
