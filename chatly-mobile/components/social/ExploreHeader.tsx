import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EXPLORE_CATEGORIES, type ExploreCategory } from '@/constants/feed';
import { Colors } from '@/constants/theme';

interface ExploreHeaderProps {
  selectedCategory: string;
  selectedHashtag: string | null;
  trendingHashtags: string[];
  searchInput: string;
  onBack: () => void;
  onChangeSearch: (value: string) => void;
  onClearSearch: () => void;
  onSelectCategory: (label: string) => void;
  onSelectTrendingHashtag: (hashtag: string) => void;
}

export function ExploreHeader({
  selectedCategory,
  selectedHashtag,
  trendingHashtags,
  searchInput,
  onBack,
  onChangeSearch,
  onClearSearch,
  onSelectCategory,
  onSelectTrendingHashtag,
}: ExploreHeaderProps) {
  const { t } = useTranslation();

  const getCategoryLabel = useCallback(
    (item: ExploreCategory) => {
      const keyByHashtag: Record<string, string> = {
        trending: 'explore.category.trending',
        photography: 'explore.category.photography',
        digitalart: 'explore.category.digital_art',
        travel: 'explore.category.travel',
        architecture: 'explore.category.architecture',
      };
      if (!item.hashtag) return t('explore.category.for_you');
      return t(keyByHashtag[item.hashtag] ?? item.label);
    },
    [t],
  );

  const renderCategory = useCallback(
    ({ item }: ListRenderItemInfo<ExploreCategory>) => {
      const isSelected = item.label === selectedCategory;
      const label = getCategoryLabel(item);
      return (
        <TouchableOpacity
          onPress={() => onSelectCategory(item.label)}
          className={
            isSelected
              ? 'mr-2 rounded-full bg-[#0071E3] px-4 py-2'
              : 'mr-2 rounded-full bg-[#F0F0F5] px-4 py-2'
          }
          activeOpacity={0.75}>
          <Text
            className={
              isSelected
                ? 'text-sm font-semibold text-white'
                : 'text-sm font-semibold text-[#6E6E73]'
            }>
            {label}
          </Text>
        </TouchableOpacity>
      );
    },
    [getCategoryLabel, onSelectCategory, selectedCategory],
  );

  return (
    <SafeAreaView edges={['top']} className="bg-white">
      <View className="border-b border-[#E5E5EA] px-4 pb-3">
        <View className="h-11 flex-row items-center justify-between">
          <TouchableOpacity onPress={onBack} className="rounded-full p-2" activeOpacity={0.75}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-[#1D1D1F]">{t('explore.title')}</Text>
          <View className="h-10 w-10" />
        </View>

        <View className="mt-3 h-11 flex-row items-center rounded-2xl bg-[#F5F5F7] px-3">
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
          <TextInput
            className="ml-2 flex-1 text-base text-[#1D1D1F]"
            placeholder={t('mobile.explore.search_posts_placeholder')}
            placeholderTextColor={Colors.textLight}
            value={searchInput}
            onChangeText={onChangeSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={onClearSearch} activeOpacity={0.75}>
              <Ionicons name="close-circle" size={19} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View className="border-b border-[#E5E5EA] bg-white py-3 pl-4">
        <FlatList
          data={EXPLORE_CATEGORIES}
          keyExtractor={(item) => item.label}
          renderItem={renderCategory}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      </View>

      {trendingHashtags.length > 0 && (
        <View className="border-b border-[#E5E5EA] bg-white py-3 pl-4">
          <View className="mb-2 flex-row items-center">
            <Ionicons name="trending-up-outline" size={16} color={Colors.cta} />
            <Text className="ml-1 text-sm font-semibold text-[#1D1D1F]">{t('explore.trending_hashtags')}</Text>
          </View>
          <FlatList
            data={trendingHashtags}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const isSelected = selectedHashtag === item;
              return (
                <TouchableOpacity
                  onPress={() => onSelectTrendingHashtag(item)}
                  className={
                    isSelected
                      ? 'mr-2 rounded-full bg-[#0A7AFF] px-3 py-1.5'
                      : 'mr-2 rounded-full bg-[#F0F0F5] px-3 py-1.5'
                  }
                  activeOpacity={0.75}
                >
                  <Text
                    className={
                      isSelected
                        ? 'text-xs font-semibold text-white'
                        : 'text-xs font-semibold text-[#6E6E73]'
                    }
                  >
                    #{item}
                  </Text>
                </TouchableOpacity>
              );
            }}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
