import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import {
  createAudioPlayer,
  type AudioPlayer as ExpoAudioPlayer,
  type AudioStatus,
} from 'expo-audio';
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
  const playerRef = useRef<ExpoAudioPlayer | null>(null);
  const statusSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(durationSeconds != null ? durationSeconds * 1000 : 0);
  const [error, setError] = useState(false);

  const handlePlaybackStatusUpdate = useCallback((status: AudioStatus) => {
    if (!status.isLoaded) {
      return;
    }

    setIsPlaying(status.playing);
    setPositionMs(Math.round(status.currentTime * 1000));
    if (status.duration > 0) {
      setDurationMs(Math.round(status.duration * 1000));
    }

    if (status.didJustFinish) {
      setIsPlaying(false);
      setPositionMs(0);
      playerRef.current?.seekTo(0).catch(() => {
        // Ignore seek cleanup failure after playback completion.
      });
    }
  }, []);

  const initializePlayer = useCallback((): ExpoAudioPlayer => {
    if (playerRef.current) {
      return playerRef.current;
    }

    const player = createAudioPlayer({ uri: url }, { updateInterval: 250 });
    statusSubscriptionRef.current = player.addListener('playbackStatusUpdate', handlePlaybackStatusUpdate);
    playerRef.current = player;
    return player;
  }, [handlePlaybackStatusUpdate, url]);

  const handleTogglePlay = useCallback(async () => {
    try {
      if (!playerRef.current) {
        setIsLoading(true);
        setError(false);
        const player = initializePlayer();
        player.play();
        setIsLoading(false);
        return;
      }

      if (isPlaying) {
        playerRef.current.pause();
      } else {
        playerRef.current.play();
      }
    } catch (err) {
      console.error('Audio playback error:', err);
      setError(true);
      setIsLoading(false);
    }
  }, [initializePlayer, isPlaying]);

  useEffect(() => {
    setIsPlaying(false);
    setIsLoading(false);
    setError(false);
    setPositionMs(0);
    if (durationSeconds != null) {
      setDurationMs(durationSeconds * 1000);
    }

    if (playerRef.current) {
      playerRef.current.pause();
      playerRef.current.replace({ uri: url });
    }
  }, [durationSeconds, url]);

  useEffect(() => {
    return () => {
      statusSubscriptionRef.current?.remove();
      statusSubscriptionRef.current = null;
      playerRef.current?.remove();
      playerRef.current = null;
    };
  }, []);

  const progress = durationMs > 0 ? positionMs / durationMs : 0;
  const accentColor = isMe ? Colors.bubbleSenderText : Colors.cta;
  const cardBgColor = isMe ? 'rgba(255,255,255,0.16)' : Colors.bgCard;
  const cardBorderColor = isMe ? 'rgba(255,255,255,0.22)' : Colors.borderLight;

  return (
    <View
      className="mb-1 flex-row items-center rounded-2xl px-3 py-2.5"
      style={{ minWidth: 200, backgroundColor: cardBgColor, borderWidth: 1, borderColor: cardBorderColor }}
    >
      <TouchableOpacity
        onPress={handleTogglePlay}
        activeOpacity={0.7}
        disabled={isLoading}
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: isMe ? 'rgba(255,255,255,0.18)' : Colors.ctaLight }}
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
        <View
          className="h-1.5 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: isMe ? 'rgba(255,255,255,0.3)' : Colors.borderLight }}
        >
          <View
            className="h-full rounded-full"
            style={{
              width: `${Math.round(progress * 100)}%`,
              backgroundColor: isMe ? 'rgba(255,255,255,0.9)' : Colors.cta,
            }}
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
