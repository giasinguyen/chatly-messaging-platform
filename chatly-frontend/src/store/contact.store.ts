import { create } from "zustand";
import { contactService } from "@/services/contact.service";
import type { ContactResponse } from "@/types/contact";

interface ContactStoreState {
    contacts: ContactResponse[];
    loading: boolean;
    loaded: boolean;
    /** Incremented each time a friend request notification arrives — subscribe to trigger refetch. */
    pendingRefreshToken: number;
    /** Load all contacts once. No-ops if already loading. */
    fetchContacts: () => Promise<void>;
    /** Force a fresh reload — call after block/unblock/add friend actions. */
    invalidate: () => void;
    /** Increment pendingRefreshToken to signal that the pending list should be reloaded. */
    triggerPendingRefresh: () => void;
    /** Returns "I_BLOCKED" | "BLOCKED_ME" | null for a given pair (used by ChatList). */
    getBlockDirection: (
        currentUserId: string,
        otherUserId: string,
    ) => "I_BLOCKED" | "BLOCKED_ME" | null;
}

export const useContactStore = create<ContactStoreState>((set, get) => ({
    contacts: [],
    loading: false,
    loaded: false,
    pendingRefreshToken: 0,

    fetchContacts: async () => {
        if (get().loading) return;
        set({ loading: true });
        try {
            const res = await contactService.getAll();
            set({ contacts: res.result ?? [], loading: false, loaded: true });
        } catch {
            set({ loading: false });
        }
    },

    invalidate: () => {
        set({ loaded: false });
        get().fetchContacts();
    },

    triggerPendingRefresh: () => {
        set((s) => ({ pendingRefreshToken: s.pendingRefreshToken + 1 }));
    },

    getBlockDirection: (currentUserId, otherUserId) => {
        const record = get().contacts.find(
            (c) =>
                (c.user.id === currentUserId && c.contact.id === otherUserId) ||
                (c.user.id === otherUserId && c.contact.id === currentUserId),
        );
        if (!record || record.status !== "BLOCKED") return null;
        return record.blockedBy === currentUserId ? "I_BLOCKED" : "BLOCKED_ME";
    },
}));
