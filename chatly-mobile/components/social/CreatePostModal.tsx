import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { fileService } from '@/services/file.service';
import { postService } from '@/services/post.service';
import type { Post, PostVisibility } from '@/types/post';
import { Colors } from '@/constants/theme';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated?: (post: Post) => void;
  editingPost?: Post | null;
  onUpdated?: (post: Post) => void;
}

interface SelectedPostImage {
  uri: string;
  fileName: string;
  mimeType: string;
}

const MAX_POST_IMAGES = 6;
const DEFAULT_IMAGE_MIME_TYPE = 'image/jpeg';

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
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<PostVisibility>('PUBLIC');
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [images, setImages] = useState<SelectedPostImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(editingPost);
  const totalImageCount = existingImageUrls.length + images.length;

  useEffect(() => {
    if (!visible) return;
    setContent(editingPost?.content ?? '');
    setVisibility(editingPost?.visibility ?? 'PUBLIC');
    setExistingImageUrls(editingPost?.mediaUrls ?? []);
    setImages([]);
  }, [editingPost, visible]);

  const reset = () => {
    setContent('');
    setVisibility('PUBLIC');
    setExistingImageUrls([]);
    setImages([]);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    onClose();
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

    if (result.canceled) return;

    const picked = result.assets.slice(0, remainingSlots).map((asset, index) => ({
      uri: asset.uri,
      fileName: asset.fileName ?? `post-image-${Date.now()}-${index}.jpg`,
      mimeType: asset.mimeType ?? DEFAULT_IMAGE_MIME_TYPE,
    }));
    setImages((prev) => [...prev, ...picked]);
  };

  const handleRemoveImage = (uri: string) => {
    setImages((prev) => prev.filter((image) => image.uri !== uri));
  };

  const handleRemoveExistingImage = (url: string) => {
    setExistingImageUrls((prev) => prev.filter((item) => item !== url));
  };

  const handleSubmit = async () => {
    const trimmedContent = content.trim();
    if (totalImageCount === 0) {
      Alert.alert('Add an image', 'Posts must include at least one image.');
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedUrls = await Promise.all(
        images.map(async (image) => {
          const uploaded = await fileService.upload(image.uri, image.fileName, image.mimeType);
          return uploaded.url;
        }),
      );
      const mediaUrls = [...existingImageUrls, ...uploadedUrls];
      const response = isEditing && editingPost
        ? await postService.update(editingPost.id, {
          content: trimmedContent || 'Shared photos',
          mediaUrls,
          visibility,
        })
        : await postService.create({
          content: trimmedContent || 'Shared photos',
          mediaUrls,
          visibility,
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
      <Pressable
        onPress={handleClose}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: Colors.overlay }}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          className="rounded-t-3xl bg-white px-4 pb-7 pt-4"
        >
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-[#1D1D1F]">
              {isEditing ? 'Edit post' : 'Create post'}
            </Text>
            <TouchableOpacity onPress={handleClose} className="rounded-full bg-[#F5F5F7] p-2">
              <Ionicons name="close" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <TextInput
            value={content}
            onChangeText={setContent}
            multiline
            placeholder="Share something with everyone..."
            placeholderTextColor={Colors.textLight}
            style={{
              minHeight: 130,
              borderWidth: 1,
              borderColor: Colors.borderLight,
              borderRadius: 14,
              paddingHorizontal: 12,
              paddingVertical: 10,
              textAlignVertical: 'top',
              color: Colors.text,
            }}
          />

          {totalImageCount > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-3"
              contentContainerStyle={{ gap: 8 }}
            >
              {existingImageUrls.map((url) => (
                <View key={url} className="relative">
                  <Image
                    source={{ uri: url }}
                    contentFit="cover"
                    style={{ width: 82, height: 82, borderRadius: 12 }}
                  />
                  <TouchableOpacity
                    onPress={() => handleRemoveExistingImage(url)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1"
                    activeOpacity={0.8}
                    disabled={isSubmitting}
                  >
                    <Ionicons name="close" size={13} color={Colors.white} />
                  </TouchableOpacity>
                </View>
              ))}
              {images.map((image) => (
                <View key={image.uri} className="relative">
                  <Image
                    source={{ uri: image.uri }}
                    contentFit="cover"
                    style={{ width: 82, height: 82, borderRadius: 12 }}
                  />
                  <TouchableOpacity
                    onPress={() => handleRemoveImage(image.uri)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1"
                    activeOpacity={0.8}
                    disabled={isSubmitting}
                  >
                    <Ionicons name="close" size={13} color={Colors.white} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity
            onPress={handlePickImages}
            className="mt-3 flex-row items-center justify-center rounded-xl border border-[#D1D1D6] py-2.5"
            activeOpacity={0.85}
            disabled={isSubmitting}
          >
            <Ionicons name="image-outline" size={18} color={Colors.cta} />
            <Text className="ml-2 text-sm font-semibold text-[#0071E3]">
              Add images ({totalImageCount}/{MAX_POST_IMAGES})
            </Text>
          </TouchableOpacity>

          <Text className="mb-2 mt-4 text-sm font-medium text-[#1D1D1F]">Visibility</Text>
          <View className="mb-5 flex-row flex-wrap gap-2">
            {VISIBILITY_OPTIONS.map((option) => {
              const selected = option.value === visibility;
              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setVisibility(option.value)}
                  className="rounded-full px-3 py-2"
                  style={{
                    backgroundColor: selected ? '#E8F2FE' : '#F5F5F7',
                    borderWidth: selected ? 1 : 0,
                    borderColor: selected ? '#0071E3' : 'transparent',
                  }}
                >
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons
                      name={option.icon}
                      size={14}
                      color={selected ? Colors.cta : Colors.textMuted}
                    />
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: selected ? Colors.cta : Colors.textMuted }}
                    >
                      {option.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            activeOpacity={0.85}
            className="items-center rounded-xl bg-[#0071E3] py-3"
            disabled={isSubmitting || totalImageCount === 0}
            style={{ opacity: isSubmitting || totalImageCount === 0 ? 0.55 : 1 }}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text className="text-sm font-semibold text-white">
                {isEditing ? 'Save changes' : 'Post'}
              </Text>
            )}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
