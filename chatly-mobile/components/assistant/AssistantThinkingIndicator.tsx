import { View, Text } from 'react-native';
import { Colors } from '@/constants/theme';
import type { StatusHint } from '@/types/agent';

const HINT_LABELS: Record<StatusHint, string> = {
  thinking: 'Thinking...',
  searching_web: 'Searching the web...',
  analyzing_documents: 'Analyzing documents...',
  generating: 'Generating response...',
};

interface Props {
  hint?: StatusHint;
}

export function AssistantThinkingIndicator({ hint = 'thinking' }: Props) {
  return (
    <View className="px-4 py-1">
      <View
        className="self-start rounded-2xl px-4 py-3"
        style={{
          backgroundColor: Colors.bubbleReceiver,
          borderBottomLeftRadius: 6,
        }}
      >
        <View className="flex-row items-center">
          <View className="flex-row" style={{ gap: 4 }}>
            <View
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: Colors.cta, opacity: 0.8 }}
            />
            <View
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: Colors.cta, opacity: 0.5 }}
            />
            <View
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: Colors.cta, opacity: 0.3 }}
            />
          </View>
        </View>
      </View>
      <Text className="ml-1 mt-0.5 text-[11px]" style={{ color: Colors.textLight }}>
        {HINT_LABELS[hint]}
      </Text>
    </View>
  );
}
