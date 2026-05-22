import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, View, TextInput, TouchableOpacity, type NativeSyntheticEvent, type TextInputSelectionChangeEventData } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import EmojiPicker from 'rn-emoji-keyboard';
import type { EmojiType } from 'rn-emoji-keyboard';
import { MentionSuggestionsDropdown } from '@/components/mention/MentionSuggestionsDropdown';
import { Colors } from '@/constants/theme';
import { useMentionCandidates } from '@/hooks/useMentionCandidates';
import { fileService } from '@/services/file.service';
import { buildMentionSuggestions, detectMentionQuery, extractMentionTargets, insertMentionAtCursor } from '@/utils/mention';

interface CommentInputProps {
  onSubmit: (content: string, mediaUrls?: string[], mentionIds?: string[]) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  placeholder?: string;
  isReply?: boolean;
  isEditing?: boolean;
  replyToUsername?: string | null;
  initialContent?: string;
}

export function CommentInput({
  onSubmit,
  onCancel,
  isLoading = false,
  placeholder = 'Add a comment...',
  isReply = false,
  isEditing = false,
  replyToUsername,
  initialContent,
}: CommentInputProps) {
  const [content, setContent] = useState(replyToUsername ? `@${replyToUsername} ` : '');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const inputRef = useRef<TextInput | null>(null);
  const { candidates, currentUserId } = useMentionCandidates(true);

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
    if (isEditing) {
      setContent(initialContent ?? '');
      setSelectedImages([]);
      setMentionQuery(null);
      return;
    }

    if (isReply && replyToUsername) {
      setContent(`@${replyToUsername} `);
      setSelectedImages([]);
      setMentionQuery(null);
      return;
    }

    if (!isReply) {
      setContent('');
      setSelectedImages([]);
      setMentionQuery(null);
    }
  }, [initialContent, isEditing, isReply, replyToUsername]);

  const updateMentionQuery = (nextContent: string, cursorPos: number) => {
    const nextMentionQuery = detectMentionQuery(nextContent, cursorPos);
    setMentionQuery(nextMentionQuery);
  };

  const handlePickImage = async () => {
    try {
      setIsPickingImage(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Please allow photo access to attach an image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets.length) {
        return;
      }

      const uploadedUrls: string[] = [];
      for (const asset of result.assets) {
        const fileName = asset.fileName ?? asset.uri.split('/').pop() ?? 'comment-image.jpg';
        const mimeType = asset.mimeType ?? 'image/jpeg';
        const uploaded = await fileService.upload(asset.uri, fileName, mimeType);
        uploadedUrls.push(uploaded.url);
      }

      setSelectedImages((prev) => [...prev, ...uploadedUrls]);
    } catch (error: unknown) {
      console.error('Failed to pick comment image', error);
      Alert.alert('Error', 'Failed to attach the selected image.');
    } finally {
      setIsPickingImage(false);
    }
  };

  const handleEmojiPick = (emoji: EmojiType) => {
    setContent((prev) => {
      const nextContent = `${prev}${emoji.emoji}`;
      updateMentionQuery(nextContent, nextContent.length);
      return nextContent;
    });
  };

  const handleSelectionChange = (
    event: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
  ) => {
    const nextSelection = event.nativeEvent.selection;
    setSelection(nextSelection);
    updateMentionQuery(content, nextSelection.start);
  };

  const handleChangeText = (nextContent: string) => {
    setContent(nextContent);
    updateMentionQuery(nextContent, selection.start > nextContent.length ? nextContent.length : selection.start);
  };

  const handleSelectMention = (suggestion: ReturnType<typeof buildMentionSuggestions>[number]) => {
    const cursorPos = selection.start;
    const nextContent = insertMentionAtCursor(content, cursorPos, suggestion, {
      userMentionField: 'username',
    });
    const nextCursor = nextContent.slice(0, cursorPos).lastIndexOf('@');
    const insertedLength = nextContent.length - content.length;

    setContent(nextContent);
    setMentionQuery(null);
    setSelection({
      start: Math.max(0, nextCursor + insertedLength + 1),
      end: Math.max(0, nextCursor + insertedLength + 1),
    });
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handleSubmit = () => {
    const trimmedContent = content.trim();
    const hasImages = selectedImages.length > 0;
    if (!trimmedContent && !hasImages) {
      return;
    }

    const mentionIds = extractMentionTargets(trimmedContent, candidates, {
      includeAi: false,
      includeAll: false,
    });
    onSubmit(trimmedContent, hasImages ? selectedImages : undefined, mentionIds);
    setContent('');
    setSelectedImages([]);
    setMentionQuery(null);
  };

  const canSubmit = (content.trim().length > 0 || selectedImages.length > 0) && !isLoading;

  return (
    <View className={`border-t border-gray-200 bg-white px-3 py-3 ${isReply ? 'bg-gray-50' : ''}`}>
      {/* Selected Images Preview */}
      {selectedImages.length > 0 && (
        <View className="mb-2 flex-row flex-wrap gap-2">
          {selectedImages.map((imageUri, idx) => (
            <View key={`image-${idx}`} className="relative">
              <Image
                source={{ uri: imageUri }}
                contentFit="cover"
                transition={100}
                style={{ width: 80, height: 80, borderRadius: 8 }}
              />
              <TouchableOpacity
                onPress={() => setSelectedImages(selectedImages.filter((_, i) => i !== idx))}
                className="absolute -right-2 -top-2 rounded-full bg-gray-400 p-1"
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={14} color="white" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Input Area */}
      <View className="relative">
        {mentionSuggestions.length > 0 ? (
          <MentionSuggestionsDropdown
            suggestions={mentionSuggestions}
            onSelect={handleSelectMention}
            placement="top"
          />
        ) : null}

      <View className="flex-row items-center gap-2">
        <View className="flex-1 flex-row items-center rounded-full border border-gray-300 bg-gray-50 px-3 py-2">
          <TextInput
            ref={inputRef}
            value={content}
            onChangeText={handleChangeText}
            onSelectionChange={handleSelectionChange}
            selection={selection}
            placeholder={placeholder}
            placeholderTextColor={Colors.textLight}
            multiline
            maxHeight={100}
            editable={!isLoading}
            style={{
              flex: 1,
              fontSize: 14,
              color: Colors.text,
              maxHeight: 100,
            }}
          />

          {/* Image Picker Icon */}
          {!isEditing ? (
            <TouchableOpacity
              onPress={handlePickImage}
              className="ml-1 p-1"
              activeOpacity={0.7}
              disabled={isLoading || isPickingImage}
            >
              <Ionicons name="image-outline" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}

          {/* Emoji Icon */}
          <TouchableOpacity
            onPress={() => setShowEmojiPicker(true)}
            className="ml-1 p-1"
            activeOpacity={0.7}
            disabled={isLoading}
          >
            <Ionicons name="happy-outline" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Send Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit}
          className="rounded-full p-2"
          style={{
            backgroundColor: canSubmit ? '#0071E3' : '#D5D5D7',
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="send" size={16} color="white" />
        </TouchableOpacity>

        {/* Cancel Button (for replies) */}
        {(isReply || isEditing) && onCancel && (
          <TouchableOpacity
            onPress={onCancel}
            className="rounded-full bg-gray-300 p-2"
            activeOpacity={0.7}
            disabled={isLoading}
          >
            <Ionicons name="close" size={16} color="white" />
          </TouchableOpacity>
        )}
      </View>
      </View>

      <EmojiPicker
        open={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onEmojiSelected={handleEmojiPick}
        enableSearchBar
        enableRecentlyUsed
      />
    </View>
  );
}
