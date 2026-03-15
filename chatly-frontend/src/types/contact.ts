import type { UserResponse } from "@/types/auth";

export type ContactStatus = "PENDING" | "ACCEPTED" | "BLOCKED";

export interface ContactRequestPayload {
    contactId: string;
}

export interface ContactResponse {
    id: string;
    user: UserResponse;
    contact: UserResponse;
    status: ContactStatus;
    createdAt: string;
}

