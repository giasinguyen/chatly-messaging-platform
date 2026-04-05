import { View, Text } from 'react-native';
import { Colors } from '@/constants/theme';

export function TypingIndicator({ name }: { name?: string }) {
  return (
    <View className="px-4 py-1">
      <View
        className="self-start rounded-2xl px-4 py-2.5"
        style={{
          backgroundColor: Colors.bubbleReceiver,
          borderBottomLeftRadius: 6,
        }}
      >
        <View className="flex-row items-center">
          <View className="flex-row space-x-1">
            <View
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: Colors.textMuted, opacity: 0.6 }}
            />
            <View
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: Colors.textMuted, opacity: 0.4 }}
            />
            <View
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: Colors.textMuted, opacity: 0.2 }}
            />
          </View>
        </View>
      </View>
      {name && (
        <Text className="ml-1 mt-0.5 text-[11px]" style={{ color: Colors.textLight }}>
          {name} đang nhập...
        </Text>
      )}
    </View>
  );
}
