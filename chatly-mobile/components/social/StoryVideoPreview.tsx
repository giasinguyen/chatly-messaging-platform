import { useEffect, useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

interface StoryVideoPreviewProps {
  uri: string;
  shouldLoop?: boolean;
  shouldAutoPlay?: boolean;
}

export function StoryVideoPreview({
  uri,
  shouldLoop = true,
  shouldAutoPlay = false,
}: StoryVideoPreviewProps) {
  const player = useVideoPlayer({ uri }, (videoPlayer) => {
    videoPlayer.loop = shouldLoop;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const statusSubscription = player.addListener('statusChange', ({ status }) => {
      setIsLoading(status === 'loading');
    });
    const playingSubscription = player.addListener(
      'playingChange',
      ({ isPlaying: isNowPlaying }) => {
        setIsPlaying(isNowPlaying);
      }
    );
    return () => {
      statusSubscription.remove();
      playingSubscription.remove();
    };
  }, [player]);

  useEffect(() => {
    if (shouldAutoPlay) {
      player.play();
    } else {
      player.pause();
    }
  }, [player, shouldAutoPlay]);

  const handleToggle = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  return (
    <View className="absolute inset-0 bg-black">
      <VideoView
        player={player}
        contentFit="cover"
        nativeControls={false}
        onFirstFrameRender={() => setIsLoading(false)}
        style={{ width: '100%', height: '100%' }}
      />
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleToggle}
        className="absolute inset-0 items-center justify-center">
        {!isPlaying && (
          <View className="h-14 w-14 items-center justify-center rounded-full bg-black/45">
            <Ionicons name="play" size={24} color={Colors.white} />
          </View>
        )}
      </TouchableOpacity>
      {isLoading && (
        <View className="absolute inset-0 items-center justify-center bg-black/30">
          <ActivityIndicator color={Colors.white} />
        </View>
      )}
    </View>
  );
}
