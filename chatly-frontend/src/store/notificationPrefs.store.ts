import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NotificationSound = "soft-bell" | "iphone" | "silent";

const NOTIFICATION_SOUND_URLS: Record<Exclude<NotificationSound, "silent">, string> = {
    iphone: "/sounds/iphone.mp3",
    "soft-bell": "/sounds/message_ting_ting.mp3",
};

const NOTIFICATION_SOUND_VOLUMES: Record<Exclude<NotificationSound, "silent">, number> = {
    iphone: 10 ** (-2 / 20),
    "soft-bell": 1,
};

interface NotificationPrefsState {
    browserNotificationsEnabled: boolean;
    sound: NotificationSound;
    setBrowserNotificationsEnabled: (enabled: boolean) => void;
    setSound: (sound: NotificationSound) => void;
}

export const useNotificationPrefsStore = create<NotificationPrefsState>()(
    persist(
        (set) => ({
            browserNotificationsEnabled: true,
            sound: "soft-bell",
            setBrowserNotificationsEnabled: (enabled) =>
                set({ browserNotificationsEnabled: enabled }),
            setSound: (sound) => set({ sound }),
        }),
        {
            name: "chatly-notification-prefs",
        },
    ),
);

function normalizeNotificationSound(sound: string): NotificationSound {
    if (sound === "iphone" || sound === "silent" || sound === "soft-bell") {
        return sound;
    }
    return "soft-bell";
}

export function getNotificationSoundUrl(): string | null {
    const sound = normalizeNotificationSound(useNotificationPrefsStore.getState().sound);
    if (sound === "silent") return null;
    return NOTIFICATION_SOUND_URLS[sound];
}

export function playNotificationSound(): void {
    const sound = normalizeNotificationSound(useNotificationPrefsStore.getState().sound);
    if (sound === "silent") return;
    const soundUrl = NOTIFICATION_SOUND_URLS[sound];
    if (!soundUrl) return;
    const audio = new Audio(soundUrl);
    audio.volume = NOTIFICATION_SOUND_VOLUMES[sound];
    audio.play().catch(() => {});
}
