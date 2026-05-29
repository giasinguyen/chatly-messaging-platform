import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Animated, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CloudFileList } from '@/components/cloud/CloudFileList';
import { CloudHeader } from '@/components/cloud/CloudHeader';
import { ShareCloudFileDialog } from '@/components/cloud/ShareCloudFileDialog';
import { ImageLightbox } from '@/components/ui/ImageLightbox';
import { Colors } from '@/constants/theme';
import { fileService, type FileUploadResponse } from '@/services/file.service';
import { useConversationStore } from '@/store/conversation.store';
import { useThemeStore } from '@/store/theme.store';
import { isCloudUpload } from '@/utils/cloudFileAttachment';
import {
  formatCloudFileDate,
  isCloudImage,
  isCloudMedia,
  type CloudTab,
} from '@/utils/cloudFileDisplay';

export default function CloudScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  useThemeStore((state) => state.isDarkMode);
  const conversations = useConversationStore((state) => state.conversations);

  const [tab, setTab] = useState<CloudTab>('all');
  const [files, setFiles] = useState<FileUploadResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [selectedShareFile, setSelectedShareFile] = useState<FileUploadResponse | null>(null);
  const [lightboxUrls, setLightboxUrls] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxVisible, setLightboxVisible] = useState(false);

  const searchAnim = useRef(new Animated.Value(0)).current;

  const getConversationName = useCallback(
    (id?: string) => {
      if (!id) return t('common.anonymous');
      const conversation = conversations.find((item) => item.id === id);
      return conversation?.name ?? t('chat.message_fallback');
    },
    [conversations, t]
  );

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fileService.getMyFiles();
      setFiles(response);
    } catch {
      Alert.alert(t('errors.request_failed'), t('cloud.load_failed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load])
  );

  const openLightbox = useCallback((urls: string[], index: number) => {
    setLightboxUrls(urls);
    setLightboxIndex(index);
    setLightboxVisible(true);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  const handleUpload = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      multiple: true,
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    setUploading(true);
    setUploadProgress(0);
    try {
      for (const asset of result.assets) {
        const fileName = asset.name || `${t('mobile.cloud.upload_label')}-${Date.now()}`;
        const mimeType = asset.mimeType || 'application/octet-stream';
        await fileService.upload(asset.uri, fileName, mimeType, undefined, setUploadProgress);
      }

      await load(true);
      setTab('uploads');
      Alert.alert(
        t('mobile.cloud.upload_success'),
        t(
          result.assets.length === 1 ? 'cloud.file_count_one' : 'cloud.file_count_other',
          { count: result.assets.length },
        ),
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('mobile.cloud.upload_failed');
      Alert.alert(t('mobile.cloud.upload_failed'), message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [load, t]);

  const handleDeleteFile = useCallback((file: FileUploadResponse) => {
    Alert.alert(
      t('mobile.cloud.delete_upload_title'),
      t('mobile.cloud.delete_upload_body', { fileName: file.fileName }),
      [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await fileService.deleteFile(file.fileId);
            setFiles((current) => current.filter((item) => item.fileId !== file.fileId));
            setSelectedShareFile((current) => (current?.fileId === file.fileId ? null : current));
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : t('mobile.cloud.delete_failed');
            Alert.alert(t('mobile.cloud.delete_failed'), message);
          }
        },
      },
    ]);
  }, [t]);

  const displayed = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return files.filter((file) => {
      const matchesTab =
        tab === 'all' ||
        (tab === 'uploads' && isCloudUpload(file)) ||
        (tab === 'media' && isCloudMedia(file)) ||
        (tab === 'file' && !isCloudMedia(file));
      const matchesSearch = !query || file.fileName.toLowerCase().includes(query);
      return matchesTab && matchesSearch;
    });
  }, [files, searchQuery, tab]);

  const grouped = useMemo(() => {
    const groups: { date: string; items: FileUploadResponse[] }[] = [];
    for (const file of displayed) {
      const date = formatCloudFileDate(file.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.date === date) last.items.push(file);
      else groups.push({ date, items: [file] });
    }
    return groups;
  }, [displayed]);

  const imageUrls = useMemo(
    () => displayed.filter(isCloudImage).map((file) => file.url),
    [displayed]
  );

  const toggleSearch = useCallback(() => {
    const nextActive = !searchActive;
    setSearchActive(nextActive);
    Animated.timing(searchAnim, {
      toValue: nextActive ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start(() => {
      if (!nextActive) setSearchQuery('');
    });
  }, [searchActive, searchAnim]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ImageLightbox
        images={lightboxUrls}
        initialIndex={lightboxIndex}
        visible={lightboxVisible}
        onClose={() => setLightboxVisible(false)}
      />
      <ShareCloudFileDialog
        file={selectedShareFile}
        visible={selectedShareFile !== null}
        onClose={() => setSelectedShareFile(null)}
      />

      <CloudHeader
        insetsTop={insets.top}
        uploading={uploading}
        uploadProgress={uploadProgress}
        searchActive={searchActive}
        searchQuery={searchQuery}
        searchAnim={searchAnim}
        tab={tab}
        onUpload={handleUpload}
        onToggleSearch={toggleSearch}
        onSearchChange={setSearchQuery}
        onClearSearch={() => setSearchQuery('')}
        onTabChange={setTab}
      />

      <CloudFileList
        files={files}
        displayedFiles={displayed}
        groupedFiles={grouped}
        imageUrls={imageUrls}
        tab={tab}
        searchQuery={searchQuery}
        loading={loading}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onOpenImage={openLightbox}
        onShareFile={setSelectedShareFile}
        onDeleteFile={handleDeleteFile}
        getConversationName={getConversationName}
      />
    </View>
  );
}
