import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

interface AssistantHeaderProps {
  title: string;
  onPressSetting?: () => void;
}

export function AssistantHeader({ title, onPressSetting }: AssistantHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: Colors.white,
        borderBottomWidth: 0.5,
        borderBottomColor: Colors.borderLight,
      }}
    >
      <View className="flex-row items-center px-2 py-2">
        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="items-center justify-center"
          style={{ width: 40, height: 40 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={26} color={Colors.cta} />
        </TouchableOpacity>

        {/* AI icon + title */}
        <View className="flex-1 flex-row items-center ml-1">
          <View
            className="h-9 w-9 rounded-xl items-center justify-center"
            style={{ backgroundColor: Colors.ctaLight }}
          >
            <Ionicons name="sparkles" size={18} color={Colors.cta} />
          </View>
          <View className="ml-2.5 flex-1">
            <Text
              className="text-base font-semibold"
              style={{ color: Colors.text }}
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text className="text-xs" style={{ color: Colors.textMuted }}>
              AI Assistant
            </Text>
          </View>
        </View>

        {/* Settings */}
        {onPressSetting && (
          <TouchableOpacity onPress={onPressSetting} className="mx-1 p-2">
            <Ionicons name="settings-outline" size={22} color={Colors.cta} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
