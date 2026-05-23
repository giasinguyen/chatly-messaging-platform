import { View } from 'react-native';
import { useChatbotStore } from '@/store/chatbot.store';
import { AssistantThinkingIndicator } from './AssistantThinkingIndicator';
import { AssistantStreamingBubble } from './AssistantStreamingBubble';
import { AgentToolProgress } from './AgentToolProgress';

/**
 * Self-contained list footer that subscribes directly to the Zustand store.
 * LegendList caches footer components — by owning its own selectors,
 * this component re-renders itself when store state changes,
 * regardless of whether LegendList triggers a re-render.
 */
export function AssistantListFooter() {
  const streamingStatus = useChatbotStore((s) => s.streamingStatus);
  const streamingContent = useChatbotStore((s) => s.streamingContent);
  const statusHint = useChatbotStore((s) => s.statusHint);
  const toolCalls = useChatbotStore((s) => s.toolCalls);

  const isThinking = streamingStatus === 'connecting' || streamingStatus === 'thinking';

  console.log('[AssistantListFooter] render — isThinking:', isThinking, 'streaming:', streamingStatus);

  const hasContent = isThinking || toolCalls.length > 0 || (streamingStatus === 'streaming' && !!streamingContent);
  if (!hasContent) return null;

  return (
    <View>
      {isThinking && <AssistantThinkingIndicator hint={statusHint} />}
      {toolCalls.length > 0 && <AgentToolProgress toolCalls={toolCalls} />}
      {streamingStatus === 'streaming' && streamingContent ? (
        <AssistantStreamingBubble content={streamingContent} />
      ) : null}
    </View>
  );
}
