import { create } from 'zustand';
import type { CallStatus, CallSession, IncomingCall, IncomingGroupCall, GroupParticipantInfo, Participant } from '@/types/call';

type CallStoreStatus = CallStatus | 'IDLE';

export interface GroupCallRealtimeState {
  ended: boolean;
  activeParticipantCount: number;
  updatedAt: number;
}

interface CallState {
  // --- 1-1 call state ---
  callStatus: CallStoreStatus;
  incomingCall: IncomingCall | null;
  activeCall: CallSession | null;
  pendingOffer: RTCSessionDescriptionInit | null;
  remoteParticipant: { name: string; avatar: string | null } | null;
  participants: Participant[];
  isMuted: boolean;
  isCameraOff: boolean;
  callDuration: number;

  // --- Group call state ---
  isGroupCall: boolean;
  incomingGroupCall: IncomingGroupCall | null;
  groupParticipantInfo: Record<string, GroupParticipantInfo>;
  groupCallRealtimeState: Record<string, GroupCallRealtimeState>;

  // --- 1-1 actions ---
  setIncomingCall: (call: IncomingCall | null) => void;
  setCallStatus: (status: CallStoreStatus) => void;
  setPendingOffer: (offer: RTCSessionDescriptionInit | null) => void;
  setRemoteParticipant: (participant: { name: string; avatar: string | null } | null) => void;
  startCall: (session: CallSession) => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  setCameraOff: (value: boolean) => void;
  setParticipants: (participants: Participant[]) => void;
  incrementDuration: () => void;

  upgradeCall: () => void;

  // --- Group call actions ---
  setIncomingGroupCall: (call: IncomingGroupCall | null) => void;
  startGroupCall: (session: CallSession) => void;
  setGroupParticipantInfo: (userId: string, info: GroupParticipantInfo) => void;
  removeGroupParticipant: (userId: string) => void;
  setGroupCallRealtimeState: (callId: string, ended: boolean, activeParticipantCount: number) => void;
}

export const useCallStore = create<CallState>((set) => ({
  // 1-1 initial state
  callStatus: 'IDLE',
  incomingCall: null,
  activeCall: null,
  pendingOffer: null,
  remoteParticipant: null,
  participants: [],
  isMuted: false,
  isCameraOff: false,
  callDuration: 0,

  // Group initial state
  isGroupCall: false,
  incomingGroupCall: null,
  groupParticipantInfo: {},
  groupCallRealtimeState: {},

  setIncomingCall: (call) => set({ incomingCall: call }),

  setCallStatus: (status) => set({ callStatus: status }),

  setPendingOffer: (offer) => set({ pendingOffer: offer }),

  setRemoteParticipant: (participant) => set({ remoteParticipant: participant }),

  startCall: (session) =>
    set({
      activeCall: session,
      callStatus: 'ONGOING',
      isGroupCall: false,
      callDuration: 0,
      isMuted: false,
      isCameraOff: session.type !== 'VIDEO',
    }),

  endCall: () =>
    set({
      callStatus: 'IDLE',
      incomingCall: null,
      incomingGroupCall: null,
      activeCall: null,
      pendingOffer: null,
      remoteParticipant: null,
      participants: [],
      isGroupCall: false,
      groupParticipantInfo: {},
      isMuted: false,
      isCameraOff: false,
      callDuration: 0,
    }),

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

  toggleCamera: () => set((state) => ({ isCameraOff: !state.isCameraOff })),

  setCameraOff: (value) => set({ isCameraOff: value }),

  setParticipants: (participants) => set({ participants }),

  incrementDuration: () =>
    set((state) => ({ callDuration: state.callDuration + 1 })),

  upgradeCall: () =>
    set((state) =>
      state.activeCall
        ? { activeCall: { ...state.activeCall, type: 'VIDEO' } }
        : {},
    ),

  setIncomingGroupCall: (call) => set({ incomingGroupCall: call }),

  startGroupCall: (session) =>
    set({
      activeCall: session,
      callStatus: 'ONGOING',
      isGroupCall: true,
      callDuration: 0,
      isMuted: false,
      isCameraOff: session.type !== 'VIDEO',
    }),

  setGroupParticipantInfo: (userId, info) =>
    set((state) => ({
      groupParticipantInfo: { ...state.groupParticipantInfo, [userId]: info },
    })),

  removeGroupParticipant: (userId) =>
    set((state) => {
      const next = { ...state.groupParticipantInfo };
      delete next[userId];
      return { groupParticipantInfo: next };
    }),

  setGroupCallRealtimeState: (callId, ended, activeParticipantCount) =>
    set((state) => ({
      groupCallRealtimeState: {
        ...state.groupCallRealtimeState,
        [callId]: {
          ended,
          activeParticipantCount,
          updatedAt: Date.now(),
        },
      },
    })),
}));

