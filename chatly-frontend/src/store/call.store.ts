import { create } from "zustand";
import type { CallStatus, CallSession, IncomingCall, IncomingGroupCall, GroupParticipantInfo, Participant } from "@/types/call";

type CallStoreStatus = CallStatus | "IDLE";

export interface OutgoingCallTarget {
    name: string;
    avatarUrl?: string;
    type: "VOICE" | "VIDEO";
}

interface CallState {
    // 1-1 call state
    callStatus: CallStoreStatus;
    incomingCall: IncomingCall | null;
    activeCall: CallSession | null;
    outgoingCallTarget: OutgoingCallTarget | null;
    pendingOffer: RTCSessionDescriptionInit | null;
    participants: Participant[];
    isMuted: boolean;
    isCameraOff: boolean;
    callDuration: number;

    // Group call state
    isGroupCall: boolean;
    incomingGroupCall: IncomingGroupCall | null;
    groupParticipantInfo: Record<string, GroupParticipantInfo>;
    lastEndedGroupCallId: string | null;

    // 1-1 actions
    setIncomingCall: (call: IncomingCall | null) => void;
    setCallStatus: (status: CallStoreStatus) => void;
    setOutgoingCallTarget: (target: OutgoingCallTarget | null) => void;
    setPendingOffer: (offer: RTCSessionDescriptionInit | null) => void;
    startCall: (session: CallSession) => void;
    endCall: () => void;
    toggleMute: () => void;
    toggleCamera: () => void;
    setCameraOff: (val: boolean) => void;
    upgradeCall: () => void;
    setParticipants: (participants: Participant[]) => void;
    incrementDuration: () => void;

    // Group call actions
    setIncomingGroupCall: (call: IncomingGroupCall | null) => void;
    startGroupCall: (session: CallSession) => void;
    setGroupParticipantInfo: (userId: string, info: GroupParticipantInfo) => void;
    removeGroupParticipant: (userId: string) => void;
}

export const useCallStore = create<CallState>((set) => ({
    // 1-1 initial state
    callStatus: "IDLE",
    incomingCall: null,
    activeCall: null,
    outgoingCallTarget: null,
    pendingOffer: null,
    participants: [],
    isMuted: false,
    isCameraOff: false,
    callDuration: 0,

    // Group initial state
    isGroupCall: false,
    incomingGroupCall: null,
    groupParticipantInfo: {},
    lastEndedGroupCallId: null,

    setIncomingCall: (call) => set({ incomingCall: call }),

    setCallStatus: (status) => set({ callStatus: status }),

    setOutgoingCallTarget: (target) => set({ outgoingCallTarget: target }),

    setPendingOffer: (offer) => set({ pendingOffer: offer }),

    startCall: (session) =>
        set({
            activeCall: session,
            callStatus: "ONGOING",
            isGroupCall: false,
            callDuration: 0,
            isMuted: false,
            isCameraOff: false,
        }),

    endCall: () =>
        set((state) => ({
            callStatus: "IDLE",
            incomingCall: null,
            incomingGroupCall: null,
            lastEndedGroupCallId: state.isGroupCall ? (state.activeCall?.callId ?? null) : state.lastEndedGroupCallId,
            activeCall: null,
            outgoingCallTarget: null,
            pendingOffer: null,
            participants: [],
            isGroupCall: false,
            groupParticipantInfo: {},
            isMuted: false,
            isCameraOff: false,
            callDuration: 0,
        })),

    toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

    toggleCamera: () => set((state) => ({ isCameraOff: !state.isCameraOff })),

    setCameraOff: (val) => set({ isCameraOff: val }),

    upgradeCall: () =>
        set((state) =>
            state.activeCall
                ? { activeCall: { ...state.activeCall, type: "VIDEO" } }
                : {},
        ),

    setParticipants: (participants) => set({ participants }),

    incrementDuration: () =>
        set((state) => ({ callDuration: state.callDuration + 1 })),

    // Group call actions
    setIncomingGroupCall: (call) => set({ incomingGroupCall: call }),

    startGroupCall: (session) =>
        set({
            activeCall: session,
            callStatus: "RINGING",
            isGroupCall: true,
            incomingGroupCall: null,
            callDuration: 0,
            isMuted: false,
            isCameraOff: session.type !== "VIDEO",
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
}));
