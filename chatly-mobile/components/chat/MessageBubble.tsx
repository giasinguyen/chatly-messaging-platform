import { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Linking, Modal, Pressable, FlatList, Dimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import RenderHtml from 'react-native-render-html';
import { Ionicons } from '@expo/vector-icons';
import {
  FilePdf,
  MicrosoftWordLogo,
  MicrosoftExcelLogo,
  FileCsv,
  MicrosoftPowerpointLogo,
  FileImage as PhosphorFileImage,
  FileVideo as PhosphorFileVideo,
  FileAudio as PhosphorFileAudio,
  FileArchive,
  FileCode as PhosphorFileCode,
  File as PhosphorFile,
} from 'phosphor-react-native';
import { Colors } from '@/constants/theme';
import { formatMessageTime, isRichTextHtml, richTextToPlainText } from '@/utils/format';
import { ImageLightbox } from '@/components/ui/ImageLightbox';
import { VideoPlayer } from '@/components/chat/VideoPlayer';
import { AudioPlayer } from '@/components/chat/AudioPlayer';
import { useCallStore } from '@/store/call.store';
import type { Message, Reaction } from '@/types/message';

interface ParticipantInfo {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  showAvatar?: boolean;
  senderName?: string;
  senderAvatarUrl?: string;
  currentUserId?: string;
  onLongPress?: () => void;
  onReact?: (messageId: string, emoji: string) => void;
  onVotePoll?: (messageId: string, optionIndex: number) => void;
  replyToMessage?: Message | null;
  onCallAgain?: (calleeId: string, calleeName: string, calleeAvatar?: string) => void;
  onJoinGroupCall?: (callId: string) => void;
  isGroupConversation?: boolean;
  calleeInfo?: { id: string; name: string; avatar?: string } | null;
  highlightKeyword?: string | null;
  onMentionPress?: (displayName: string) => void;
  participantNames?: string[];
  participantMap?: Record<string, ParticipantInfo>;
  onVCardPress?: (userId: string) => void;
  onAddFriend?: (userId: string) => void;
  vcardFriendStatus?: (userId: string) => 'ACCEPTED' | 'PENDING' | null;
  onClosePoll?: (messageId: string) => void;
  onScrollToMessage?: (messageId: string) => void;
}

export function MessageBubble({
  message,
  isMe,
  showAvatar = false,
  senderName,
  senderAvatarUrl,
  currentUserId,
  onLongPress,
  onReact,
  onVotePoll,
  replyToMessage,
  onCallAgain,
  onJoinGroupCall,
  isGroupConversation = false,
  calleeInfo,
  highlightKeyword,
  onMentionPress,
  participantNames,
  participantMap,
  onVCardPress,
  onAddFriend,
  vcardFriendStatus,
  onClosePoll,
  onScrollToMessage,
}: MessageBubbleProps) {
  const { content, type, recalled, edited, createdAt, readBy, attachments } = message;
  const normalizedTextContent = richTextToPlainText(content);
  const groupCallRealtimeState = useCallStore((state) => state.groupCallRealtimeState);

  const screenWidth = Dimensions.get('window').width;
  const maxBubbleWidth = screenWidth * 0.78;
  const imageSize = Math.min(maxBubbleWidth - 32, 240);

  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [voterModal, setVoterModal] = useState<{ title: string; voterIds: string[] } | null>(null);

  // Recalled message
  if (recalled) {
    return (
      <View className={`my-0.5 flex-row px-4 ${isMe ? 'justify-end' : 'justify-start'}`}>
        <View
          className="rounded-2xl px-4 py-2.5"
          style={{
            backgroundColor: isMe ? Colors.bubbleSender : Colors.bubbleReceiver,
            opacity: 0.5,
            maxWidth: '75%',
          }}
        >
          <Text
            className="text-sm italic"
            style={{ color: isMe ? Colors.bubbleSenderText : Colors.bubbleReceiverText }}
          >
            Message recalled
          </Text>
        </View>
      </View>
    );
  }

  // Image message — show ALL images, not just the first
  const renderImageContent = () => {
    const images = (attachments ?? []).filter((a) => !!a.url);
    if (images.length === 0) return null;
    const imageUrls = images.map((a) => a.url);
    return (
      <>
        <ImageLightbox
          images={imageUrls}
          initialIndex={0}
          visible={lightboxVisible}
          onClose={() => setLightboxVisible(false)}
        />
        <View className="gap-1">
          {images.map((img, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => setLightboxVisible(true)}
              activeOpacity={0.85}
            >
              <Image
                source={{ uri: img.url }}
                style={{ width: imageSize, height: imageSize, borderRadius: 12 }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </View>
      </>
    );
  };

  // Video message
  const renderVideoContent = () => {
    const video = attachments?.[0];
    if (!video?.url) return null;
    return <VideoPlayer url={video.url} name={video.name} />;
  };

  // Audio message
  const renderAudioContent = () => {
    const audio = attachments?.[0];
    if (!audio?.url) return null;
    return <AudioPlayer url={audio.url} name={audio.name} isMe={isMe} durationSeconds={audio.durationSeconds} />;
  };

  // File message — show ALL files with proper names and type-based icons
  type PhosphorIconComponent = React.ComponentType<{ size: number; color: string; weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone' }>;
  const getFileIconDetails = (mimeType?: string, fileName?: string): { IconComponent: PhosphorIconComponent; color: string } => {
    const t = (mimeType ?? '').toLowerCase();
    const ext = (fileName?.split('.').pop() ?? '').toLowerCase();
    if (t.includes('pdf') || ext === 'pdf') return { IconComponent: FilePdf, color: '#ef4444' };
    if (t.includes('word') || t.includes('document') || ext === 'docx' || ext === 'doc') return { IconComponent: MicrosoftWordLogo, color: '#2563eb' };
    if (t.includes('sheet') || t.includes('excel') || ext === 'xlsx' || ext === 'xls') return { IconComponent: MicrosoftExcelLogo, color: '#16a34a' };
    if (ext === 'csv') return { IconComponent: FileCsv, color: '#16a34a' };
    if (t.includes('presentation') || t.includes('powerpoint') || ext === 'pptx' || ext === 'ppt') return { IconComponent: MicrosoftPowerpointLogo, color: '#ea580c' };
    if (t.startsWith('image/')) return { IconComponent: PhosphorFileImage, color: '#7c3aed' };
    if (t.startsWith('video/')) return { IconComponent: PhosphorFileVideo, color: '#db2777' };
    if (t.startsWith('audio/')) return { IconComponent: PhosphorFileAudio, color: '#d97706' };
    if (t.includes('zip') || t.includes('rar') || t.includes('tar') || t.includes('7z') || ext === 'zip' || ext === 'rar' || ext === '7z') return { IconComponent: FileArchive, color: '#92400e' };
    if (['js', 'ts', 'jsx', 'tsx', 'json', 'xml', 'html', 'css', 'py', 'java'].includes(ext)) return { IconComponent: PhosphorFileCode, color: '#475569' };
    return { IconComponent: PhosphorFile, color: '#6b7280' };
  };

  const renderFileContent = () => {
    const files = (attachments ?? []).filter((a) => !!a.url);
    if (files.length === 0) return null;

    const isVideoFile = (url: string) => {
      const ext = url.split('.').pop()?.toLowerCase();
      return ['mp4', 'm4v', 'mov', 'mkv', 'webm'].includes(ext || '');
    };

    const isAudioFile = (url: string) => {
      const ext = url.split('.').pop()?.toLowerCase();
      return ['mp3', 'wav', 'm4a', 'ogg', 'aac'].includes(ext || '');
    };

    return (
      <View style={{ gap: 6, width: maxBubbleWidth - 32 }}>
        {files.map((file, idx) => {
          if (!file.url) return null;

          // Inline players for media files
          if (isVideoFile(file.url)) {
            return <VideoPlayer key={idx} url={file.url} name={file.name} />;
          }
          if (isAudioFile(file.url)) {
            return <AudioPlayer key={idx} url={file.url} name={file.name} isMe={isMe} />;
          }

          const rawName = file.name
            || (() => { try { return decodeURIComponent(file.url.split('/').pop() ?? ''); } catch { return file.url.split('/').pop(); } })()
            || 'Attachment';
          const fileName = rawName.length > 60 ? `${rawName.slice(0, 57)}...` : rawName;
          const sizeStr = file.size
            ? file.size > 1048576
              ? `${(file.size / 1048576).toFixed(1)} MB`
              : `${Math.round(file.size / 1024)} KB`
            : '';
          const { IconComponent, color: iconColor } = getFileIconDetails(file.type, rawName);
          return (
            <TouchableOpacity
              key={idx}
              onPress={() => file.url && Linking.openURL(file.url)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: isMe ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.07)',
              }}
            >
              {/* Phosphor file icon */}
              <View style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IconComponent size={28} color={isMe ? 'rgba(255,255,255,0.85)' : iconColor} weight="duotone" />
              </View>
              <View style={{ marginLeft: 10, flex: 1, overflow: 'hidden' }}>
                <Text
                  style={{ fontSize: 14, fontWeight: '500', color: isMe ? Colors.bubbleSenderText : Colors.text }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {fileName}
                </Text>
                {sizeStr ? (
                  <Text
                    style={{ fontSize: 11, marginTop: 2, color: isMe ? 'rgba(255,255,255,0.6)' : Colors.textMuted }}
                  >
                    {sizeStr}
                  </Text>
                ) : null}
              </View>
              <Ionicons
                name="download-outline"
                size={16}
                color={isMe ? 'rgba(255,255,255,0.7)' : Colors.textMuted}
                style={{ marginLeft: 8, flexShrink: 0 }}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // Text with URL detection
  const renderHighlightedText = (text: string, textColor: string, keyPrefix = 'hl') => {
    if (!highlightKeyword?.trim()) return <Text key={keyPrefix} style={{ color: textColor }}>{text}</Text>;
    const escaped = highlightKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    if (parts.length === 1) return <Text key={keyPrefix} style={{ color: textColor }}>{text}</Text>;
    return (
      <Text key={keyPrefix} style={{ color: textColor }}>
        {parts.map((part, i) =>
          i % 2 === 1 ? (
            <Text key={i} style={{ backgroundColor: '#fef08a', color: '#1a1a1a', borderRadius: 2 }}>
              {part}
            </Text>
          ) : (
            <Text key={i}>{part}</Text>
          ),
        )}
      </Text>
    );
  };

  const renderTextContent = () => {
    const URL_REGEX = /(https?:\/\/[^\s<>"]+)/g;
    const textColor = isMe ? Colors.bubbleSenderText : Colors.bubbleReceiverText;
    const htmlContent = content;

    if (isRichTextHtml(htmlContent)) {
      return (
        <RenderHtml
          contentWidth={maxBubbleWidth - 32}
          source={{ html: `<div>${htmlContent}</div>` }}
          baseStyle={{ color: textColor, fontSize: 15, lineHeight: 21 }}
          tagsStyles={{
            p: { marginTop: 0, marginBottom: 4, color: textColor },
            div: { marginTop: 0, marginBottom: 4, color: textColor },
            span: { color: textColor },
            strong: { fontWeight: '700', color: textColor },
            b: { fontWeight: '700', color: textColor },
            em: { fontStyle: 'italic', color: textColor },
            i: { fontStyle: 'italic', color: textColor },
            u: { textDecorationLine: 'underline', color: textColor },
            s: { textDecorationLine: 'line-through', color: textColor },
            ul: { marginTop: 0, marginBottom: 4, paddingLeft: 14 },
            ol: { marginTop: 0, marginBottom: 4, paddingLeft: 14 },
            li: { marginBottom: 2, color: textColor },
          }}
          renderersProps={{
            a: {
              onPress: (_, href) => {
                if (href) {
                  Linking.openURL(href);
                }
              },
            },
          }}
        />
      );
    }

    // Build mention regex from known participant names (longest first to avoid partial matches)
    const names = [...(participantNames ?? []), 'all'].filter(Boolean).sort((a, b) => b.length - a.length);
    const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const MENTION_REGEX = escaped.length > 0
      ? new RegExp(`(@(?:${escaped.join('|')}))`, 'g')
      : /(@\S+)/g;

    // Split by URLs first, then parse mentions within non-URL parts
    const urlParts = normalizedTextContent.split(URL_REGEX);
    const hasLinks = urlParts.some((p) => /^https?:\/\//.test(p));

    const renderWithMentions = (text: string, color: string) => {
      const mentionParts = text.split(MENTION_REGEX);
      if (mentionParts.length === 1) return renderHighlightedText(text, color);
      return mentionParts.map((part, i) => {
        if (part.startsWith('@')) {
          return (
            <Text
              key={`m-${i}`}
              onPress={() => onMentionPress?.(part.slice(1).trim())}
              style={{ color: isMe ? '#93c5fd' : Colors.cta, fontWeight: '600' }}
            >
              {part}
            </Text>
          );
        }
        return renderHighlightedText(part, color, `t-${i}`);
      });
    };

    if (!hasLinks) {
      return (
        <Text className="text-[15px] leading-5" style={{ color: textColor }}>
          {renderWithMentions(normalizedTextContent, textColor)}
        </Text>
      );
    }
    return (
      <Text className="text-[15px] leading-5" style={{ color: textColor }}>
        {urlParts.map((part, i) =>
          /^https?:\/\//.test(part) ? (
            <Text
              key={i}
              onPress={() => Linking.openURL(part)}
              style={{
                color: isMe ? 'rgba(255,255,255,0.9)' : Colors.cta,
                textDecorationLine: 'underline',
              }}
            >
              {part}
            </Text>
          ) : (
            <Text key={i}>{renderWithMentions(part, textColor)}</Text>
          )
        )}
      </Text>
    );
  };

  // Poll message — Zalo-style white card
  const renderPollContent = () => {
    const poll = message.poll;
    if (!poll) return null;
    const isClosed = poll.closed === true;
    const totalVoters = new Set(Object.values(poll.votes ?? {}).flat()).size;
    const myVotedOptions = Object.entries(poll.votes ?? {})
      .filter(([, voters]) => voters.includes(currentUserId ?? ''))
      .map(([idx]) => Number(idx));

    const deadlineStr = poll.deadline
      ? new Date(poll.deadline).toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        })
      : null;
    const isExpired = poll.deadline ? new Date(poll.deadline).getTime() < Date.now() : false;
    const isDisabled = isClosed || isExpired;

    return (
      <View style={{ width: maxBubbleWidth, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: Colors.borderLight }}>
        {/* Header */}
        <View style={{ backgroundColor: Colors.cta, paddingHorizontal: 16, paddingVertical: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Ionicons name="bar-chart-outline" size={14} color="rgba(255,255,255,0.85)" />
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600', marginLeft: 5, letterSpacing: 0.3 }}>
              {isClosed || isExpired ? 'POLL ENDED' : 'VOTE NOW'}
            </Text>
          </View>
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', lineHeight: 20, textAlign: 'center' }}>
            {poll.question}
          </Text>
        </View>

        {/* Options */}
        <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 }}>
          {poll.options.map((option, idx) => {
            const voterCount = (poll.votes?.[String(idx)] ?? []).length;
            const pct = totalVoters > 0 ? Math.round((voterCount / totalVoters) * 100) : 0;
            const isVoted = myVotedOptions.includes(idx);
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => !isDisabled && onVotePoll?.(message.id, idx)}
                onLongPress={onLongPress}
                delayLongPress={300}
                activeOpacity={isDisabled ? 1 : 0.7}
                style={{ marginBottom: 10, opacity: isDisabled && !isVoted ? 0.75 : 1 }}
              >
                {/* Option label row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  {isVoted ? (
                    <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.cta, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                      <Ionicons name="checkmark" size={11} color="#fff" />
                    </View>
                  ) : (
                    <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: isDisabled ? Colors.borderLight : Colors.cta, marginRight: 8 }} />
                  )}
                  <Text style={{ flex: 1, fontSize: 14, color: Colors.text, fontWeight: isVoted ? '600' : '400' }} numberOfLines={2}>
                    {option}
                  </Text>
                  <TouchableOpacity
                    onPress={() => voterCount > 0 && setVoterModal({ title: option, voterIds: poll.votes?.[String(idx)] ?? [] })}
                    onLongPress={onLongPress}
                    delayLongPress={300}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    disabled={voterCount === 0}
                  >
                    <Text style={{ fontSize: 12, color: isVoted ? Colors.cta : Colors.textMuted, fontWeight: '500', minWidth: 44, textAlign: 'right' }}>
                      {pct}%
                    </Text>
                  </TouchableOpacity>
                </View>
                {/* Progress bar */}
                <View style={{ height: 5, backgroundColor: '#F0F0F5', borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ height: 5, width: `${pct}%` as `${number}%`, backgroundColor: isVoted ? Colors.cta : '#B0C4DE', borderRadius: 3 }} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Footer */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 10, paddingTop: 2 }}>
          <TouchableOpacity
            onPress={() => totalVoters > 0 && setVoterModal({ title: 'All voters', voterIds: [...new Set(Object.values(poll.votes ?? {}).flat())] })}
            onLongPress={onLongPress}
            delayLongPress={300}
            disabled={totalVoters === 0}
          >
            <Text style={{ fontSize: 11, color: totalVoters > 0 ? Colors.cta : Colors.textMuted }}>
              {totalVoters} {totalVoters === 1 ? 'person' : 'people'} voted
            </Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {deadlineStr && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="time-outline" size={11} color={isExpired ? Colors.error : Colors.textMuted} />
                <Text style={{ fontSize: 11, color: isExpired ? Colors.error : Colors.textMuted, marginLeft: 3 }}>
                  {isExpired ? 'Expired' : `Ends ${deadlineStr}`}
                </Text>
              </View>
            )}
            {isMe && !isClosed && !isExpired && (
              <TouchableOpacity
                onPress={() => onClosePoll?.(message.id)}
                onLongPress={onLongPress}
                delayLongPress={300}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: Colors.error }}>End poll</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Time + status row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 14, paddingBottom: 8, gap: 4 }}>
          <Text style={{ fontSize: 10, color: Colors.textLight }}>{formatMessageTime(createdAt)}</Text>
          {isMe && (
            <Ionicons
              name={readBy && readBy.length > 0 ? 'checkmark-done' : 'checkmark'}
              size={13}
              color={readBy && readBy.length > 0 ? Colors.cta : Colors.textLight}
            />
          )}
        </View>
      </View>
    );
  };

  const renderContent = () => {
    switch (type) {
      case 'IMAGE':
        return renderImageContent();
      case 'VIDEO':
        return renderVideoContent();
      case 'AUDIO':
        return renderAudioContent();
      case 'FILE':
        return renderFileContent();
      case 'GIF':
        return (
          <ExpoImage
            source={{ uri: content }}
            style={{ width: imageSize, height: imageSize * 0.82, borderRadius: 12 }}
            contentFit="cover"
            autoplay
          />
        );
      case 'STICKER':
        return (
          <ExpoImage
            source={{ uri: content }}
            style={{ width: Math.min(imageSize, 140), height: Math.min(imageSize, 140) }}
            contentFit="contain"
            autoplay
          />
        );
      case 'VCARD': {
        let card: { id?: string; displayName?: string; username?: string; avatarUrl?: string } = {};
        try { card = JSON.parse(content); } catch { /* ignore */ }
        const isSelf = card.id === currentUserId;
        const friendSt = card.id ? vcardFriendStatus?.(card.id) : null;
        return (
          <View style={{ width: maxBubbleWidth - 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', backgroundColor: '#fff', overflow: 'hidden' }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.03)', borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
              <Ionicons name="person-circle-outline" size={14} color={Colors.textMuted} />
              <Text style={{ fontSize: 11, color: Colors.textMuted, fontWeight: '500', marginLeft: 4 }}>Contact card</Text>
            </View>
            {/* Body */}
            <TouchableOpacity
              onPress={() => card.id && onVCardPress?.(card.id)}
              activeOpacity={0.7}
              style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.cta, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {card.avatarUrl ? (
                  <Image source={{ uri: card.avatarUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{(card.displayName ?? 'U').charAt(0).toUpperCase()}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.text }} numberOfLines={1}>{card.displayName ?? 'User'}</Text>
                {card.username ? <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 2 }} numberOfLines={1}>@{card.username}</Text> : null}
              </View>
            </TouchableOpacity>
            {/* Footer — friend status */}
            {card.id && (
              <View style={{ borderTopWidth: 0.5, borderTopColor: 'rgba(0,0,0,0.06)', flexDirection: 'row' }}>
                {(isSelf || friendSt === 'ACCEPTED') ? (
                  <Text style={{ flex: 1, paddingVertical: 8, fontSize: 12, fontWeight: '600', color: '#16a34a', textAlign: 'center' }}>
                    ✓ Friends
                  </Text>
                ) : friendSt === 'PENDING' ? (
                  <Text style={{ flex: 1, paddingVertical: 8, fontSize: 12, fontWeight: '600', color: Colors.textMuted, textAlign: 'center' }}>
                    Request sent
                  </Text>
                ) : (
                  <TouchableOpacity
                    onPress={() => onAddFriend?.(card.id!)}
                    style={{ flex: 1, paddingVertical: 8 }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.cta, textAlign: 'center' }}>Add friend</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => onVCardPress?.(card.id!)}
                  style={{ flex: 1, paddingVertical: 8, borderLeftWidth: 0.5, borderLeftColor: 'rgba(0,0,0,0.06)' }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.cta, textAlign: 'center' }}>View profile</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      }
      case 'LOCATION': {
        const loc = message.location;
        if (!loc) return renderTextContent();
        return (
          <TouchableOpacity
            onPress={() => {
              const latlng = `${loc.latitude},${loc.longitude}`;
              const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latlng}`;

              Linking.canOpenURL(googleMapsUrl).then(supported => {
                if (supported) {
                  Linking.openURL(googleMapsUrl);
                } else {
                  Linking.openURL(googleMapsUrl);
                }
              }).catch(() => {
                Linking.openURL(googleMapsUrl);
              });
            }}
            activeOpacity={0.8}
            style={{ width: 220, borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.05)' }}
          >
            <View style={{ height: 120, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' }}>
               <ExpoImage
                  source={{ uri: `https://static-maps.yandex.ru/1.x/?ll=${loc.longitude},${loc.latitude}&size=450,300&z=14&l=map&pt=${loc.longitude},${loc.latitude},pm2rdl` }}
                  style={{ width: '100%', height: '100%', position: 'absolute' }}
                  contentFit="cover"
               />
               <Ionicons name="location" size={28} color="#ef4444" style={{ zIndex: 10, marginTop: -14 }} />
            </View>
            <View style={{ padding: 10, backgroundColor: isMe ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.07)' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="navigate-circle-outline" size={18} color={isMe ? Colors.bubbleSenderText : Colors.cta} />
                <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: '500', color: isMe ? Colors.bubbleSenderText : Colors.cta, flex: 1 }} numberOfLines={2}>
                  {loc.address || 'Shared Location'}
                </Text>
              </View>
              <Text style={{ marginTop: 4, fontSize: 11, color: isMe ? 'rgba(255,255,255,0.7)' : Colors.textMuted }}>
                {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
              </Text>
            </View>
          </TouchableOpacity>
        );
      }
      case 'POLL':
        return renderPollContent();
      case 'CALL': {
        let callData: { callType?: string; status?: string; duration?: number; callId?: string } = {};
        try { callData = JSON.parse(content); } catch { /* ignore */ }
        const isMissed = callData.status === 'MISSED' || callData.status === 'REJECTED';
        const isGroupCallActiveStatus = callData.status === 'RINGING' || callData.status === 'ONGOING';
        const isVideo = callData.callType === 'VIDEO';
        const duration = callData.duration ?? 0;
        const realtimeState = callData.callId ? groupCallRealtimeState[callData.callId] : undefined;
        const isCallEndedRealtime = Boolean(realtimeState?.ended);
        const formatDur = (s: number) =>
          `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
        const typeLabel = isVideo ? 'video' : 'audio';

        if (isGroupCallActiveStatus && isGroupConversation && callData.callId) {
          if (isCallEndedRealtime || !onJoinGroupCall) {
            return (
              <View style={{ marginVertical: 6, paddingHorizontal: 16, alignItems: 'center' }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: '#fca5a5',
                    backgroundColor: '#fef2f2',
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    minWidth: 190,
                    opacity: 0.8,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(239,68,68,0.14)',
                      marginRight: 10,
                    }}
                  >
                    <Ionicons name="call" size={16} color="#dc2626" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#b91c1c', fontSize: 13, fontWeight: '600' }}>
                      Group {typeLabel} call
                    </Text>
                    <Text style={{ color: '#dc2626', fontSize: 11, opacity: 0.75, marginTop: 1 }}>
                      Call ended
                    </Text>
                  </View>
                </View>
              </View>
            );
          }

          return (
            <View style={{ marginVertical: 6, paddingHorizontal: 16, alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => onJoinGroupCall(callData.callId!)}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: '#86efac',
                  backgroundColor: '#f0fdf4',
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  minWidth: 190,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(34,197,94,0.15)',
                    marginRight: 10,
                  }}
                >
                  <Ionicons name="call" size={16} color="#16a34a" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#15803d', fontSize: 13, fontWeight: '600' }}>
                    Group {typeLabel} call
                  </Text>
                  <Text style={{ color: '#16a34a', fontSize: 11, opacity: 0.75, marginTop: 1 }}>
                    Tap to join
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          );
        }

        const callLabel = isMissed
          ? (isVideo ? 'Missed video call' : 'Missed audio call')
          : (isVideo ? 'Video call' : 'Audio call');
        const callColor = isMissed ? '#ef4444' : '#16a34a';
        return (
          <View style={{ marginVertical: 4, paddingHorizontal: 16, alignItems: isMe ? 'flex-end' : 'flex-start' }}>
            <View
              style={{
                backgroundColor: isMissed ? '#fef2f2' : '#f0fdf4',
                borderWidth: 1,
                borderColor: isMissed ? '#fca5a5' : '#86efac',
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 10,
                maxWidth: maxBubbleWidth * 0.7,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons
                  name={isMissed ? 'call' : isVideo ? 'videocam' : 'call'}
                  size={13}
                  color={callColor}
                />
                <Text style={{ color: callColor, fontSize: 12, fontWeight: '500' }}>{callLabel}</Text>
              </View>
              {!isMissed && duration > 0 && (
                <Text style={{ color: callColor, fontSize: 11, opacity: 0.7, marginTop: 2 }}>{formatDur(duration)}</Text>
              )}
              {isMissed && !isMe && onCallAgain && calleeInfo && (
                <TouchableOpacity
                  onPress={() => onCallAgain(calleeInfo.id, calleeInfo.name, calleeInfo.avatar)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 8,
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    backgroundColor: 'rgba(239,68,68,0.08)',
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="call" size={12} color="#ef4444" />
                  <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '600', marginLeft: 4 }}>
                    Call back
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      }
      case 'SYSTEM':
        return (
          <View className="my-1 items-center">
            <Text className="rounded-lg px-3 py-1 text-xs" style={{ color: Colors.textMuted, backgroundColor: Colors.bg }}>
              {content}
            </Text>
          </View>
        );
      default:
        return renderTextContent();
    }
  };

  // System messages are centered
  if (type === 'SYSTEM' || type === 'CALL') {
    return renderContent();
  }

  // Poll messages — white card, full-width, centered
  if (type === 'POLL') {
    return (
      <View className="my-1 px-4 items-center">
        {!isMe && showAvatar && senderName && (
          <Text className="mb-1 text-xs" style={{ color: Colors.textMuted, marginLeft: 34 }}>
            {senderName}
          </Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          {!isMe && showAvatar && (
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.cta, alignItems: 'center', justifyContent: 'center', marginRight: 6, overflow: 'hidden' }}>
              {senderAvatarUrl ? (
                <Image source={{ uri: senderAvatarUrl }} style={{ width: 28, height: 28, borderRadius: 14 }} />
              ) : (
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: 'white' }}>
                  {(senderName ?? '?').charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
          )}
          <TouchableOpacity activeOpacity={1} onLongPress={onLongPress} delayLongPress={300}>
            {renderPollContent()}
          </TouchableOpacity>
        </View>
        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <View className={`mt-1 flex-row flex-wrap gap-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(
              message.reactions.reduce<Record<string, string[]>>((acc, r) => {
                (acc[r.emoji] ??= []).push(r.userId);
                return acc;
              }, {}),
            ).map(([emoji, userIds]) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => onReact?.(message.id, emoji)}
                activeOpacity={0.7}
                className="flex-row items-center rounded-full px-1.5 py-0.5"
                style={{
                  backgroundColor: currentUserId && userIds.includes(currentUserId) ? 'rgba(0,113,227,0.12)' : 'rgba(0,0,0,0.06)',
                  borderWidth: 1,
                  borderColor: currentUserId && userIds.includes(currentUserId) ? 'rgba(0,113,227,0.3)' : 'rgba(0,0,0,0.08)',
                }}
              >
                <Text className="text-xs">{emoji}</Text>
                {userIds.length > 1 && (
                  <Text className="ml-0.5 text-[10px]" style={{ color: Colors.textMuted }}>{userIds.length}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
        {/* Poll voter modal */}
        {voterModal && (
          <Modal visible transparent animationType="fade" onRequestClose={() => setVoterModal(null)}>
            <Pressable className="flex-1 justify-center items-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={() => setVoterModal(null)}>
              <Pressable className="rounded-2xl w-64 max-h-80 overflow-hidden" style={{ backgroundColor: Colors.bgCard }} onPress={() => {}}>
                <View className="px-4 py-3" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)' }}>
                  <Text className="text-sm font-semibold" style={{ color: Colors.text }} numberOfLines={1}>{voterModal.title}</Text>
                  <Text className="text-xs mt-0.5" style={{ color: Colors.textMuted }}>
                    {message.poll?.anonymous ? `${voterModal.voterIds.length} vote${voterModal.voterIds.length !== 1 ? 's' : ''} (anonymous)` : `${voterModal.voterIds.length} vote${voterModal.voterIds.length !== 1 ? 's' : ''}`}
                  </Text>
                </View>
                {message.poll?.anonymous ? (
                  <View className="px-4 py-6 items-center">
                    <Ionicons name="eye-off-outline" size={28} color={Colors.textMuted} />
                    <Text className="text-xs mt-2 text-center" style={{ color: Colors.textMuted }}>This poll is anonymous.{'\n'}Voter identities are hidden.</Text>
                  </View>
                ) : (
                  <FlatList
                    data={voterModal.voterIds}
                    keyExtractor={(id) => id}
                    renderItem={({ item: userId }) => {
                      const user = participantMap?.[userId];
                      const name = user?.displayName ?? 'Unknown';
                      return (
                        <View className="flex-row items-center px-4 py-2">
                          {user?.avatarUrl ? (
                            <Image source={{ uri: user.avatarUrl }} style={{ width: 24, height: 24, borderRadius: 12 }} />
                          ) : (
                            <View className="items-center justify-center rounded-full" style={{ width: 24, height: 24, backgroundColor: Colors.cta }}>
                              <Text className="text-[10px] font-bold" style={{ color: '#fff' }}>{name.charAt(0).toUpperCase()}</Text>
                            </View>
                          )}
                          <Text className="ml-2 text-sm" style={{ color: Colors.text }}>{name}</Text>
                        </View>
                      );
                    }}
                  />
                )}
                <TouchableOpacity onPress={() => setVoterModal(null)} className="items-center py-3" style={{ borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)' }}>
                  <Text className="text-sm font-medium" style={{ color: Colors.cta }}>Close</Text>
                </TouchableOpacity>
              </Pressable>
            </Pressable>
          </Modal>
        )}
      </View>
    );
  }

  // GIF & Sticker messages — no bubble background
  if (type === 'GIF' || type === 'STICKER') {
    return (
      <View className={`my-0.5 px-4 ${isMe ? 'items-end' : 'items-start'}`}>
        {!isMe && showAvatar && senderName && (
          <Text className="mb-0.5 ml-1 text-xs" style={{ color: Colors.textMuted }}>
            {senderName}
          </Text>
        )}
        <TouchableOpacity activeOpacity={0.8} onLongPress={onLongPress} delayLongPress={300}>
          {renderContent()}
          <View className="mt-0.5 flex-row items-center" style={{ alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
            <Text className="text-[10px]" style={{ color: Colors.textLight }}>
              {formatMessageTime(createdAt)}
            </Text>
            {isMe && (
              <Ionicons
                name={readBy && readBy.length > 0 ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={readBy && readBy.length > 0 ? '#60D4F2' : Colors.textLight}
                style={{ marginLeft: 3 }}
              />
            )}
          </View>
        </TouchableOpacity>

        {/* Reaction badges */}
        {message.reactions && message.reactions.length > 0 && (
          <View className={`mt-1 flex-row flex-wrap gap-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(
              message.reactions.reduce<Record<string, string[]>>((acc, r) => {
                (acc[r.emoji] ??= []).push(r.userId);
                return acc;
              }, {}),
            ).map(([emoji, userIds]) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => onReact?.(message.id, emoji)}
                activeOpacity={0.7}
                className="flex-row items-center rounded-full px-1.5 py-0.5"
                style={{
                  backgroundColor: currentUserId && userIds.includes(currentUserId)
                    ? 'rgba(99,102,241,0.15)'
                    : 'rgba(0,0,0,0.06)',
                  borderWidth: 1,
                  borderColor: currentUserId && userIds.includes(currentUserId)
                    ? 'rgba(99,102,241,0.4)'
                    : 'rgba(0,0,0,0.08)',
                }}
              >
                <Text className="text-xs">{emoji}</Text>
                {userIds.length > 1 && (
                  <Text className="ml-0.5 text-[10px]" style={{ color: Colors.textMuted }}>
                    {userIds.length}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  }

  return (
    <View className={`my-0.5 px-4 ${isMe ? 'items-end' : 'items-start'}`}>
      {/* Sender name for group chats */}
      {!isMe && showAvatar && senderName && (
        <Text className="mb-0.5 text-xs" style={{ color: Colors.textMuted, marginLeft: 38 }}>
          {senderName}
        </Text>
      )}

      {/* Pinned indicator */}
      {message.pinned && (
        <View className={`flex-row items-center mb-0.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
          <Ionicons name="pin" size={10} color="#f59e0b" />
          <Text className="ml-1 text-[10px]" style={{ color: '#d97706' }}>Pinned</Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        {/* Avatar for group received messages */}
        {!isMe && showAvatar && (
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: Colors.cta,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 6,
              overflow: 'hidden',
            }}
          >
            {senderAvatarUrl ? (
              <Image source={{ uri: senderAvatarUrl }} style={{ width: 28, height: 28, borderRadius: 14 }} />
            ) : (
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: 'white' }}>
                {(senderName ?? '?').charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          onLongPress={onLongPress}
          delayLongPress={300}
          style={{ maxWidth: '78%' }}
        >
        <View
          className="rounded-2xl px-4 py-2.5"
          style={{
            backgroundColor: isMe ? Colors.bubbleSender : Colors.bubbleReceiver,
            borderBottomRightRadius: isMe ? 6 : 20,
            borderBottomLeftRadius: isMe ? 20 : 6,
          }}
        >
          {/* Reply preview */}
          {replyToMessage && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => replyToMessage.id && onScrollToMessage?.(replyToMessage.id)}
              className="mb-2 rounded-xl px-3 py-2"
              style={{
                backgroundColor: isMe
                  ? 'rgba(0,0,0,0.15)'
                  : 'rgba(0,0,0,0.07)',
                borderLeftWidth: 3,
                borderLeftColor: isMe ? 'rgba(255,255,255,0.6)' : Colors.cta,
              }}
            >
              <Text
                className="mb-0.5 text-[11px] font-semibold"
                style={{ color: isMe ? 'rgba(255,255,255,0.75)' : Colors.cta }}
                numberOfLines={1}
              >
                {replyToMessage.recalled ? 'Message recalled' : (senderName ?? 'Message')}
              </Text>
              <Text
                className="text-[12px]"
                style={{ color: isMe ? 'rgba(255,255,255,0.65)' : Colors.textMuted }}
                numberOfLines={2}
              >
                {replyToMessage.recalled
                  ? 'Message recalled'
                  : replyToMessage.type === 'IMAGE'
                  ? '🖼 Image'
                  : replyToMessage.type === 'VIDEO'
                  ? '🎥 Video'
                  : replyToMessage.type === 'AUDIO'
                  ? '🎵 Audio'
                  : replyToMessage.type === 'FILE'
                  ? '📎 Attachment'
                  : replyToMessage.type === 'GIF'
                  ? '🎬 GIF'
                  : replyToMessage.type === 'STICKER'
                  ? '🎨 Sticker'
                  : replyToMessage.type === 'LOCATION'
                  ? '📍 Location'
                  : replyToMessage.type === 'POLL'
                  ? '📊 Poll'
                  : replyToMessage.type === 'VCARD'
                  ? '👤 Contact'
                  : richTextToPlainText(replyToMessage.content)}
              </Text>
            </TouchableOpacity>
          )}

          {renderContent()}

          {/* Time + status */}
          <View className="mt-1 flex-row items-center justify-end">
            {edited && (
              <Text
                className="mr-1 text-[10px]"
                style={{ color: isMe ? 'rgba(255,255,255,0.6)' : Colors.textLight }}
              >
                edited
              </Text>
            )}
            <Text
              className="text-[10px]"
              style={{ color: isMe ? 'rgba(255,255,255,0.6)' : Colors.textLight }}
            >
              {formatMessageTime(createdAt)}
            </Text>
            {isMe && (
              <Ionicons
                name={readBy && readBy.length > 0 ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={readBy && readBy.length > 0 ? '#60D4F2' : 'rgba(255,255,255,0.6)'}
                style={{ marginLeft: 3 }}
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
      </View>

      {/* Reaction badges */}
      {message.reactions && message.reactions.length > 0 && (
        <View className={`mt-1 flex-row flex-wrap gap-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
          {Object.entries(
            message.reactions.reduce<Record<string, string[]>>((acc, r) => {
              (acc[r.emoji] ??= []).push(r.userId);
              return acc;
            }, {}),
          ).map(([emoji, userIds]) => (
            <TouchableOpacity
              key={emoji}
              onPress={() => onReact?.(message.id, emoji)}
              activeOpacity={0.7}
              className="flex-row items-center rounded-full px-1.5 py-0.5"
              style={{
                backgroundColor: currentUserId && userIds.includes(currentUserId)
                  ? 'rgba(99,102,241,0.15)'
                  : 'rgba(0,0,0,0.06)',
                borderWidth: 1,
                borderColor: currentUserId && userIds.includes(currentUserId)
                  ? 'rgba(99,102,241,0.4)'
                  : 'rgba(0,0,0,0.08)',
              }}
            >
              <Text className="text-xs">{emoji}</Text>
              {userIds.length > 1 && (
                <Text className="ml-0.5 text-[10px]" style={{ color: Colors.textMuted }}>
                  {userIds.length}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Poll voter modal */}
      {voterModal && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setVoterModal(null)}
        >
          <Pressable
            className="flex-1 justify-center items-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onPress={() => setVoterModal(null)}
          >
            <Pressable
              className="rounded-2xl w-64 max-h-80 overflow-hidden"
              style={{ backgroundColor: Colors.bgCard }}
              onPress={() => {}}
            >
              <View className="px-4 py-3" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)' }}>
                <Text className="text-sm font-semibold" style={{ color: Colors.text }} numberOfLines={1}>
                  {voterModal.title}
                </Text>
                <Text className="text-xs mt-0.5" style={{ color: Colors.textMuted }}>
                  {message.poll?.anonymous
                    ? `${voterModal.voterIds.length} vote${voterModal.voterIds.length !== 1 ? 's' : ''} (anonymous)`
                    : `${voterModal.voterIds.length} vote${voterModal.voterIds.length !== 1 ? 's' : ''}`}
                </Text>
              </View>
              {message.poll?.anonymous ? (
                <View className="px-4 py-6 items-center">
                  <Ionicons name="eye-off-outline" size={28} color={Colors.textMuted} />
                  <Text className="text-xs mt-2 text-center" style={{ color: Colors.textMuted }}>
                    This poll is anonymous.{'\n'}Voter identities are hidden.
                  </Text>
                </View>
              ) : (
                <FlatList
                data={voterModal.voterIds}
                keyExtractor={(id) => id}
                renderItem={({ item: userId }) => {
                  const user = participantMap?.[userId];
                  const name = user?.displayName ?? 'Unknown';
                  return (
                    <View className="flex-row items-center px-4 py-2">
                      {user?.avatarUrl ? (
                        <Image
                          source={{ uri: user.avatarUrl }}
                          style={{ width: 24, height: 24, borderRadius: 12 }}
                        />
                      ) : (
                        <View
                          className="items-center justify-center rounded-full"
                          style={{ width: 24, height: 24, backgroundColor: Colors.cta }}
                        >
                          <Text className="text-[10px] font-bold" style={{ color: '#fff' }}>
                            {name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <Text className="ml-2 text-sm" style={{ color: Colors.text }}>{name}</Text>
                    </View>
                  );
                }}
              />
              )}
              <TouchableOpacity
                onPress={() => setVoterModal(null)}
                className="items-center py-3"
                style={{ borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)' }}
              >
                <Text className="text-sm font-medium" style={{ color: Colors.cta }}>Close</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}
