import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useCallback } from 'react';
import { Colors } from '@/constants/theme';
import type { CallType } from '@/types/call';

const COUNTDOWN_SECONDS = 3;

interface GroupCallConfirmDialogProps {
  visible: boolean;
  groupName: string;
  callType: CallType;
  onConfirm: () => void;
  onCancel: () => void;
}

export function GroupCallConfirmDialog({
  visible,
  groupName,
  callType,
  onConfirm,
  onCancel,
}: GroupCallConfirmDialogProps) {
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  const handleConfirm = useCallback(() => {
    onConfirm();
  }, [onConfirm]);

  // Reset countdown when dialog becomes visible
  useEffect(() => {
    if (!visible) {
      setCountdown(COUNTDOWN_SECONDS);
      return;
    }

    setCountdown(COUNTDOWN_SECONDS);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visible]);

  const callLabel = callType === 'VIDEO' ? 'video call' : 'voice call';
  const iconName = callType === 'VIDEO' ? 'videocam' : 'call';

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
    >
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      >
        <View
          className="mx-6 rounded-2xl p-6"
          style={{
            backgroundColor: Colors.white,
            width: '85%',
            maxWidth: 340,
            shadowColor: Colors.black,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 16,
            elevation: 12,
          }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <Text
              className="text-lg font-semibold"
              style={{ color: Colors.text, flex: 1 }}
            >
              Start group {callLabel}?
            </Text>
            <TouchableOpacity
              onPress={onCancel}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View className="flex-row items-center mb-6" style={{ gap: 12 }}>
            <View
              className="items-center justify-center"
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: `${Colors.cta}20`,
              }}
            >
              <Ionicons name={iconName} size={24} color={Colors.cta} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                className="text-sm font-medium"
                style={{ color: Colors.text }}
                numberOfLines={1}
              >
                {groupName}
              </Text>
              <Text
                className="text-xs mt-0.5"
                style={{ color: Colors.textMuted }}
              >
                All group members will be notified
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View className="flex-row" style={{ gap: 12 }}>
            <TouchableOpacity
              onPress={onCancel}
              className="flex-1 items-center justify-center rounded-xl py-3"
              style={{
                borderWidth: 1,
                borderColor: Colors.borderLight,
              }}
              activeOpacity={0.7}
            >
              <Text
                className="text-sm font-medium"
                style={{ color: Colors.text }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              className="flex-1 items-center justify-center rounded-xl py-3"
              style={{ backgroundColor: Colors.cta }}
              activeOpacity={0.7}
            >
              <Text className="text-sm font-medium" style={{ color: Colors.white }}>
                {countdown > 0 ? `Start (${countdown}s)` : 'Start'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
