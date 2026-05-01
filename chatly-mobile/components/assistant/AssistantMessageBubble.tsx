import { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Markdown from '@ronradtke/react-native-markdown-display';
import { Colors } from '@/constants/theme';
import { AssistantAttachmentView } from './AssistantAttachmentView';
import type { AgentMessage } from '@/types/agent';

interface AssistantMessageBubbleProps {
  message: AgentMessage;
  isLast?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onCopy?: (content: string) => void;
  sessionId: string;
  onLongPress?: () => void;
}

const markdownStyles = {
  body: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  code_inline: {
    backgroundColor: Colors.borderLight,
    color: Colors.text,
    fontSize: 13,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  code_block: {
    backgroundColor: '#1D1D1F',
    color: '#E5E5EA',
    fontSize: 13,
    padding: 12,
    borderRadius: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  fence: {
    backgroundColor: '#1D1D1F',
    color: '#E5E5EA',
    fontSize: 13,
    padding: 12,
    borderRadius: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  link: {
    color: Colors.cta,
  },
  blockquote: {
    backgroundColor: Colors.bg,
    borderLeftColor: Colors.cta,
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 4,
    marginVertical: 4,
  },
  heading1: { fontSize: 22, fontWeight: '700' as const, color: Colors.text, marginTop: 8, marginBottom: 4 },
  heading2: { fontSize: 19, fontWeight: '600' as const, color: Colors.text, marginTop: 6, marginBottom: 3 },
  heading3: { fontSize: 17, fontWeight: '600' as const, color: Colors.text, marginTop: 4, marginBottom: 2 },
  list_item: { marginVertical: 2 },
  table: { borderColor: Colors.borderLight },
  tr: { borderBottomWidth: 0.5, borderColor: Colors.borderLight },
  th: { padding: 6, fontWeight: '600' as const },
  td: { padding: 6 },
  image: { borderRadius: 10, maxWidth: 280 },
};

import { Platform } from 'react-native';

export const AssistantMessageBubble = memo(function AssistantMessageBubble({
  message,
  isLast,
  isError,
  onRetry,
  onCopy,
  sessionId,
  onLongPress,
}: AssistantMessageBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <View className="flex-row justify-end px-4 py-1">
        <View
          className="max-w-[80%] rounded-2xl px-4 py-2.5"
          style={{
            backgroundColor: Colors.cta,
            borderBottomRightRadius: 6,
          }}
        >
        {/* Attachments above text */}
        {message.attachments?.map((att) => (
            <AssistantAttachmentView key={att.file_id} attachment={att} sessionId={sessionId} role="user" />
          ))}
          {message.content ? (
            <Text className="text-[15px] leading-[22px]" style={{ color: Colors.white }}>
              {message.content}
            </Text>
          ) : null}
          <Text className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {new Date(message.created_at).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  }

  // AI message
  return (
    <View className="px-4 py-1">
      <TouchableOpacity
        onLongPress={onLongPress}
        delayLongPress={240}
        activeOpacity={1}
        className="max-w-[90%] rounded-2xl px-4 py-2.5"
        style={{
          backgroundColor: Colors.bubbleReceiver,
          borderBottomLeftRadius: 6,
        }}
      >
        <Markdown style={markdownStyles}>{message.content}</Markdown>
        {/* Attachments below AI content */}
        {message.attachments?.map((att) => (
          <AssistantAttachmentView key={att.file_id} attachment={att} sessionId={sessionId} role="assistant" />
        ))}

        {/* Timestamp + actions */}
        <View className="flex-row items-center justify-between mt-1.5">
          <Text className="text-[10px]" style={{ color: Colors.textLight }}>
            {new Date(message.created_at).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          <View className="flex-row items-center gap-2">
            {onCopy && (
              <TouchableOpacity
                onPress={() => onCopy(message.content)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="copy-outline" size={14} color={Colors.textLight} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Retry on error */}
        {isLast && isError && onRetry && (
          <TouchableOpacity
            onPress={onRetry}
            className="flex-row items-center mt-2 pt-2"
            style={{ borderTopWidth: 0.5, borderTopColor: Colors.borderLight }}
          >
            <Ionicons name="reload-outline" size={14} color={Colors.error} />
            <Text className="ml-1.5 text-xs font-medium" style={{ color: Colors.error }}>
              Retry
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </View>
  );
}, (prev, next) =>
  prev.message.id === next.message.id &&
  prev.message.content === next.message.content &&
  prev.isLast === next.isLast &&
  prev.isError === next.isError &&
  prev.onLongPress === next.onLongPress
);
