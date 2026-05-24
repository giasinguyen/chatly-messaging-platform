import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface CallControlButtonProps {
  icon: IoniconName;
  active: boolean;
  onPress: () => void;
}

export function CallControlButton({ icon, active, onPress }: CallControlButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="items-center justify-center"
      style={{
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: active ? Colors.error : 'rgba(255,255,255,0.2)',
      }}
      activeOpacity={0.7}>
      <Ionicons name={icon} size={24} color={Colors.white} />
    </TouchableOpacity>
  );
}
