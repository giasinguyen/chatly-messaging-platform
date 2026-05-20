import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { HomeStoryCarousel } from './HomeStoryCarousel';
import { Colors } from '@/constants/theme';
import type { StoryGroup } from '@/types/story';

interface HomeFeedHeaderProps {
  storyGroups: StoryGroup[];
  onCreatePost: () => void;
  onOpenExplore: () => void;
  onPressStoryGroup: (group: StoryGroup, groupIndex: number) => void;
}

export function HomeFeedHeader({
  storyGroups,
  onCreatePost,
  onOpenExplore,
  onPressStoryGroup,
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

          <TouchableOpacity
            onPress={onOpenExplore}
            className="absolute right-0 rounded-full p-1.5"
            activeOpacity={0.75}>
            <Ionicons name="compass-outline" size={26} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <HomeStoryCarousel
        stories={[]}
        storyGroups={storyGroups}
        onPressStoryGroup={onPressStoryGroup}
      />
    </View>
  );
}
