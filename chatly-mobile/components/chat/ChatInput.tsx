import { useState, useMemo } from 'react';
import { View, TextInput, TouchableOpacity, Text, Image, ActivityIndicator, Alert, Modal, FlatList, Pressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import EmojiPicker from 'rn-emoji-keyboard';
import type { EmojiType } from 'rn-emoji-keyboard';
import { Colors } from '@/constants/theme';
import { fileService } from '@/services/file.service';
import { getDisplayUrl, type KlipyItem } from '@/services/klipy.service';
import { MediaPicker } from '@/components/chat/MediaPicker';
import { ReminderModal } from '@/components/chat/ReminderModal';
import { PollModal } from '@/components/chat/PollModal';
import { useAuthStore } from '@/store/auth.store';
import type { Message, Attachment, Poll, LocationPayload } from '@/types/message';

interface GroupMember {
  id: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
}

interface ChatInputProps {
  conversationId?: string;
  onSend: (text: string, attachments?: Attachment[], messageType?: string, priority?: 'IMPORTANT' | 'URGENT', poll?: Poll, location?: LocationPayload) => void;
  onTyping?: (isTyping: boolean) => void;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  isGroup?: boolean;
  groupMembers?: GroupMember[];
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
  if (mimeType.includes('word') || mimeType.includes('msword') || mimeType.includes('wordprocessingml'))
    return { name: 'document-outline', color: '#3b82f6' };
  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('spreadsheetml'))
    return { name: 'grid-outline', color: '#22c55e' };
  if (mimeType.includes('csv')) return { name: 'grid-outline', color: '#22c55e' };
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint') || mimeType.includes('presentationml'))
    return { name: 'easel-outline', color: '#f97316' };
  if (mimeType.startsWith('audio/')) return { name: 'musical-notes-outline', color: '#a855f7' };
  if (mimeType.startsWith('video/')) return { name: 'film-outline', color: '#ec4899' };
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') || mimeType.includes('tar') || mimeType.includes('gzip'))
    return { name: 'archive-outline', color: '#78716c' };
  if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('xml'))
    return { name: 'code-slash-outline', color: '#64748b' };
  return { name: 'document-outline', color: Colors.textMuted };
}

