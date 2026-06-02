import { ScrollView, Text, TextInput, TouchableOpacity, View, type NativeSyntheticEvent, type TextInputSelectionChangeEventData } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { MentionSuggestionsDropdown } from '@/components/mention/MentionSuggestionsDropdown';
import { Colors } from '@/constants/theme';
import type { PostVisibility } from '@/types/post';
import type { MentionSuggestion } from '@/utils/mention';

interface SelectedPostImage {
  uri: string;
  fileName: string;
  mimeType: string;
}

interface CreatePostEditorFieldsProps {
  content: string;
  contentError: string | null;
  selection: { start: number; end: number };
  mentionSuggestions: MentionSuggestion[];
  visibility: PostVisibility;
  totalImageCount: number;
  maxPostImages: number;
  existingImageUrls: string[];
  images: SelectedPostImage[];
  isSubmitting: boolean;
  inputRef: React.RefObject<TextInput | null>;
  visibilityOptions: { label: string; value: PostVisibility; icon: keyof typeof Ionicons.glyphMap }[];
  onChangeContent: (value: string) => void;
  onSelectionChange: (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => void;
  onSelectMention: (suggestion: MentionSuggestion) => void;
  onRemoveExistingImage: (url: string) => void;
  onRemoveImage: (uri: string) => void;
  onPickImages: () => void;
  onChangeVisibility: (visibility: PostVisibility) => void;
}

export function CreatePostEditorFields({
  content,
  contentError,
  selection,
  mentionSuggestions,
  visibility,
  totalImageCount,
  maxPostImages,
  existingImageUrls,
  images,
  isSubmitting,
  inputRef,
  visibilityOptions,
  onChangeContent,
  onSelectionChange,
  onSelectMention,
  onRemoveExistingImage,
  onRemoveImage,
  onPickImages,
  onChangeVisibility,
}: CreatePostEditorFieldsProps) {
  const { t } = useTranslation();

  return (
    <>
      <View className="relative">
        <TextInput
          ref={inputRef}
          value={content}
          onChangeText={onChangeContent}
          onSelectionChange={onSelectionChange}
          selection={selection}
          multiline
          placeholder={t('post.share_placeholder')}
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
        {mentionSuggestions.length > 0 ? (
          <MentionSuggestionsDropdown
            suggestions={mentionSuggestions}
            onSelect={onSelectMention}
            placement="bottom"
          />
        ) : null}
      </View>

      {contentError ? (
        <Text className="mt-2 text-xs font-medium text-[#FF3B30]">{contentError}</Text>
      ) : null}

      {totalImageCount > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3"
          contentContainerStyle={{ gap: 8 }}>
          {existingImageUrls.map((url) => (
            <View key={url} className="relative">
              <Image source={{ uri: url }} contentFit="cover" style={{ width: 82, height: 82, borderRadius: 12 }} />
              <TouchableOpacity
                onPress={() => onRemoveExistingImage(url)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1"
                activeOpacity={0.8}
                disabled={isSubmitting}>
                <Ionicons name="close" size={13} color={Colors.white} />
              </TouchableOpacity>
            </View>
          ))}

          {images.map((image) => (
            <View key={image.uri} className="relative">
              <Image source={{ uri: image.uri }} contentFit="cover" style={{ width: 82, height: 82, borderRadius: 12 }} />
              <TouchableOpacity
                onPress={() => onRemoveImage(image.uri)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1"
                activeOpacity={0.8}
                disabled={isSubmitting}>
                <Ionicons name="close" size={13} color={Colors.white} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <TouchableOpacity
        onPress={onPickImages}
        className="mt-3 flex-row items-center justify-center rounded-xl border border-[#D1D1D6] py-2.5"
        activeOpacity={0.85}
        disabled={isSubmitting}>
        <Ionicons name="image-outline" size={18} color={Colors.cta} />
        <Text className="ml-2 text-sm font-semibold text-[#0071E3]">
          {t('post.add_images', { current: totalImageCount, max: maxPostImages })}
        </Text>
      </TouchableOpacity>

      <Text className="mb-2 mt-4 text-sm font-medium text-[#1D1D1F]">{t('post.visibility')}</Text>
      <View className="mb-5 flex-row flex-wrap gap-2">
        {visibilityOptions.map((option) => {
          const selected = option.value === visibility;
          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => onChangeVisibility(option.value)}
              className="rounded-full px-3 py-2"
              style={{
                backgroundColor: selected ? '#E8F2FE' : '#F5F5F7',
                borderWidth: selected ? 1 : 0,
                borderColor: selected ? '#0071E3' : 'transparent',
              }}>
              <View className="flex-row items-center gap-1.5">
                <Ionicons
                  name={option.icon}
                  size={14}
                  color={selected ? Colors.cta : Colors.textMuted}
                />
                <Text
                  className="text-xs font-semibold"
                  style={{ color: selected ? Colors.cta : Colors.textMuted }}>
                  {option.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
}