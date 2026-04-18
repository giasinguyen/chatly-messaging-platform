import { createContext, useContext } from 'react';
import { useCallSocket } from '@/hooks/useCallSocket';
import { useGroupCallSocket } from '@/hooks/useGroupCallSocket';

type CallSocketReturn = ReturnType<typeof useCallSocket>;
type GroupCallSocketReturn = ReturnType<typeof useGroupCallSocket>;

type CallContextValue = CallSocketReturn & GroupCallSocketReturn;

const CallContext = createContext<CallContextValue | null>(null);

export function CallSocketProvider({ children }: { children: React.ReactNode }) {
  const callSocket = useCallSocket();
  const groupCallSocket = useGroupCallSocket();

  const value: CallContextValue = { ...callSocket, ...groupCallSocket };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCallContext(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCallContext must be used inside CallSocketProvider');
  return ctx;
}
