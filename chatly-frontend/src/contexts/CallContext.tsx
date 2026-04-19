import { createContext, useContext, type ReactNode } from "react";
import { useCallSocket } from "@/hooks/useCallSocket";
import { useGroupCallSocket } from "@/hooks/useGroupCallSocket";

type CallSocketReturn = ReturnType<typeof useCallSocket>;
type GroupCallSocketReturn = ReturnType<typeof useGroupCallSocket>;
type CallContextValue = CallSocketReturn & GroupCallSocketReturn;

const CallContext = createContext<CallContextValue | null>(null);

/**
 * Provides a single shared call instance (1-1 + group) to the entire app.
 * Without this, each component would create its own WebRTC instances.
 */
export function CallSocketProvider({ children }: { children: ReactNode }) {
    const groupCallSocket = useGroupCallSocket();
    const callSocket = useCallSocket(groupCallSocket.handleGroupSignal);
    const value: CallContextValue = { ...callSocket, ...groupCallSocket };
    return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCallContext(): CallContextValue {
    const ctx = useContext(CallContext);
    if (!ctx) {
        throw new Error("useCallContext must be used inside <CallSocketProvider>");
    }
    return ctx;
}
