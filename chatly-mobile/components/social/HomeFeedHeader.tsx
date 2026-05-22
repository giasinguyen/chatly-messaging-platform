import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { HomeStoryCarousel } from './HomeStoryCarousel';
import { Colors } from '@/constants/theme';
import type { StoryGroup } from '@/types/story';

interface HomeFeedHeaderProps {
  storyGroups: StoryGroup[];
  onCreatePost: () => void;
  onCreateStory: () => void;
  onOpenExplore: () => void;
  onOpenNotifications: () => void;
  onOpenReels: () => void;
  onPressStoryGroup: (group: StoryGroup, groupIndex: number) => void;
  hasUnreadNotifications: boolean;
}

export function HomeFeedHeader({
  storyGroups,
  onCreatePost,
  onCreateStory,
  onOpenExplore,
  onOpenNotifications,
  onOpenReels,
  onPressStoryGroup,
  hasUnreadNotifications,
}: HomeFeedHeaderProps) {
  return (
    <View>
      <SafeAreaView edges={['top']} className="border-b border-[#E5E5EA] bg-white px-4 pb-3">
        <View className="relative h-10 flex-row items-center justify-center">
          <TouchableOpacity
            onPress={onCreatePost}
            className="absolute left-0 rounded-full p-1.5"
            activeOpacity={0.75}>
            <Ionicons name="add" size={28} color={Colors.text} />
          </TouchableOpacity>

          <Text className="text-3xl font-bold text-[#1D1D1F]">Chatly</Text>

          <View className="absolute right-0 flex-row items-center">
            <TouchableOpacity
              onPress={onOpenNotifications}
              className="relative rounded-full p-1.5"
              activeOpacity={0.75}>
              <Ionicons name="notifications-outline" size={25} color={Colors.text} />
              {hasUnreadNotifications ? (
                <View className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#FF3B30]" />
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onOpenReels}
              className="rounded-full p-1.5"
              activeOpacity={0.75}>
              <Ionicons name="film-outline" size={26} color={Colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onOpenExplore}
              className="rounded-full p-1.5"
              activeOpacity={0.75}>
              <Ionicons name="compass-outline" size={26} color={Colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <HomeStoryCarousel
        stories={[]}
        storyGroups={storyGroups}
        onPressCreateStory={onCreateStory}
        onPressStoryGroup={onPressStoryGroup}
      />
    </View>
  );
}
