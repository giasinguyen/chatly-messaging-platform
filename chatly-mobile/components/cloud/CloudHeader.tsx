import {
  ActivityIndicator,
  Animated,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import type { CloudTab } from '@/utils/cloudFileDisplay';

const TAB_FILTER_KEYS: { key: CloudTab; labelKey: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', labelKey: 'cloud.all', icon: 'albums-outline' },
  { key: 'uploads', labelKey: 'mobile.cloud.tab_uploads', icon: 'cloud-upload-outline' },
  { key: 'media', labelKey: 'mobile.cloud.tab_media', icon: 'image-outline' },
  { key: 'file', labelKey: 'mobile.cloud.tab_documents', icon: 'document-text-outline' },
];

interface CloudHeaderProps {
  insetsTop: number;
  uploading: boolean;
  uploadProgress: number;
  searchActive: boolean;
  searchQuery: string;
  searchAnim: Animated.Value;
  tab: CloudTab;
  onUpload: () => void;
  onToggleSearch: () => void;
  onSearchChange: (query: string) => void;
  onClearSearch: () => void;
  onTabChange: (tab: CloudTab) => void;
}

export function CloudHeader({
  insetsTop,
  uploading,
  uploadProgress,
  searchActive,
  searchQuery,
  searchAnim,
  tab,
  onUpload,
  onToggleSearch,
  onSearchChange,
  onClearSearch,
  onTabChange,
}: CloudHeaderProps) {
  const { t } = useTranslation();

  return (
    <View
      style={{
        paddingTop: insetsTop,
        backgroundColor: Colors.bgCard,
        borderBottomWidth: 0.5,
        borderBottomColor: Colors.borderLight,
      }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: Colors.text }}>{t('cloud.title')}</Text>
        </View>
        <TouchableOpacity
          onPress={onUpload}
          disabled={uploading}
          style={{ padding: 4, marginRight: 10 }}>
          {uploading ? (
            <ActivityIndicator size="small" color={Colors.cta} />
          ) : (
            <Ionicons name="cloud-upload-outline" size={22} color={Colors.text} />
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={onToggleSearch} style={{ padding: 4 }}>
          <Ionicons
            name={searchActive ? 'close' : 'search-outline'}
            size={22}
            color={Colors.text}
          />
        </TouchableOpacity>
      </View>

      <Animated.View
        style={{
          overflow: 'hidden',
          maxHeight: searchAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 52] }),
          paddingHorizontal: 16,
          paddingBottom: searchAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }),
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: Colors.bg,
            borderRadius: 10,
            paddingHorizontal: 10,
            height: 38,
          }}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
          <TextInput
            style={{ flex: 1, marginLeft: 8, fontSize: 14, color: Colors.text }}
            placeholder={t('cloud.search_placeholder')}
            placeholderTextColor={Colors.textLight}
            value={searchQuery}
            onChangeText={onSearchChange}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={onClearSearch}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </Animated.View>

      {uploading ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
          <View
            style={{
              height: 4,
              overflow: 'hidden',
              borderRadius: 2,
              backgroundColor: Colors.borderLight,
            }}>
            <View
              style={{
                height: 4,
                width: `${Math.max(8, Math.round(uploadProgress * 100))}%`,
                borderRadius: 2,
                backgroundColor: Colors.cta,
              }}
            />
          </View>
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 10, gap: 8 }}>
        {TAB_FILTER_KEYS.map((item) => {
          const active = tab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => onTabChange(item.key)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: active ? Colors.cta : Colors.bg,
                gap: 4,
              }}>
              <Ionicons
                name={item.icon}
                size={14}
                color={active ? Colors.white : Colors.textMuted}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: active ? Colors.white : Colors.textMuted,
                }}>
                {t(item.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
