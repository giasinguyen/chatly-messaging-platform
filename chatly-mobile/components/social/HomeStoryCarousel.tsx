import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Colors } from '@/constants/theme';

export interface HomeStoryItem {
  id: string;
  name: string;
  avatarUrl: string;
  isMyStory?: boolean;
}

interface HomeStoryCarouselProps {
  stories: HomeStoryItem[];
  onPressCreateStory?: () => void;
}

export function HomeStoryCarousel({ stories, onPressCreateStory }: HomeStoryCarouselProps) {
  return (
    <View className="border-b border-[#E5E5EA] bg-white py-3">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 12 }}
      >
        <TouchableOpacity
          onPress={onPressCreateStory}
          activeOpacity={0.85}
          className="items-center"
        >
          <View className="h-[76px] w-[76px] items-center justify-center rounded-full border border-[#D2D2D7] bg-[#F5F5F7]">
            <Ionicons name="add" size={32} color={Colors.cta} />
          </View>
          <Text className="mt-2 max-w-[76px] text-center text-xs font-medium text-[#1D1D1F]">
            Your story
          </Text>
        </TouchableOpacity>

        {stories.map((story) => (
          <TouchableOpacity key={story.id} activeOpacity={0.85} className="items-center">
            <View className="h-[76px] w-[76px] items-center justify-center rounded-full bg-[#F9CE34] p-[2px]">
              <View className="h-full w-full items-center justify-center rounded-full bg-white p-[2px]">
                <Image
                  source={{ uri: story.avatarUrl }}
                  contentFit="cover"
                  transition={120}
                  style={{ width: '100%', height: '100%', borderRadius: 999 }}
                />
              </View>
            </View>
            <Text
              numberOfLines={1}
              className="mt-2 max-w-[76px] text-center text-xs font-medium text-[#1D1D1F]"
            >
              {story.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
