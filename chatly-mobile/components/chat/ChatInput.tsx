import { useState } from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

interface ChatInputProps {
  onSend: (text: string) => void;
  onTyping?: (isTyping: boolean) => void;
}

export function ChatInput({ onSend, onTyping }: ChatInputProps) {
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
  };

  return (
    <View
      className="flex-row items-end border-t px-3 py-2"
      style={{
        borderTopColor: Colors.borderLight,
        backgroundColor: Colors.white,
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
          backgroundColor: Colors.bg,
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
  );
}
