import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import type { Poll } from '@/types/message';

const MAX_OPTIONS = 10;
const MIN_OPTIONS = 2;

interface PollModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (poll: Poll) => void;
}

export function PollModal({ visible, onClose, onSend }: PollModalProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [multipleChoice, setMultipleChoice] = useState(false);
  const [anonymous, setAnonymous] = useState(false);

  const reset = () => {
    setQuestion('');
    setOptions(['', '']);
    setMultipleChoice(false);
    setAnonymous(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const updateOption = (idx: number, val: string) => {
    const next = [...options];
    next[idx] = val;
    setOptions(next);
  };

  const handleRemoveOption = (idx: number) => {
    if (options.length <= MIN_OPTIONS) return;
    setOptions(options.filter((_, i) => i !== idx));
  };

  const handleSend = () => {
    if (!question.trim()) {
      Alert.alert('Error', 'Question cannot be empty');
      return;
    }
    const validOptions = options.map((o) => o.trim()).filter(Boolean);
    if (validOptions.length < MIN_OPTIONS) {
      Alert.alert('Error', 'At least 2 valid options are required');
      return;
    }
    onSend({
      question: question.trim(),
      options: validOptions,
      multipleChoice,
      anonymous,
      votes: {},
    });
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable className="flex-1 justify-end bg-black/30" onPress={handleClose}>
        <Pressable
          className="rounded-t-2xl pt-3 pb-9 px-5"
          style={{ backgroundColor: Colors.white, maxHeight: '88%' }}
          onPress={() => {}}
        >
          {/* Handle bar */}
          <View className="items-center mb-4">
            <View
              className="w-9 h-1 rounded-full"
              style={{ backgroundColor: Colors.borderLight }}
            />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View className="flex-row items-center mb-5">
              <View className="w-9 h-9 rounded-full items-center justify-center mr-3 bg-sky-100">
                <Ionicons name="bar-chart-outline" size={20} color="#0284c7" />
              </View>
              <Text className="text-[17px] font-semibold" style={{ color: Colors.text }}>
                Create a poll
              </Text>
              <TouchableOpacity onPress={handleClose} className="ml-auto p-1">
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Question */}
            <Text className="text-[13px] font-medium mb-1.5" style={{ color: Colors.text }}>
              Question <Text style={{ color: Colors.error }}>*</Text>
            </Text>
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder="Enter your poll question..."
              placeholderTextColor={Colors.textLight}
              className="border rounded-[10px] px-3 py-2.5 text-sm mb-4"
              style={{ borderColor: Colors.borderLight, color: Colors.text }}
            />

            {/* Options */}
            <Text className="text-[13px] font-medium mb-2" style={{ color: Colors.text }}>
              Options
            </Text>
            {options.map((opt, idx) => (
              <View key={idx} className="flex-row items-center mb-2 gap-2">
                <TextInput
                  value={opt}
                  onChangeText={(val) => updateOption(idx, val)}
                  placeholder={`Option ${idx + 1}...`}
                  placeholderTextColor={Colors.textLight}
                  className="flex-1 border rounded-[10px] px-3 py-2 text-sm"
                  style={{ borderColor: Colors.borderLight, color: Colors.text }}
                />
                {options.length > MIN_OPTIONS && (
                  <TouchableOpacity onPress={() => handleRemoveOption(idx)} className="p-1">
                    <Ionicons name="close-circle" size={22} color={Colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {options.length < MAX_OPTIONS && (
              <TouchableOpacity
                onPress={() => setOptions([...options, ''])}
                className="flex-row items-center py-2 mb-4 gap-1.5"
              >
                <Ionicons name="add-circle-outline" size={18} color={Colors.cta} />
                <Text className="text-[13px] font-medium" style={{ color: Colors.cta }}>
                  Add more options
                </Text>
              </TouchableOpacity>
            )}

            {/* Toggle switches */}
            <View
              className="flex-row items-center py-3 border-t mb-2"
              style={{ borderTopColor: Colors.borderLight }}
            >
              <Text className="flex-1 text-sm" style={{ color: Colors.text }}>
                Allow multiple choices
              </Text>
              <Switch
                value={multipleChoice}
                onValueChange={setMultipleChoice}
                trackColor={{ false: Colors.borderLight, true: Colors.cta }}
                thumbColor={Colors.white}
              />
            </View>

            <View
              className="flex-row items-center py-3 border-t mb-5"
              style={{ borderTopColor: Colors.borderLight }}
            >
              <Text className="flex-1 text-sm" style={{ color: Colors.text }}>
                Anonymous voting
              </Text>
              <Switch
                value={anonymous}
                onValueChange={setAnonymous}
                trackColor={{ false: Colors.borderLight, true: Colors.cta }}
                thumbColor={Colors.white}
              />
            </View>

            {/* Buttons */}
            <View className="flex-row gap-2.5">
              <TouchableOpacity
                onPress={handleClose}
                className="flex-1 py-3 rounded-xl items-center"
                style={{ backgroundColor: Colors.bg }}
              >
                <Text className="text-[15px] font-medium" style={{ color: Colors.textMuted }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSend}
                className="flex-[2] py-3 rounded-xl items-center bg-sky-600"
              >
                <Text className="text-[15px] font-semibold text-white">
                  Create poll
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
