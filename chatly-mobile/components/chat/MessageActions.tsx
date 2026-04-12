import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import type { Message } from '@/types/message';

interface MessageActionsProps {
  visible: boolean;
  message: Message | null;
  isMe: boolean;
  onClose: () => void;
  onReply: () => void;
  onForward?: () => void;
  onCopy: () => void;
  onReact?: (emoji: string) => void;
  onEdit?: () => void;
  onRecall?: () => void;
  onDelete?: () => void;
  onTogglePin?: () => void;
}

interface ActionItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

export function MessageActions({
  visible,
  message,
  isMe,
  onClose,
  onReply,
  onForward,
  onCopy,
  onReact,
  onEdit,
  onRecall,
  onDelete,
  onTogglePin,
}: MessageActionsProps) {
  if (!message) return null;

  const now = new Date();
  const createdAt = new Date(message.createdAt);
  const diffMin = (now.getTime() - createdAt.getTime()) / 60000;
  const canEdit = isMe && message.type === 'TEXT' && diffMin <= 15 && !message.recalled;
  const canRecall = isMe && diffMin <= 1440 && !message.recalled; // 24h

  const actions: ActionItem[] = [
    { icon: 'arrow-undo-outline', label: 'Reply', onPress: onReply },
    ...(onForward ? [{ icon: 'arrow-redo-outline' as const, label: 'Forward', onPress: onForward }] : []),
    { icon: 'copy-outline', label: 'Copy', onPress: onCopy },
  ];

  if (canEdit && onEdit) {
    actions.push({ icon: 'pencil-outline', label: 'Edit', onPress: onEdit });
  }

  if (!message.recalled && onTogglePin) {
    actions.push({
      icon: 'pin-outline',
      label: message.pinned ? 'Unpin' : 'Pin message',
      onPress: onTogglePin,
    });
  }

  if (canRecall && onRecall) {
    actions.push({
      icon: 'refresh-outline',
      label: 'Recall',
      onPress: onRecall,
      destructive: true,
    });
  }

  if (isMe && onDelete) {
    actions.push({
      icon: 'trash-outline',
      label: 'Delete',
      onPress: onDelete,
      destructive: true,
    });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end" style={{ backgroundColor: Colors.overlay }} onPress={onClose}>
        <Pressable
          className="rounded-t-3xl pb-8 pt-4"
          style={{ backgroundColor: Colors.white }}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <View
            className="mb-4 self-center rounded-full"
            style={{ width: 36, height: 4, backgroundColor: Colors.borderLight }}
          />

          {/* Quick emoji reactions */}
          {!message.recalled && onReact && (
            <View className="mb-3 flex-row justify-center gap-2 px-6">
              {['👍', '❤️', '😂', '😮', '😢', '😡'].map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => {
                    onReact(emoji);
                    onClose();
                  }}
                  activeOpacity={0.7}
                  className="items-center justify-center rounded-full"
                  style={{
                    width: 44,
                    height: 44,
                    backgroundColor: Colors.bg,
                  }}
                >
                  <Text className="text-2xl">{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                action.onPress();
                onClose();
              }}
              className="flex-row items-center px-6 py-3.5"
              activeOpacity={0.7}
            >
              <Ionicons
                name={action.icon}
                size={22}
                color={action.destructive ? Colors.error : Colors.text}
              />
              <Text
                className="ml-4 text-base"
                style={{ color: action.destructive ? Colors.error : Colors.text }}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
