import { createContext, useContext } from 'react';
import { useCallSocket } from '@/hooks/useCallSocket';

type CallSocketReturn = ReturnType<typeof useCallSocket>;

const CallContext = createContext<CallSocketReturn | null>(null);

export function CallSocketProvider({ children }: { children: React.ReactNode }) {
  const value = useCallSocket();
  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCallContext(): CallSocketReturn {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCallContext must be used inside CallSocketProvider');
  return ctx;
}
