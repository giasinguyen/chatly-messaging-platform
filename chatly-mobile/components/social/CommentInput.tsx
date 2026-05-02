import { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Colors } from '@/constants/theme';

interface CommentInputProps {
  onSubmit: (content: string, mediaUrls?: string[]) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  placeholder?: string;
  isReply?: boolean;
  replyToUsername?: string | null;
}

const FALLBACK_AVATAR = 'https://i.pravatar.cc/140?img=30';

export function CommentInput({
  onSubmit,
  onCancel,
  isLoading = false,
  placeholder = 'Add a comment...',
  isReply = false,
  replyToUsername,
}: CommentInputProps) {
  const [content, setContent] = useState(replyToUsername ? `@${replyToUsername} ` : '');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content, selectedImages.length > 0 ? selectedImages : undefined);
      setContent('');
      setSelectedImages([]);
    }
  };

  const canSubmit = content.trim().length > 0 && !isLoading;

  return (
    <View className={`border-t border-gray-200 bg-white px-3 py-3 ${isReply ? 'bg-gray-50' : ''}`}>
      {/* Selected Images Preview */}
      {selectedImages.length > 0 && (
        <View className="mb-2 flex-row flex-wrap gap-2">
          {selectedImages.map((imageUri, idx) => (
            <View key={`image-${idx}`} className="relative">
              <Image
                source={{ uri: imageUri }}
                contentFit="cover"
                transition={100}
                style={{ width: 80, height: 80, borderRadius: 8 }}
              />
              <TouchableOpacity
                onPress={() => setSelectedImages(selectedImages.filter((_, i) => i !== idx))}
                className="absolute -right-2 -top-2 rounded-full bg-gray-400 p-1"
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={14} color="white" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Input Area */}
      <View className="flex-row items-center gap-2">
        <View className="flex-1 flex-row items-center rounded-full border border-gray-300 bg-gray-50 px-3 py-2">
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder={placeholder}
            placeholderTextColor={Colors.textLight}
            multiline
            maxHeight={100}
            editable={!isLoading}
            style={{
              flex: 1,
              fontSize: 14,
              color: Colors.text,
              maxHeight: 100,
            }}
          />

          {/* Image Picker Icon */}
          <TouchableOpacity
            onPress={() => {
              // TODO: Implement image picker
              // For now, show a toast or placeholder
              console.log('Image picker not yet implemented');
            }}
            className="ml-1 p-1"
            activeOpacity={0.7}
            disabled={isLoading}
          >
            <Ionicons name="image-outline" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          {/* Emoji Icon */}
          <TouchableOpacity
            onPress={() => {
              // TODO: Implement emoji picker
              console.log('Emoji picker not yet implemented');
            }}
            className="ml-1 p-1"
            activeOpacity={0.7}
            disabled={isLoading}
          >
            <Ionicons name="happy-outline" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Send Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit}
          className="rounded-full p-2"
          style={{
            backgroundColor: canSubmit ? '#0071E3' : '#D5D5D7',
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="send" size={16} color="white" />
        </TouchableOpacity>

        {/* Cancel Button (for replies) */}
        {isReply && onCancel && (
          <TouchableOpacity
            onPress={onCancel}
            className="rounded-full bg-gray-300 p-2"
            activeOpacity={0.7}
            disabled={isLoading}
          >
            <Ionicons name="close" size={16} color="white" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
