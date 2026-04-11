import { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Linking } from 'react-native';
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
  currentUserId?: string;
  onLongPress?: () => void;
  onReact?: (messageId: string, emoji: string) => void;
  onVotePoll?: (messageId: string, optionIndex: number) => void;
  replyToMessage?: Message | null;
}

export function MessageBubble({
  message,
  isMe,
  showAvatar = false,
  senderName,
  currentUserId,
  onLongPress,
  onReact,
  onVotePoll,
  replyToMessage,
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
            Tin nhắn đã được thu hồi
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
          {audio.name ?? 'Âm thanh'}
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
          {file.name ?? 'Tệp đính kèm'}
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
  const renderTextContent = () => {
    const URL_REGEX = /(https?:\/\/[^\s<>"]+)/g;
    const parts = content.split(URL_REGEX);
    const hasLinks = parts.some((p) => /^https?:\/\//.test(p));
    const textColor = isMe ? Colors.bubbleSenderText : Colors.bubbleReceiverText;
    if (!hasLinks) {
      return (
        <Text className="text-[15px] leading-5" style={{ color: textColor }}>
          {content}
        </Text>
      );
    }
    return (
      <Text className="text-[15px] leading-5" style={{ color: textColor }}>
        {parts.map((part, i) =>
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
            <Text key={i}>{part}</Text>
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
            {totalVoters} người đã bình chọn
          </Text>
          <Text className="text-[11px]" style={{ color: Colors.textMuted }}>
            {poll.multipleChoice ? 'Chọn nhiều' : 'Chọn một'}
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
      case 'POLL':
        return renderPollContent();
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
  if (type === 'SYSTEM') {
    return renderContent();
  }

  return (
    <View className={`my-0.5 px-4 ${isMe ? 'items-end' : 'items-start'}`}>
      {/* Sender name for group chats */}
      {!isMe && showAvatar && senderName && (
        <Text className="mb-0.5 ml-1 text-xs" style={{ color: Colors.textMuted }}>
          {senderName}
        </Text>
      )}

      {/* Pinned indicator */}
      {message.pinned && (
        <View className={`flex-row items-center mb-0.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
          <Ionicons name="pin" size={10} color="#f59e0b" />
          <Text className="ml-1 text-[10px]" style={{ color: '#d97706' }}>Đã ghim</Text>
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
                {replyToMessage.recalled ? 'Tin nhắn đã thu hồi' : ''}
              </Text>
              <Text
                className="text-[12px]"
                style={{ color: isMe ? 'rgba(255,255,255,0.65)' : Colors.textMuted }}
                numberOfLines={2}
              >
                {replyToMessage.recalled
                  ? 'Tin nhắn đã được thu hồi'
                  : replyToMessage.type === 'IMAGE'
                  ? '🖼 Hình ảnh'
                  : replyToMessage.type === 'FILE'
                  ? '📎 Tệp đính kèm'
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
                đã chỉnh sửa
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
