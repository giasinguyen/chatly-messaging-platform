import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

interface AssistantMessageActionsProps {
  visible: boolean;
  onClose: () => void;
  onCopy: () => void;
  onForwardToChat: () => void;
}

export function AssistantMessageActions({
  visible,
  onClose,
  onCopy,
  onForwardToChat,
}: AssistantMessageActionsProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end" style={{ backgroundColor: Colors.overlay }} onPress={onClose}>
        <Pressable
          className="rounded-t-3xl pb-8 pt-4"
          style={{ backgroundColor: Colors.white }}
          onPress={(event) => event.stopPropagation()}
        >
          <View
            className="mb-4 self-center rounded-full"
            style={{ width: 36, height: 4, backgroundColor: Colors.borderLight }}
          />

          <TouchableOpacity
            onPress={() => {
              onCopy();
              onClose();
            }}
            className="flex-row items-center px-6 py-3.5"
            activeOpacity={0.7}
          >
            <Ionicons name="copy-outline" size={22} color={Colors.text} />
            <Text className="ml-4 text-base" style={{ color: Colors.text }}>
              Copy
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              onForwardToChat();
              onClose();
            }}
            className="flex-row items-center px-6 py-3.5"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-redo-outline" size={22} color={Colors.cta} />
            <Text className="ml-4 text-base" style={{ color: Colors.cta }}>
              Forward to chat
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
