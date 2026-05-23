import { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Linking,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Animated,
  Share,
} from 'react-native';
import { ImageLightbox } from '@/components/ui/ImageLightbox';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { fileService, type FileUploadResponse } from '@/services/file.service';
import { useConversationStore } from '@/store/conversation.store';
import { useThemeStore } from '@/store/theme.store';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Tab = 'all' | 'media' | 'file';

const TAB_FILTERS: { key: Tab; label: string; icon: string }[] = [
  { key: 'all',   label: 'All',  icon: 'albums-outline'         },
  { key: 'media', label: 'Media', icon: 'image-outline' },
  { key: 'file',  label: 'Documents', icon: 'document-text-outline' },
];

function formatSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fileIcon(type?: string): string {
  if (!type) return 'document-outline';
  if (type.startsWith('image/')) return 'image-outline';
  if (type.startsWith('video/')) return 'videocam-outline';
  if (type.startsWith('audio/')) return 'musical-notes-outline';
  if (type.includes('pdf'))      return 'document-text-outline';
  if (type.includes('word') || type.includes('docx')) return 'document-outline';
  if (type.includes('excel') || type.includes('xlsx')) return 'grid-outline';
  if (type.includes('zip') || type.includes('compressed')) return 'archive-outline';
  return 'document-outline';
}

function isImage(f: FileUploadResponse) {
  return (f.fileType ?? '').startsWith('image/');
}

function isVideo(f: FileUploadResponse) {
  return (f.fileType ?? '').startsWith('video/');
}

