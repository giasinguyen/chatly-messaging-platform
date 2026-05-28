import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CloudDocumentRow } from '@/components/cloud/CloudDocumentRow';
import { CloudMediaTile } from '@/components/cloud/CloudMediaTile';
import { Colors } from '@/constants/theme';
import type { FileUploadResponse } from '@/services/file.service';
import { isCloudUpload } from '@/utils/cloudFileAttachment';
import { formatCloudFileSize, isCloudMedia, type CloudTab } from '@/utils/cloudFileDisplay';

interface CloudFileGroup {
  date: string;
  items: FileUploadResponse[];
}

interface CloudFileListProps {
  files: FileUploadResponse[];
  displayedFiles: FileUploadResponse[];
  groupedFiles: CloudFileGroup[];
  imageUrls: string[];
  tab: CloudTab;
  searchQuery: string;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenImage: (urls: string[], index: number) => void;
  onShareFile: (file: FileUploadResponse) => void;
  onDeleteFile: (file: FileUploadResponse) => void;
  getConversationName: (conversationId?: string) => string;
}

export function CloudFileList({
  files,
  displayedFiles,
  groupedFiles,
  imageUrls,
  tab,
  searchQuery,
  loading,
  refreshing,
  onRefresh,
  onOpenImage,
  onShareFile,
  onDeleteFile,
  getConversationName,
}: CloudFileListProps) {
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Colors.cta} />
      </View>
    );
  }

  const totalSize = files.reduce((size, file) => size + (file.fileSize ?? 0), 0);
  const mediaCount = files.filter(isCloudMedia).length;
  const docCount = files.filter((file) => !isCloudMedia(file)).length;
  const uploadCount = files.filter(isCloudUpload).length;

  return (
    <FlatList
      data={groupedFiles}
      keyExtractor={(group) => group.date || 'unknown'}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.cta}
          colors={[Colors.cta]}
        />
      }
      ListHeaderComponent={
        !searchQuery && files.length > 0 ? (
          <View
            style={{
              margin: 12,
              borderRadius: 14,
              backgroundColor: Colors.cta,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
            }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Ionicons name="cloud-outline" size={26} color={Colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.white, fontWeight: '700', fontSize: 16 }}>
                {files.length} files · {formatCloudFileSize(totalSize)}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>
                {uploadCount} uploads · {mediaCount} media · {docCount} documents
              </Text>
            </View>
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
          <Ionicons name="cloud-offline-outline" size={64} color={Colors.borderLight} />
          <Text style={{ marginTop: 16, fontSize: 16, color: Colors.textMuted }}>
            {searchQuery
              ? 'No files found'
              : tab === 'uploads'
                ? 'No cloud uploads yet'
                : 'No files yet'}
          </Text>
          <Text style={{ marginTop: 4, fontSize: 13, color: Colors.textLight }}>
            {searchQuery
              ? 'Try a different keyword'
              : tab === 'uploads'
                ? 'Use the upload button to add files to Cloud'
                : 'Photos and files you send will appear here'}
          </Text>
        </View>
      }
      renderItem={({ item: group }) => (
        <View style={{ marginBottom: 4 }}>
          {group.date ? (
            <Text
              style={{
                fontSize: 12,
                color: Colors.textMuted,
                fontWeight: '600',
                paddingHorizontal: 16,
                paddingVertical: 8,
              }}>
              {group.date}
            </Text>
          ) : null}

          {tab !== 'file' && group.items.some(isCloudMedia) ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 3 }}>
              {group.items.filter(isCloudMedia).map((file) => {
                const imageIndex = imageUrls.indexOf(file.url);
                return (
                  <CloudMediaTile
                    key={file.fileId}
                    file={file}
                    imageIndex={imageIndex}
                    imageUrls={imageUrls}
                    onOpenImage={onOpenImage}
                    onShareFile={onShareFile}
                    onDeleteFile={onDeleteFile}
                    getConversationName={getConversationName}
                  />
                );
              })}
            </View>
          ) : null}

          {tab !== 'media' &&
            group.items
              .filter((file) => !isCloudMedia(file))
              .map((file) => (
                <CloudDocumentRow
                  key={file.fileId}
                  file={file}
                  onShareFile={onShareFile}
                  onDeleteFile={onDeleteFile}
                  getConversationName={getConversationName}
                />
              ))}
        </View>
      )}
      contentContainerStyle={displayedFiles.length === 0 ? { flex: 1 } : { paddingBottom: 32 }}
    />
  );
}
