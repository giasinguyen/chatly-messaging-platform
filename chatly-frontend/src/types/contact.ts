
import type { UserResponse } from "@/types/auth";

export type ContactStatus = "PENDING" | "ACCEPTED" | "BLOCKED";

export interface ContactResponse {
    id: string;
    user: UserResponse;
    contact: UserResponse;
    status: ContactStatus;
    createdAt: string;
}

export interface ContactRequest {
    contactId: string;
}
=======
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
    createdAt: string;
}

