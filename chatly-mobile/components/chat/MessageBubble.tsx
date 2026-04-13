import { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Linking, Modal, Pressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { formatMessageTime } from '@/utils/format';
import { ImageLightbox } from '@/components/ui/ImageLightbox';
import type { Message, Reaction } from '@/types/message';

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
  calleeInfo?: { id: string; name: string; avatar?: string } | null;
  highlightKeyword?: string | null;
  onMentionPress?: (displayName: string) => void;
  participantNames?: string[];
  onVCardPress?: (userId: string) => void;
  onAddFriend?: (userId: string) => void;
  vcardFriendStatus?: (userId: string) => 'ACCEPTED' | 'PENDING' | null;
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
  calleeInfo,
  highlightKeyword,
  onMentionPress,
  participantNames,
  onVCardPress,
  onAddFriend,
  vcardFriendStatus,
}: MessageBubbleProps) {
  const { content, type, recalled, edited, createdAt, readBy, attachments } = message;

  const [lightboxVisible, setLightboxVisible] = useState(false);

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

  // Image message
  const renderImageContent = () => {
    const imageUrl = attachments?.[0]?.url;
    if (!imageUrl) return null;
    return (
      <>
        <ImageLightbox
          images={[imageUrl]}
          initialIndex={0}
          visible={lightboxVisible}
          onClose={() => setLightboxVisible(false)}
        />
        <TouchableOpacity onPress={() => setLightboxVisible(true)} activeOpacity={0.85}>
          <Image
            source={{ uri: imageUrl }}
            style={{ width: 200, height: 200, borderRadius: 12 }}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </>
    );
  };

  // Video message
  const renderVideoContent = () => {
    const video = attachments?.[0];
    if (!video?.url) return null;
    return (
      <TouchableOpacity
        onPress={() => Linking.openURL(video.url)}
        activeOpacity={0.85}
        style={{ width: 200, height: 120, borderRadius: 12, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
      >
        <Ionicons name="play-circle-outline" size={44} color="rgba(255,255,255,0.9)" />
        {video.name ? (
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 6, paddingHorizontal: 8, textAlign: 'center' }} numberOfLines={1}>
            {video.name}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  // Audio message
  const renderAudioContent = () => {
    const audio = attachments?.[0];
    if (!audio?.url) return null;
    return (
      <TouchableOpacity
        onPress={() => Linking.openURL(audio.url)}
        className="flex-row items-center rounded-xl px-3 py-2"
        style={{ backgroundColor: isMe ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.07)' }}
      >
        <Ionicons name="musical-notes-outline" size={20} color={isMe ? Colors.bubbleSenderText : Colors.cta} />
        <Text
          className="ml-2 text-sm"
          style={{ color: isMe ? Colors.bubbleSenderText : Colors.cta }}
          numberOfLines={1}
        >
          {audio.name ?? 'Audio'}
        </Text>
      </TouchableOpacity>
    );
  };

  // File message
  const renderFileContent = () => {
    const file = attachments?.[0];
    if (!file) return null;
    return (
      <TouchableOpacity
        onPress={() => file.url && Linking.openURL(file.url)}
        className="flex-row items-center rounded-xl px-3 py-2"
        style={{ backgroundColor: isMe ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.07)' }}
      >
        <Ionicons
          name="document-outline"
          size={20}
          color={isMe ? Colors.bubbleSenderText : Colors.cta}
        />
        <Text
          className="ml-2 text-sm flex-1"
          style={{ color: isMe ? Colors.bubbleSenderText : Colors.cta }}
          numberOfLines={1}
        >
          {file.name ?? 'Attachment'}
        </Text>
        <Ionicons
          name="download-outline"
          size={16}
          color={isMe ? Colors.bubbleSenderText : Colors.cta}
          style={{ marginLeft: 6 }}
        />
      </TouchableOpacity>
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

    // Build mention regex from known participant names (longest first to avoid partial matches)
    const names = [...(participantNames ?? []), 'all'].filter(Boolean).sort((a, b) => b.length - a.length);
    const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const MENTION_REGEX = escaped.length > 0
      ? new RegExp(`(@(?:${escaped.join('|')}))`, 'g')
      : /(@\S+)/g;

    // Split by URLs first, then parse mentions within non-URL parts
    const urlParts = content.split(URL_REGEX);
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
          {renderWithMentions(content, textColor)}
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

  // Poll message
  const renderPollContent = () => {
    const poll = message.poll;
    if (!poll) return null;
    const totalVoters = new Set(Object.values(poll.votes ?? {}).flat()).size;
    const myVotedOptions = Object.entries(poll.votes ?? {})
      .filter(([, voters]) => voters.includes(currentUserId ?? ''))
      .map(([idx]) => Number(idx));

    return (
      <View style={{ width: 260 }}>
        {/* Poll header */}
        <View className="flex-row items-center mb-2">
          <Ionicons name="bar-chart-outline" size={16} color={Colors.cta} />
          <Text className="ml-2 text-sm font-semibold" style={{ color: Colors.text, flex: 1 }}>
            {poll.question}
          </Text>
        </View>
        {/* Options */}
        {poll.options.map((option, idx) => {
          const voterCount = (poll.votes?.[String(idx)] ?? []).length;
          const pct = totalVoters > 0 ? Math.round((voterCount / totalVoters) * 100) : 0;
          const isVoted = myVotedOptions.includes(idx);
          return (
            <TouchableOpacity
              key={idx}
              onPress={() => onVotePoll?.(message.id, idx)}
              activeOpacity={0.7}
              className="mb-1.5 rounded-lg overflow-hidden"
              style={{
                borderWidth: 1,
                borderColor: isVoted ? Colors.cta : 'rgba(0,0,0,0.1)',
                backgroundColor: isVoted ? 'rgba(99,102,241,0.08)' : 'transparent',
              }}
            >
              {/* Progress background */}
              <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, backgroundColor: isVoted ? 'rgba(99,102,241,0.12)' : 'rgba(0,0,0,0.04)' }} />
              <View className="flex-row items-center justify-between px-3 py-2">
                <Text className="text-sm flex-1" style={{ color: Colors.text }} numberOfLines={1}>
                  {option}
                </Text>
                {voterCount > 0 && (
                  <Text className="text-xs ml-2" style={{ color: Colors.textMuted }}>
                    {pct}%
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
        {/* Footer */}
        <View className="flex-row items-center justify-between mt-1">
          <Text className="text-[11px]" style={{ color: Colors.textMuted }}>
            {totalVoters} people voted
          </Text>
          <Text className="text-[11px]" style={{ color: Colors.textMuted }}>
            {poll.multipleChoice ? 'Multiple choice' : 'Single choice'}
          </Text>
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
            style={{ width: 220, height: 180, borderRadius: 12 }}
            contentFit="cover"
            autoplay
          />
        );
      case 'STICKER':
        return (
          <ExpoImage
            source={{ uri: content }}
            style={{ width: 140, height: 140 }}
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
          <View style={{ width: 220, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', backgroundColor: '#fff', overflow: 'hidden' }}>
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
      case 'POLL':
        return renderPollContent();
      case 'CALL': {
        let callData: { callType?: string; status?: string; duration?: number } = {};
        try { callData = JSON.parse(content); } catch { /* ignore */ }
        const isMissed = callData.status === 'MISSED' || callData.status === 'REJECTED';
        const isVideo = callData.callType === 'VIDEO';
        const duration = callData.duration ?? 0;
        const formatDur = (s: number) =>
          `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
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
                maxWidth: 220,
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
            <View
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
                {replyToMessage.recalled ? 'Message recalled' : ''}
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
                  : replyToMessage.type === 'FILE'
                  ? '📎 Attachment'
                  : replyToMessage.type === 'GIF'
                  ? '🎬 GIF'
                  : replyToMessage.type === 'STICKER'
                  ? '🎨 Sticker'
                  : replyToMessage.content}
              </Text>
            </View>
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
    </View>
  );
}
