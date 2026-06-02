import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  TouchableOpacity,
  Text,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Pressable,
  Keyboard,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import { Colors } from '@/constants/theme';
import { fileService, type FileUploadResponse } from '@/services/file.service';
import { getDisplayUrl, type KlipyItem } from '@/services/klipy.service';
import { MediaPicker } from '@/components/chat/MediaPicker';
import { ReminderModal } from '@/components/chat/ReminderModal';
import { PollModal } from '@/components/chat/PollModal';
import { VoiceRecordingBar } from '@/components/chat/VoiceRecordingBar';
import { CloudFilePickerModal } from '@/components/cloud/CloudFilePickerModal';
import { useAuthStore } from '@/store/auth.store';
import { useVoiceRecorder, MicPermissionDeniedError } from '@/hooks/useVoiceRecorder';
import type { Message, Attachment, Poll, LocationPayload } from '@/types/message';
import {
  TextRichComposer,
  type ComposerMode,
  type TextRichComposerRef,
} from '@/components/chat/TextRichComposer';
import { CustomAiIcon } from '@/components/ui/CustomAiIcon';
import { richTextToPlainText } from '@/utils/format';
import { fileToAttachment, resolveCloudFileMessageType } from '@/utils/cloudFileAttachment';

interface GroupMember {
  id: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
}

const VIRTUAL_MENTION_ALL: GroupMember = { id: '__all__', displayName: 'All', username: 'all' };
const VIRTUAL_MENTION_AI: GroupMember = { id: '__ai__', displayName: 'AI', username: 'ai' };

interface ChatInputProps {
  conversationId?: string;
  onSend: (
    text: string,
    attachments?: Attachment[],
    messageType?: string,
    priority?: 'IMPORTANT' | 'URGENT',
    poll?: Poll,
    location?: LocationPayload
  ) => void;
  onTyping?: (isTyping: boolean) => void;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  isGroup?: boolean;
  groupMembers?: GroupMember[];
  showAiMention?: boolean;
  prefilledText?: string;
  prefilledToken?: string;
  onPrefillApplied?: () => void;
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

function getDocumentIcon(mimeType: string): { name: string; color: string } {
  if (mimeType.includes('pdf')) return { name: 'document-text-outline', color: '#ef4444' };
  if (
    mimeType.includes('word') ||
    mimeType.includes('msword') ||
    mimeType.includes('wordprocessingml')
  )
    return { name: 'document-outline', color: '#3b82f6' };
  if (
    mimeType.includes('sheet') ||
    mimeType.includes('excel') ||
    mimeType.includes('spreadsheetml')
  )
    return { name: 'grid-outline', color: '#22c55e' };
  if (mimeType.includes('csv')) return { name: 'grid-outline', color: '#22c55e' };
  if (
    mimeType.includes('presentation') ||
    mimeType.includes('powerpoint') ||
    mimeType.includes('presentationml')
  )
    return { name: 'easel-outline', color: '#f97316' };
  if (mimeType.startsWith('audio/')) return { name: 'musical-notes-outline', color: '#a855f7' };
  if (mimeType.startsWith('video/')) return { name: 'film-outline', color: '#ec4899' };
  if (
    mimeType.includes('zip') ||
    mimeType.includes('rar') ||
    mimeType.includes('7z') ||
    mimeType.includes('tar') ||
    mimeType.includes('gzip')
  )
    return { name: 'archive-outline', color: '#78716c' };
  if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('xml'))
    return { name: 'code-slash-outline', color: '#64748b' };
  return { name: 'document-outline', color: Colors.textMuted };
}

