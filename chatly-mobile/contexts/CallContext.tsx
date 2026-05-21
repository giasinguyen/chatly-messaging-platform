import { createContext, useContext } from 'react';
import { useCallSocket } from '@/hooks/useCallSocket';
import { useGroupCallSocket } from '@/hooks/useGroupCallSocket';
import { IS_CALL_ENABLED } from '@/constants/runtime';

type CallSocketReturn = ReturnType<typeof useCallSocket>;
type GroupCallSocketReturn = ReturnType<typeof useGroupCallSocket>;

type CallContextValue = CallSocketReturn & GroupCallSocketReturn;

const CallContext = createContext<CallContextValue | null>(null);

const disabledCallContextValue = {
  initiateCall: async () => {},
  answerCall: () => {},
  joinGroupCall: () => {},
  endCall: () => {},
  initiateGroupCall: async () => {},
  upgradeToVideo: async () => {},
  upgradeGroupCallToVideo: async () => {},
  toggleCamera: () => {},
  groupToggleCamera: () => {},
  groupToggleMute: () => {},
  localStream: null,
  remoteStream: null,
  remoteStreamKey: 0,
  groupLocalStream: null,
  groupRemoteStreams: {},
} as unknown as CallContextValue;

export function CallSocketProvider({ children }: { children: React.ReactNode }) {
  if (!IS_CALL_ENABLED) {
    return <CallContext.Provider value={disabledCallContextValue}>{children}</CallContext.Provider>;
  }

  return <EnabledCallSocketProvider>{children}</EnabledCallSocketProvider>;
}

function EnabledCallSocketProvider({ children }: { children: React.ReactNode }) {
  const groupCallSocket = useGroupCallSocket();
  const callSocket = useCallSocket(groupCallSocket.handleGroupSignal);

  const value: CallContextValue = { ...callSocket, ...groupCallSocket };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCallContext(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCallContext must be used inside CallSocketProvider');
  return ctx;
}
