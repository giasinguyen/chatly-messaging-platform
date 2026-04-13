import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { groupService } from '@/services/group.service';

interface ReminderModalProps {
  visible: boolean;
  conversationId: string;
  onClose: () => void;
}

function formatDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function ReminderModal({ visible, conversationId, onClose }: ReminderModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date(Date.now() + 3600_000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setTitle('');
    setDescription('');
    setSelectedDate(new Date(Date.now() + 3600_000));
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Lỗi', 'Tiêu đề không được để trống');
      return;
    }

    if (selectedDate <= new Date()) {
      Alert.alert('Lỗi', 'Thời gian nhắc hẹn phải ở trong tương lai');
      return;
    }

    setLoading(true);
    try {
      await groupService.createReminder(conversationId, {
        title: title.trim(),
        description: description.trim() || undefined,
        remindAt: selectedDate.toISOString(),
      });
      Alert.alert('Thành công', 'Đã tạo nhắc hẹn');
      reset();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Không thể tạo nhắc hẹn';
      Alert.alert('Lỗi', msg);
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      const updated = new Date(selectedDate);
      updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      setSelectedDate(updated);
    }
  };

  const onTimeChange = (_event: DateTimePickerEvent, date?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (date) {
      const updated = new Date(selectedDate);
      updated.setHours(date.getHours(), date.getMinutes(), 0, 0);
      setSelectedDate(updated);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}
        onPress={handleClose}
      >
        <Pressable
          style={{
            backgroundColor: Colors.white,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 12,
            paddingBottom: 36,
            paddingHorizontal: 20,
            maxHeight: '90%',
          }}
          onPress={() => {}}
        >
          {/* Handle bar */}
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.borderLight }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#e0e7ff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Ionicons name="alarm-outline" size={20} color={Colors.cta} />
              </View>
              <Text style={{ fontSize: 17, fontWeight: '600', color: Colors.text }}>Tạo nhắc hẹn</Text>
              <TouchableOpacity onPress={handleClose} style={{ marginLeft: 'auto', padding: 4 }}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Title */}
            <Text style={{ fontSize: 13, fontWeight: '500', color: Colors.text, marginBottom: 6 }}>
              Tiêu đề <Text style={{ color: Colors.error }}>*</Text>
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Nhập tiêu đề nhắc hẹn..."
              placeholderTextColor={Colors.textLight}
              style={{
                borderWidth: 1,
                borderColor: Colors.borderLight,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 14,
                color: Colors.text,
                marginBottom: 14,
              }}
            />

            {/* Description */}
            <Text style={{ fontSize: 13, fontWeight: '500', color: Colors.text, marginBottom: 6 }}>
              Mô tả (tuỳ chọn)
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Nhập mô tả..."
              placeholderTextColor={Colors.textLight}
              multiline
              numberOfLines={2}
              style={{
                borderWidth: 1,
                borderColor: Colors.borderLight,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 14,
                color: Colors.text,
                marginBottom: 14,
                minHeight: 60,
                textAlignVertical: 'top',
              }}
            />

            {/* Date & Time */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: Colors.text, marginBottom: 6 }}>
                  Ngày
                </Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={{
                    borderWidth: 1,
                    borderColor: Colors.borderLight,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ fontSize: 14, color: Colors.text }}>{formatDate(selectedDate)}</Text>
                  <Ionicons name="calendar-outline" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: Colors.text, marginBottom: 6 }}>
                  Giờ
                </Text>
                <TouchableOpacity
                  onPress={() => setShowTimePicker(true)}
                  style={{
                    borderWidth: 1,
                    borderColor: Colors.borderLight,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ fontSize: 14, color: Colors.text }}>{formatTime(selectedDate)}</Text>
                  <Ionicons name="time-outline" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={onDateChange}
              />
            )}
            {showTimePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                is24Hour={true}
                onChange={onTimeChange}
              />
            )}

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
                }}
              >
                <Text style={{ fontSize: 15, color: Colors.textMuted, fontWeight: '500' }}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreate}
                disabled={loading}
                style={{
                  flex: 2,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: Colors.cta,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading && <ActivityIndicator size="small" color="white" />}
                <Text style={{ fontSize: 15, color: 'white', fontWeight: '600' }}>Tạo nhắc hẹn</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
