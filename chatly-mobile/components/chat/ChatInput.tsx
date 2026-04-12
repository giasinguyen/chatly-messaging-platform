import { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Image, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import EmojiPicker from 'rn-emoji-keyboard';
import type { EmojiType } from 'rn-emoji-keyboard';
import { Colors } from '@/constants/theme';
import { fileService } from '@/services/file.service';
import { getDisplayUrl, type KlipyItem } from '@/services/klipy.service';
import { MediaPicker } from '@/components/chat/MediaPicker';
import { useAuthStore } from '@/store/auth.store';
import type { Message, Attachment } from '@/types/message';

interface ChatInputProps {
  conversationId?: string;
  onSend: (text: string, attachments?: Attachment[], messageType?: string) => void;
  onTyping?: (isTyping: boolean) => void;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
}

interface PendingFile {
  localId: string;
  uri: string;
  name: string;
  mimeType: string;
  isImage: boolean;
  progress: number;
  uploaded?: Attachment;
  error?: string;
}

export function ChatInput({ conversationId, onSend, onTyping, replyingTo, onCancelReply }: ChatInputProps) {
  const { user } = useAuthStore();
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [activePicker, setActivePicker] = useState<'gif' | 'sticker' | null>(null);

  const handleChangeText = (value: string) => {
    setText(value);
    if (value.length > 0 && !isTyping) {
      setIsTyping(true);
      onTyping?.(true);
    } else if (value.length === 0 && isTyping) {
      setIsTyping(false);
      onTyping?.(false);
    }
  };

  const uploadFile = async (uri: string, fileName: string, mimeType: string) => {
    const localId = `${Date.now()}-${Math.random()}`;
    const isImage = mimeType.startsWith('image/') || mimeType.startsWith('video/');
    const pending: PendingFile = { localId, uri, name: fileName, mimeType, isImage, progress: 0 };
    setPendingFiles((prev) => [...prev, pending]);

    try {
      const result = await fileService.upload(uri, fileName, mimeType, conversationId, (pct) => {
        setPendingFiles((prev) =>
          prev.map((p) => (p.localId === localId ? { ...p, progress: pct } : p)),
        );
      });

      const attachment: Attachment = {
        fileId: result.fileId,
        url: result.url,
        name: result.fileName,
        type: result.fileType,
        size: result.fileSize,
      };

      setPendingFiles((prev) =>
        prev.map((p) =>
          p.localId === localId ? { ...p, progress: 100, uploaded: attachment } : p,
        ),
      );
    } catch {
      setPendingFiles((prev) =>
        prev.map((p) =>
          p.localId === localId ? { ...p, error: 'Upload failed' } : p,
        ),
      );
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Need library permissions to pick images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets) {
        for (const asset of result.assets) {
          const fileName = asset.fileName || asset.uri.split('/').pop() || 'image.jpg';
          const mimeType = asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');
          await uploadFile(asset.uri, fileName, mimeType);
        }
      }
    } catch (err) {
      console.error('Image picker error:', err);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.*', 'text/plain', 'application/zip', 'audio/*'],
        multiple: true,
      });
      if (!result.canceled && result.assets) {
        for (const asset of result.assets) {
          await uploadFile(asset.uri, asset.name, asset.mimeType || 'application/octet-stream');
        }
      }
    } catch (err) {
      console.error('Document picker error:', err);
    }
  };

  const removePending = (localId: string) => {
    setPendingFiles((prev) => prev.filter((p) => p.localId !== localId));
  };

  const isUploading = pendingFiles.some((p) => !p.uploaded && !p.error);
  const canSend = (text.trim().length > 0 || pendingFiles.some((p) => p.uploaded)) && !isUploading;

  const handleSend = () => {
    if (!canSend) return;

    const attachments: Attachment[] = pendingFiles
      .filter((p) => p.uploaded)
      .map((p) => p.uploaded!);

    onSend(text.trim(), attachments.length ? attachments : undefined);
    setText('');
    setPendingFiles([]);
    setIsTyping(false);
    onTyping?.(false);
    onCancelReply?.();
  };

  const handleEmojiPick = (emoji: EmojiType) => {
    setText((prev) => prev + emoji.emoji);
  };

  const handleMediaSelect = (item: KlipyItem) => {
    const displayUrl = getDisplayUrl(item);
    const messageType = item.type === 'sticker' ? 'STICKER' : 'GIF';
    const attachment: Attachment = {
      fileId: item.slug,
      url: displayUrl,
      name: item.title,
      type: item.type === 'sticker' ? 'image/gif' : 'image/webp',
    };
    onSend(displayUrl, [attachment], messageType);
    setActivePicker(null);
  };

  return (
    <View style={{ backgroundColor: Colors.white }}>
      {/* MediaPicker overlay */}
      {activePicker && user?.id && (
        <MediaPicker
          initialTab={activePicker}
          customerId={user.id}
          onSelect={handleMediaSelect}
          onClose={() => setActivePicker(null)}
        />
      )}

      {/* Reply preview banner */}
      {replyingTo && (
        <View
          className="flex-row items-center px-3 py-2"
          style={{
            borderTopWidth: 0.5,
            borderTopColor: Colors.borderLight,
            backgroundColor: Colors.bg,
          }}
        >
          <View
            className="flex-1 rounded-lg px-3 py-1.5"
            style={{
              borderLeftWidth: 3,
              borderLeftColor: Colors.cta,
              backgroundColor: Colors.white,
            }}
          >
            <Text className="text-[11px] font-semibold mb-0.5" style={{ color: Colors.cta }}>
              Replying to
            </Text>
            <Text className="text-[12px]" style={{ color: Colors.textMuted }} numberOfLines={1}>
              {replyingTo.recalled
                ? 'Message recalled'
                : replyingTo.type === 'IMAGE'
                ? '🖼 Image'
                : replyingTo.type === 'FILE'
                ? '📎 Attachment'
                : replyingTo.type === 'GIF'
                ? '🎬 GIF'
                : replyingTo.type === 'STICKER'
                ? '🎨 Sticker'
                : replyingTo.content}
            </Text>
          </View>
          <TouchableOpacity onPress={onCancelReply} className="ml-2 p-1">
            <Ionicons name="close" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Pending file previews */}
      {pendingFiles.length > 0 && (
        <View className="flex-row flex-wrap px-3 pt-2 gap-2" style={{ borderTopWidth: 0.5, borderTopColor: Colors.borderLight }}>
          {pendingFiles.map((p) => (
            <View
              key={p.localId}
              className="rounded-lg overflow-hidden"
              style={{
                width: 72,
                height: 72,
                backgroundColor: Colors.bg,
                borderWidth: 1,
                borderColor: Colors.borderLight,
              }}
            >
              {p.isImage ? (
                <Image source={{ uri: p.uri }} style={{ width: 72, height: 72 }} resizeMode="cover" />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Ionicons name="document-outline" size={24} color={Colors.textMuted} />
                  <Text style={{ fontSize: 8, color: Colors.textMuted }} numberOfLines={1}>{p.name}</Text>
                </View>
              )}
              {/* Progress / status overlay */}
              {!p.uploaded && !p.error && (
                <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                  <ActivityIndicator size="small" color={Colors.white} />
                </View>
              )}
              {p.error && (
                <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: 'rgba(255,0,0,0.3)' }}>
                  <Ionicons name="alert-circle" size={20} color={Colors.white} />
                </View>
              )}
              {/* Remove button */}
              <TouchableOpacity
                onPress={() => removePending(p.localId)}
                style={{
                  position: 'absolute', top: 2, right: 2,
                  width: 18, height: 18, borderRadius: 9,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Ionicons name="close" size={12} color={Colors.white} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Input row */}
      <View
        className="flex-row items-end border-t px-3 py-2"
        style={{
          borderTopColor: Colors.borderLight,
          backgroundColor: Colors.bg,
        }}
      >
        {/* Image picker button */}
        <TouchableOpacity
          onPress={handlePickImage}
          className="items-center justify-center pb-1"
          style={{ width: 36, height: 36 }}
        >
          <Ionicons name="image-outline" size={24} color={Colors.cta} />
        </TouchableOpacity>

        {/* Document picker button */}
        <TouchableOpacity
          onPress={handlePickDocument}
          className="items-center justify-center pb-1"
          style={{ width: 36, height: 36 }}
        >
          <Ionicons name="attach-outline" size={24} color={Colors.cta} />
        </TouchableOpacity>

        {/* Emoji picker button */}
        <TouchableOpacity
          onPress={() => setShowEmojiPicker(true)}
          className="items-center justify-center pb-1"
          style={{ width: 36, height: 36 }}
        >
          <Ionicons name="happy-outline" size={24} color={Colors.cta} />
        </TouchableOpacity>

        {/* GIF picker button */}
        <TouchableOpacity
          onPress={() => { setActivePicker((p) => (p === 'gif' ? null : 'gif')); setShowEmojiPicker(false); }}
          className="items-center justify-center pb-1"
          style={{ width: 36, height: 36 }}
        >
          <Ionicons
            name="film-outline"
            size={22}
            color={activePicker === 'gif' ? Colors.cta : Colors.textMuted}
          />
        </TouchableOpacity>

        {/* Sticker picker button */}
        <TouchableOpacity
          onPress={() => { setActivePicker((p) => (p === 'sticker' ? null : 'sticker')); setShowEmojiPicker(false); }}
          className="items-center justify-center pb-1"
          style={{ width: 36, height: 36 }}
        >
          <Ionicons
            name="flower-outline"
            size={22}
            color={activePicker === 'sticker' ? Colors.cta : Colors.textMuted}
          />
        </TouchableOpacity>

        {/* Text input */}
        <View
          className="mx-2 flex-1 rounded-2xl px-4 py-2"
          style={{
            backgroundColor: Colors.white,
            minHeight: 38,
            maxHeight: 120,
          }}
        >
          <TextInput
            className="text-[15px]"
            style={{ color: Colors.text, maxHeight: 100 }}
            placeholder="Type a message..."
            placeholderTextColor={Colors.textLight}
            value={text}
            onChangeText={handleChangeText}
            multiline
            textAlignVertical="center"
          />
        </View>

        {/* Send button */}
        <TouchableOpacity
          onPress={handleSend}
          disabled={!canSend}
          className="items-center justify-center pb-1"
          style={{ width: 36, height: 36 }}
        >
          <Ionicons
            name="send"
            size={24}
            color={canSend ? Colors.cta : Colors.textLight}
          />
        </TouchableOpacity>
      </View>

      <EmojiPicker
        onEmojiSelected={handleEmojiPick}
        open={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        enableSearchBar
        enableRecentlyUsed
      />
    </View>
  );
}
