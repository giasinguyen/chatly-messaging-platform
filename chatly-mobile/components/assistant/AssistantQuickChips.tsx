import { View, Text, TouchableOpacity } from 'react-native';
import type { AssistantContextMode } from '@/constants/assistant';
import { Colors } from '@/constants/theme';

interface QuickChip {
  label: string;
  query: string;
}

const GENERAL_CHIPS: QuickChip[] = [
  { label: '📬 Unread messages', query: 'Show me my unread messages across all conversations' },
  { label: '📌 Today\'s reminders', query: 'List all my reminders due today or upcoming' },
  { label: '👥 My groups', query: 'Show me all my group conversations' },
  { label: '🔍 Search messages', query: 'Search for messages containing keyword: ' },
];

const GROUP_CONTEXT_CHIPS: QuickChip[] = [
  { label: '📝 Summarize this group', query: 'Summarize recent activity in this group' },
  { label: '❓ Unanswered questions', query: 'Find unanswered questions in this group' },
  { label: '📎 Files in this group', query: 'List files shared in this group' },
  { label: '🔔 Group reminders', query: 'List all reminders in this group' },
];

const POST_CONTEXT_CHIPS: QuickChip[] = [
  { label: '📝 Summarize this post', query: 'Summarize this post and its main point' },
  { label: '💡 Explain this post', query: 'Explain this post in a simple way' },
  { label: '✍️ Draft a reply', query: 'Draft a helpful reply to this post' },
  { label: '🌐 Translate this post', query: 'Translate this post to English' },
];

interface AssistantQuickChipsProps {
  onChipSelect: (query: string) => void;
  contextConversationName?: string;
  contextMode?: AssistantContextMode;
}

export function AssistantQuickChips({
  onChipSelect,
  contextConversationName,
  contextMode = null,
}: AssistantQuickChipsProps) {
  const hasContext = Boolean(contextConversationName && contextMode);
  const contextChips = contextMode === 'post' ? POST_CONTEXT_CHIPS : GROUP_CONTEXT_CHIPS;
  const contextTitle = contextMode === 'post' ? 'Post actions' : 'Group actions';
  const contextBorderColor = contextMode === 'post' ? '#BFDBFE' : '#C7D2FE';
  const contextBackgroundColor = contextMode === 'post' ? '#EEF5FF' : '#EEF2FF';
  const contextTextColor = contextMode === 'post' ? '#0A7AFF' : '#4338CA';

  return (
    <View style={{ width: '100%', maxWidth: 360, marginTop: 18 }}>
      {hasContext && (
        <>
          <Text
            style={{
              textAlign: 'center',
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 0.8,
              color: Colors.textMuted,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            {contextTitle}
          </Text>
          <View className="flex-row flex-wrap justify-center" style={{ gap: 8 }}>
            {contextChips.map((chip) => (
              <TouchableOpacity
                key={chip.label}
                onPress={() => onChipSelect(chip.query)}
                activeOpacity={0.8}
                style={{
                  borderWidth: 1,
                  borderColor: contextBorderColor,
                  backgroundColor: contextBackgroundColor,
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                }}
              >
                <Text style={{ fontSize: 13, color: contextTextColor, fontWeight: '500' }}>{chip.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {hasContext && (
        <Text
          style={{
            textAlign: 'center',
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 0.8,
            color: Colors.textMuted,
            textTransform: 'uppercase',
            marginTop: 14,
            marginBottom: 8,
          }}
        >
          General
        </Text>
      )}

      <View className="flex-row flex-wrap justify-center" style={{ gap: 8 }}>
        {GENERAL_CHIPS.map((chip) => (
          <TouchableOpacity
            key={chip.label}
            onPress={() => onChipSelect(chip.query)}
            activeOpacity={0.8}
            style={{
              borderWidth: 1,
              borderColor: Colors.borderLight,
              backgroundColor: '#F8FAFC',
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 7,
            }}
          >
            <Text style={{ fontSize: 13, color: Colors.text }}>{chip.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
