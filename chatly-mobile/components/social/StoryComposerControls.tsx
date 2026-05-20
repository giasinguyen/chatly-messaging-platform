import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  STORY_BACKGROUNDS,
  STORY_PRIVACY_OPTIONS,
  MIN_STORY_FONT_SIZE,
  MAX_STORY_FONT_SIZE,
} from '@/constants/story';
import { Colors } from '@/constants/theme';
import type { MusicTrack } from '@/types/music';
import type { StoryPrivacy } from '@/types/story';
import type { StoryStep } from '@/hooks/useCreateStory';

interface StoryComposerControlsProps {
  step: StoryStep;
  textValue: string;
  bgIndex: number;
  fontSize: number;
  privacy: StoryPrivacy;
  selectedTrack: MusicTrack | null;
  onChangeText: (value: string) => void;
  onChangeBackground: (value: number) => void;
  onChangePrivacy: (value: StoryPrivacy) => void;
  onDecreaseFont: () => void;
  onIncreaseFont: () => void;
  onOpenMusic: () => void;
  onRemoveMusic: () => void;
}

export function StoryComposerControls({
  step,
  textValue,
  bgIndex,
  fontSize,
  privacy,
  selectedTrack,
  onChangeText,
  onChangeBackground,
  onChangePrivacy,
  onDecreaseFont,
  onIncreaseFont,
  onOpenMusic,
  onRemoveMusic,
}: StoryComposerControlsProps) {
  return (
    <View className="gap-4 px-4 pb-5">
      <View>
        <Text className="mb-2 text-xs font-bold uppercase text-[#6E6E73]">Caption</Text>
        <TextInput
          value={textValue}
          onChangeText={onChangeText}
          multiline
          maxLength={220}
          placeholder={step === 'text' ? 'What is on your mind?' : 'Add text overlay'}
          placeholderTextColor={Colors.textLight}
          className="min-h-[86px] rounded-2xl border border-[#D1D1D6] px-3 py-3 text-[15px] text-[#1D1D1F]"
          textAlignVertical="top"
        />
      </View>

      <View>
        <Text className="mb-2 text-xs font-bold uppercase text-[#6E6E73]">Privacy</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2">
          {STORY_PRIVACY_OPTIONS.map((option) => {
            const isSelected = privacy === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => onChangePrivacy(option.value)}
                activeOpacity={0.82}
                className="min-w-[132px] rounded-2xl border px-3 py-3"
                style={{
                  borderColor: isSelected ? Colors.cta : '#E5E5EA',
                  backgroundColor: isSelected ? '#E8F2FE' : '#FFFFFF',
                }}>
                <View className="mb-1 flex-row items-center gap-2">
                  <Ionicons
                    name={option.icon}
                    size={16}
                    color={isSelected ? Colors.cta : Colors.textMuted}
                  />
                  <Text className="text-sm font-semibold text-[#1D1D1F]">{option.label}</Text>
                </View>
                <Text className="text-xs text-[#6E6E73]">{option.description}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View>
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-xs font-bold uppercase text-[#6E6E73]">Style</Text>
          <View className="flex-row items-center rounded-full bg-[#F5F5F7] p-1">
            <TouchableOpacity
              className="h-8 w-8 items-center justify-center rounded-full bg-white"
              disabled={fontSize <= MIN_STORY_FONT_SIZE}
              onPress={onDecreaseFont}>
              <Ionicons name="remove" size={16} color={Colors.text} />
            </TouchableOpacity>
            <Text className="w-12 text-center text-xs font-semibold text-[#1D1D1F]">
              {fontSize}
            </Text>
            <TouchableOpacity
              className="h-8 w-8 items-center justify-center rounded-full bg-white"
              disabled={fontSize >= MAX_STORY_FONT_SIZE}
              onPress={onIncreaseFont}>
              <Ionicons name="add" size={16} color={Colors.text} />
            </TouchableOpacity>
          </View>
        </View>
        <View className="flex-row gap-2">
          {STORY_BACKGROUNDS.map((item) => (
            <TouchableOpacity
              key={item.id}
              accessibilityLabel={item.label}
              onPress={() => onChangeBackground(item.id)}
              className="h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: item.color }}>
              {item.id === bgIndex && <Ionicons name="checkmark" size={17} color={Colors.white} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View>
        <Text className="mb-2 text-xs font-bold uppercase text-[#6E6E73]">Music</Text>
        <TouchableOpacity
          onPress={onOpenMusic}
          activeOpacity={0.84}
          className="flex-row items-center rounded-2xl border border-[#E5E5EA] bg-white px-3 py-3">
          <Ionicons name="musical-notes-outline" size={18} color={Colors.cta} />
          <View className="ml-3 flex-1">
            <Text numberOfLines={1} className="text-sm font-semibold text-[#1D1D1F]">
              {selectedTrack?.name ?? 'Add music'}
            </Text>
            <Text numberOfLines={1} className="text-xs text-[#6E6E73]">
              {selectedTrack?.artistName ?? 'Search trending tracks'}
            </Text>
          </View>
          {selectedTrack ? (
            <TouchableOpacity onPress={onRemoveMusic} className="rounded-full bg-[#F5F5F7] p-2">
              <Ionicons name="close" size={14} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : (
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
