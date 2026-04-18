import { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
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

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setIsPlaying(status.isPlaying);
    if (status.didJustFinish) {
      setHasStarted(false);
      setIsPlaying(false);
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
    <View className="overflow-hidden rounded-xl" style={{ width: 220, height: 150 }}>
      <Video
        ref={videoRef}
        source={{ uri: url }}
        resizeMode={ResizeMode.COVER}
        shouldPlay={false}
        isLooping={false}
        useNativeControls={hasStarted}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        style={{ width: 220, height: 150 }}
      />
      {!hasStarted && (
        <TouchableOpacity
          onPress={handleTogglePlay}
          activeOpacity={0.8}
          className="absolute inset-0 items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
        >
          <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
          {name ? (
            <Text
              className="mt-1 px-2 text-center text-[11px]"
              style={{ color: 'rgba(255,255,255,0.75)' }}
              numberOfLines={1}
            >
              {name}
            </Text>
          ) : null}
        </TouchableOpacity>
      )}
    </View>
  );
}
