import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Linking,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { fileService, type FileUploadResponse } from '@/services/file.service';
import { messageService } from '@/services/message.service';
import { ImageLightbox } from '@/components/ui/ImageLightbox';
import { Colors } from '@/constants/theme';
import { useThemeStore } from '@/store/theme.store';

type TabType = 'media' | 'files' | 'links';

interface ExtractedLink {
  url: string;
  domain: string;
}

const PAGE_SIZE = 20;
const URL_REGEX = /(https?:\/\/[^\s<>"]+)/g;
const SCREEN_WIDTH = Dimensions.get('window').width;
const IMAGE_SIZE = (SCREEN_WIDTH - 48 - 6) / 4;

export default function SharedMediaScreen() {
  const { id: conversationId, tab: initialTab } = useLocalSearchParams<{
    id: string;
    tab?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useThemeStore((state) => state.isDarkMode);

  const [activeTab, setActiveTab] = useState<TabType>(
    (initialTab as TabType) || 'media',
  );

  const [media, setMedia] = useState<FileUploadResponse[]>([]);
  const [files, setFiles] = useState<FileUploadResponse[]>([]);
  const [links, setLinks] = useState<ExtractedLink[]>([]);

  const [mediaPage, setMediaPage] = useState(0);
  const [filesPage, setFilesPage] = useState(0);
  const [hasMoreMedia, setHasMoreMedia] = useState(true);
  const [hasMoreFiles, setHasMoreFiles] = useState(true);

  const [loadingMedia, setLoadingMedia] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingLinks, setLoadingLinks] = useState(false);

  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const loadMedia = useCallback(
    async (page: number, append: boolean) => {
      setLoadingMedia(true);
      try {
        const result = await fileService.getByConversation(
          conversationId,
          'image',
          page,
          PAGE_SIZE,
        );
        setMedia((prev) => (append ? [...prev, ...result] : result));
        setHasMoreMedia(result.length === PAGE_SIZE);
        setMediaPage(page);
      } catch {
        /* silent */
      } finally {
        setLoadingMedia(false);
      }
    },
    [conversationId],
  );

  const loadFiles = useCallback(
    async (page: number, append: boolean) => {
      setLoadingFiles(true);
      try {
        const result = await fileService.getByConversation(
          conversationId,
          'file',
          page,
          PAGE_SIZE,
        );
        setFiles((prev) => (append ? [...prev, ...result] : result));
        setHasMoreFiles(result.length === PAGE_SIZE);
        setFilesPage(page);
      } catch {
        /* silent */
      } finally {
        setLoadingFiles(false);
      }
    },
    [conversationId],
  );

  const loadLinks = useCallback(async () => {
    setLoadingLinks(true);
    try {
      const res = await messageService.search(conversationId, 'http', 0, 100);
      const extracted: ExtractedLink[] = [];
      for (const msg of res.result) {
        if (msg.type === 'GIF' || msg.type === 'STICKER') continue;
        const matches = msg.content?.match(URL_REGEX) ?? [];
        for (const url of matches) {
          try {
            const domain = new URL(url).hostname;
            if (!extracted.find((l) => l.url === url)) {
              extracted.push({ url, domain });
            }
          } catch {
            /* ignore */
          }
        }
      }
      setLinks(extracted);
    } catch {
      /* silent */
    } finally {
      setLoadingLinks(false);
    }
  }, [conversationId]);

  useEffect(() => {
    loadMedia(0, false);
    loadFiles(0, false);
    loadLinks();
  }, [loadMedia, loadFiles, loadLinks]);

  const renderMediaItem = useCallback(
    ({ item, index }: { item: FileUploadResponse; index: number }) => (
      <TouchableOpacity
        onPress={() => {
          setLightboxIndex(index);
          setLightboxVisible(true);
        }}
        style={{
          width: IMAGE_SIZE,
          height: IMAGE_SIZE,
          borderRadius: 6,
          overflow: 'hidden',
          margin: 1,
        }}
      >
        <Image
          source={{ uri: item.url }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      </TouchableOpacity>
    ),
    [],
  );

  const renderFileItem = useCallback(
    ({ item }: { item: FileUploadResponse }) => {
      const sizeStr = item.fileSize
        ? item.fileSize > 1048576
          ? `${(item.fileSize / 1048576).toFixed(1)} MB`
          : `${(item.fileSize / 1024).toFixed(0)} KB`
        : '';
      return (
        <TouchableOpacity
          onPress={() => Linking.openURL(item.url)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderBottomWidth: 0.5,
            borderBottomColor: Colors.borderLight,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: Colors.ctaLight,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
            }}
          >
            <Ionicons name="document-text" size={18} color={Colors.cta} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{ fontSize: 13, fontWeight: '500', color: Colors.text }}
            >
              {item.fileName}
            </Text>
            {sizeStr ? (
              <Text style={{ fontSize: 11, color: Colors.textLight }}>
                {sizeStr}
              </Text>
            ) : null}
          </View>
          <Ionicons name="download-outline" size={18} color={Colors.textLight} />
        </TouchableOpacity>
      );
    },
    [],
  );

  const renderLinkItem = useCallback(
    ({ item }: { item: ExtractedLink }) => (
      <TouchableOpacity
        onPress={() => Linking.openURL(item.url)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderBottomWidth: 0.5,
          borderBottomColor: Colors.borderLight,
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: Colors.ctaLight,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
          }}
        >
          <Ionicons name="link" size={16} color={Colors.cta} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{ fontSize: 13, fontWeight: '500', color: Colors.cta }}
          >
            {item.domain}
          </Text>
          <Text
            numberOfLines={1}
            style={{ fontSize: 11, color: Colors.textLight }}
          >
            {item.url}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [],
  );

  const mediaImageUrls = media.map((f) => f.url);

  const renderTab = (tab: TabType, label: string, count: number) => (
    <TouchableOpacity
      onPress={() => setActiveTab(tab)}
      style={{
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: activeTab === tab ? Colors.cta : 'transparent',
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: activeTab === tab ? '600' : '400',
          color: activeTab === tab ? Colors.cta : Colors.textLight,
        }}
      >
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );

  const renderEmpty = (loading: boolean, label: string) =>
    !loading ? (
      <View style={{ paddingVertical: 40, alignItems: 'center' }}>
        <Text style={{ fontSize: 13, color: Colors.textLight }}>
          No {label} yet
        </Text>
      </View>
    ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: Colors.bgCard,
          borderBottomWidth: 0.5,
          borderBottomColor: Colors.borderLight,
        }}
      >
        <View
          style={{
            height: 50,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
          }}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 17,
              fontWeight: '600',
              color: Colors.text,
            }}
          >
            {activeTab === 'media' ? 'Shared Media' : activeTab === 'files' ? 'Files' : 'Links'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: 'row' }}>
          {renderTab('media', 'Media', media.length)}
          {renderTab('files', 'Files', files.length)}
          {renderTab('links', 'Links', links.length)}
        </View>
      </View>

      {/* Content */}
      {activeTab === 'media' && (
        <FlatList
          data={media}
          renderItem={renderMediaItem}
          keyExtractor={(item) => item.fileId}
          numColumns={4}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={renderEmpty(loadingMedia, 'media')}
          ListFooterComponent={
            loadingMedia ? (
              <ActivityIndicator
                style={{ paddingVertical: 16 }}
                color={Colors.cta}
              />
            ) : hasMoreMedia && media.length > 0 ? (
              <TouchableOpacity
                onPress={() => loadMedia(mediaPage + 1, true)}
                style={{
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 13, color: Colors.cta }}>
                  Load more
                </Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}

      {activeTab === 'files' && (
        <FlatList
          data={files}
          renderItem={renderFileItem}
          keyExtractor={(item) => item.fileId}
          contentContainerStyle={{ backgroundColor: Colors.bgCard }}
          ListEmptyComponent={renderEmpty(loadingFiles, 'files')}
          ListFooterComponent={
            loadingFiles ? (
              <ActivityIndicator
                style={{ paddingVertical: 16 }}
                color={Colors.cta}
              />
            ) : hasMoreFiles && files.length > 0 ? (
              <TouchableOpacity
                onPress={() => loadFiles(filesPage + 1, true)}
                style={{
                  paddingVertical: 12,
                  alignItems: 'center',
                  backgroundColor: Colors.bgCard,
                }}
              >
                <Text style={{ fontSize: 13, color: Colors.cta }}>
                  Load more
                </Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}

      {activeTab === 'links' && (
        <FlatList
          data={links}
          renderItem={renderLinkItem}
          keyExtractor={(item, index) => `${item.url}-${index}`}
          contentContainerStyle={{ backgroundColor: Colors.bgCard }}
          ListEmptyComponent={renderEmpty(loadingLinks, 'links')}
          ListFooterComponent={
            loadingLinks ? (
              <ActivityIndicator
                style={{ paddingVertical: 16 }}
                color={Colors.cta}
              />
            ) : null
          }
        />
      )}

      <ImageLightbox
        images={mediaImageUrls}
        initialIndex={lightboxIndex}
        visible={lightboxVisible}
        onClose={() => setLightboxVisible(false)}
      />
    </View>
  );
}
