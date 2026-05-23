import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

interface PostCardMenuProps {
  isOwnPost: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
}

export function PostCardMenu({ isOwnPost, onEdit, onDelete, onReport }: PostCardMenuProps) {
  return (
    <View className="absolute right-0 top-10 z-50 w-44 rounded-2xl border border-[#E5E5EA] bg-white shadow-sm">
      {isOwnPost ? (
        <>
          <TouchableOpacity
            onPress={onEdit}
            className="flex-row items-center gap-2 border-b border-[#F2F2F7] px-3 py-2.5"
            activeOpacity={0.7}>
            <Ionicons name="pencil-outline" size={16} color={Colors.text} />
            <Text className="text-sm font-medium text-[#1D1D1F]">Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDelete}
            className="flex-row items-center gap-2 px-3 py-2.5"
            activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
            <Text className="text-sm font-medium text-[#FF3B30]">Delete</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          onPress={onReport}
          className="flex-row items-center gap-2 px-3 py-2.5"
          activeOpacity={0.7}>
          <Ionicons name="flag-outline" size={16} color={Colors.text} />
          <Text className="text-sm font-medium text-[#1D1D1F]">Report</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}