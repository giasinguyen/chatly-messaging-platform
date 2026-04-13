import { createContext, useContext, type ReactNode } from "react";
import { useCallSocket } from "@/hooks/useCallSocket";

type CallSocketReturn = ReturnType<typeof useCallSocket>;

const CallContext = createContext<CallSocketReturn | null>(null);

/**
 * Provides a single shared useCallSocket instance to the entire app.
 * Without this, each component calling useCallSocket() would create its own
 * useWebRTC instance with separate peer connections and streams.
 */
export function CallSocketProvider({ children }: { children: ReactNode }) {
    const value = useCallSocket();
    return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCallContext(): CallSocketReturn {
    const ctx = useContext(CallContext);
    if (!ctx) {
        throw new Error("useCallContext must be used inside <CallSocketProvider>");
    }
    return ctx;
}
