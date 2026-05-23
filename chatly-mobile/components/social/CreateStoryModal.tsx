import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useCreateStory } from '@/hooks/useCreateStory';
import type { StoryResponse } from '@/types/story';
import { StoryComposerControls } from './StoryComposerControls';
import { StoryMusicPicker } from './StoryMusicPicker';
import { StoryPreview } from './StoryPreview';

interface CreateStoryModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated?: (story: StoryResponse) => void;
}

interface StoryChoiceButtonProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  colorClassName: string;
  layoutClassName?: string;
  onPress: () => void;
}

function StoryChoiceButton({
  label,
  icon,
  colorClassName,
  layoutClassName = '',
  onPress,
}: StoryChoiceButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.86}
      className={`h-48 items-center justify-center rounded-3xl ${colorClassName} ${layoutClassName}`}>
      <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-white">
        <Ionicons name={icon} size={25} color={Colors.cta} />
      </View>
      <Text className="px-3 text-center text-base font-bold text-white">{label}</Text>
    </TouchableOpacity>
  );
}

export function CreateStoryModal({ visible, onClose, onCreated }: CreateStoryModalProps) {
  const story = useCreateStory({ onClose, onCreated });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={story.handleClose}>
      <View className="flex-1 bg-[#F5F5F7]">
        <View className="flex-row items-center justify-between border-b border-[#E5E5EA] bg-white px-4 pb-3 pt-14">
          <View className="flex-row items-center gap-2">
            {story.step !== 'choose' && (
              <TouchableOpacity
                onPress={() => story.setStep('choose')}
                activeOpacity={0.8}
                className="rounded-full bg-[#F5F5F7] p-2">
                <Ionicons name="chevron-back" size={20} color={Colors.text} />
              </TouchableOpacity>
            )}
            <Text className="text-xl font-bold text-[#1D1D1F]">Create Story</Text>
          </View>
          <TouchableOpacity
            onPress={story.handleClose}
            activeOpacity={0.8}
            className="rounded-full bg-[#F5F5F7] p-2">
            <Ionicons name="close" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {story.step === 'choose' ? (
          <View className="flex-1 justify-center gap-4 px-4">
            <View className="flex-row gap-3">
              <StoryChoiceButton
                label="Create a photo story"
                icon="image-outline"
                colorClassName="bg-[#0A7AFF]"
                layoutClassName="flex-1"
                onPress={story.pickPhotoStory}
              />
              <StoryChoiceButton
                label="Create a video story"
                icon="videocam-outline"
                colorClassName="bg-[#10B981]"
                layoutClassName="flex-1"
                onPress={story.pickVideoStory}
              />
            </View>
            <StoryChoiceButton
              label="Create a text story"
              icon="text-outline"
              colorClassName="bg-[#AF52DE]"
              onPress={() => story.setStep('text')}
            />
          </View>
        ) : (
          <>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <StoryPreview
                step={story.step}
                textValue={story.textValue}
                bgIndex={story.bgIndex}
                fontSize={story.fontSize}
                asset={story.asset}
                selectedTrack={story.selectedTrack}
              />
              <StoryComposerControls
                step={story.step}
                textValue={story.textValue}
                bgIndex={story.bgIndex}
                fontSize={story.fontSize}
                privacy={story.privacy}
                selectedTrack={story.selectedTrack}
                onChangeText={story.setTextValue}
                onChangeBackground={story.setBgIndex}
                onChangePrivacy={story.setPrivacy}
                onDecreaseFont={story.decrementFontSize}
                onIncreaseFont={story.incrementFontSize}
                onOpenMusic={story.openMusicPicker}
                onRemoveMusic={() => story.setSelectedTrack(null)}
              />
            </ScrollView>

            <View className="flex-row gap-3 border-t border-[#E5E5EA] bg-white px-4 pb-7 pt-3">
              <Pressable
                onPress={story.handleClose}
                className="flex-1 items-center rounded-2xl bg-[#F5F5F7] py-3.5"
                disabled={story.isSubmitting}>
                <Text className="text-sm font-bold text-[#1D1D1F]">Discard</Text>
              </Pressable>
              <Pressable
                onPress={() => void story.handleShare()}
                className={`flex-1 items-center rounded-2xl py-3.5 ${
                  story.isSubmitting ? 'bg-[#8FC8FF]' : 'bg-[#0A7AFF]'
                }`}
                disabled={story.isSubmitting}>
                {story.isSubmitting ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text className="text-sm font-bold text-white">Share</Text>
                )}
              </Pressable>
            </View>
          </>
        )}

        <StoryMusicPicker
          visible={story.isMusicPickerOpen}
          tracks={story.tracks}
          selectedCategory={story.selectedCategory}
          selectedTrack={story.selectedTrack}
          isLoading={story.isLoadingMusic}
          onClose={() => story.setIsMusicPickerOpen(false)}
          onSelectCategory={(category) => void story.fetchMusic(category)}
          onSelectTrack={story.handleSelectTrack}
        />
      </View>
    </Modal>
  );
}
