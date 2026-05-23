import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useMentionCandidates } from '@/hooks/useMentionCandidates';
import type { Post, PostVisibility } from '@/types/post';
import { buildMentionSuggestions, detectMentionQuery, insertMentionAtCursor } from '@/utils/mention';

export interface SelectedPostImage {
  uri: string;
  fileName: string;
  mimeType: string;
}

export const MAX_POST_IMAGES = 6;
export const DEFAULT_IMAGE_MIME_TYPE = 'image/jpeg';
export const MAX_POST_CONTENT_LENGTH = 2000;

export function useCreatePostComposer(visible: boolean, editingPost?: Post | null) {
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<PostVisibility>('PUBLIC');
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [images, setImages] = useState<SelectedPostImage[]>([]);
  const [contentError, setContentError] = useState<string | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const inputRef = useRef<import('react-native').TextInput | null>(null);
  const { candidates, currentUserId } = useMentionCandidates(visible);
  const isEditing = Boolean(editingPost);
  const totalImageCount = existingImageUrls.length + images.length;
  const trimmedContent = content.trim();
  const canSubmit = trimmedContent.length > 0 && trimmedContent.length <= MAX_POST_CONTENT_LENGTH;

  const mentionSuggestions = useMemo(
    () => buildMentionSuggestions(mentionQuery, candidates, {
      includeAi: true,
      includeAll: false,
      currentUserId,
      maxUsers: 8,
    }),
    [candidates, currentUserId, mentionQuery],
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    setContent(editingPost?.content ?? '');
    setVisibility(editingPost?.visibility ?? 'PUBLIC');
    setExistingImageUrls(editingPost?.mediaUrls ?? []);
    setImages([]);
    setContentError(null);
    setMentionQuery(null);
    setSelection({ start: 0, end: 0 });
  }, [editingPost, visible]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const reset = () => {
    setContent('');
    setVisibility('PUBLIC');
    setExistingImageUrls([]);
    setImages([]);
    setContentError(null);
    setMentionQuery(null);
    setSelection({ start: 0, end: 0 });
  };

  const updateMentionQuery = (nextContent: string, cursorPos: number) => {
    setMentionQuery(detectMentionQuery(nextContent, cursorPos));
  };

  const handleSelectionChange = (
    event: import('react-native').NativeSyntheticEvent<import('react-native').TextInputSelectionChangeEventData>,
  ) => {
    const nextSelection = event.nativeEvent.selection;
    setSelection(nextSelection);
    updateMentionQuery(content, nextSelection.start);
  };

  const handleChangeContent = (nextContent: string) => {
    setContent(nextContent);
    if (contentError) {
      setContentError(null);
    }
    updateMentionQuery(nextContent, Math.min(selection.start, nextContent.length));
  };

  const handleSelectMention = (suggestion: ReturnType<typeof buildMentionSuggestions>[number]) => {
    const nextContent = insertMentionAtCursor(content, selection.start, suggestion, {
      userMentionField: 'username',
    });
    const mentionStart = content.slice(0, selection.start).lastIndexOf('@');
    const nextCursor = Math.max(0, mentionStart + (nextContent.length - content.length) + 1);

    setContent(nextContent);
    setMentionQuery(null);
    setSelection({ start: nextCursor, end: nextCursor });
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handlePickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access to choose images.');
      return;
    }

    const remainingSlots = MAX_POST_IMAGES - totalImageCount;
    if (remainingSlots <= 0) {
      Alert.alert('Limit reached', `You can attach up to ${MAX_POST_IMAGES} images.`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.9,
    });

    if (result.canceled) {
      return;
    }

    const picked = result.assets.slice(0, remainingSlots).map((asset, index) => ({
      uri: asset.uri,
      fileName: asset.fileName ?? `post-image-${Date.now()}-${index}.jpg`,
      mimeType: asset.mimeType ?? DEFAULT_IMAGE_MIME_TYPE,
    }));
    setImages((prev) => [...prev, ...picked]);
  };

  return {
    content,
    visibility,
    existingImageUrls,
    images,
    contentError,
    isKeyboardVisible,
    inputRef,
    isEditing,
    totalImageCount,
    trimmedContent,
    canSubmit,
    candidates,
    mentionSuggestions,
    selection,
    setVisibility,
    setContentError,
    reset,
    handleSelectionChange,
    handleChangeContent,
    handleSelectMention,
    handlePickImages,
    handleRemoveImage: (uri: string) => {
      setImages((prev) => prev.filter((image) => image.uri !== uri));
    },
    handleRemoveExistingImage: (url: string) => {
      setExistingImageUrls((prev) => prev.filter((item) => item !== url));
    },
  };
}