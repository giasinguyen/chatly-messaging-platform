import { ActivityIndicator, FlatList, Modal, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { STORY_MUSIC_CATEGORIES } from '@/constants/story';
import { Colors } from '@/constants/theme';
import type { MusicTrack } from '@/types/music';

interface StoryMusicPickerProps {
  visible: boolean;
  tracks: MusicTrack[];
  selectedCategory: string;
  selectedTrack: MusicTrack | null;
  isLoading: boolean;
  onClose: () => void;
  onSelectCategory: (category: string) => void;
  onSelectTrack: (track: MusicTrack) => void;
}

export function StoryMusicPicker({
  visible,
  tracks,
  selectedCategory,
  selectedTrack,
  isLoading,
  onClose,
  onSelectCategory,
  onSelectTrack,
}: StoryMusicPickerProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/45">
        <View className="max-h-[78%] rounded-t-3xl bg-white pb-6 pt-4">
          <View className="mb-4 flex-row items-center justify-between px-4">
            <Text className="text-lg font-bold text-[#1D1D1F]">Add Music</Text>
            <TouchableOpacity onPress={onClose} className="rounded-full bg-[#F5F5F7] p-2">
              <Ionicons name="close" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <FlatList
            horizontal
            data={STORY_MUSIC_CATEGORIES}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2 px-4 pb-4"
            renderItem={({ item }) => {
              const isSelected = item.id === selectedCategory;
              return (
                <TouchableOpacity
                  onPress={() => onSelectCategory(item.id)}
                  className="rounded-full px-4 py-2"
                  style={{ backgroundColor: isSelected ? Colors.cta : '#F5F5F7' }}>
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: isSelected ? Colors.white : Colors.text }}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />

          {isLoading ? (
            <View className="h-72 items-center justify-center">
              <ActivityIndicator color={Colors.cta} />
              <Text className="mt-2 text-sm text-[#6E6E73]">Loading tracks...</Text>
            </View>
          ) : (
            <FlatList
              data={tracks}
              keyExtractor={(item) => item.id}
              contentContainerClassName="px-4 pb-3"
              renderItem={({ item }) => {
                const isSelected = selectedTrack?.id === item.id;
                return (
                  <TouchableOpacity
                    onPress={() => onSelectTrack(item)}
                    activeOpacity={0.82}
                    className="mb-2 flex-row items-center rounded-2xl px-3 py-2"
                    style={{ backgroundColor: isSelected ? '#E8F2FE' : '#FFFFFF' }}>
                    {item.albumImage ? (
                      <Image
                        source={{ uri: item.albumImage }}
                        contentFit="cover"
                        className="h-12 w-12 rounded-xl"
                      />
                    ) : (
                      <View className="h-12 w-12 rounded-xl bg-[#F5F5F7]" />
                    )}
                    <View className="ml-3 flex-1">
                      <Text numberOfLines={1} className="text-sm font-bold text-[#1D1D1F]">
                        {item.name}
                      </Text>
                      <Text numberOfLines={1} className="text-xs text-[#6E6E73]">
                        {item.artistName}
                      </Text>
                    </View>
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'play-circle-outline'}
                      size={22}
                      color={isSelected ? Colors.cta : Colors.textMuted}
                    />
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View className="h-56 items-center justify-center">
                  <Text className="text-sm text-[#6E6E73]">No tracks found.</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
