import { Text, TouchableOpacity, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { CustomAiIcon } from '@/components/ui/CustomAiIcon';
import { Colors } from '@/constants/theme';
import type { MentionSuggestion } from '@/utils/mention';

interface MentionSuggestionsDropdownProps {
  suggestions: MentionSuggestion[];
  onSelect: (suggestion: MentionSuggestion) => void;
  placement?: 'top' | 'bottom';
}

export function MentionSuggestionsDropdown({
  suggestions,
  onSelect,
  placement = 'top',
}: MentionSuggestionsDropdownProps) {
  if (!suggestions.length) {
    return null;
  }

  return (
    <View
      className="absolute left-0 right-0 z-50 overflow-hidden rounded-2xl border border-[#E5E5EA] bg-white shadow-sm"
      style={placement === 'bottom' ? { top: '100%', marginTop: 8 } : { bottom: '100%', marginBottom: 8 }}>
      {suggestions.map((suggestion) => (
        <TouchableOpacity
          key={`${suggestion.kind}-${suggestion.id}`}
          onPress={() => onSelect(suggestion)}
          activeOpacity={0.72}
          className="flex-row items-center gap-3 px-3 py-2.5">
          {suggestion.kind === 'user' ? (
            <Avatar uri={suggestion.avatarUrl} name={suggestion.displayName} size={30} />
          ) : (
            <View
              className="items-center justify-center rounded-full"
              style={{
                width: 30,
                height: 30,
                backgroundColor: suggestion.kind === 'ai' ? '#EEF5FF' : '#F2F2F7',
              }}>
              {suggestion.kind === 'ai' ? (
                <CustomAiIcon size={14} color={Colors.cta} />
              ) : (
                <Text className="text-xs font-semibold text-[#6E6E73]">@</Text>
              )}
            </View>
          )}

          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="text-sm font-medium text-[#1D1D1F]">
              {suggestion.kind === 'ai'
                ? '@AI'
                : suggestion.kind === 'all'
                  ? '@all'
                  : suggestion.displayName}
            </Text>
            <Text numberOfLines={1} className="text-xs text-[#6E6E73]">
              {suggestion.kind === 'user'
                ? `@${suggestion.username}`
                : suggestion.kind === 'ai'
                  ? 'AI assistant'
                  : 'Mention everyone'}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}