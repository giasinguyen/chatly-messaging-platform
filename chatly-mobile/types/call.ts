export type CallType = 'VOICE' | 'VIDEO';
export type CallMediaProvider = 'AGORA' | 'WEBRTC';

export type CallStatus = 'RINGING' | 'ONGOING' | 'ENDED' | 'MISSED' | 'REJECTED';

export type SignalType =
  | 'OFFER'
  | 'ANSWER'
  | 'ICE_CANDIDATE'
  | 'INITIATE'
  | 'END'
  | 'VIDEO_UPGRADE_REQUEST'
  | 'VIDEO_UPGRADE_ACCEPT'
  | 'VIDEO_UPGRADE_REJECT'
  | 'RENEGOTIATE_OFFER'
  | 'RENEGOTIATE_ANSWER'
  | 'GROUP_INITIATE'
  | 'GROUP_JOIN'
  | 'GROUP_OFFER'
  | 'GROUP_ANSWER'
  | 'GROUP_LEAVE'
  | 'GROUP_VIDEO_UPGRADE_REQUEST'
  | 'GROUP_VIDEO_UPGRADE_ACCEPT'
  | 'GROUP_VIDEO_UPGRADE_REJECT'
  | 'GROUP_RENEGOTIATE_OFFER'
  | 'GROUP_RENEGOTIATE_ANSWER';

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
  mediaProvider?: CallMediaProvider;
  startedAt?: string;
  endedAt?: string;
}

export interface AgoraTokenRequest {
  conversationId: string;
  callId: string;
}

export interface AgoraTokenResponse {
  appId: string;
  channelName: string;
  uid: number;
  token: string | null;
  expiresInSeconds: number;
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
  conversationId: string;
  callerId: string;
  callerName: string;
  callerAvatar: string | null;
  type: CallType;
  mediaProvider?: CallMediaProvider;
}

export interface IncomingGroupCall {
  callId: string;
  conversationId: string;
  initiatorId: string;
  initiatorName: string;
  initiatorAvatar: string | null;
  initiatorAgoraUid?: number | null;
  groupName: string;
  groupAvatarUrl: string | null;
  type: CallType;
  mediaProvider?: CallMediaProvider;
  participantCount: number;
}

export interface GroupParticipantInfo {
  name: string;
  avatar: string | null;
  agoraUid?: number | null;
}
