import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import type { ReportPostRequest, ReportReason } from '@/types/post';

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: 'SPAM', label: 'Spam', description: 'Scams, repeated posts, or unwanted promotion.' },
  { value: 'HARASSMENT', label: 'Harassment', description: 'Bullying, threats, or targeted abuse.' },
  { value: 'INAPPROPRIATE', label: 'Inappropriate', description: 'Nudity, violence, hate, or unsafe content.' },
  { value: 'OTHER', label: 'Other', description: 'Something else that should be reviewed.' },
];

interface ReportPostModalProps {
  visible: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: ReportPostRequest) => void | Promise<void>;
}

export function ReportPostModal({
  visible,
  isSubmitting = false,
  onClose,
  onSubmit,
}: ReportPostModalProps) {
  const [reason, setReason] = useState<ReportReason>('SPAM');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!visible) {
      setReason('SPAM');
      setDescription('');
    }
  }, [visible]);

  const handleSubmit = () => {
    void onSubmit({
      reason,
      description: description.trim() || undefined,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => !isSubmitting && onClose()}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0 bg-black/40"
          onPress={() => !isSubmitting && onClose()}
        />

        <View className="rounded-t-[28px] bg-white px-4 pb-8 pt-3">
          <View className="mb-4 items-center">
            <View className="h-1.5 w-12 rounded-full bg-gray-300" />
          </View>

          <View className="mb-4 flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <View className="mb-2 h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <Ionicons name="warning-outline" size={21} color={Colors.error} />
              </View>
              <Text className="text-xl font-bold text-[#1D1D1F]">Report post</Text>
              <Text className="mt-1 text-sm leading-5 text-[#6E6E73]">
                Choose a reason and add context for the moderation team.
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              disabled={isSubmitting}
              className="rounded-full bg-gray-100 p-2"
              activeOpacity={0.7}>
              <Ionicons name="close" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View className="gap-2">
            {REPORT_REASONS.map((item) => {
              const selected = reason === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => setReason(item.value)}
                  disabled={isSubmitting}
                  className={`flex-row items-start gap-3 rounded-2xl border px-3 py-3 ${
                    selected ? 'border-[#0071E3] bg-[#E8F2FE]' : 'border-[#E5E5EA] bg-white'
                  }`}
                  activeOpacity={0.75}>
                  <View
                    className={`mt-0.5 h-5 w-5 items-center justify-center rounded-full border ${
                      selected ? 'border-[#0071E3]' : 'border-[#AEAEB2]'
                    }`}>
                    {selected && <View className="h-2.5 w-2.5 rounded-full bg-[#0071E3]" />}
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-[#1D1D1F]">{item.label}</Text>
                    <Text className="mt-0.5 text-xs leading-4 text-[#6E6E73]">
                      {item.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View className="mt-4">
            <Text className="mb-2 text-sm font-semibold text-[#1D1D1F]">Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              editable={!isSubmitting}
              multiline
              maxLength={500}
              placeholder="Add details for review..."
              placeholderTextColor={Colors.textLight}
              className="min-h-[104px] rounded-2xl border border-gray-200 px-3 py-3 text-sm text-[#1D1D1F]"
              textAlignVertical="top"
            />
            <Text className="mt-1 text-right text-xs text-[#8E8E93]">
              {description.length}/500
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            className="mt-4 h-12 flex-row items-center justify-center rounded-2xl bg-[#FF3B30]"
            activeOpacity={0.8}>
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-sm font-semibold text-white">Submit report</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
