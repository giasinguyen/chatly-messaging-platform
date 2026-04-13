export type ContactStatus = 'PENDING' | 'ACCEPTED' | 'BLOCKED';

export interface ContactRequestPayload {
  contactId: string;
}

export interface BlockStatusResponse {
  blocked: boolean;
  blockedBy: string | null;
}

export interface ContactUserInfo {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  displayName: string;
  avatarUrl?: string;
}

export interface ContactResponse {
  id: string;
  user: ContactUserInfo;
  contact: ContactUserInfo;
  status: ContactStatus;
  blockedBy?: string | null;
  createdAt: string;
}
