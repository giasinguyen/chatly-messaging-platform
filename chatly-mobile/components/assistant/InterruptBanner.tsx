import { useCallback, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useChatbotStore } from '@/store/chatbot.store';
import { useAgentStream } from '@/hooks/useAgentStream';
import { InterruptCard } from './InterruptCard';
import type { InterruptData } from '@/types/agent';

interface Props {
  sessionId: string;
}

/**
 * Self-contained component that subscribes directly to the interrupt state.
 * Uses manual Zustand subscribe + local state to guarantee re-renders.
 */
export function InterruptBanner({ sessionId }: Props) {
  const [interrupt, setLocalInterrupt] = useState<InterruptData | null>(
    useChatbotStore.getState().interrupt
  );
  const { resumeStream } = useAgentStream(sessionId);

  // Manual subscription — bypasses React batching entirely
  useEffect(() => {
    // Sync initial value
    const current = useChatbotStore.getState().interrupt;
    setLocalInterrupt(current);
    console.log('[InterruptBanner] mounted, initial interrupt:', current !== null);

    const unsub = useChatbotStore.subscribe((state) => {
      const storeInterrupt = state.interrupt;
      console.log('[InterruptBanner] store changed, interrupt:', storeInterrupt !== null);
      setLocalInterrupt(storeInterrupt);
    });

    return unsub;
  }, []);

  const handleApprove = useCallback(() => {
    resumeStream(sessionId, true);
  }, [sessionId, resumeStream]);

  const handleReject = useCallback(() => {
    resumeStream(sessionId, false);
  }, [sessionId, resumeStream]);

  console.log('[InterruptBanner] render — interrupt:', interrupt !== null);

  // Always render a debug strip so we know the component is in the layout
  if (!interrupt) {
    return (
      <View style={{ backgroundColor: '#ff0', paddingVertical: 2, paddingHorizontal: 8 }}>
        <Text style={{ fontSize: 10, color: '#000' }}>
          [DEBUG] InterruptBanner: no interrupt
        </Text>
      </View>
    );
  }

  return (
    <InterruptCard
      interrupt={interrupt}
      onApprove={handleApprove}
      onReject={handleReject}
    />
  );
}
