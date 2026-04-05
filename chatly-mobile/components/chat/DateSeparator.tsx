import { View, Text } from 'react-native';
import { Colors } from '@/constants/theme';

interface DateSeparatorProps {
  label: string;
}

export function DateSeparator({ label }: DateSeparatorProps) {
  return (
    <View className="my-3 flex-row items-center justify-center">
      <View
        className="rounded-full px-3 py-1"
        style={{ backgroundColor: Colors.bg }}
      >
        <Text className="text-xs font-medium" style={{ color: Colors.textMuted }}>
          {label}
        </Text>
      </View>
    </View>
  );
}
