import { useEffect, useRef } from 'react';
import { View, Text, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

interface VoiceRecordingBarProps {
  elapsedSeconds: number;
  onSend: () => void;
  onCancel: () => void;
  isSending: boolean;
}

const PULSE_COLORS = [Colors.error, '#ff6b6b'];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VoiceRecordingBar({ elapsedSeconds, onSend, onCancel, isSending }: VoiceRecordingBarProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseColorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1.35, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseColorAnim, { toValue: 1, duration: 700, useNativeDriver: false }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseColorAnim, { toValue: 0, duration: 700, useNativeDriver: false }),
        ]),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim, pulseColorAnim]);

  const dotColor = pulseColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: PULSE_COLORS,
  });

  return (
    <View
      className="flex-row items-center border-t px-4 py-2"
      style={{ backgroundColor: Colors.bgCard, borderTopColor: Colors.borderLight }}
    >
      {/* Cancel button */}
      <TouchableOpacity
        onPress={onCancel}
        disabled={isSending}
        className="h-9 w-9 items-center justify-center"
      >
        <Ionicons name="trash-outline" size={22} color={Colors.error} />
      </TouchableOpacity>

      {/* Recording indicator + timer */}
      <View className="ml-3 flex-1 flex-row items-center">
        <Animated.View
          className="h-2.5 w-2.5 rounded-full"
          style={{ transform: [{ scale: pulseAnim }], backgroundColor: dotColor }}
        />
        <Text className="ml-2 text-[15px] font-semibold tabular-nums" style={{ color: Colors.text }}>
          {formatDuration(elapsedSeconds)}
        </Text>
        <Text className="ml-2 text-[13px]" style={{ color: Colors.textMuted }}>
          Recording…
        </Text>
      </View>

      {/* Send button */}
      <TouchableOpacity
        onPress={onSend}
        disabled={isSending}
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: Colors.cta }}
      >
        {isSending ? (
          <Ionicons name="hourglass-outline" size={20} color={Colors.white} />
        ) : (
          <Ionicons name="send" size={20} color={Colors.white} />
        )}
      </TouchableOpacity>
    </View>
  );
}
