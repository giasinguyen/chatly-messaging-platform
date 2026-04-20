import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';

interface VideoPlayerProps {
  url: string;
  name?: string;
}

export function VideoPlayer({ url, name }: VideoPlayerProps) {
  const player = useVideoPlayer({ uri: url }, (videoPlayer) => {
    videoPlayer.loop = false;
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const statusSubscription = player.addListener('statusChange', ({ status, error: playerError }) => {
      setIsLoading(status === 'loading');
      if (status === 'error' || playerError) {
        setError(true);
      }
    });

    const playingSubscription = player.addListener('playingChange', ({ isPlaying: isNowPlaying }) => {
      setIsPlaying(isNowPlaying);
    });

    const endSubscription = player.addListener('playToEnd', () => {
      setHasStarted(false);
      setIsPlaying(false);
      player.currentTime = 0;
    });

    return () => {
      statusSubscription.remove();
      playingSubscription.remove();
      endSubscription.remove();
    };
  }, [player]);

  const handleTogglePlay = useCallback(async () => {
    if (isLoading) return;

    if (isPlaying) {
      player.pause();
    } else {
      if (error) {
        await player.replaceAsync({ uri: url });
        setError(false);
      }
      if (!hasStarted) setHasStarted(true);
      player.play();
    }
  }, [error, hasStarted, isLoading, isPlaying, player, url]);

  return (
    <View className="overflow-hidden rounded-2xl bg-black" style={{ width: 260, height: 180, marginBottom: 8 }}>
      <VideoView
        player={player}
        contentFit="contain"
        nativeControls={hasStarted}
        onFirstFrameRender={() => setIsLoading(false)}
        style={{ width: '100%', height: '100%' }}
      />
      
      {!hasStarted && !error && (
        <TouchableOpacity
          onPress={handleTogglePlay}
          activeOpacity={0.9}
          className="absolute inset-0 items-center justify-center bg-black/20"
        >
          <View className="h-16 w-16 items-center justify-center rounded-full bg-white/20 blur-md" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
            <View className="h-12 w-12 items-center justify-center rounded-full bg-white">
              <Ionicons name="play" size={24} color="black" style={{ marginLeft: 3 }} />
            </View>
          </View>
          {name ? (
            <View className="absolute bottom-3 left-3 right-3 bg-black/40 px-3 py-1.5 rounded-lg">
              <Text
                className="text-center text-[10px] font-medium text-white"
                numberOfLines={1}
              >
                {name}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
      )}

      {isLoading && (
        <View className="absolute inset-0 items-center justify-center bg-black/10">
          <ActivityIndicator color="white" />
        </View>
      )}

      {error && (
        <View className="absolute inset-0 items-center justify-center bg-black/60 p-4">
          <Ionicons name="alert-circle" size={32} color="white" />
          <Text className="mt-2 text-center text-xs text-white">Failed to load video</Text>
        </View>
      )}
    </View>
  );
}
