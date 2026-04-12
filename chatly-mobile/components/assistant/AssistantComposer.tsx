import { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Colors } from '@/constants/theme';
import { agentFileService } from '@/services/agent-file.service';
import { useChatbotStore } from '@/store/chatbot.store';
import { McpPickerModal } from './McpPickerModal';
import { McpConfigModal } from './McpConfigModal';

interface AssistantComposerProps {
  sessionId: string;
  onSend: (text: string) => void;
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
    onSend(text);
    setDraft(sessionId, '');
    setPendingFiles([]);
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      for (const asset of result.assets) {
        const localId = `${Date.now()}-${Math.random()}`;
        const pending: PendingFile = {
          localId,
          name: asset.name,
          progress: 0,
          done: false,
        };
        setPendingFiles((prev) => [...prev, pending]);

        try {
          await agentFileService.upload(
            sessionId,
            asset.uri,
            asset.name,
            asset.mimeType ?? 'application/octet-stream',
            (pct) => {
              setPendingFiles((prev) =>
                prev.map((p) => (p.localId === localId ? { ...p, progress: pct } : p)),
              );
            },
          );
          setPendingFiles((prev) =>
            prev.map((p) => (p.localId === localId ? { ...p, progress: 100, done: true } : p)),
          );
        } catch {
          setPendingFiles((prev) =>
            prev.map((p) => (p.localId === localId ? { ...p, error: 'Upload thất bại' } : p)),
          );
        }
      }
    } catch {
      // User cancelled or error
    }
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
                    Xong
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
          onPress={handlePickDocument}
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
          placeholder="Hỏi AI bất kỳ điều gì..."
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
