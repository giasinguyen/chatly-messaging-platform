import { View, Text } from 'react-native';

export default function ChatsPlaceholder() {
  return (
    <View className="flex-1 items-center justify-center bg-chatly-bg">
      <Text className="text-2xl font-semibold text-chatly-text">Tin nhắn</Text>
      <Text className="mt-2 text-chatly-muted">Phase 2 sẽ implement</Text>
    </View>
  );
}
