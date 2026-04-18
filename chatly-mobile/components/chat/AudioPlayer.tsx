import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

interface AudioPlayerProps {
  url: string;
  name?: string;
  isMe: boolean;
}

const FORMAT_DURATION = (ms: number): string => {
  if (isNaN(ms) || ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export function AudioPlayer({ url, name, isMe }: AudioPlayerProps) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [error, setError] = useState(false);

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) setError(true);
      return;
    }
    
    setIsPlaying(status.isPlaying);
    setPositionMs(status.positionMillis);
    if (status.durationMillis) {
      setDurationMs(status.durationMillis);
    }
    
    if (status.didJustFinish) {
      setIsPlaying(false);
      setPositionMs(0);
      soundRef.current?.setPositionAsync(0);
    }
  }, []);

  const handleTogglePlay = useCallback(async () => {
    try {
      if (!soundRef.current) {
        setIsLoading(true);
        setError(false);
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true },
          handlePlaybackStatusUpdate,
        );
        soundRef.current = sound;
        setIsLoading(false);
        return;
      }

      if (isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
    } catch (err) {
      console.error('Audio playback error:', err);
      setError(true);
      setIsLoading(false);
    }
  }, [url, isPlaying, handlePlaybackStatusUpdate]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const progress = durationMs > 0 ? positionMs / durationMs : 0;
  const accentColor = isMe ? Colors.bubbleSenderText : Colors.cta;
  const mutedColor = isMe ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.1)';

  return (
    <View
      className="flex-row items-center rounded-2xl px-4 py-3"
      style={{
        backgroundColor: isMe ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.05)',
        minWidth: 200,
        marginBottom: 4,
      }}
    >
      <TouchableOpacity onPress={handleTogglePlay} activeOpacity={0.7} disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator size="small" color={accentColor} style={{ width: 32, height: 32 }} />
        ) : (
          <Ionicons
            name={error ? 'alert-circle' : isPlaying ? 'pause' : 'play'}
            size={32}
            color={accentColor}
          />
        )}
      </TouchableOpacity>

      <View className="ml-3 flex-1">
        {/* Progress bar container */}
        <View
          className="h-1.5 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: mutedColor }}
        >
          <View
            className="h-full rounded-full"
            style={{
              width: `${Math.round(progress * 100)}%`,
              backgroundColor: accentColor,
            }}
          />
        </View>

        <View className="mt-2 flex-row items-center justify-between">
          <Text className="text-[10px] font-medium" style={{ color: accentColor, opacity: 0.8 }}>
            {isPlaying || positionMs > 0 ? FORMAT_DURATION(positionMs) : '0:00'}
          </Text>
          <Text className="text-[10px] font-medium" style={{ color: accentColor, opacity: 0.8 }} numberOfLines={1}>
            {error ? 'Load Error' : durationMs > 0 ? FORMAT_DURATION(durationMs) : name || 'Audio Message'}
          </Text>
        </View>
      </View>
    </View>
  );
}
