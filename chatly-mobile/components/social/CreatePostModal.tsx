import { useState } from 'react';
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PostVisibility } from '@/types/post';
import { Colors } from '@/constants/theme';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
}

const VISIBILITY_OPTIONS: Array<{ label: string; value: PostVisibility }> = [
  { label: 'Public', value: 'PUBLIC' },
  { label: 'Followers', value: 'FOLLOWERS_ONLY' },
  { label: 'Friends', value: 'FRIENDS_ONLY' },
  { label: 'Only me', value: 'ONLY_ME' },
];

export function CreatePostModal({ visible, onClose }: CreatePostModalProps) {
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<PostVisibility>('PUBLIC');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: Colors.overlay }}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          className="rounded-t-3xl bg-white px-4 pb-7 pt-4"
        >
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-[#1D1D1F]">Create post</Text>
            <TouchableOpacity onPress={onClose} className="rounded-full bg-[#F5F5F7] p-2">
              <Ionicons name="close" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <TextInput
            value={content}
            onChangeText={setContent}
            multiline
            placeholder="Share something with everyone..."
            placeholderTextColor={Colors.textLight}
            style={{
              minHeight: 130,
              borderWidth: 1,
              borderColor: Colors.borderLight,
              borderRadius: 14,
              paddingHorizontal: 12,
              paddingVertical: 10,
              textAlignVertical: 'top',
              color: Colors.text,
            }}
          />

          <Text className="mb-2 mt-4 text-sm font-medium text-[#1D1D1F]">Visibility</Text>
          <View className="mb-5 flex-row flex-wrap gap-2">
            {VISIBILITY_OPTIONS.map((option) => {
              const selected = option.value === visibility;
              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setVisibility(option.value)}
                  className="rounded-full px-3 py-2"
                  style={{
                    backgroundColor: selected ? '#E8F2FE' : '#F5F5F7',
                    borderWidth: selected ? 1 : 0,
                    borderColor: selected ? '#0071E3' : 'transparent',
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: selected ? '#0071E3' : '#6E6E73' }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            className="items-center rounded-xl bg-[#0071E3] py-3"
          >
            <Text className="text-sm font-semibold text-white">Post (UI only)</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
