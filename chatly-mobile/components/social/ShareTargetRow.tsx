import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';

interface ShareTargetRowProps {
  title: string;
  subtitle: string;
  avatarUrl?: string | null;
  isSelected: boolean;
  onPress: () => void;
}

export function ShareTargetRow({
  title,
  subtitle,
  avatarUrl,
  isSelected,
  onPress,
}: ShareTargetRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`mb-2 flex-row items-center rounded-3xl border px-3 py-3 ${
        isSelected ? 'border-[#0071E3]/30 bg-[#0071E3]/5' : 'border-[#E5E5EA] bg-white'
      }`}
      activeOpacity={0.8}>
      <Avatar uri={avatarUrl} name={title} size={40} />
      <View className="ml-3 min-w-0 flex-1">
        <Text numberOfLines={1} className="text-sm font-medium text-[#1D1D1F]">
          {title}
        </Text>
        <Text numberOfLines={1} className="mt-0.5 text-xs text-[#6E6E73]">
          {subtitle}
        </Text>
      </View>
      <View
        className={`h-5 w-5 items-center justify-center rounded-full border ${
          isSelected ? 'border-[#0071E3] bg-[#0071E3]' : 'border-[#D1D1D6] bg-white'
        }`}>
        {isSelected ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
      </View>
    </TouchableOpacity>
  );
}