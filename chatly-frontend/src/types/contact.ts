export type ContactStatus = "PENDING" | "ACCEPTED" | "BLOCKED";

export interface ContactRequestPayload {
    contactId: string;
}

export interface ContactResponse {
    id: string; // the contact record ID
    user: {
        id: string;
        username: string;
        email?: string;
        phone?: string;
        displayName: string;
        avatarUrl?: string;
    };
    contact: {
        id: string;
        username: string;
        email?: string;
        phone?: string;
        displayName: string;
        avatarUrl?: string;
    };
    status: ContactStatus;
    blockedBy?: string | null;
    createdAt: string;
}

export interface BlockStatusResponse {
    blocked: boolean;
    blockedBy: string | null;
    /** "I_BLOCKED" | "BLOCKED_ME" | null */
    direction: "I_BLOCKED" | "BLOCKED_ME" | null;
}

