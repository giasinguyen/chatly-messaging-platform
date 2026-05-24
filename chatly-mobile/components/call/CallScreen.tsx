import { Alert, View, Text, TouchableOpacity, Modal } from 'react-native';
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
import { IS_WEBRTC_CALL_ENABLED } from '@/constants/runtime';
import type { IncomingCall } from '@/types/call';

interface CallScreenProps {
  visible: boolean;
  incomingCall: IncomingCall;
  onAccept: () => void;
  onReject: () => void;
}

export function CallScreen({ visible, incomingCall, onAccept, onReject }: CallScreenProps) {
  // Pulsing animation for circle around avatar
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  useEffect(() => {
    if (visible) {
      pulseScale.value = withRepeat(
        withTiming(1.6, { duration: 1200, easing: Easing.out(Easing.ease) }),
        -1,
        true
      );
      pulseOpacity.value = withRepeat(
        withTiming(0, { duration: 1200, easing: Easing.out(Easing.ease) }),
        -1,
        true
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

  const callLabel = incomingCall.type === 'VIDEO' ? 'Video call...' : 'Calling...';

  const handleAccept = () => {
    if (!IS_WEBRTC_CALL_ENABLED) {
      Alert.alert(
        'Call unavailable in Expo Go',
        'Calling is only available in a development build. Please build the app to use voice/video calls.'
      );
      return;
    }

    onAccept();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}>
        {/* Caller info */}
        <View className="mb-12 items-center">
          {/* Pulsing circle */}
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
            <Avatar uri={incomingCall.callerAvatar} name={incomingCall.callerName} size={100} />
          </View>

          <Text className="mt-6 text-2xl font-bold" style={{ color: Colors.white }}>
            {incomingCall.callerName}
          </Text>
          <Text className="mt-2 text-base" style={{ color: Colors.textLight }}>
            {callLabel}
          </Text>
        </View>

        {/* Accept / Reject buttons */}
        <View className="flex-row items-center justify-center" style={{ gap: 60 }}>
          {/* Reject button (red) */}
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
              activeOpacity={0.7}>
              <Ionicons name="close" size={36} color={Colors.white} />
            </TouchableOpacity>
            <Text className="mt-2 text-sm" style={{ color: Colors.textLight }}>
              Decline
            </Text>
          </View>

          {/* Accept button (green) */}
          <View className="items-center">
            <TouchableOpacity
              onPress={handleAccept}
              className="items-center justify-center"
              style={{
                width: 70,
                height: 70,
                borderRadius: 35,
                backgroundColor: Colors.online,
              }}
              activeOpacity={0.7}>
              <Ionicons
                name={incomingCall.type === 'VIDEO' ? 'videocam' : 'call'}
                size={32}
                color={Colors.white}
              />
            </TouchableOpacity>
            <Text className="mt-2 text-sm" style={{ color: Colors.textLight }}>
              Accept
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