function isMedia(f: FileUploadResponse) {
  return isImage(f) || isVideo(f);
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CloudScreen() {
  const insets = useSafeAreaInsets();
  useThemeStore((state) => state.isDarkMode);
  const conversations = useConversationStore((s) => s.conversations);

  const [tab, setTab] = useState<Tab>('all');
  const [files, setFiles] = useState<FileUploadResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);

  const [lightboxUrls, setLightboxUrls] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxVisible, setLightboxVisible] = useState(false);

  const openLightbox = (urls: string[], idx: number) => {
    setLightboxUrls(urls);
    setLightboxIndex(idx);
    setLightboxVisible(true);
  };

  const searchAnim = useRef(new Animated.Value(0)).current;

  const convName = useCallback(
    (id?: string) => {
      if (!id) return 'Unknown';
      const c = conversations.find((c) => c.id === id);
      return c?.name ?? 'Conversation';
    },
    [conversations],
  );

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fileService.getMyFiles();
      setFiles(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  const displayed = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return files.filter((file) => {
      const matchesTab =
        tab === 'all' ||
        (tab === 'media' && isMedia(file)) ||
        (tab === 'file' && !isMedia(file));
      const matchesSearch = !query || file.fileName?.toLowerCase().includes(query);
      return matchesTab && matchesSearch;
    });
  }, [files, searchQuery, tab]);

  const toggleSearch = () => {
    const toActive = !searchActive;
    setSearchActive(toActive);
    Animated.timing(searchAnim, {
      toValue: toActive ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start(() => { if (!toActive) setSearchQuery(''); });
  };

  // stats
  const totalSize = files.reduce((s, f) => s + (f.fileSize ?? 0), 0);
  const mediaCount = files.filter(isMedia).length;
  const docCount = files.filter((f) => !isMedia(f)).length;

  // ── Group by date ──
  const grouped: { date: string; items: FileUploadResponse[] }[] = [];
  for (const f of displayed) {
    const d = formatDate(f.createdAt);
    const last = grouped[grouped.length - 1];
    if (last && last.date === d) last.items.push(f);
    else grouped.push({ date: d, items: [f] });
  }

  // Flat list of all image urls for lightbox navigation
  const allImageUrls = displayed.filter(isImage).map((f) => f.url);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ImageLightbox
        images={lightboxUrls}
        initialIndex={lightboxIndex}
        visible={lightboxVisible}
        onClose={() => setLightboxVisible(false)}
      />
      {/* ── Header ── */}
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: Colors.bgCard,
          borderBottomWidth: 0.5,
          borderBottomColor: Colors.borderLight,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: Colors.text }}>Cloud Storage</Text>
          </View>
          <TouchableOpacity onPress={toggleSearch} style={{ padding: 4 }}>
            <Ionicons
              name={searchActive ? 'close' : 'search-outline'}
              size={22}
              color={Colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* Animated search bar */}
        <Animated.View
          style={{
            overflow: 'hidden',
            maxHeight: searchAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 52] }),
            paddingHorizontal: 16,
            paddingBottom: searchAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }),
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: Colors.bg,
              borderRadius: 10,
              paddingHorizontal: 10,
              height: 38,
            }}
          >
            <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
            <TextInput
              style={{ flex: 1, marginLeft: 8, fontSize: 14, color: Colors.text }}
              placeholder="Search file name..."
              placeholderTextColor={Colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Tab filter */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 10, gap: 8 }}>
          {TAB_FILTERS.map((t) => {
            const active = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => setTab(t.key)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: active ? Colors.cta : Colors.bg,
                  gap: 4,
                }}
              >
                <Ionicons name={t.icon as any} size={14} color={active ? Colors.white : Colors.textMuted} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: active ? Colors.white : Colors.textMuted }}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={Colors.cta} />
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={(g) => g.date || 'unknown'}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.cta} colors={[Colors.cta]} />
          }
          ListHeaderComponent={
            !searchQuery && files.length > 0 ? (
              /* ── Stats card ── */
              <View
                style={{
                  margin: 12,
                  borderRadius: 14,
                  backgroundColor: Colors.cta,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="cloud-outline" size={26} color={Colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Colors.white, fontWeight: '700', fontSize: 16 }}>
                    {files.length} files · {formatSize(totalSize)}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>
                    {mediaCount} media · {docCount} documents
                  </Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
              <Ionicons name="cloud-offline-outline" size={64} color={Colors.borderLight} />
              <Text style={{ marginTop: 16, fontSize: 16, color: Colors.textMuted }}>
                {searchQuery ? 'No files found' : 'No files yet'}
              </Text>
              <Text style={{ marginTop: 4, fontSize: 13, color: Colors.textLight }}>
                {searchQuery ? 'Try a different keyword' : 'Photos and files you send will appear here'}
              </Text>
            </View>
          }
          renderItem={({ item: group }) => (
            <View style={{ marginBottom: 4 }}>
              {/* Date header */}
              {group.date ? (
                <Text style={{ fontSize: 12, color: Colors.textMuted, fontWeight: '600', paddingHorizontal: 16, paddingVertical: 8 }}>
                  {group.date}
                </Text>
              ) : null}

              {/* Media grid for image and video files */}
              {tab !== 'file' && group.items.some(isMedia) && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 3 }}>
                  {group.items.filter(isMedia).map((f) => {
                    const imgIdx = allImageUrls.indexOf(f.url);
                    const handlePress = () => {
                      if (isImage(f)) {
                        openLightbox(allImageUrls, imgIdx >= 0 ? imgIdx : 0);
                        return;
                      }
                      Linking.openURL(f.url);
                    };
                    return (
                    <TouchableOpacity
                      key={f.fileId}
                      onPress={handlePress}
                      onLongPress={() =>
                        Share.share({ url: f.url, message: f.fileName })
                      }
                      style={{ borderRadius: 8, overflow: 'hidden' }}
                    >
                      {isImage(f) ? (
                        <Image
                          source={{ uri: f.url }}
                          style={{ width: 110, height: 110 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={{
                            width: 110,
                            height: 110,
                            backgroundColor: Colors.ctaLight,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Ionicons name="play-circle-outline" size={34} color={Colors.cta} />
                          <Text
                            style={{ marginTop: 4, maxWidth: 88, color: Colors.textMuted, fontSize: 10, textAlign: 'center' }}
                            numberOfLines={2}
                          >
                            {f.fileName}
                          </Text>
                        </View>
                      )}
                      {/* Conversation badge */}
                      <View
                        style={{
                          position: 'absolute',
                          bottom: 0, left: 0, right: 0,
                          backgroundColor: 'rgba(0,0,0,0.45)',
                          paddingHorizontal: 4,
                          paddingVertical: 2,
                        }}
                      >
                        <Text style={{ color: Colors.white, fontSize: 9 }} numberOfLines={1}>
                          {convName(f.conversationId)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Doc list rows */}
              {tab !== 'media' && group.items.filter((f) => !isMedia(f)).map((f) => (
                <TouchableOpacity
                  key={f.fileId}
                  onPress={() => Linking.openURL(f.url)}
                  onLongPress={() => Share.share({ url: f.url, message: f.fileName })}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    backgroundColor: Colors.bgCard,
                    borderBottomWidth: 0.5,
                    borderBottomColor: Colors.borderLight,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      backgroundColor: Colors.ctaLight,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    <Ionicons name={fileIcon(f.fileType) as any} size={22} color={Colors.cta} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: Colors.text }} numberOfLines={1}>
                      {f.fileName}
                    </Text>
                    <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 2 }}>
                      {formatSize(f.fileSize)} · {convName(f.conversationId)}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => Linking.openURL(f.url)} style={{ padding: 8 }}>
                    <Ionicons name="download-outline" size={20} color={Colors.cta} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}
          contentContainerStyle={displayed.length === 0 ? { flex: 1 } : { paddingBottom: 32 }}
        />
      )}
    </View>
  );
}
