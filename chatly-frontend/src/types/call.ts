export type CallType = "VOICE" | "VIDEO";

export type CallStatus = "RINGING" | "ONGOING" | "ENDED" | "MISSED" | "REJECTED";

export type SignalType = "OFFER" | "ANSWER" | "ICE_CANDIDATE" | "INITIATE" | "END" | "RENEGOTIATE_OFFER" | "RENEGOTIATE_ANSWER";

export interface CallSignal {
    type: SignalType;
    callId: string;
    senderId: string;
    receiverId: string;
    payload?: Record<string, unknown>;
}

export interface CallSession {
    callId: string;
    conversationId: string;
    initiatorId: string;
    participants: string[];
    type: CallType;
    status: CallStatus;
    startedAt?: string;
    endedAt?: string;
}

export interface Participant {
    userId: string;
    displayName: string;
    avatarUrl: string;
    isMuted: boolean;
    isCameraOff: boolean;
}

export interface IncomingCall {
    callId: string;
    callerId: string;
    callerName: string;
    callerAvatar: string;
    type: CallType;
}
