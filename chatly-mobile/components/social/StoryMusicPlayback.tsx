import { useEffect, useRef } from 'react';
import { createAudioPlayer, type AudioPlayer as ExpoAudioPlayer } from 'expo-audio';

interface StoryMusicPlaybackProps {
  uri: string;
  shouldPlay: boolean;
}

export function StoryMusicPlayback({ uri, shouldPlay }: StoryMusicPlaybackProps) {
  const playerRef = useRef<ExpoAudioPlayer | null>(null);
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    const player = createAudioPlayer({ uri }, { updateInterval: 500 });
    subscriptionRef.current = player.addListener('playbackStatusUpdate', (status) => {
      if (status.isLoaded && status.didJustFinish) {
        player
          .seekTo(0)
          .then(() => player.play())
          .catch(() => undefined);
      }
    });
    playerRef.current = player;

    return () => {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      player.remove();
      playerRef.current = null;
    };
  }, [uri]);

  useEffect(() => {
    if (!playerRef.current) return;
    if (shouldPlay) {
      playerRef.current.play();
    } else {
      playerRef.current.pause();
    }
  }, [shouldPlay]);

  return null;
}
