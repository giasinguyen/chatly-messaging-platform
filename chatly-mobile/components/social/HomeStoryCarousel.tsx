import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  return (
    <View
      className="border-b py-3"
      style={{ backgroundColor: Colors.bgCard, borderBottomColor: Colors.borderLight }}>
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
          <View
            className="h-[76px] w-[76px] items-center justify-center rounded-full border"
            style={{ backgroundColor: Colors.bg, borderColor: Colors.border }}>
            <Ionicons name="add" size={32} color={Colors.cta} />
          </View>
          <Text
            className="mt-2 max-w-[76px] text-center text-xs font-medium"
            style={{ color: Colors.text }}>
            {t('home.your_story')}
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
                    <View
                      className="h-full w-full items-center justify-center rounded-full p-[2px]"
                      style={{ backgroundColor: Colors.bgCard }}>
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
                    className="mt-2 max-w-[76px] text-center text-xs font-medium"
                    style={{ color: Colors.text }}>
                    {group.user.displayName ?? group.user.username}
                  </Text>
                </TouchableOpacity>
              );
            })
          : stories.map((story) => (
              <TouchableOpacity key={story.id} activeOpacity={0.85} className="items-center">
                <View className="h-[76px] w-[76px] items-center justify-center rounded-full bg-[#F9CE34] p-[2px]">
                  <View
                    className="h-full w-full items-center justify-center rounded-full p-[2px]"
                    style={{ backgroundColor: Colors.bgCard }}>
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
                  className="mt-2 max-w-[76px] text-center text-xs font-medium"
                  style={{ color: Colors.text }}>
                  {story.name}
                </Text>
              </TouchableOpacity>
            ))}
      </ScrollView>
    </View>
  );
}
