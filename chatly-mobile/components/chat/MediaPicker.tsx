import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import {
  fetchGifTrending,
  searchGifs,
  fetchStickerTrending,
  searchStickers,
  fetchGifCategories,
  fetchStickerCategories,
  triggerShare,
  getThumbUrl,
  type KlipyItem,
  type KlipyCategory,
} from '@/services/klipy.service';

type MediaTab = 'gif' | 'sticker';
type PickerTab = 'emoji' | MediaTab;

interface MediaPickerProps {
  initialTab?: PickerTab;
  customerId: string;
  onEmojiSelect?: (emoji: string) => void;
  onSelect: (item: KlipyItem) => void;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GIF_COLUMNS = 3;
const STICKER_COLUMNS = 4;
const EMOJI_COLUMNS = 8;
const GRID_GAP = 4;
const QUICK_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
  '😊', '😇', '🙂', '🙃', '😉', '😍', '😘', '😋',
  '😎', '🤩', '🥳', '😏', '😒', '😔', '😢', '😭',
  '😤', '😡', '🤯', '😳', '🥺', '😱', '😴', '🤤',
  '👍', '👎', '👏', '🙌', '🙏', '💪', '🤝', '👌',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '💕', '💔',
  '🔥', '✨', '🎉', '🎂', '⭐', '🌟', '💯', '✅',
];

