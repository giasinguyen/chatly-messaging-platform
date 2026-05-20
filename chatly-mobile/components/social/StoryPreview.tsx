import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { STORY_BACKGROUNDS } from '@/constants/story';
import type { MusicTrack } from '@/types/music';
import type { StoryStep, SelectedStoryAsset } from '@/hooks/useCreateStory';
import { StoryVideoPreview } from './StoryVideoPreview';

interface StoryPreviewProps {
  step: StoryStep;
  textValue: string;
  bgIndex: number;
  fontSize: number;
  asset: SelectedStoryAsset | null;
  selectedTrack: MusicTrack | null;
}

export function StoryPreview({
  step,
  textValue,
  bgIndex,
  fontSize,
  asset,
  selectedTrack,
}: StoryPreviewProps) {
  const background = STORY_BACKGROUNDS[bgIndex] ?? STORY_BACKGROUNDS[0];
  const isTextStory = step === 'text';
  const text = textValue.trim() || 'Your feeling?';

  return (
    <View className="items-center px-5 py-4">
      <View
        className="relative aspect-[9/16] w-full max-w-[300px] overflow-hidden rounded-3xl"
        style={{ backgroundColor: background.color }}>
        {step === 'photo' && asset ? (
          <Image
            source={{ uri: asset.uri }}
            contentFit="cover"
            style={{ width: '100%', height: '100%' }}
          />
        ) : null}

        {step === 'video' && asset ? <StoryVideoPreview uri={asset.uri} shouldAutoPlay /> : null}

        {(isTextStory || textValue.trim()) && (
          <View className="absolute inset-0 items-center justify-center px-5">
            <Text
              className="text-center font-bold text-white"
              style={{
                fontSize,
                textShadowColor: 'rgba(0,0,0,0.35)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 8,
              }}>
              {text}
            </Text>
          </View>
        )}

        {selectedTrack && (
          <View className="absolute bottom-8 left-5 right-5 flex-row items-center rounded-2xl bg-white/90 px-3 py-2">
            {selectedTrack.albumImage ? (
              <Image
                source={{ uri: selectedTrack.albumImage }}
                contentFit="cover"
                className="h-10 w-10 rounded-xl"
              />
            ) : (
              <View className="h-10 w-10 rounded-xl bg-[#F5F5F7]" />
            )}
            <View className="ml-3 flex-1">
              <Text numberOfLines={1} className="text-sm font-bold text-[#1D1D1F]">
                {selectedTrack.name}
              </Text>
              <Text numberOfLines={1} className="text-xs text-[#6E6E73]">
                {selectedTrack.artistName}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
