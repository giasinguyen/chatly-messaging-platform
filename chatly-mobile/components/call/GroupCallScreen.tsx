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
import type { IncomingGroupCall } from '@/types/call';

interface GroupCallScreenProps {
  visible: boolean;
  incomingGroupCall: IncomingGroupCall;
  onJoin: () => void;
  onDecline: () => void;
}

export function GroupCallScreen({ visible, incomingGroupCall, onJoin, onDecline }: GroupCallScreenProps) {
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
    incomingGroupCall.type === 'VIDEO' ? 'Group video call' : 'Group voice call';

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
        {/* Group info */}
        <View className="items-center mb-12">
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
              uri={incomingGroupCall.groupAvatarUrl}
              name={incomingGroupCall.groupName}
              size={100}
            />
          </View>

          <Text className="text-2xl font-bold mt-6" style={{ color: Colors.white }}>
            {incomingGroupCall.groupName}
          </Text>
          <Text className="text-base mt-1" style={{ color: Colors.textLight }}>
            {callLabel}
          </Text>
          <Text className="text-sm mt-2" style={{ color: Colors.textMuted }}>
            {incomingGroupCall.initiatorName} is calling •{' '}
            {incomingGroupCall.participantCount} participants
          </Text>
        </View>

        {/* Action buttons */}
        <View className="flex-row items-center" style={{ gap: 48 }}>
          {/* Decline */}
          <View className="items-center" style={{ gap: 8 }}>
            <TouchableOpacity
              onPress={onDecline}
              className="items-center justify-center"
              style={{
                width: 70,
                height: 70,
                borderRadius: 35,
                backgroundColor: Colors.error,
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={30} color={Colors.white} style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
            <Text className="text-sm" style={{ color: Colors.textLight }}>
              Decline
            </Text>
          </View>

          {/* Join */}
          <View className="items-center" style={{ gap: 8 }}>
            <TouchableOpacity
              onPress={onJoin}
              className="items-center justify-center"
              style={{
                width: 70,
                height: 70,
                borderRadius: 35,
                backgroundColor: Colors.online,
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={incomingGroupCall.type === 'VIDEO' ? 'videocam' : 'call'}
                size={30}
                color={Colors.white}
              />
            </TouchableOpacity>
            <Text className="text-sm" style={{ color: Colors.textLight }}>
              Join
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
