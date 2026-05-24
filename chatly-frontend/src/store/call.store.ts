import { create } from "zustand";
import type {
    CallStatus,
    CallSession,
    IncomingCall,
    IncomingGroupCall,
    GroupParticipantInfo,
    Participant,
} from "@/types/call";

type CallStoreStatus = CallStatus | "IDLE";

export interface OutgoingCallTarget {
    name: string;
    avatarUrl?: string | null;
    type: "VOICE" | "VIDEO";
}

export interface GroupCallRealtimeState {
    ended: boolean;
    activeParticipantCount: number;
    updatedAt: number;
}

interface CallState {
    // 1-1 call state
    callStatus: CallStoreStatus;
    incomingCall: IncomingCall | null;
    activeCall: CallSession | null;
    outgoingCallTarget: OutgoingCallTarget | null;
    participants: Participant[];
    isMuted: boolean;
    isCameraOff: boolean;
    callDuration: number;

    // Group call state
    isGroupCall: boolean;
    incomingGroupCall: IncomingGroupCall | null;
    groupParticipantInfo: Record<string, GroupParticipantInfo>;
    groupCallRealtimeState: Record<string, GroupCallRealtimeState>;

    // 1-1 actions
    setIncomingCall: (call: IncomingCall | null) => void;
    setCallStatus: (status: CallStoreStatus) => void;
    setOutgoingCallTarget: (target: OutgoingCallTarget | null) => void;
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
    setGroupParticipantInfo: (
        userId: string,
        info: GroupParticipantInfo,
    ) => void;
    removeGroupParticipant: (userId: string) => void;
    setGroupCallRealtimeState: (
        callId: string,
        ended: boolean,
        activeParticipantCount: number,
    ) => void;
}

export const useCallStore = create<CallState>((set) => ({
    // 1-1 initial state
    callStatus: "IDLE",
    incomingCall: null,
    activeCall: null,
    outgoingCallTarget: null,
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

    setOutgoingCallTarget: (target) => set({ outgoingCallTarget: target }),

    startCall: (session) =>
        set({
            activeCall: session,
            callStatus: "ONGOING",
            isGroupCall: false,
            callDuration: 0,
            isMuted: false,
            isCameraOff: session.type !== "VIDEO",
        }),

    endCall: () =>
        set({
            callStatus: "IDLE",
            incomingCall: null,
            incomingGroupCall: null,
            activeCall: null,
            outgoingCallTarget: null,
            participants: [],
            isGroupCall: false,
            groupParticipantInfo: {},
            isMuted: false,
            isCameraOff: false,
            callDuration: 0,
        }),

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
            groupParticipantInfo: {
                ...state.groupParticipantInfo,
                [userId]: info,
            },
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