export function ChatInput({
  conversationId,
  onSend,
  onTyping,
  replyingTo,
  onCancelReply,
  isGroup,
  groupMembers,
  showAiMention,
  prefilledText,
  prefilledToken,
  onPrefillApplied,
}: ChatInputProps) {
  const { t } = useTranslation();
  const composerRef = useRef<TextRichComposerRef>(null);
  const lastAppliedPrefillTokenRef = useRef<string | undefined>(undefined);
  const { user } = useAuthStore();
  const [composerMode, setComposerMode] = useState<ComposerMode>('plain');
  const [editorInstanceKey, setEditorInstanceKey] = useState(0);
  const [text, setText] = useState('');
  const [richHtml, setRichHtml] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [activePicker, setActivePicker] = useState<'emoji' | 'gif' | 'sticker' | null>(null);
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);
  const [showCloudPicker, setShowCloudPicker] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<'IMPORTANT' | 'URGENT' | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showLocationPreview, setShowLocationPreview] = useState(false);
  const [tempLocation, setTempLocation] = useState<LocationPayload | null>(null);
  const [isAcquiringLocation, setIsAcquiringLocation] = useState(false);
  const [isAudioSending, setIsAudioSending] = useState(false);

  const { isRecording, elapsedSeconds, startRecording, stopRecording, cancelRecording } =
    useVoiceRecorder();
  const replyPreviewText = replyingTo ? richTextToPlainText(replyingTo.content) : '';

  // Mention detection
  const mentionQuery = useMemo(() => {
    if (!isGroup || !groupMembers?.length) return null;
    const match = text.match(/@(\w*)$/);
    return match !== null ? match[1] : null;
  }, [text, isGroup, groupMembers]);

  const mentionSuggestions = useMemo<GroupMember[]>(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    const virtual: GroupMember[] = [
      ...('all'.includes(q) || 'All'.toLowerCase().includes(q) ? [VIRTUAL_MENTION_ALL] : []),
      ...(showAiMention && ('ai'.includes(q) || 'AI'.toLowerCase().includes(q))
        ? [VIRTUAL_MENTION_AI]
        : []),
    ];
    const members = (groupMembers ?? [])
      .filter(
        (m) => m.displayName.toLowerCase().includes(q) || m.username.toLowerCase().includes(q)
      )
      .slice(0, 6);
    return [...virtual, ...members];
  }, [mentionQuery, groupMembers, showAiMention]);

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

  const insertMention = (member: GroupMember) => {
    const newText = text.replace(/@\w*$/, `@${member.displayName} `);
    setText(newText);
  };

  const uploadFile = async (uri: string, fileName: string, mimeType: string) => {
    const localId = `${Date.now()}-${Math.random()}`;
    const isImage = mimeType.startsWith('image/') || mimeType.startsWith('video/');
    const pending: PendingFile = { localId, uri, name: fileName, mimeType, isImage, progress: 0 };
    setPendingFiles((prev) => [...prev, pending]);

    try {
      const result = await fileService.upload(uri, fileName, mimeType, conversationId, (pct) => {
        setPendingFiles((prev) =>
          prev.map((p) => (p.localId === localId ? { ...p, progress: pct } : p))
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
        prev.map((p) => (p.localId === localId ? { ...p, progress: 100, uploaded: attachment } : p))
      );
    } catch {
      setPendingFiles((prev) =>
        prev.map((p) => (p.localId === localId ? { ...p, error: t('chat.composer.upload_failed') } : p))
      );
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('chat.composer.library_permission_body'));
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
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.*',
          'text/plain',
          'application/zip',
          'audio/*',
        ],
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
  const hasAttachment = pendingFiles.some((p) => p.uploaded);
  const hasTextContent =
    composerMode === 'plain'
      ? text.trim().length > 0
      : richTextToPlainText(richHtml).trim().length > 0;
  const canSend = (hasTextContent || hasAttachment) && !isUploading;

  const handleSend = () => {
    if (!canSend) return;

    const attachments: Attachment[] = pendingFiles
      .filter((p) => p.uploaded)
      .map((p) => p.uploaded!);

    const outgoingContent = composerMode === 'editor' ? richHtml.trim() : text.trim();
    onSend(
      outgoingContent,
      attachments.length ? attachments : undefined,
      undefined,
      selectedPriority ?? undefined
    );
    setText('');
    setRichHtml('');
    setPendingFiles([]);
    setIsTyping(false);
    setSelectedPriority(null);
    onTyping?.(false);
    onCancelReply?.();
    if (composerMode === 'editor') {
      setEditorInstanceKey((prev) => prev + 1);
    }
    composerRef.current?.blur();
    Keyboard.dismiss();
  };

  const handleEmojiPick = (emoji: string) => {
    setText((prev) => prev + emoji);
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

  const handleOptionSelect = (optionId: string) => {
    setShowOptionsSheet(false);
    if (optionId === 'important') {
      setSelectedPriority((prev) => (prev === 'IMPORTANT' ? null : 'IMPORTANT'));
    } else if (optionId === 'urgent') {
      setSelectedPriority((prev) => (prev === 'URGENT' ? null : 'URGENT'));
    } else if (optionId === 'mode-plain') {
      setComposerMode('plain');
    } else if (optionId === 'mode-editor') {
      setComposerMode('editor');
    } else if (optionId === 'reminder') {
      setShowReminderModal(true);
    } else if (optionId === 'poll') {
      setShowPollModal(true);
    } else if (optionId === 'cloud-upload') {
      setShowCloudPicker(true);
    }
  };

  const handleSendCloudFiles = useCallback(
    (files: FileUploadResponse[]) => {
      if (files.length === 0) {
        return;
      }

      onSend(
        '',
        files.map(fileToAttachment),
        resolveCloudFileMessageType(files),
        selectedPriority ?? undefined
      );
      setSelectedPriority(null);
    },
    [onSend, selectedPriority]
  );

  const handleSendPoll = (poll: Poll) => {
    onSend('', undefined, 'POLL', undefined, poll);
  };

  const handleShareLocation = async () => {
    try {
      setShowOptionsSheet(false);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.permission_denied'),
          t('chat.composer.location_permission_body')
        );
        return;
      }

      setIsAcquiringLocation(true);
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Get human readable address if possible
      let address = `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`;
      try {
        const reverse = await Location.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        if (reverse && reverse.length > 0) {
          const first = reverse[0];
          address = [first.streetNumber, first.street, first.district, first.city, first.region]
            .filter(Boolean)
            .join(', ');
        }
      } catch {}

      setTempLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        address: address,
      });
      setShowLocationPreview(true);
      setIsAcquiringLocation(false);
    } catch (err) {
      setIsAcquiringLocation(false);
      console.error(err);
      Alert.alert(t('common.error'), t('chat.composer.location_acquire_failed'));
    }
  };

  const confirmShareLocation = () => {
    if (tempLocation) {
      onSend(t('chat.location_shared'), undefined, 'LOCATION', undefined, undefined, tempLocation);
      setShowLocationPreview(false);
      setTempLocation(null);
    }
  };

  const handleStartRecording = useCallback(async () => {
    try {
      await startRecording();
    } catch (err) {
      if (err instanceof MicPermissionDeniedError) {
        Alert.alert(
          t('common.permission_denied'),
          t('chat.composer.mic_permission_body')
        );
      } else {
        Alert.alert(t('common.error'), t('chat.composer.recording_start_failed'));
      }
    }
  }, [startRecording]);

  const handleSendAudio = useCallback(async () => {
    setIsAudioSending(true);
    try {
      const result = await stopRecording();
      if (!result) return;
      const fileName = `voice_${Date.now()}.m4a`;
      const uploaded = await fileService.upload(result.uri, fileName, 'audio/mp4', conversationId);
      const attachment: Attachment = {
        fileId: uploaded.fileId,
        url: uploaded.url,
        name: uploaded.fileName,
        type: uploaded.fileType,
        size: uploaded.fileSize,
        durationSeconds: result.durationSeconds,
      };
      onSend('', [attachment], 'AUDIO');
    } catch {
      Alert.alert(t('common.error'), t('chat.composer.voice_send_failed'));
    } finally {
      setIsAudioSending(false);
    }
  }, [stopRecording, conversationId, onSend]);

  const handleCancelRecording = useCallback(async () => {
    await cancelRecording();
  }, [cancelRecording]);

  useEffect(() => {
    const focusDelayMs = 140;
    const timer = setTimeout(() => {
      composerRef.current?.focus(composerMode);
    }, focusDelayMs);

    return () => clearTimeout(timer);
  }, [composerMode]);

  useEffect(() => {
    if (!prefilledText || !prefilledToken) return;
    if (lastAppliedPrefillTokenRef.current === prefilledToken) return;

    lastAppliedPrefillTokenRef.current = prefilledToken;
    setComposerMode('plain');
    setText(prefilledText);
    onPrefillApplied?.();

    const focusDelayMs = 120;
    const timer = setTimeout(() => {
      composerRef.current?.focus('plain');
    }, focusDelayMs);

    return () => clearTimeout(timer);
  }, [prefilledText, prefilledToken, onPrefillApplied]);

  return (
    <View style={{ backgroundColor: Colors.bgCard }}>
      <CloudFilePickerModal
        visible={showCloudPicker}
        onClose={() => setShowCloudPicker(false)}
        onSend={handleSendCloudFiles}
      />

      {/* Mention suggestions */}
      {mentionSuggestions.length > 0 && (
        <View
          style={{
            borderTopWidth: 0.5,
            borderTopColor: Colors.borderLight,
            backgroundColor: Colors.bgCard,
            maxHeight: 200,
          }}>
          <FlatList
            data={mentionSuggestions}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="always"
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => insertMention(item)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderBottomWidth: 0.5,
                  borderBottomColor: Colors.borderLight,
                }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: item.id === '__ai__' ? Colors.ctaLight : Colors.cta,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                    overflow: 'hidden',
                  }}>
                  {item.id === '__all__' ? (
                    <Ionicons name="people" size={18} color="white" />
                  ) : item.id === '__ai__' ? (
                    <CustomAiIcon size={18} color={Colors.cta} />
                  ) : item.avatarUrl ? (
                    <Image source={{ uri: item.avatarUrl }} style={{ width: 32, height: 32 }} />
                  ) : (
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>
                      {item.displayName.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.text }}>
                    {item.id === '__all__'
                      ? t('chat.mention_all')
                      : item.id === '__ai__'
                        ? t('chat.ai_short')
                        : item.displayName}
                  </Text>
                  <Text style={{ fontSize: 11, color: Colors.textMuted }}>@{item.username}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Priority indicator banner */}
      {selectedPriority && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: selectedPriority === 'URGENT' ? '#fef2f2' : '#fffbeb',
            borderTopWidth: 0.5,
            borderTopColor: Colors.borderLight,
          }}>
          <Ionicons
            name={selectedPriority === 'URGENT' ? 'warning-outline' : 'star-outline'}
            size={14}
            color={selectedPriority === 'URGENT' ? '#ef4444' : '#d97706'}
          />
          <Text
            style={{
              marginLeft: 6,
              fontSize: 12,
              color: selectedPriority === 'URGENT' ? '#ef4444' : '#d97706',
              flex: 1,
            }}>
            {selectedPriority === 'URGENT'
              ? t('chat.composer.urgent_message')
              : t('chat.composer.important_message')}
          </Text>
          <TouchableOpacity onPress={() => setSelectedPriority(null)}>
            <Ionicons name="close" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* MediaPicker overlay */}
      {activePicker && user?.id && (
        <MediaPicker
          initialTab={activePicker}
          customerId={user.id}
          onEmojiSelect={handleEmojiPick}
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
          }}>
          <View
            className="flex-1 rounded-lg px-3 py-1.5"
            style={{
              borderLeftWidth: 3,
              borderLeftColor: Colors.cta,
              backgroundColor: Colors.bgCard,
            }}>
            <Text className="mb-0.5 text-[11px] font-semibold" style={{ color: Colors.cta }}>
              {t('chat.replying_to')}
            </Text>
            <Text className="text-[12px]" style={{ color: Colors.textMuted }} numberOfLines={1}>
              {replyingTo.recalled
                ? t('chat.message_recalled')
                : replyingTo.type === 'IMAGE'
                  ? `🖼 ${t('chat.preview_image')}`
                  : replyingTo.type === 'FILE'
                    ? `📎 ${t('chat.preview_attachment')}`
                    : replyingTo.type === 'GIF'
                      ? `🎬 ${t('chat.preview_gif')}`
                      : replyingTo.type === 'STICKER'
                        ? `🎨 ${t('chat.preview_sticker')}`
                        : replyingTo.type === 'LOCATION'
                          ? `📍 ${t('chat.preview_location')}`
                          : replyPreviewText}
            </Text>
          </View>
          <TouchableOpacity onPress={onCancelReply} className="ml-2 p-1">
            <Ionicons name="close" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Pending file previews */}
      {pendingFiles.length > 0 && (
        <View
          className="flex-row flex-wrap gap-2 px-3 pt-2"
          style={{ borderTopWidth: 0.5, borderTopColor: Colors.borderLight }}>
          {pendingFiles.map((p) => (
            <View
              key={p.localId}
              className="overflow-hidden rounded-lg"
              style={{
                width: 72,
                height: 72,
                backgroundColor: Colors.bg,
                borderWidth: 1,
                borderColor: Colors.borderLight,
              }}>
              {p.isImage ? (
                <Image
                  source={{ uri: p.uri }}
                  style={{ width: 72, height: 72 }}
                  resizeMode="cover"
                />
              ) : (
                <View className="flex-1 items-center justify-center">
                  {(() => {
                    const icon = getDocumentIcon(p.mimeType);
                    return (
                      <Ionicons
                        name={icon.name as 'document-outline'}
                        size={24}
                        color={icon.color}
                      />
                    );
                  })()}
                  <Text style={{ fontSize: 8, color: Colors.textMuted }} numberOfLines={1}>
                    {p.name}
                  </Text>
                </View>
              )}
              {/* Progress / status overlay */}
              {!p.uploaded && !p.error && (
                <View
                  className="absolute inset-0 items-center justify-center"
                  style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                  <ActivityIndicator size="small" color={Colors.white} />
                </View>
              )}
              {p.error && (
                <View
                  className="absolute inset-0 items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,0,0,0.3)' }}>
                  <Ionicons name="alert-circle" size={20} color={Colors.white} />
                </View>
              )}
              {/* Remove button */}
              <TouchableOpacity
                onPress={() => removePending(p.localId)}
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name="close" size={12} color={Colors.white} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Voice recording bar — replaces the input row while recording */}
      {isRecording && (
        <VoiceRecordingBar
          elapsedSeconds={elapsedSeconds}
          onSend={handleSendAudio}
          onCancel={handleCancelRecording}
          isSending={isAudioSending}
        />
      )}

      {/* Input row */}
      {!isRecording && (
        <View
          className="flex-row items-center border-t px-3 py-2"
          style={{
            borderTopColor: Colors.borderLight,
            backgroundColor: Colors.bg,
          }}>
          {/* Image picker button */}
          <TouchableOpacity
            onPress={handlePickImage}
            className="items-center justify-center"
            style={{ width: 36, height: 36 }}>
            <Ionicons name="image-outline" size={24} color={Colors.cta} />
          </TouchableOpacity>

          {/* Document picker button */}
          <TouchableOpacity
            onPress={handlePickDocument}
            className="items-center justify-center"
            style={{ width: 36, height: 36 }}>
            <Ionicons name="attach-outline" size={24} color={Colors.cta} />
          </TouchableOpacity>

          {/* 3-dot options button */}
          <TouchableOpacity
            onPress={() => setShowOptionsSheet(true)}
            className="items-center justify-center"
            style={{ width: 36, height: 36 }}>
            <Ionicons
              name="ellipsis-horizontal"
              size={22}
              color={
                selectedPriority
                  ? selectedPriority === 'URGENT'
                    ? '#ef4444'
                    : '#d97706'
                  : Colors.cta
              }
            />
          </TouchableOpacity>

          {/* Text / Editor composer */}
          <View
            className="mx-2 flex-1 rounded-2xl px-4 py-2"
            style={{
              backgroundColor: 'transparent',
              minHeight: 38,
              maxHeight: composerMode === 'plain' ? 120 : 220,
            }}>
            <TextRichComposer
              ref={composerRef}
              mode={composerMode}
              onModeChange={setComposerMode}
              plainText={text}
              onPlainTextChange={handleChangeText}
              richHtml={richHtml}
              onRichHtmlChange={setRichHtml}
              placeholder={t('chat.type_placeholder_short')}
              minHeight={44}
              showToolbar={composerMode === 'editor'}
              showModeToggle={false}
              editorKey={`chat-input-composer-${editorInstanceKey}`}
              plainRightAccessory={
                <TouchableOpacity
                  onPress={() => setActivePicker((current) => (current ? null : 'emoji'))}
                  className="items-center justify-center rounded-full"
                  style={{ width: 32, height: 32 }}>
                  <Ionicons
                    name="happy-outline"
                    size={22}
                    color={activePicker ? Colors.cta : Colors.textMuted}
                  />
                </TouchableOpacity>
              }
            />
          </View>

          {/* Mic button — shown when text and files are empty */}
          {composerMode === 'plain' && text === '' && pendingFiles.length === 0 ? (
            <TouchableOpacity
              onPress={handleStartRecording}
              className="items-center justify-center"
              style={{ width: 36, height: 36 }}>
              <Ionicons name="mic-outline" size={24} color={Colors.cta} />
            </TouchableOpacity>
          ) : (
            /* Send button */
            <TouchableOpacity
              onPress={handleSend}
              disabled={!canSend}
              className="items-center justify-center"
              style={{ width: 36, height: 36 }}>
              <Ionicons name="send" size={24} color={canSend ? Colors.cta : Colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Reminder Modal */}
      {conversationId && (
        <ReminderModal
          visible={showReminderModal}
          conversationId={conversationId}
          onClose={() => setShowReminderModal(false)}
        />
      )}

      {/* Poll Modal */}
      <PollModal
        visible={showPollModal}
        onClose={() => setShowPollModal(false)}
        onSend={handleSendPoll}
      />

      {/* Location Preview Modal */}
      <Modal
        visible={showLocationPreview}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLocationPreview(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}>
          <View
            style={{
              backgroundColor: Colors.bgCard,
              borderRadius: 24,
              width: '100%',
              overflow: 'hidden',
              maxWidth: 400,
            }}>
            {/* Header */}
            <View
              style={{
                padding: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottomWidth: 0.5,
                borderBottomColor: Colors.borderLight,
              }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.text }}>
                {t('chat.composer.share_location_title')}
              </Text>
              <TouchableOpacity onPress={() => setShowLocationPreview(false)}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Map Preview */}
            {tempLocation && (
              <View style={{ height: 250, backgroundColor: '#f1f5f9', position: 'relative' }}>
                <ExpoImage
                  source={{
                    uri: `https://static-maps.yandex.ru/1.x/?ll=${tempLocation.longitude},${tempLocation.latitude}&size=600,400&z=15&l=map&pt=${tempLocation.longitude},${tempLocation.latitude},pm2rdl`,
                  }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Ionicons name="location" size={40} color="#ef4444" style={{ marginTop: -20 }} />
                </View>
              </View>
            )}

            {/* Location Info */}
            <View style={{ padding: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="navigate-circle" size={20} color={Colors.cta} />
                <Text
                  style={{
                    marginLeft: 8,
                    fontSize: 15,
                    fontWeight: '600',
                    color: Colors.text,
                    flex: 1,
                  }}>
                  {t('chat.composer.your_current_location')}
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: Colors.textMuted, lineHeight: 18 }}>
                {tempLocation?.address}
              </Text>
              <Text style={{ fontSize: 11, color: Colors.textLight, marginTop: 4 }}>
                {tempLocation?.latitude.toFixed(6)}, {tempLocation?.longitude.toFixed(6)}
              </Text>
            </View>

            {/* Actions */}
            <View style={{ padding: 20, paddingTop: 0, flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowLocationPreview(false)}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 14,
                  backgroundColor: Colors.bg,
                  alignItems: 'center',
                }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: Colors.text }}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmShareLocation}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 14,
                  backgroundColor: Colors.cta,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                }}>
                <Ionicons name="send" size={16} color="white" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 15, fontWeight: '600', color: 'white' }}>
                  {t('chat.composer.send_location')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Loading overlay for location acquisition */}
      {isAcquiringLocation && (
        <View
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: Colors.overlay,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
          }}>
          <ActivityIndicator size="large" color={Colors.cta} />
          <Text style={{ marginTop: 12, fontSize: 14, color: Colors.text, fontWeight: '500' }}>
            {t('chat.composer.acquiring_location')}
          </Text>
        </View>
      )}

      {/* Options bottom sheet */}
      <Modal
        visible={showOptionsSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOptionsSheet(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}
          onPress={() => setShowOptionsSheet(false)}>
          <Pressable
            style={{
              backgroundColor: Colors.bgCard,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingTop: 12,
              paddingBottom: 28,
            }}
            onPress={() => {}}>
            {/* Handle bar */}
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: Colors.borderLight,
                }}
              />
            </View>

            {/* Input mode options */}
            <TouchableOpacity
              onPress={() => handleOptionSelect('mode-plain')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 14,
                backgroundColor: composerMode === 'plain' ? '#eff6ff' : 'transparent',
              }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#dbeafe',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                }}>
                <Ionicons name="text-outline" size={20} color="#2563eb" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '500', color: Colors.text }}>
                  {t('chat.composer.text_mode')}
                </Text>
                <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 1 }}>
                  {t('chat.composer.text_mode_desc')}
                </Text>
              </View>
              {composerMode === 'plain' && (
                <Ionicons name="checkmark-circle" size={20} color="#2563eb" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleOptionSelect('mode-editor')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 14,
                backgroundColor: composerMode === 'editor' ? '#f5f3ff' : 'transparent',
              }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#ede9fe',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                }}>
                <Ionicons name="create-outline" size={20} color="#7c3aed" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '500', color: Colors.text }}>
                  {t('chat.composer.editor_mode')}
                </Text>
                <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 1 }}>
                  {t('chat.composer.editor_mode_desc')}
                </Text>
              </View>
              {composerMode === 'editor' && (
                <Ionicons name="checkmark-circle" size={20} color="#7c3aed" />
              )}
            </TouchableOpacity>

            <View
              style={{
                height: 1,
                backgroundColor: Colors.borderLight,
                marginHorizontal: 20,
                marginVertical: 4,
              }}
            />

            {/* Priority options */}
            <TouchableOpacity
              onPress={() => handleOptionSelect('important')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 14,
                backgroundColor: selectedPriority === 'IMPORTANT' ? '#fffbeb' : 'transparent',
              }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#fef3c7',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                }}>
                <Ionicons
                  name={selectedPriority === 'IMPORTANT' ? 'star' : 'star-outline'}
                  size={20}
                  color="#d97706"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '500', color: Colors.text }}>
                  {t('chat.composer.important_news')}
                </Text>
                <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 1 }}>
                  {t('chat.composer.important_news_desc')}
                </Text>
              </View>
              {selectedPriority === 'IMPORTANT' && (
                <Ionicons name="checkmark-circle" size={20} color="#d97706" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleOptionSelect('urgent')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 14,
                backgroundColor: selectedPriority === 'URGENT' ? '#fef2f2' : 'transparent',
              }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#fee2e2',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                }}>
                <Ionicons
                  name={selectedPriority === 'URGENT' ? 'warning' : 'warning-outline'}
                  size={20}
                  color="#ef4444"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '500', color: Colors.text }}>
                  {t('chat.composer.urgent_news')}
                </Text>
                <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 1 }}>
                  {t('chat.composer.urgent_news_desc')}
                </Text>
              </View>
              {selectedPriority === 'URGENT' && (
                <Ionicons name="checkmark-circle" size={20} color="#ef4444" />
              )}
            </TouchableOpacity>

            <View
              style={{
                height: 1,
                backgroundColor: Colors.borderLight,
                marginHorizontal: 20,
                marginVertical: 4,
              }}
            />

            <TouchableOpacity
              onPress={() => handleOptionSelect('cloud-upload')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 14,
              }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#eef2ff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                }}>
                <Ionicons name="cloud-upload-outline" size={20} color={Colors.cta} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '500', color: Colors.text }}>
                  {t('chat.composer.upload_from_cloud')}
                </Text>
                <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 1 }}>
                  {t('chat.composer.upload_from_cloud_desc')}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleOptionSelect('reminder')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 14,
              }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#e0e7ff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                }}>
                <Ionicons name="alarm-outline" size={20} color={Colors.cta} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '500', color: Colors.text }}>
                  {t('chat.composer.create_reminders')}
                </Text>
                <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 1 }}>
                  {t('chat.composer.create_reminders_desc')}
                </Text>
              </View>
            </TouchableOpacity>

            {isGroup && (
              <TouchableOpacity
                onPress={() => handleOptionSelect('poll')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: '#e0f2fe',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}>
                  <Ionicons name="bar-chart-outline" size={20} color="#0284c7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '500', color: Colors.text }}>
                    {t('chat.composer.vote')}
                  </Text>
                  <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 1 }}>
                    {t('chat.composer.vote_desc')}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Share Location option */}
            <TouchableOpacity
              onPress={handleShareLocation}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 14,
              }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#fee2e2',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                }}>
                <Ionicons name="location-outline" size={20} color="#ef4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '500', color: Colors.text }}>
                  {t('chat.composer.location')}
                </Text>
                <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 1 }}>
                  {t('chat.composer.location_desc')}
                </Text>
              </View>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
