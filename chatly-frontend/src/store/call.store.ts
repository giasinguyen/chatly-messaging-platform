import { create } from "zustand";
import type { CallStatus, CallSession, IncomingCall, Participant } from "@/types/call";

type CallStoreStatus = CallStatus | "IDLE";

export interface OutgoingCallTarget {
    name: string;
    avatarUrl?: string;
    type: "VOICE" | "VIDEO";
}

interface CallState {
    callStatus: CallStoreStatus;
    incomingCall: IncomingCall | null;
    activeCall: CallSession | null;
    outgoingCallTarget: OutgoingCallTarget | null;
    pendingOffer: RTCSessionDescriptionInit | null;
    participants: Participant[];
    isMuted: boolean;
    isCameraOff: boolean;
    callDuration: number;

    setIncomingCall: (call: IncomingCall | null) => void;
    setCallStatus: (status: CallStoreStatus) => void;
    setOutgoingCallTarget: (target: OutgoingCallTarget | null) => void;
    setPendingOffer: (offer: RTCSessionDescriptionInit | null) => void;
    startCall: (session: CallSession) => void;
    endCall: () => void;
    toggleMute: () => void;
    toggleCamera: () => void;
    upgradeCall: () => void;
    setParticipants: (participants: Participant[]) => void;
    incrementDuration: () => void;
}

export const useCallStore = create<CallState>((set) => ({
    callStatus: "IDLE",
    incomingCall: null,
    activeCall: null,
    outgoingCallTarget: null,
    pendingOffer: null,
    participants: [],
    isMuted: false,
    isCameraOff: false,
    callDuration: 0,

    setIncomingCall: (call) => set({ incomingCall: call }),

    setCallStatus: (status) => set({ callStatus: status }),

    setOutgoingCallTarget: (target) => set({ outgoingCallTarget: target }),

    setPendingOffer: (offer) => set({ pendingOffer: offer }),

    startCall: (session) =>
        set({
            activeCall: session,
            callStatus: "ONGOING",
            callDuration: 0,
            isMuted: false,
            isCameraOff: false,
        }),

    endCall: () =>
        set({
            callStatus: "IDLE",
            incomingCall: null,
            activeCall: null,
            outgoingCallTarget: null,
            pendingOffer: null,
            participants: [],
            isMuted: false,
            isCameraOff: false,
            callDuration: 0,
        }),

    toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

    toggleCamera: () => set((state) => ({ isCameraOff: !state.isCameraOff })),

    upgradeCall: () =>
        set((state) =>
            state.activeCall
                ? { activeCall: { ...state.activeCall, type: "VIDEO" } }
                : {},
        ),

    setParticipants: (participants) => set({ participants }),

    incrementDuration: () =>
        set((state) => ({ callDuration: state.callDuration + 1 })),
}));
