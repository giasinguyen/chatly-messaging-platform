import { create } from 'zustand';
import type { CallStatus, CallSession, IncomingCall, Participant } from '@/types/call';

type CallStoreStatus = CallStatus | 'IDLE';

interface CallState {
  callStatus: CallStoreStatus;
  incomingCall: IncomingCall | null;
  activeCall: CallSession | null;
  pendingOffer: RTCSessionDescriptionInit | null;
  remoteParticipant: { name: string; avatar: string | null } | null;
  participants: Participant[];
  isMuted: boolean;
  isCameraOff: boolean;
  callDuration: number;

  setIncomingCall: (call: IncomingCall | null) => void;
  setCallStatus: (status: CallStoreStatus) => void;
  setPendingOffer: (offer: RTCSessionDescriptionInit | null) => void;
  setRemoteParticipant: (participant: { name: string; avatar: string | null } | null) => void;
  startCall: (session: CallSession) => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  setParticipants: (participants: Participant[]) => void;
  incrementDuration: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  callStatus: 'IDLE',
  incomingCall: null,
  activeCall: null,
  pendingOffer: null,
  remoteParticipant: null,
  participants: [],
  isMuted: false,
  isCameraOff: false,
  callDuration: 0,

  setIncomingCall: (call) => set({ incomingCall: call }),

  setCallStatus: (status) => set({ callStatus: status }),

  setPendingOffer: (offer) => set({ pendingOffer: offer }),

  setRemoteParticipant: (participant) => set({ remoteParticipant: participant }),

  startCall: (session) =>
    set({
      activeCall: session,
      callStatus: 'ONGOING',
      callDuration: 0,
      isMuted: false,
      isCameraOff: false,
    }),

  endCall: () =>
    set({
      callStatus: 'IDLE',
      incomingCall: null,
      activeCall: null,
      pendingOffer: null,
      remoteParticipant: null,
      participants: [],
      isMuted: false,
      isCameraOff: false,
      callDuration: 0,
    }),

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

  toggleCamera: () => set((state) => ({ isCameraOff: !state.isCameraOff })),

  setParticipants: (participants) => set({ participants }),

  incrementDuration: () =>
    set((state) => ({ callDuration: state.callDuration + 1 })),
}));
