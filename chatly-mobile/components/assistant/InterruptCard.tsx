import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import type { InterruptData } from '@/types/agent';

interface Props {
  interrupt: InterruptData;
  onApprove: () => void;
  onReject: () => void;
}

export function InterruptCard({ interrupt, onApprove, onReject }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasInput = Object.keys(interrupt.tool_input).length > 0;

  return (
    <View className="px-4 py-1">
      <View
        className="self-start max-w-[90%] rounded-2xl px-4 py-3"
        style={{
          backgroundColor: Colors.bubbleReceiver,
          borderBottomLeftRadius: 6,
          gap: 12,
        }}
      >
        {/* Header */}
        <View className="flex-row items-start" style={{ gap: 8 }}>
          <Ionicons name="shield-outline" size={18} color={Colors.warning} style={{ marginTop: 1 }} />
          <View className="flex-1">
            <Text className="text-[14px] font-medium leading-5" style={{ color: Colors.text }}>
              {interrupt.message}
            </Text>
            <TouchableOpacity
              onPress={() => setIsExpanded((v) => !v)}
              className="flex-row items-center mt-1"
              style={{ gap: 4 }}
            >
              <View
                className="rounded px-1.5 py-0.5"
                style={{ backgroundColor: Colors.borderLight }}
              >
                <Text className="text-[12px] font-mono" style={{ color: Colors.textMuted }}>
                  {interrupt.tool_name}
                </Text>
              </View>
              {hasInput && (
                <>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={Colors.textMuted}
                  />
                  <Text className="text-[12px]" style={{ color: Colors.textMuted }}>
                    {isExpanded ? 'Hide' : 'Show'} input
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Collapsible input details */}
        {isExpanded && hasInput && (
          <View
            className="rounded-lg px-3 py-2"
            style={{
              backgroundColor: Colors.white,
              borderWidth: 1,
              borderColor: Colors.borderLight,
              maxHeight: 160,
            }}
          >
            <ScrollView nestedScrollEnabled>
              <Text className="text-[12px] font-mono" style={{ color: Colors.textMuted }}>
                {JSON.stringify(interrupt.tool_input, null, 2)}
              </Text>
            </ScrollView>
          </View>
        )}

        {/* Action buttons */}
        <View className="flex-row" style={{ gap: 8 }}>
          <TouchableOpacity
            onPress={onApprove}
            className="flex-1 flex-row items-center justify-center rounded-xl py-2.5"
            style={{ backgroundColor: Colors.cta, gap: 6 }}
          >
            <Ionicons name="checkmark" size={16} color={Colors.white} />
            <Text className="text-[14px] font-semibold" style={{ color: Colors.white }}>
              Approve
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onReject}
            className="flex-1 flex-row items-center justify-center rounded-xl py-2.5"
            style={{
              backgroundColor: Colors.white,
              borderWidth: 1,
              borderColor: Colors.border,
              gap: 6,
            }}
          >
            <Ionicons name="close" size={16} color={Colors.text} />
            <Text className="text-[14px] font-semibold" style={{ color: Colors.text }}>
              Reject
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
