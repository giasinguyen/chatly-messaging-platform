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

interface PollModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (poll: Poll) => void;
}

export function PollModal({ visible, onClose, onSend }: PollModalProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [multipleChoice, setMultipleChoice] = useState(false);

  const reset = () => {
    setQuestion('');
    setOptions(['', '']);
    setMultipleChoice(false);
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
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== idx));
  };

  const handleSend = () => {
    if (!question.trim()) {
      Alert.alert('Lỗi', 'Câu hỏi không được để trống');
      return;
    }
    const validOptions = options.map((o) => o.trim()).filter(Boolean);
    if (validOptions.length < 2) {
      Alert.alert('Lỗi', 'Cần ít nhất 2 lựa chọn hợp lệ');
      return;
    }
    onSend({
      question: question.trim(),
      options: validOptions,
      multipleChoice,
      votes: {},
    });
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}
        onPress={handleClose}>
        <Pressable
          style={{
            backgroundColor: Colors.white,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 12,
            paddingBottom: 36,
            paddingHorizontal: 20,
            maxHeight: '88%',
          }}
          onPress={() => {}}>
          {/* Handle bar */}
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View
              style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.borderLight }}
            />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#e0f2fe',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}>
                <Ionicons name="bar-chart-outline" size={20} color="#0284c7" />
              </View>
              <Text style={{ fontSize: 17, fontWeight: '600', color: Colors.text }}>
                Create a poll
              </Text>
              <TouchableOpacity onPress={handleClose} style={{ marginLeft: 'auto', padding: 4 }}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Question */}
            <Text style={{ fontSize: 13, fontWeight: '500', color: Colors.text, marginBottom: 6 }}>
              Câu hỏi <Text style={{ color: Colors.error }}>*</Text>
            </Text>
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder="Nhập câu hỏi bình chọn..."
              placeholderTextColor={Colors.textLight}
              style={{
                borderWidth: 1,
                borderColor: Colors.borderLight,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 14,
                color: Colors.text,
                marginBottom: 16,
              }}
            />

            {/* Options */}
            <Text style={{ fontSize: 13, fontWeight: '500', color: Colors.text, marginBottom: 8 }}>
              Lựa chọn
            </Text>
            {options.map((opt, idx) => (
              <View
                key={idx}
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                <TextInput
                  value={opt}
                  onChangeText={(val) => updateOption(idx, val)}
                  placeholder={`Lựa chọn ${idx + 1}...`}
                  placeholderTextColor={Colors.textLight}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: Colors.borderLight,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    fontSize: 14,
                    color: Colors.text,
                  }}
                />
                {options.length > 2 && (
                  <TouchableOpacity onPress={() => handleRemoveOption(idx)} style={{ padding: 4 }}>
                    <Ionicons name="close-circle" size={22} color={Colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {options.length < 10 && (
              <TouchableOpacity
                onPress={() => setOptions([...options, ''])}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 8,
                  marginBottom: 16,
                  gap: 6,
                }}>
                <Ionicons name="add-circle-outline" size={18} color={Colors.cta} />
                <Text style={{ fontSize: 13, color: Colors.cta, fontWeight: '500' }}>
                  Add more options
                </Text>
              </TouchableOpacity>
            )}

            {/* Multiple choice toggle */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                borderTopWidth: 1,
                borderTopColor: Colors.borderLight,
                marginBottom: 20,
              }}>
              <Text style={{ flex: 1, fontSize: 14, color: Colors.text }}>Cho phép chọn nhiều</Text>
              <Switch
                value={multipleChoice}
                onValueChange={setMultipleChoice}
                trackColor={{ false: Colors.borderLight, true: Colors.cta }}
                thumbColor={Colors.white}
              />
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={handleClose}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: Colors.bg,
                  alignItems: 'center',
                }}>
                <Text style={{ fontSize: 15, color: Colors.textMuted, fontWeight: '500' }}>
                  Huỷ
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSend}
                style={{
                  flex: 2,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: '#0284c7',
                  alignItems: 'center',
                }}>
                <Text style={{ fontSize: 15, color: 'white', fontWeight: '600' }}>
                  Submit your vote
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