export function MediaPicker({
  initialTab = 'emoji',
  customerId,
  onEmojiSelect,
  onSelect,
  onClose,
}: MediaPickerProps) {
  const [activeTab, setActiveTab] = useState<PickerTab>(initialTab);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [items, setItems] = useState<KlipyItem[]>([]);
  const [categories, setCategories] = useState<KlipyCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  const numColumns =
    activeTab === 'emoji' ? EMOJI_COLUMNS : activeTab === 'gif' ? GIF_COLUMNS : STICKER_COLUMNS;
  const itemSize = (SCREEN_WIDTH - GRID_GAP * (numColumns + 1)) / numColumns;

  // ── Tab switch ────────────────────────────────────────────────────────────
  const switchTab = (tab: PickerTab) => {
    setActiveTab(tab);
    setQuery('');
    setActiveCategory(null);
    setPage(1);
    setItems([]);
    searchInputRef.current?.clear();
  };

  // ── Categories ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'emoji') {
      setCategories([]);
      return;
    }
    (activeTab === 'gif' ? fetchGifCategories() : fetchStickerCategories())
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [activeTab]);

  // ── Load items ────────────────────────────────────────────────────────────
  const loadItems = useCallback(
    async (q: string, cat: string | null, p: number, tab: MediaTab, append = false) => {
      setLoading(true);
      try {
        const keyword = q || cat || '';
        let result;
        if (tab === 'gif') {
          result = keyword
            ? await searchGifs(keyword, p, customerId)
            : await fetchGifTrending(p, customerId);
        } else {
          result = keyword
            ? await searchStickers(keyword, p, customerId)
            : await fetchStickerTrending(p, customerId);
        }
        setItems((prev) => (append ? [...prev, ...result.items] : result.items));
        setHasNext(result.hasNext);
      } catch {
        if (!append) setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [customerId]
  );

  useEffect(() => {
    if (activeTab === 'emoji') {
      setItems([]);
      setHasNext(false);
      return;
    }
    loadItems(query, activeCategory, 1, activeTab);
    setPage(1);
  }, [activeTab, query, activeCategory, loadItems]);

  // ── Load more (infinite scroll) ───────────────────────────────────────────
  const handleLoadMore = useCallback(() => {
    if (activeTab === 'emoji' || loading || !hasNext) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadItems(query, activeCategory, nextPage, activeTab, true);
  }, [loading, hasNext, page, query, activeCategory, activeTab, loadItems]);

  // ── Search (debounced 400ms) ──────────────────────────────────────────────
  const handleSearchChange = (text: string) => {
    setActiveCategory(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setQuery(text), 400);
  };

  // ── Category chip click ───────────────────────────────────────────────────
  const handleCategoryClick = (cat: string) => {
    setActiveCategory((prev) => (prev === cat ? null : cat));
    setQuery('');
    searchInputRef.current?.clear();
  };

  // ── Item select + share tracking ──────────────────────────────────────────
  const handleSelect = useCallback(
    (item: KlipyItem) => {
      if (activeTab !== 'emoji') {
        triggerShare(activeTab, item.slug, customerId, query);
      }
      onSelect(item);
    },
    [activeTab, customerId, query, onSelect]
  );

  // ── Render grid item ──────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: KlipyItem }) => {
      const thumbUrl = getThumbUrl(item);
      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleSelect(item)}
          style={{
            width: itemSize,
            height: itemSize,
            margin: GRID_GAP / 2,
            borderRadius: 8,
            overflow: 'hidden',
            backgroundColor: activeTab === 'sticker' ? 'transparent' : Colors.bg,
          }}>
          <ExpoImage
            source={{ uri: thumbUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit={activeTab === 'sticker' ? 'contain' : 'cover'}
            autoplay
          />
        </TouchableOpacity>
      );
    },
    [activeTab, itemSize, handleSelect]
  );

  const renderEmojiItem = useCallback(
    ({ item }: { item: string }) => (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onEmojiSelect?.(item)}
        style={{
          width: itemSize,
          height: itemSize,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Text style={{ fontSize: 28 }}>{item}</Text>
      </TouchableOpacity>
    ),
    [itemSize, onEmojiSelect]
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{
        height: 380,
        backgroundColor: Colors.bgCard,
        borderTopWidth: 0.5,
        borderTopColor: Colors.borderLight,
      }}>
      {/* ── Header tabs ── */}
      <View
        className="flex-row items-center px-3"
        style={{
          borderBottomWidth: 0.5,
          borderBottomColor: Colors.borderLight,
          backgroundColor: Colors.bg,
        }}>
        <View className="flex-1 flex-row">
          <TouchableOpacity
            onPress={() => switchTab('emoji')}
            className="px-4 py-2.5"
            style={{
              borderBottomWidth: 2.5,
              borderBottomColor: activeTab === 'emoji' ? Colors.cta : 'transparent',
            }}>
            <Text
              className="text-[13px] font-semibold"
              style={{ color: activeTab === 'emoji' ? Colors.cta : Colors.textMuted }}>
              Emoji
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => switchTab('gif')}
            className="px-4 py-2.5"
            style={{
              borderBottomWidth: 2.5,
              borderBottomColor: activeTab === 'gif' ? Colors.cta : 'transparent',
            }}>
            <Text
              className="text-[13px] font-semibold"
              style={{ color: activeTab === 'gif' ? Colors.cta : Colors.textMuted }}>
              GIF
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => switchTab('sticker')}
            className="px-4 py-2.5"
            style={{
              borderBottomWidth: 2.5,
              borderBottomColor: activeTab === 'sticker' ? Colors.cta : 'transparent',
            }}>
            <Text
              className="text-[13px] font-semibold"
              style={{ color: activeTab === 'sticker' ? Colors.cta : Colors.textMuted }}>
              Sticker
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={onClose}
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: Colors.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="close" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* ── Search ── */}
      {activeTab !== 'emoji' && (
      <View
        className="flex-row items-center px-3 py-2"
        style={{
          backgroundColor: Colors.bg,
          borderBottomWidth: 0.5,
          borderBottomColor: Colors.borderLight,
        }}>
        <Ionicons name="search" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
        {/* REQUIRED: placeholder must be "Search KLIPY" per KLIPY attribution guidelines */}
        <TextInput
          ref={searchInputRef}
          placeholder="Search KLIPY"
          placeholderTextColor={Colors.textLight}
          onChangeText={handleSearchChange}
          style={{
            flex: 1,
            backgroundColor: Colors.bgCard,
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 6,
            fontSize: 13,
            color: Colors.text,
          }}
        />
      </View>
      )}

      {/* ── Category chips ── */}
      {activeTab !== 'emoji' && categories.length > 0 && !query && (
        <FlatList
          horizontal
          data={categories.slice(0, 14)}
          keyExtractor={(cat) => cat.query}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 4, gap: 6 }}
          style={{ height: 72, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight }}
          renderItem={({ item: cat }) => (
            <TouchableOpacity
              onPress={() => handleCategoryClick(cat.query)}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderWidth: 1.5,
                borderRadius: 8,
                borderColor: activeCategory === cat.query ? Colors.cta : Colors.borderLight,
                backgroundColor: activeCategory === cat.query ? Colors.ctaLight : Colors.white,
                minWidth: 52,
                height: 40,
              }}>
              {cat.preview_url ? (
                <ExpoImage
                  source={{ uri: cat.preview_url }}
                  style={{ width: 28, height: 20, borderRadius: 4 }}
                  contentFit="cover"
                />
              ) : null}
              <Text
                style={{ fontSize: 10, color: Colors.textMuted, fontWeight: '500', marginTop: 2 }}
                numberOfLines={1}>
                {cat.category}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* ── Content grid ── */}
      {activeTab === 'emoji' ? (
        <FlatList
          data={QUICK_EMOJIS}
          keyExtractor={(item) => item}
          renderItem={renderEmojiItem}
          numColumns={EMOJI_COLUMNS}
          key="grid-emoji"
          contentContainerStyle={{ padding: GRID_GAP / 2 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          numColumns={numColumns}
          key={`grid-${numColumns}`}
          contentContainerStyle={{ padding: GRID_GAP / 2 }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !loading ? (
              <View className="items-center justify-center py-8">
                <Text style={{ fontSize: 13, color: Colors.textMuted }}>No results found</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            loading ? (
              <View className="items-center py-4">
                <ActivityIndicator size="small" color={Colors.cta} />
              </View>
            ) : null
          }
        />
      )}

      {/* ── Attribution (REQUIRED) ── */}
      {activeTab !== 'emoji' && (
        <View
          className="items-center py-1.5"
          style={{ borderTopWidth: 0.5, borderTopColor: Colors.borderLight }}>
          <Text style={{ fontSize: 10, color: Colors.textLight }}>Powered by KLIPY</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
