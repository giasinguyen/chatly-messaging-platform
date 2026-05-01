import { View, Text, TouchableOpacity } from 'react-native';
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

interface AssistantQuickChipsProps {
  onChipSelect: (query: string) => void;
  contextConversationName?: string;
}

export function AssistantQuickChips({ onChipSelect, contextConversationName }: AssistantQuickChipsProps) {
  const hasGroupContext = !!contextConversationName;

  return (
    <View style={{ width: '100%', maxWidth: 360, marginTop: 18 }}>
      {hasGroupContext && (
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
            Group actions
          </Text>
          <View className="flex-row flex-wrap justify-center" style={{ gap: 8 }}>
            {GROUP_CONTEXT_CHIPS.map((chip) => (
              <TouchableOpacity
                key={chip.label}
                onPress={() => onChipSelect(chip.query)}
                activeOpacity={0.8}
                style={{
                  borderWidth: 1,
                  borderColor: '#C7D2FE',
                  backgroundColor: '#EEF2FF',
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                }}
              >
                <Text style={{ fontSize: 13, color: '#4338CA', fontWeight: '500' }}>{chip.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {hasGroupContext && (
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
