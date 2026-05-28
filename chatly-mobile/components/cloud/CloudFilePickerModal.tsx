import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { fileService, type FileUploadResponse } from '@/services/file.service';
import { isCloudUpload } from '@/utils/cloudFileAttachment';
import { normalizeMediaUrl } from '@/utils/mediaUrl';

interface CloudFilePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (files: FileUploadResponse[]) => void;
}

function formatSize(bytes: number): string {
  if (bytes >= 1_048_576) {
    return `${(bytes / 1_048_576).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function isImage(file: FileUploadResponse): boolean {
  return (file.fileType ?? '').startsWith('image/');
}

function fileIcon(fileType?: string): keyof typeof Ionicons.glyphMap {
  if (!fileType) return 'document-outline';
  if (fileType.startsWith('image/')) return 'image-outline';
  if (fileType.startsWith('video/')) return 'videocam-outline';
  if (fileType.startsWith('audio/')) return 'musical-notes-outline';
  if (fileType.includes('pdf')) return 'document-text-outline';
  if (fileType.includes('zip') || fileType.includes('compressed')) return 'archive-outline';
  return 'document-outline';
}

export function CloudFilePickerModal({ visible, onClose, onSend }: CloudFilePickerModalProps) {
  const [files, setFiles] = useState<FileUploadResponse[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await fileService.getMyFiles();
      setFiles(response.filter(isCloudUpload));
    } catch {
      setErrorMessage('Could not load cloud uploads.');
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setSelectedIds([]);
      setSearchQuery('');
      loadFiles();
    }
  }, [visible, loadFiles]);

  const displayedFiles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return files;
    return files.filter((file) => file.fileName.toLowerCase().includes(query));
  }, [files, searchQuery]);

  const selectedFiles = useMemo(
    () => files.filter((file) => selectedIds.includes(file.fileId)),
    [files, selectedIds]
  );

  const toggleFile = useCallback((fileId: string) => {
    setSelectedIds((current) =>
      current.includes(fileId) ? current.filter((id) => id !== fileId) : [...current, fileId]
    );
  }, []);

  const handleSend = useCallback(() => {
    if (selectedFiles.length === 0) {
      return;
    }

    onSend(selectedFiles);
    onClose();
  }, [onClose, onSend, selectedFiles]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} />
        <View className="max-h-[82%] rounded-t-[28px] bg-white px-4 pb-8 pt-3">
          <View className="mb-4 items-center">
            <View className="h-1.5 w-12 rounded-full bg-gray-300" />
          </View>

          <View className="mb-4 flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="text-xl font-bold text-[#1D1D1F]">Upload from cloud</Text>
              <Text className="mt-1 text-sm leading-5 text-[#6E6E73]">
                Choose uploaded files to send in this conversation.
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="rounded-full bg-gray-100 p-2"
              activeOpacity={0.7}>
              <Ionicons name="close" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View className="mb-4 flex-row items-center rounded-2xl border border-[#E5E5EA] bg-[#FAFAFB] px-3">
            <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search uploaded files"
              placeholderTextColor={Colors.textLight}
              className="ml-2 h-12 flex-1 text-sm text-[#1D1D1F]"
            />
          </View>

          {isLoading ? (
            <View className="items-center justify-center py-12">
              <ActivityIndicator size="small" color={Colors.cta} />
              <Text className="mt-2 text-sm text-[#6E6E73]">Loading cloud uploads...</Text>
            </View>
          ) : (
            <FlatList
              data={displayedFiles}
              keyExtractor={(item) => item.fileId}
              style={{ maxHeight: 360 }}
              ListEmptyComponent={
                <View className="items-center py-12">
                  <Ionicons name="cloud-upload-outline" size={40} color={Colors.textLight} />
                  <Text className="mt-3 text-sm text-[#6E6E73]">
                    {errorMessage || 'No cloud uploads found.'}
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isSelected = selectedIds.includes(item.fileId);
                const imageUrl = isImage(item) ? normalizeMediaUrl(item.url) : null;
                return (
                  <TouchableOpacity
                    onPress={() => toggleFile(item.fileId)}
                    className={`mb-2 flex-row items-center rounded-3xl border px-3 py-3 ${
                      isSelected
                        ? 'border-[#0071E3]/30 bg-[#0071E3]/5'
                        : 'border-[#E5E5EA] bg-white'
                    }`}
                    activeOpacity={0.8}>
                    {imageUrl ? (
                      <ExpoImage
                        source={{ uri: imageUrl }}
                        className="h-12 w-12 rounded-2xl"
                        contentFit="cover"
                      />
                    ) : (
                      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF]">
                        <Ionicons name={fileIcon(item.fileType)} size={22} color={Colors.cta} />
                      </View>
                    )}
                    <View className="ml-3 min-w-0 flex-1">
                      <Text numberOfLines={1} className="text-sm font-medium text-[#1D1D1F]">
                        {item.fileName}
                      </Text>
                      <Text numberOfLines={1} className="mt-0.5 text-xs text-[#6E6E73]">
                        {formatSize(item.fileSize)}
                      </Text>
                    </View>
                    <View
                      className={`h-5 w-5 items-center justify-center rounded-full border ${
                        isSelected ? 'border-[#0071E3] bg-[#0071E3]' : 'border-[#D1D1D6] bg-white'
                      }`}>
                      {isSelected ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          <View className="mt-4 flex-row gap-3">
            <TouchableOpacity
              onPress={onClose}
              className="h-12 flex-1 items-center justify-center rounded-2xl border border-[#D1D1D6] bg-white"
              activeOpacity={0.8}>
              <Text className="text-sm font-semibold text-[#1D1D1F]">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSend}
              disabled={selectedFiles.length === 0}
              className={`h-12 flex-1 flex-row items-center justify-center rounded-2xl ${
                selectedFiles.length === 0 ? 'bg-[#C7D2FE]' : 'bg-[#0071E3]'
              }`}
              activeOpacity={0.8}>
              <Text className="text-sm font-semibold text-white">
                Send{selectedFiles.length > 0 ? ` (${selectedFiles.length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
