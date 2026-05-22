import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import type { Reel } from '@/types/reel';
import { formatCount, formatPrivacy, getReactionCount, hasReacted } from '../utils/reelFormat';

interface ReelSlideProps {
  reel: Reel;
  isActive: boolean;
  isBusy: boolean;
  onToggleLike: (reel: Reel) => void;
  onOpenComments: (reel: Reel) => void;
  onShare: (reel: Reel) => void;
}

export function ReelSlide({
  reel,
  isActive,
  isBusy,
  onToggleLike,
  onOpenComments,
  onShare,
}: ReelSlideProps) {
  const player = useVideoPlayer({ uri: reel.videoUrl }, (videoPlayer) => {
    videoPlayer.loop = true;
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const p = player as any;
    const statusSubscription = p.addListener('statusChange', ({ status }: any) => {
      setIsLoading(status === 'loading');
    });
    const playingSubscription = p.addListener('playingChange', ({ isPlaying: nowPlaying }: any) => {
      setIsPlaying(nowPlaying);
    });

    return () => {
      statusSubscription.remove();
      playingSubscription.remove();
    };
  }, [player]);

  useEffect(() => {
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [player, isActive]);

  const handleTogglePlay = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  const isLiked = hasReacted(reel);
  const authorLabel = reel.authorDisplayName ?? reel.authorUsername ?? 'Chatly user';

  return (
    <View className="flex-1 bg-black justify-center items-center relative">
      <Pressable onPress={handleTogglePlay} className="absolute inset-0">
        <VideoView
          player={player}
          contentFit="contain"
          nativeControls={false}
          onFirstFrameRender={() => setIsLoading(false)}
          style={{ width: '100%', height: '100%' }}
        />
      </Pressable>

      {/* Large play pause indicator when paused */}
      {!isPlaying && !isLoading && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleTogglePlay}
          className="absolute items-center justify-center pointer-events-none">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-black/40">
            <Ionicons name="play" size={32} color={Colors.white} />
          </View>
        </TouchableOpacity>
      )}

      {/* Loading state indicator */}
      {isLoading && (
        <View className="absolute inset-0 items-center justify-center bg-black/20">
          <ActivityIndicator size="large" color={Colors.white} />
        </View>
      )}

      {/* Right Column Action Buttons */}
      <View className="absolute right-4 bottom-32 z-10 items-center justify-center gap-5">
        {/* Like Button */}
        <View className="items-center">
          <TouchableOpacity
            disabled={isBusy}
            onPress={() => onToggleLike(reel)}
            activeOpacity={0.7}
            className="h-12 w-12 rounded-full bg-black/40 items-center justify-center border border-white/10 shadow">
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={26}
              color={isLiked ? '#FF3B30' : Colors.white}
            />
          </TouchableOpacity>
          <Text className="text-white text-xs font-semibold mt-1 shadow-sm">
            {formatCount(getReactionCount(reel))}
          </Text>
        </View>

        {/* Comment Button */}
        <View className="items-center">
          <TouchableOpacity
            onPress={() => onOpenComments(reel)}
            activeOpacity={0.7}
            className="h-12 w-12 rounded-full bg-black/40 items-center justify-center border border-white/10 shadow">
            <Ionicons name="chatbubble-outline" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text className="text-white text-xs font-semibold mt-1 shadow-sm">
            {formatCount(reel.commentCount)}
          </Text>
        </View>

        {/* Share Button */}
        <View className="items-center">
          <TouchableOpacity
            onPress={() => onShare(reel)}
            activeOpacity={0.7}
            className="h-12 w-12 rounded-full bg-black/40 items-center justify-center border border-white/10 shadow">
            <Ionicons name="share-social-outline" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text className="text-white text-xs font-semibold mt-1 shadow-sm">
            {formatCount(reel.shareCount)}
          </Text>
        </View>
      </View>

      {/* Bottom Info Overlay */}
      <View className="absolute left-4 right-20 bottom-8 z-10 pointer-events-none gap-2">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 rounded-full border border-white/20 overflow-hidden bg-white/10">
            {reel.authorAvatarUrl ? (
              <Image
                source={{ uri: reel.authorAvatarUrl }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <View className="flex-1 items-center justify-center bg-white/20">
                <Text className="text-white font-semibold">
                  {authorLabel.slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <View>
            <Text className="text-white font-semibold text-sm shadow-sm">{authorLabel}</Text>
            <Text className="text-white/70 text-xs shadow-sm">
              {formatPrivacy(reel.visibility)}
            </Text>
          </View>
        </View>

        {reel.caption ? (
          <Text className="text-white text-sm leading-5 mt-1 shadow-sm" numberOfLines={3}>
            {reel.caption}
          </Text>
        ) : null}

        <View className="flex-row items-center gap-1.5 self-start rounded-full bg-white/10 px-3 py-1 mt-1">
          <Ionicons name="eye-outline" size={14} color={Colors.white} />
          <Text className="text-white text-xs font-medium">
            {formatCount(reel.viewCount)} views
          </Text>
        </View>
      </View>
    </View>
  );
}
