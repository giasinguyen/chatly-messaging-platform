import { create } from "zustand";
import { persist } from "zustand/middleware";

export type MessageSendShortcut = "enter" | "ctrl-enter";

interface MessagePrefsState {
    sendShortcut: MessageSendShortcut;
    linkPreviewEnabled: boolean;
    setSendShortcut: (shortcut: MessageSendShortcut) => void;
    setLinkPreviewEnabled: (enabled: boolean) => void;
}

export const useMessagePrefsStore = create<MessagePrefsState>()(
    persist(
        (set) => ({
            sendShortcut: "enter",
            linkPreviewEnabled: true,
            setSendShortcut: (shortcut) => set({ sendShortcut: shortcut }),
            setLinkPreviewEnabled: (enabled) =>
                set({ linkPreviewEnabled: enabled }),
        }),
        {
            name: "chatly-message-prefs",
        },
    ),
);
