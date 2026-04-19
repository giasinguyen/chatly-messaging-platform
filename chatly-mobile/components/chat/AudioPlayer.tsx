import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

interface AudioPlayerProps {
  url: string;
  name?: string;
  isMe: boolean;
  durationSeconds?: number;
}

const FORMAT_DURATION = (ms: number): string => {
  if (isNaN(ms) || ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export function AudioPlayer({ url, name, isMe, durationSeconds }: AudioPlayerProps) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(durationSeconds != null ? durationSeconds * 1000 : 0);
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

  return (
    <View
      className={[
        'flex-row items-center rounded-2xl px-4 py-3 mb-1',
        isMe ? 'bg-black/15' : 'bg-black/5',
      ].join(' ')}
      style={{ minWidth: 200 }}
    >
      <TouchableOpacity
        onPress={handleTogglePlay}
        activeOpacity={0.7}
        disabled={isLoading}
        className="h-9 w-9 items-center justify-center"
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={accentColor} />
        ) : (
          <Ionicons
            name={error ? 'alert-circle' : isPlaying ? 'pause' : 'play'}
            size={32}
            color={accentColor}
          />
        )}
      </TouchableOpacity>

      <View className="ml-3 flex-1">
        <View className="h-1.5 w-full overflow-hidden rounded-full bg-black/10">
          <View
            className={['h-full rounded-full', isMe ? 'bg-white/80' : 'bg-blue-500'].join(' ')}
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </View>

        <View className="mt-2 flex-row items-center justify-between">
          <Text
            className="text-[10px] font-medium opacity-80"
            style={{ color: accentColor }}
          >
            {isPlaying || positionMs > 0 ? FORMAT_DURATION(positionMs) : '0:00'}
          </Text>
          <Text
            className="max-w-24 text-right text-[10px] font-medium opacity-80"
            style={{ color: accentColor }}
            numberOfLines={1}
          >
            {error ? 'Load Error' : durationMs > 0 ? FORMAT_DURATION(durationMs) : (name ?? 'Audio Message')}
          </Text>
        </View>
      </View>
    </View>
  );
}
