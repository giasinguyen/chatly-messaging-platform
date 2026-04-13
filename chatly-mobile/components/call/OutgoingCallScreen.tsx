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
import { useCallStore } from '@/store/call.store';
import { useCallContext } from '@/contexts/CallContext';

export function OutgoingCallScreen() {
  const callStatus = useCallStore((s) => s.callStatus);
  const remoteParticipant = useCallStore((s) => s.remoteParticipant);
  const incomingCall = useCallStore((s) => s.incomingCall);
  const { endCall } = useCallContext();

  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  // Chỉ hiện khi người dùng là người GỌI (không có cuộc gọi đến)
  const visible = !incomingCall && (callStatus === 'RINGING' || callStatus === 'REJECTED');

  useEffect(() => {
    if (callStatus === 'RINGING') {
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
      pulseOpacity.value = 0;
    }
  }, [callStatus, pulseScale, pulseOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  if (!visible) return null;

  const name = remoteParticipant?.name ?? 'Connecting...';
  const avatar = remoteParticipant?.avatar ?? null;

  let statusText = 'Ringing...';
  if (callStatus === 'REJECTED') statusText = 'Call rejected';

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
    >
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.88)' }}
      >
        {/* Thông tin người nhận */}
        <View className="items-center mb-12">
          <Text className="mb-6 text-sm" style={{ color: Colors.textMuted }}>
            Đang gọi...
          </Text>

          {/* Avatar + pulse */}
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
            <Avatar uri={avatar} name={name} size={110} />
          </View>

          <Text className="mt-5 text-2xl font-semibold" style={{ color: Colors.white }}>
            {name}
          </Text>
          <Text className="mt-2 text-sm" style={{ color: Colors.textMuted }}>
            {statusText}
          </Text>
        </View>

        {/* Nút hủy — chỉ khi đang ringing */}
        {callStatus === 'RINGING' && (
          <View className="items-center" style={{ gap: 8 }}>
            <TouchableOpacity
              onPress={() => endCall()}
              className="items-center justify-center"
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: '#ef4444',
              }}
            >
              <Ionicons name="call" size={28} color={Colors.white} style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
            <Text className="text-xs" style={{ color: Colors.textMuted }}>
              Hủy cuộc gọi
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}
