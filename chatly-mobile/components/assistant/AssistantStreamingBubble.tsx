import { View, Text } from 'react-native';
import Markdown from '@ronradtke/react-native-markdown-display';
import { Colors } from '@/constants/theme';
import { Platform } from 'react-native';

const streamingMarkdownStyles = {
  body: { color: Colors.text, fontSize: 15, lineHeight: 22 },
  code_inline: {
    backgroundColor: Colors.borderLight,
    color: Colors.text,
    fontSize: 13,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  fence: {
    backgroundColor: '#1D1D1F',
    color: '#E5E5EA',
    fontSize: 13,
    padding: 12,
    borderRadius: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  link: { color: Colors.cta },
};

interface Props {
  content: string;
}

export function AssistantStreamingBubble({ content }: Props) {
  return (
    <View className="px-4 py-1">
      <View
        className="max-w-[90%] rounded-2xl px-4 py-2.5"
        style={{
          backgroundColor: Colors.bubbleReceiver,
          borderBottomLeftRadius: 6,
        }}
      >
        <Markdown style={streamingMarkdownStyles}>{content}</Markdown>
        {/* Streaming cursor */}
        <View className="flex-row items-center mt-0.5">
          <View
            className="h-4 w-1.5 rounded-sm"
            style={{ backgroundColor: Colors.cta, opacity: 0.6 }}
          />
        </View>
      </View>
    </View>
  );
}
