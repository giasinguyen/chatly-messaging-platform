import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { fileService } from '@/services/file.service';
import { musicService } from '@/services/music.service';
import { storyService } from '@/services/story.service';
import {
  DEFAULT_STORY_FONT_SIZE,
  MAX_STORY_FONT_SIZE,
  MAX_STORY_VIDEO_SIZE_BYTES,
  MAX_STORY_VIDEO_SIZE_MB,
  MIN_STORY_FONT_SIZE,
  STORY_FONT_SIZE_STEP,
} from '@/constants/story';
import type { MusicTrack } from '@/types/music';
import type { StoryPrivacy, StoryResponse, StoryType } from '@/types/story';
import { getApiErrorMessage } from '@/utils/errorHandler';

export type StoryStep = 'choose' | 'text' | 'photo' | 'video';

export interface SelectedStoryAsset {
  uri: string;
  fileName: string;
  mimeType: string;
}

const DEFAULT_IMAGE_MIME_TYPE = 'image/jpeg';
const DEFAULT_VIDEO_MIME_TYPE = 'video/mp4';

interface UseCreateStoryOptions {
  onCreated?: (story: StoryResponse) => void;
  onClose: () => void;
}

function getStoryType(step: StoryStep): StoryType {
  if (step === 'photo') return 'PHOTO';
  if (step === 'video') return 'VIDEO';
  return 'TEXT';
}

export function useCreateStory({ onCreated, onClose }: UseCreateStoryOptions) {
  const [step, setStep] = useState<StoryStep>('choose');
  const [textValue, setTextValue] = useState('');
  const [bgIndex, setBgIndex] = useState(0);
  const [fontSize, setFontSize] = useState(DEFAULT_STORY_FONT_SIZE);
  const [privacy, setPrivacy] = useState<StoryPrivacy>('EVERYONE');
  const [asset, setAsset] = useState<SelectedStoryAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('chill');
  const [isLoadingMusic, setIsLoadingMusic] = useState(false);
  const [isMusicPickerOpen, setIsMusicPickerOpen] = useState(false);

  const reset = useCallback(() => {
    setStep('choose');
    setTextValue('');
    setBgIndex(0);
    setFontSize(DEFAULT_STORY_FONT_SIZE);
    setPrivacy('EVERYONE');
    setAsset(null);
    setSelectedTrack(null);
    setTracks([]);
    setSelectedCategory('chill');
    setIsMusicPickerOpen(false);
  }, []);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    reset();
    onClose();
  }, [isSubmitting, onClose, reset]);

  const requestLibraryAccess = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access to choose a story.');
      return false;
    }
    return true;
  }, []);

  const pickPhotoStory = useCallback(async () => {
    if (!(await requestLibraryAccess())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.92,
      allowsEditing: false,
    });
    if (result.canceled) return;

    const picked = result.assets[0];
    setAsset({
      uri: picked.uri,
      fileName: picked.fileName ?? `story-photo-${Date.now()}.jpg`,
      mimeType: picked.mimeType ?? DEFAULT_IMAGE_MIME_TYPE,
    });
    setStep('photo');
  }, [requestLibraryAccess]);

  const pickVideoStory = useCallback(async () => {
    if (!(await requestLibraryAccess())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled) return;

    const picked = result.assets[0];
    if (picked.fileSize && picked.fileSize > MAX_STORY_VIDEO_SIZE_BYTES) {
      Alert.alert('Video too large', `Video size must be less than ${MAX_STORY_VIDEO_SIZE_MB}MB.`);
      return;
    }

    setAsset({
      uri: picked.uri,
      fileName: picked.fileName ?? `story-video-${Date.now()}.mp4`,
      mimeType: picked.mimeType ?? DEFAULT_VIDEO_MIME_TYPE,
    });
    setStep('video');
  }, [requestLibraryAccess]);

  const incrementFontSize = useCallback(() => {
    setFontSize((value) => Math.min(MAX_STORY_FONT_SIZE, value + STORY_FONT_SIZE_STEP));
  }, []);

  const decrementFontSize = useCallback(() => {
    setFontSize((value) => Math.max(MIN_STORY_FONT_SIZE, value - STORY_FONT_SIZE_STEP));
  }, []);

  const fetchMusic = useCallback(async (category: string) => {
    setSelectedCategory(category);
    setIsLoadingMusic(true);
    try {
      const response = await musicService.search(category);
      setTracks(response.code === 1000 ? response.result : []);
    } catch {
      setTracks([]);
    } finally {
      setIsLoadingMusic(false);
    }
  }, []);

  const openMusicPicker = useCallback(() => {
    setIsMusicPickerOpen(true);
    void fetchMusic(selectedCategory);
  }, [fetchMusic, selectedCategory]);

  const handleSelectTrack = useCallback((track: MusicTrack) => {
    setSelectedTrack(track);
    setIsMusicPickerOpen(false);
  }, []);

  const handleShare = useCallback(async () => {
    const content = textValue.trim();
    if (step === 'choose') return;
    if (step === 'text' && !content) {
      Alert.alert('Add text', 'Write something for your text story.');
      return;
    }

    setIsSubmitting(true);
    try {
      const uploaded = asset
        ? await fileService.upload(asset.uri, asset.fileName, asset.mimeType)
        : null;
      const response = await storyService.create({
        type: getStoryType(step),
        content,
        mediaUrl: uploaded?.url ?? '',
        musicUrl: selectedTrack?.audioUrl,
        musicName: selectedTrack?.name,
        bgIndex,
        fontSize,
        privacy,
      });

      if (response.code !== 1000 || !response.result) {
        throw new Error(response.message ?? 'Could not share story.');
      }

      onCreated?.(response.result);
      reset();
      onClose();
    } catch (error: unknown) {
      Alert.alert('Could not share story', getApiErrorMessage(error, 'Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    asset,
    bgIndex,
    fontSize,
    onClose,
    onCreated,
    privacy,
    reset,
    selectedTrack,
    step,
    textValue,
  ]);

  return {
    step,
    textValue,
    bgIndex,
    fontSize,
    privacy,
    asset,
    isSubmitting,
    selectedTrack,
    tracks,
    selectedCategory,
    isLoadingMusic,
    isMusicPickerOpen,
    setStep,
    setTextValue,
    setBgIndex,
    setPrivacy,
    setIsMusicPickerOpen,
    pickPhotoStory,
    pickVideoStory,
    decrementFontSize,
    incrementFontSize,
    fetchMusic,
    openMusicPicker,
    handleSelectTrack,
    setSelectedTrack,
    handleClose,
    handleShare,
  };
}