export function ChatInput({ conversationId, onSend, onTyping, replyingTo, onCancelReply, isGroup, groupMembers }: ChatInputProps) {
  const { user } = useAuthStore();
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [activePicker, setActivePicker] = useState<'gif' | 'sticker' | null>(null);
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<'IMPORTANT' | 'URGENT' | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showLocationPreview, setShowLocationPreview] = useState(false);
  const [tempLocation, setTempLocation] = useState<LocationPayload | null>(null);
  const [isAcquiringLocation, setIsAcquiringLocation] = useState(false);

  // Mention detection
  const mentionQuery = useMemo(() => {
    if (!isGroup || !groupMembers?.length) return null;
    const match = text.match(/@(\w*)$/);
    return match !== null ? match[1] : null;
  }, [text, isGroup, groupMembers]);

  const mentionSuggestions = useMemo<GroupMember[]>(() => {
    if (mentionQuery === null || !groupMembers?.length) return [];
    const q = mentionQuery.toLowerCase();
    return groupMembers
      .filter(
        (m) =>
          m.displayName.toLowerCase().includes(q) ||
          m.username.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [mentionQuery, groupMembers]);

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

    onSend(text.trim(), attachments.length ? attachments : undefined, undefined, selectedPriority ?? undefined);
    setText('');
    setPendingFiles([]);
    setIsTyping(false);
    setSelectedPriority(null);
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

  const handleOptionSelect = (optionId: string) => {
    setShowOptionsSheet(false);
    if (optionId === 'important') {
      setSelectedPriority((prev) => (prev === 'IMPORTANT' ? null : 'IMPORTANT'));
    } else if (optionId === 'urgent') {
      setSelectedPriority((prev) => (prev === 'URGENT' ? null : 'URGENT'));
    } else if (optionId === 'reminder') {
      setShowReminderModal(true);
    } else if (optionId === 'poll') {
      setShowPollModal(true);
    }
  };

  const handleSendPoll = (poll: Poll) => {
    onSend('', undefined, 'POLL', undefined, poll);
  };

  const handleShareLocation = async () => {
    try {
      setShowOptionsSheet(false);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant location permission to share your location.');
        return;
      }
      
      setIsAcquiringLocation(true);
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      
      // Get human readable address if possible
      let address = `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`;
      try {
        const reverse = await Location.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        if (reverse && reverse.length > 0) {
          const first = reverse[0];
          address = [first.streetNumber, first.street, first.district, first.city, first.region].filter(Boolean).join(', ');
        }
      } catch (e) {}

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
      Alert.alert('Error', 'Failed to acquire location');
    }
  };

  const confirmShareLocation = () => {
    if (tempLocation) {
      onSend('Location shared', undefined, 'LOCATION', undefined, undefined, tempLocation);
      setShowLocationPreview(false);
      setTempLocation(null);
    }
  };

  return (
    <View style={{ backgroundColor: Colors.white }}>
      {/* Mention suggestions */}
      {mentionSuggestions.length > 0 && (
        <View
          style={{
            borderTopWidth: 0.5,
            borderTopColor: Colors.borderLight,
            backgroundColor: Colors.white,
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
                    backgroundColor: Colors.cta,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                    overflow: 'hidden',
                  }}>
                  {item.avatarUrl ? (
                    <Image source={{ uri: item.avatarUrl }} style={{ width: 32, height: 32 }} />
                  ) : (
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>
                      {item.displayName.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.text }}>
                    {item.displayName}
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
            {selectedPriority === 'URGENT' ? 'Urgent message' : 'Important message'}
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
              backgroundColor: Colors.white,
            }}>
            <Text className="mb-0.5 text-[11px] font-semibold" style={{ color: Colors.cta }}>
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
                        : replyingTo.type === 'LOCATION'
                        ? '📍 Location'
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
                    return <Ionicons name={icon.name as 'document-outline'} size={24} color={icon.color} />;
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

      {/* Input row */}
      <View
        className="flex-row items-end border-t px-3 py-2"
        style={{
          borderTopColor: Colors.borderLight,
          backgroundColor: Colors.bg,
        }}>
        {/* Image picker button */}
        <TouchableOpacity
          onPress={handlePickImage}
          className="items-center justify-center pb-1"
          style={{ width: 36, height: 36 }}>
          <Ionicons name="image-outline" size={24} color={Colors.cta} />
        </TouchableOpacity>

        {/* Document picker button */}
        <TouchableOpacity
          onPress={handlePickDocument}
          className="items-center justify-center pb-1"
          style={{ width: 36, height: 36 }}>
          <Ionicons name="attach-outline" size={24} color={Colors.cta} />
        </TouchableOpacity>

        {/* Emoji picker button */}
        <TouchableOpacity
          onPress={() => setShowEmojiPicker(true)}
          className="items-center justify-center pb-1"
          style={{ width: 36, height: 36 }}>
          <Ionicons name="happy-outline" size={24} color={Colors.cta} />
        </TouchableOpacity>

        {/* 3-dot options button */}
        <TouchableOpacity
          onPress={() => setShowOptionsSheet(true)}
          className="items-center justify-center pb-1"
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

        {/* Text input */}
        <View
          className="mx-2 flex-1 rounded-2xl px-4 py-2"
          style={{
            backgroundColor: Colors.white,
            minHeight: 38,
            maxHeight: 120,
          }}>
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
          style={{ width: 36, height: 36 }}>
          <Ionicons name="send" size={24} color={canSend ? Colors.cta : Colors.textLight} />
        </TouchableOpacity>
      </View>

      <EmojiPicker
        onEmojiSelected={handleEmojiPick}
        open={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        enableSearchBar
        enableRecentlyUsed
      />

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
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: Colors.white, borderRadius: 24, width: '100%', overflow: 'hidden', maxWidth: 400 }}>
            {/* Header */}
            <View style={{ padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.text }}>Share Location</Text>
              <TouchableOpacity onPress={() => setShowLocationPreview(false)}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Map Preview */}
            {tempLocation && (
              <View style={{ height: 250, backgroundColor: '#f1f5f9', position: 'relative' }}>
                <ExpoImage
                  source={{ uri: `https://static-maps.yandex.ru/1.x/?ll=${tempLocation.longitude},${tempLocation.latitude}&size=600,400&z=15&l=map&pt=${tempLocation.longitude},${tempLocation.latitude},pm2rdl` }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                   <Ionicons name="location" size={40} color="#ef4444" style={{ marginTop: -20 }} />
                </View>
              </View>
            )}

            {/* Location Info */}
            <View style={{ padding: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="navigate-circle" size={20} color={Colors.cta} />
                <Text style={{ marginLeft: 8, fontSize: 15, fontWeight: '600', color: Colors.text, flex: 1 }}>
                  Your Current Location
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
                style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.bg, alignItems: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: Colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmShareLocation}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.cta, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
                <Ionicons name="send" size={16} color="white" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 15, fontWeight: '600', color: 'white' }}>Send Location</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Loading overlay for location acquisition */}
      {isAcquiringLocation && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
           <ActivityIndicator size="large" color={Colors.cta} />
           <Text style={{ marginTop: 12, fontSize: 14, color: Colors.text, fontWeight: '500' }}>Acquiring location...</Text>
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
              backgroundColor: Colors.white,
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

            {/* GIF picker */}
            <TouchableOpacity
              onPress={() => {
                setShowOptionsSheet(false);
                setActivePicker((p) => (p === 'gif' ? null : 'gif'));
                setShowEmojiPicker(false);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 14,
                backgroundColor: activePicker === 'gif' ? '#f0f9ff' : 'transparent',
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
                <Ionicons name="film-outline" size={20} color="#0284c7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '500', color: Colors.text }}>GIF</Text>
                <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 1 }}>
                  Send GIF
                </Text>
              </View>
            </TouchableOpacity>

            {/* Sticker picker */}
            <TouchableOpacity
              onPress={() => {
                setShowOptionsSheet(false);
                setActivePicker((p) => (p === 'sticker' ? null : 'sticker'));
                setShowEmojiPicker(false);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 14,
                backgroundColor: activePicker === 'sticker' ? '#fdf4ff' : 'transparent',
              }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#f3e8ff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                }}>
                <Ionicons name="flower-outline" size={20} color="#9333ea" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '500', color: Colors.text }}>Sticker</Text>
                <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 1 }}>
                  Send stickers
                </Text>
              </View>
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
                  Important news
                </Text>
                <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 1 }}>
                  Mark this message as important.
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
                  Urgent news
                </Text>
                <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 1 }}>
                  Mark this message as urgent.
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
                  Create reminders
                </Text>
                <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 1 }}>
                  Set message reminders at specific times.
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
                  <Text style={{ fontSize: 15, fontWeight: '500', color: Colors.text }}>Vote</Text>
                  <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 1 }}>
                    Create a poll within the group.
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
                <Text style={{ fontSize: 15, fontWeight: '500', color: Colors.text }}>Location</Text>
                <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 1 }}>
                  Share your current location.
                </Text>
              </View>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
