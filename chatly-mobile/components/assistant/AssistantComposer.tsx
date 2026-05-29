import { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/theme';
import { agentFileService } from '@/services/agent-file.service';
import { useChatbotStore } from '@/store/chatbot.store';
import { McpPickerModal } from './McpPickerModal';
import { McpConfigModal } from './McpConfigModal';

interface AssistantComposerProps {
  sessionId: string;
  onSend: (text: string, fileIds: string[]) => void;
  isStreaming?: boolean;
  onCancel?: () => void;
  disabled?: boolean;
  mcpConfigVisible?: boolean;
  onMcpConfigChange?: (visible: boolean) => void;
}

interface PendingFile {
  localId: string;
  name: string;
  progress: number;
  done: boolean;
  fileId?: string;
  error?: string;
}

export function AssistantComposer({
  sessionId,
  onSend,
  isStreaming,
  onCancel,
  disabled,
  mcpConfigVisible: mcpConfigVisibleProp,
  onMcpConfigChange,
}: AssistantComposerProps) {
  const { t } = useTranslation();
  const {
    useWebSearch,
    setUseWebSearch,
    selectedMcpIds,
    draftsBySession,
    setDraft,
  } = useChatbotStore();

  const draft = draftsBySession[sessionId] ?? '';
  const inputRef = useRef<TextInput>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const isUploading = pendingFiles.some((p) => !p.done && !p.error);
  const [showMcpPicker, setShowMcpPicker] = useState(false);
  const [internalMcpConfig, setInternalMcpConfig] = useState(false);
  const showMcpConfig = mcpConfigVisibleProp ?? internalMcpConfig;
  const setShowMcpConfig = (v: boolean) => {
    if (onMcpConfigChange) onMcpConfigChange(v);
    else setInternalMcpConfig(v);
  };

  const handleSend = () => {
    const text = draft.trim();
    if (!text || disabled || isUploading) return;
    const fileIds = pendingFiles.filter((p) => p.done && p.fileId).map((p) => p.fileId as string);
    onSend(text, fileIds);
    setDraft(sessionId, '');
    setPendingFiles([]);
  };

  const processFileUpload = async (uri: string, name: string, mimeType: string) => {
    const localId = `${Date.now()}-${Math.random()}`;
    setPendingFiles((prev) => [...prev, { localId, name, progress: 0, done: false }]);
    try {
      const uploaded = await agentFileService.upload(sessionId, uri, name, mimeType, (pct) => {
        setPendingFiles((prev) => prev.map((p) => (p.localId === localId ? { ...p, progress: pct } : p)));
      });
      setPendingFiles((prev) =>
        prev.map((p) => (p.localId === localId ? { ...p, progress: 100, done: true, fileId: uploaded.id } : p)),
      );
    } catch {
      setPendingFiles((prev) =>
        prev.map((p) =>
          p.localId === localId ? { ...p, error: t('assistant.upload_failed') } : p,
        ),
      );
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
      if (result.canceled) return;
      for (const asset of result.assets) {
        await processFileUpload(asset.uri, asset.name, asset.mimeType ?? 'application/octet-stream');
      }
    } catch {
      // user cancelled
    }
  };

  const handlePickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      quality: 0.9,
    });
    if (result.canceled) return;
    for (const asset of result.assets) {
      await processFileUpload(asset.uri, asset.fileName ?? 'image.jpg', asset.mimeType ?? 'image/jpeg');
    }
  };

  const handlePickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.permission_denied'), t('assistant.permission_camera_body'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (result.canceled) return;
    const asset = result.assets[0];
    await processFileUpload(asset.uri, asset.fileName ?? 'photo.jpg', asset.mimeType ?? 'image/jpeg');
  };

  const showAttachMenu = () => {
    Alert.alert(t('assistant.attach_title'), t('assistant.attach_choose_source'), [
      { text: t('assistant.photo_library'), onPress: handlePickFromLibrary },
      { text: t('assistant.camera'), onPress: handlePickFromCamera },
      { text: t('assistant.document'), onPress: handlePickDocument },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const removePending = (localId: string) => {
    setPendingFiles((prev) => prev.filter((p) => p.localId !== localId));
  };

  const canSend = draft.trim().length > 0 && !disabled && !isUploading;

  return (
    <View style={{ backgroundColor: Colors.white, borderTopWidth: 0.5, borderTopColor: Colors.borderLight }}>
      {/* Pending files */}
      {pendingFiles.length > 0 && (
        <View className="flex-row flex-wrap gap-2 px-4 pt-3">
          {pendingFiles.map((p) => (
            <View
              key={p.localId}
              className="flex-row items-center rounded-lg px-3 py-2"
              style={{
                backgroundColor: Colors.bg,
                borderWidth: 0.5,
                borderColor: Colors.borderLight,
                maxWidth: 180,
              }}
            >
              <Ionicons name="document-outline" size={16} color={Colors.textMuted} />
              <View className="ml-2 flex-1">
                <Text
                  className="text-xs font-medium"
                  style={{ color: Colors.text }}
                  numberOfLines={1}
                >
                  {p.name}
                </Text>
                {p.error ? (
                  <Text className="text-[10px]" style={{ color: Colors.error }}>
                    {p.error}
                  </Text>
                ) : p.done ? (
                  <Text className="text-[10px]" style={{ color: Colors.success }}>
                    {t('assistant.upload_done')}
                  </Text>
                ) : (
                  <View
                    className="mt-1 h-1 rounded-full"
                    style={{ backgroundColor: Colors.borderLight }}
                  >
                    <View
                      className="h-1 rounded-full"
                      style={{
                        backgroundColor: Colors.cta,
                        width: `${p.progress}%`,
                      }}
                    />
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => removePending(p.localId)}
                className="ml-2"
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="close-circle" size={16} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Toolbar row */}
      <View className="flex-row items-center gap-1 px-3 pt-2">
        <TouchableOpacity
          onPress={showAttachMenu}
          className="h-8 w-8 items-center justify-center rounded-md"
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="attach-outline" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setUseWebSearch(!useWebSearch)}
          className="h-8 w-8 items-center justify-center rounded-md"
          style={{ backgroundColor: useWebSearch ? Colors.ctaLight : 'transparent' }}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons
            name="globe-outline"
            size={18}
            color={useWebSearch ? Colors.cta : Colors.textMuted}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowMcpPicker(true)}
          className="h-8 items-center justify-center rounded-md flex-row px-1.5"
          style={{ backgroundColor: selectedMcpIds.length > 0 ? Colors.ctaLight : 'transparent' }}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons
            name="hardware-chip-outline"
            size={18}
            color={selectedMcpIds.length > 0 ? Colors.cta : Colors.textMuted}
          />
          {selectedMcpIds.length > 0 && (
            <Text className="text-[11px] font-medium ml-0.5" style={{ color: Colors.cta }}>
              {selectedMcpIds.length}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Input row */}
      <View className="flex-row items-end gap-2 px-4 pb-2 pt-1">
        <TextInput
          ref={inputRef}
          value={draft}
          onChangeText={(v) => setDraft(sessionId, v)}
          placeholder={t('assistant.ask_placeholder')}
          placeholderTextColor={Colors.textLight}
          multiline
          maxLength={4000}
          className="flex-1 text-[15px] leading-[22px] max-h-28 py-2"
          style={{ color: Colors.text }}
        />
        {isStreaming ? (
          <TouchableOpacity
            onPress={onCancel}
            className="h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: Colors.textMuted }}
          >
            <Ionicons name="stop" size={18} color={Colors.white} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSend}
            disabled={!canSend}
            className="h-10 w-10 items-center justify-center rounded-xl"
            style={{
              backgroundColor: canSend ? Colors.cta : Colors.borderLight,
            }}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Ionicons
                name="arrow-up"
                size={20}
                color={canSend ? Colors.white : Colors.textLight}
              />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* MCP Modals */}
      <McpPickerModal visible={showMcpPicker} onClose={() => setShowMcpPicker(false)} />
      <McpConfigModal visible={showMcpConfig} onClose={() => setShowMcpConfig(false)} />
    </View>
  );
}
