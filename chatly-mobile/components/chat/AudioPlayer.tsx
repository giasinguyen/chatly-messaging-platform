import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

interface AudioPlayerProps {
  url: string;
  name?: string;
  isMe: boolean;
}

const FORMAT_DURATION = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export function AudioPlayer({ url, name, isMe }: AudioPlayerProps) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setIsPlaying(status.isPlaying);
    setPositionMs(status.positionMillis);
    if (status.durationMillis) {
      setDurationMs(status.durationMillis);
    }
    if (status.didJustFinish) {
      setIsPlaying(false);
      setPositionMs(0);
    }
  }, []);

  const handleTogglePlay = useCallback(async () => {
    if (!soundRef.current) {
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        handlePlaybackStatusUpdate,
      );
      soundRef.current = sound;
      return;
    }
    if (isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      await soundRef.current.playAsync();
    }
  }, [url, isPlaying, handlePlaybackStatusUpdate]);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const progress = durationMs > 0 ? positionMs / durationMs : 0;
  const accentColor = isMe ? Colors.bubbleSenderText : Colors.cta;

  return (
    <View
      className="flex-row items-center rounded-xl px-3 py-2"
      style={{
        backgroundColor: isMe ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.07)',
        minWidth: 180,
      }}
    >
      <TouchableOpacity onPress={handleTogglePlay} activeOpacity={0.7}>
        <Ionicons
          name={isPlaying ? 'pause-circle' : 'play-circle'}
          size={28}
          color={accentColor}
        />
      </TouchableOpacity>

      <View className="ml-2 flex-1">
        {/* Progress bar */}
        <View
          className="rounded-full"
          style={{ height: 4, backgroundColor: 'rgba(0,0,0,0.1)' }}
        >
          <View
            className="rounded-full"
            style={{
              height: 4,
              width: `${Math.round(progress * 100)}%`,
              backgroundColor: accentColor,
            }}
          />
        </View>

        <View className="mt-1 flex-row items-center justify-between">
          <Text className="text-[10px]" style={{ color: accentColor, opacity: 0.7 }}>
            {durationMs > 0 ? FORMAT_DURATION(positionMs) : '0:00'}
          </Text>
          <Text className="text-[10px]" style={{ color: accentColor, opacity: 0.7 }}>
            {durationMs > 0 ? FORMAT_DURATION(durationMs) : name ?? 'Audio'}
          </Text>
        </View>
      </View>
    </View>
  );
}
