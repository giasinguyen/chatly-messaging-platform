import { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

interface VideoPlayerProps {
  url: string;
  name?: string;
}

export function VideoPlayer({ url, name }: VideoPlayerProps) {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        setError(true);
        setIsLoading(false);
      } else {
        // Not loaded yet, show loading indicator
        setIsLoading(true);
      }
      return;
    }
    
    // Now TypeScript knows status is AVPlaybackStatusSuccess
    setIsPlaying(status.isPlaying);
    setIsLoading(status.isBuffering);
    
    if (status.didJustFinish) {
      setHasStarted(false);
      setIsPlaying(false);
      videoRef.current?.setPositionAsync(0);
    }
  }, []);

  const handleTogglePlay = useCallback(async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      if (!hasStarted) setHasStarted(true);
      await videoRef.current.playAsync();
    }
  }, [isPlaying, hasStarted]);

  return (
    <View className="overflow-hidden rounded-2xl bg-black" style={{ width: 260, height: 180, marginBottom: 8 }}>
      <Video
        ref={videoRef}
        source={{ uri: url }}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={false}
        isLooping={false}
        useNativeControls={hasStarted}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        style={{ width: '100%', height: '100%' }}
        usePoster={!hasStarted}
        posterSource={{ uri: url }}
        posterStyle={{ resizeMode: 'cover' }}
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
