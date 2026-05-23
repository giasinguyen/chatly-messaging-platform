import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import type { ToolCallState } from '@/types/agent';

interface Props {
  toolCalls: ToolCallState[];
}

function ToolStatusIcon({ status }: { status: ToolCallState['status'] }) {
  switch (status) {
    case 'running':
      return <ActivityIndicator size={14} color={Colors.textMuted} />;
    case 'done':
      return <Ionicons name="checkmark-circle" size={16} color={Colors.success} />;
    case 'cancelled':
      return <Ionicons name="close-circle" size={16} color={Colors.error} />;
  }
}

export function AgentToolProgress({ toolCalls }: Props) {
  if (toolCalls.length === 0) return null;

  return (
    <View className="px-4 py-1" style={{ gap: 6 }}>
      {toolCalls.map((tc, idx) => (
        <View
          key={idx}
          className="flex-row items-center self-start rounded-xl px-3 py-2"
          style={{
            backgroundColor: Colors.bubbleReceiver,
            gap: 8,
          }}
        >
          <Ionicons name="build-outline" size={14} color={Colors.textMuted} />
          <Text
            className="flex-1 text-[13px] font-medium"
            style={{ color: Colors.text }}
            numberOfLines={1}
          >
            {tc.tool}
          </Text>
          <ToolStatusIcon status={tc.status} />
        </View>
      ))}
    </View>
  );
}
