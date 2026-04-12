import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/theme';
import type { IncomingCall } from '@/types/call';

interface CallScreenProps {
  visible: boolean;
  incomingCall: IncomingCall;
  onAccept: () => void;
  onReject: () => void;
}

export function CallScreen({ visible, incomingCall, onAccept, onReject }: CallScreenProps) {
  // Animation pulsing cho vòng tròn xung quanh avatar
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  useEffect(() => {
    if (visible) {
      pulseScale.value = withRepeat(
        withTiming(1.6, { duration: 1200, easing: Easing.out(Easing.ease) }),
        -1,
        true,
      );
      pulseOpacity.value = withRepeat(
        withTiming(0, { duration: 1200, easing: Easing.out(Easing.ease) }),
        -1,
        true,
      );
    } else {
      pulseScale.value = 1;
      pulseOpacity.value = 0.6;
    }
  }, [visible, pulseScale, pulseOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const callLabel =
    incomingCall.type === 'VIDEO' ? 'Cuộc gọi video...' : 'Đang gọi...';

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
    >
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
      >
        {/* Thông tin người gọi */}
        <View className="items-center mb-12">
          {/* Vòng tròn pulsing */}
          <View className="items-center justify-center" style={{ width: 140, height: 140 }}>
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  width: 140,
                  height: 140,
                  borderRadius: 70,
                  borderWidth: 3,
                  borderColor: Colors.online,
                },
                pulseStyle,
              ]}
            />
            <Avatar
              uri={incomingCall.callerAvatar}
              name={incomingCall.callerName}
              size={100}
            />
          </View>

          <Text
            className="text-2xl font-bold mt-6"
            style={{ color: Colors.white }}
          >
            {incomingCall.callerName}
          </Text>
          <Text
            className="text-base mt-2"
            style={{ color: Colors.textLight }}
          >
            {callLabel}
          </Text>
        </View>

        {/* Nút chấp nhận / từ chối */}
        <View className="flex-row items-center justify-center" style={{ gap: 60 }}>
          {/* Nút từ chối (đỏ) */}
          <View className="items-center">
            <TouchableOpacity
              onPress={onReject}
              className="items-center justify-center"
              style={{
                width: 70,
                height: 70,
                borderRadius: 35,
                backgroundColor: Colors.error,
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={36} color={Colors.white} />
            </TouchableOpacity>
            <Text className="text-sm mt-2" style={{ color: Colors.textLight }}>
              Từ chối
            </Text>
          </View>

          {/* Nút chấp nhận (xanh lá) */}
          <View className="items-center">
            <TouchableOpacity
              onPress={onAccept}
              className="items-center justify-center"
              style={{
                width: 70,
                height: 70,
                borderRadius: 35,
                backgroundColor: Colors.online,
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={incomingCall.type === 'VIDEO' ? 'videocam' : 'call'}
                size={32}
                color={Colors.white}
              />
            </TouchableOpacity>
            <Text className="text-sm mt-2" style={{ color: Colors.textLight }}>
              Chấp nhận
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
