import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import type { Message } from '@/types/message';

interface ActivePollBannerProps {
  polls: Message[];
  currentIdx: number;
  onPrev: () => void;
  onNext: () => void;
  onPress: (messageId: string) => void;
}

export function ActivePollBanner({
  polls,
  currentIdx,
  onPrev,
  onNext,
  onPress,
}: ActivePollBannerProps) {
  if (polls.length === 0) return null;
  const current = polls[currentIdx];
  if (!current?.poll) return null;

  const totalVotes = Object.values(current.poll.votes || {}).reduce(
    (sum, voters) => sum + voters.length,
    0,
  );

  const isExpired = current.poll.deadline
    ? new Date(current.poll.deadline) < new Date()
    : false;
  const isClosed = current.poll.closed || isExpired;

  return (
    <TouchableOpacity
      onPress={() => onPress(current.id)}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#EDE9FE',
        borderBottomWidth: 0.5,
        borderBottomColor: Colors.borderLight,
        gap: 8,
      }}
    >
      <Ionicons name="stats-chart" size={16} color="#7C3AED" />

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, color: '#7C3AED', fontWeight: '600' }} numberOfLines={1}>
          {isClosed ? 'Poll ended' : 'Active poll'}
          {polls.length > 1 ? ` (${polls.length})` : ''}
        </Text>
        <Text style={{ fontSize: 12, color: Colors.text }} numberOfLines={1}>
          {current.poll.question}
        </Text>
        <Text style={{ fontSize: 10, color: Colors.textMuted }}>
          {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
          {' · Tap to view'}
        </Text>
      </View>

      {polls.length > 1 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <TouchableOpacity onPress={onPrev} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
          <Text style={{ fontSize: 10, color: Colors.textMuted }}>
            {currentIdx + 1}/{polls.length}
          </Text>
          <TouchableOpacity onPress={onNext} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}
