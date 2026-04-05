import { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import type { Message } from '@/types/message';

interface ChatInputProps {
  onSend: (text: string) => void;
  onTyping?: (isTyping: boolean) => void;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
}

export function ChatInput({ onSend, onTyping, replyingTo, onCancelReply }: ChatInputProps) {
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleChangeText = (value: string) => {
    setText(value);

    // Emit typing status
    if (value.length > 0 && !isTyping) {
      setIsTyping(true);
      onTyping?.(true);
    } else if (value.length === 0 && isTyping) {
      setIsTyping(false);
      onTyping?.(false);
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    onSend(trimmed);
    setText('');
    setIsTyping(false);
    onTyping?.(false);
    onCancelReply?.();
  };

  return (
    <View style={{ backgroundColor: Colors.white }}>
      {/* Reply preview banner */}
      {replyingTo && (
        <View
          className="flex-row items-center px-3 py-2"
          style={{
            borderTopWidth: 0.5,
            borderTopColor: Colors.borderLight,
            backgroundColor: Colors.bg,
          }}
        >
          <View
            className="flex-1 rounded-lg px-3 py-1.5"
            style={{
              borderLeftWidth: 3,
              borderLeftColor: Colors.cta,
              backgroundColor: Colors.white,
            }}
          >
            <Text className="text-[11px] font-semibold mb-0.5" style={{ color: Colors.cta }}>
              Đang trả lời
            </Text>
            <Text className="text-[12px]" style={{ color: Colors.textMuted }} numberOfLines={1}>
              {replyingTo.recalled
                ? 'Tin nhắn đã được thu hồi'
                : replyingTo.type === 'IMAGE'
                ? '🖼 Hình ảnh'
                : replyingTo.type === 'FILE'
                ? '📎 Tệp đính kèm'
                : replyingTo.content}
            </Text>
          </View>
          <TouchableOpacity onPress={onCancelReply} className="ml-2 p-1">
            <Ionicons name="close" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}
      {/* Input row */}
      <View
        className="flex-row items-end border-t px-3 py-2"
        style={{
          borderTopColor: Colors.borderLight,
          backgroundColor: Colors.bg,
        }}
      >
        {/* Attachment button */}
        <TouchableOpacity
          className="items-center justify-center pb-1"
          style={{ width: 36, height: 36 }}
        >
          <Ionicons name="add-circle-outline" size={26} color={Colors.cta} />
        </TouchableOpacity>

        {/* Text input */}
        <View
          className="mx-2 flex-1 rounded-2xl px-4 py-2"
          style={{
            backgroundColor: Colors.white,
            minHeight: 38,
            maxHeight: 120,
          }}
        >
          <TextInput
            className="text-[15px]"
            style={{ color: Colors.text, maxHeight: 100 }}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor={Colors.textLight}
            value={text}
            onChangeText={handleChangeText}
            multiline
            textAlignVertical="center"
          />
        </View>

        {/* Send button */}
        <TouchableOpacity
          onPress={handleSend}
          disabled={!text.trim()}
          className="items-center justify-center pb-1"
          style={{ width: 36, height: 36 }}
        >
          <Ionicons
            name="send"
            size={24}
            color={text.trim() ? Colors.cta : Colors.textLight}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
