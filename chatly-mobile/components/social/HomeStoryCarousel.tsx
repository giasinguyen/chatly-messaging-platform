import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Colors } from '@/constants/theme';
import type { StoryGroup } from '@/types/story';

export interface HomeStoryItem {
  id: string;
  name: string;
  avatarUrl: string;
  isMyStory?: boolean;
}

interface HomeStoryCarouselProps {
  stories: HomeStoryItem[];
  storyGroups?: StoryGroup[];
  onPressCreateStory?: () => void;
  onPressStoryGroup?: (group: StoryGroup, groupIndex: number) => void;
}

export function HomeStoryCarousel({
  stories,
  storyGroups,
  onPressCreateStory,
  onPressStoryGroup,
}: HomeStoryCarouselProps) {
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

        {storyGroups
          ? storyGroups.map((group, idx) => {
              const allViewed = group.stories.every((s) => s.viewedByMe);
              const ringColor = allViewed ? '#D2D2D7' : '#F9CE34';
              return (
                <TouchableOpacity
                  key={group.user.id}
                  activeOpacity={0.85}
                  className="items-center"
                  onPress={() => onPressStoryGroup?.(group, idx)}
                >
                  <View
                    style={{
                      height: 76,
                      width: 76,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 999,
                      backgroundColor: ringColor,
                      padding: 2,
                    }}
                  >
                    <View className="h-full w-full items-center justify-center rounded-full bg-white p-[2px]">
                      {group.user.avatarUrl ? (
                        <Image
                          source={{ uri: group.user.avatarUrl }}
                          contentFit="cover"
                          transition={120}
                          style={{ width: '100%', height: '100%', borderRadius: 999 }}
                        />
                      ) : (
                        <View className="flex-1 items-center justify-center bg-gray-200 rounded-full">
                          <Text className="text-gray-600 text-lg font-bold">
                            {(group.user.displayName ?? group.user.username).charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text
                    numberOfLines={1}
                    className="mt-2 max-w-[76px] text-center text-xs font-medium text-[#1D1D1F]"
                  >
                    {group.user.displayName ?? group.user.username}
                  </Text>
                </TouchableOpacity>
              );
            })
          : stories.map((story) => (
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
