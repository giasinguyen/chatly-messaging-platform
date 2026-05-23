import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CreatePostEditorFields } from './CreatePostEditorFields';
import { useCreatePostComposer, MAX_POST_CONTENT_LENGTH, MAX_POST_IMAGES } from '@/hooks/useCreatePostComposer';
import { fileService } from '@/services/file.service';
import { postService } from '@/services/post.service';
import type { Post, PostVisibility } from '@/types/post';
import { Colors } from '@/constants/theme';
import { extractMentionTargets } from '@/utils/mention';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated?: (post: Post) => void;
  editingPost?: Post | null;
  onUpdated?: (post: Post) => void;
}

const VISIBILITY_OPTIONS: { label: string; value: PostVisibility; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Everyone', value: 'PUBLIC', icon: 'earth-outline' },
  { label: 'Friends', value: 'FRIENDS_ONLY', icon: 'person-add-outline' },
  { label: 'Only me', value: 'ONLY_ME', icon: 'lock-closed-outline' },
];

export function CreatePostModal({
  visible,
  onClose,
  onCreated,
  editingPost,
  onUpdated,
}: CreatePostModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
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
    handleRemoveImage,
    handleRemoveExistingImage,
  } = useCreatePostComposer(visible, editingPost);

  const handleClose = () => {
    if (isSubmitting) return;
    Keyboard.dismiss();
    reset();
    onClose();
  };

  const handleBackdropPress = () => {
    if (isKeyboardVisible) {
      Keyboard.dismiss();
      return;
    }

    handleClose();
  };

  const handleSubmit = async () => {
    if (!trimmedContent) {
      setContentError('Post content cannot be empty.');
      return;
    }

    if (trimmedContent.length > MAX_POST_CONTENT_LENGTH) {
      setContentError('Content must not exceed 2000 characters.');
      return;
    }

    setContentError(null);
    setIsSubmitting(true);
    try {
      const uploadedUrls = await Promise.all(
        images.map(async (image) => {
          const uploaded = await fileService.upload(image.uri, image.fileName, image.mimeType);
          return uploaded.url;
        }),
      );
      const mediaUrls = [...existingImageUrls, ...uploadedUrls];
      const mentionIds = extractMentionTargets(trimmedContent, candidates, {
        includeAi: false,
        includeAll: false,
      });
      const response = isEditing && editingPost
        ? await postService.update(editingPost.id, {
          content: trimmedContent,
          mediaUrls,
          visibility,
          mentionIds,
        })
        : await postService.create({
          content: trimmedContent,
          mediaUrls,
          visibility,
          mentionIds,
        });
      if (response.code === 1000 && response.result) {
        if (isEditing) {
          onUpdated?.(response.result);
        } else {
          onCreated?.(response.result);
        }
        reset();
        onClose();
      } else {
        Alert.alert('Could not post', response.message ?? 'Please try again.');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      Alert.alert('Could not post', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable onPress={handleBackdropPress} style={StyleSheet.absoluteFill} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
          style={styles.sheetContainer}
        >
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              Keyboard.dismiss();
            }}
            className="rounded-t-3xl bg-white"
            style={{ maxHeight: '88%' }}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              bounces={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28 }}
            >
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-lg font-semibold text-[#1D1D1F]">
                  {isEditing ? 'Edit post' : 'Create post'}
                </Text>
                <TouchableOpacity onPress={handleClose} className="rounded-full bg-[#F5F5F7] p-2">
                  <Ionicons name="close" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              <CreatePostEditorFields
                content={content}
                contentError={contentError}
                selection={selection}
                mentionSuggestions={mentionSuggestions}
                visibility={visibility}
                totalImageCount={totalImageCount}
                maxPostImages={MAX_POST_IMAGES}
                existingImageUrls={existingImageUrls}
                images={images}
                isSubmitting={isSubmitting}
                inputRef={inputRef}
                visibilityOptions={VISIBILITY_OPTIONS}
                onChangeContent={handleChangeContent}
                onSelectionChange={handleSelectionChange}
                onSelectMention={handleSelectMention}
                onRemoveExistingImage={handleRemoveExistingImage}
                onRemoveImage={handleRemoveImage}
                onPickImages={() => void handlePickImages()}
                onChangeVisibility={setVisibility}
              />

              <TouchableOpacity
                onPress={handleSubmit}
                activeOpacity={0.85}
                className="items-center rounded-xl bg-[#0071E3] py-3"
                disabled={isSubmitting || !canSubmit}
                style={{ opacity: isSubmitting || !canSubmit ? 0.55 : 1 }}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text className="text-sm font-semibold text-white">
                    {isEditing ? 'Save changes' : 'Post'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
  },
  sheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
});
