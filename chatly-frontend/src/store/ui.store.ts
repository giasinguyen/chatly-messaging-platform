import { create } from "zustand";

interface UiState {
    mobileDrawerOpen: boolean;
    setMobileDrawerOpen: (open: boolean) => void;
    toggleMobileDrawer: () => void;
}

export const useUiStore = create<UiState>((set) => ({
    mobileDrawerOpen: false,
    setMobileDrawerOpen: (open) => set({ mobileDrawerOpen: open }),
    toggleMobileDrawer: () => set((state) => ({ mobileDrawerOpen: !state.mobileDrawerOpen })),
}));
