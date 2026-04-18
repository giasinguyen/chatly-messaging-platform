export type CallType = 'VOICE' | 'VIDEO';

export type CallStatus = 'RINGING' | 'ONGOING' | 'ENDED' | 'MISSED' | 'REJECTED';

export type SignalType =
  | 'OFFER'
  | 'ANSWER'
  | 'ICE_CANDIDATE'
  | 'INITIATE'
  | 'END'
  | 'RENEGOTIATE_OFFER'
  | 'RENEGOTIATE_ANSWER'
  | 'GROUP_INITIATE'
  | 'GROUP_JOIN'
  | 'GROUP_OFFER'
  | 'GROUP_ANSWER'
  | 'GROUP_LEAVE';

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
  isGroup?: boolean;
  startedAt?: string;
  endedAt?: string;
}

export interface Participant {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  isMuted: boolean;
  isCameraOff: boolean;
}

export interface IncomingCall {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar: string | null;
  type: CallType;
}

export interface IncomingGroupCall {
  callId: string;
  conversationId: string;
  initiatorId: string;
  initiatorName: string;
  initiatorAvatar: string | null;
  groupName: string;
  groupAvatarUrl: string | null;
  type: CallType;
  participantCount: number;
}

export interface GroupParticipantInfo {
  name: string;
  avatar: string | null;
}
