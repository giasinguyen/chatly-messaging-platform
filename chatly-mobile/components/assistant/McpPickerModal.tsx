import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { mcpService } from '@/services/mcp.service';
import { useChatbotStore } from '@/store/chatbot.store';
import type { McpServer } from '@/types/agent';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function McpPickerModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { selectedMcpIds, setSelectedMcpIds } = useChatbotStore();
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      mcpService
        .list()
        .then((data) => setServers(data.filter((s) => s.is_active)))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [visible]);

  const toggle = useCallback(
    (serverId: string) => {
      const next = selectedMcpIds.includes(serverId)
        ? selectedMcpIds.filter((id) => id !== serverId)
        : [...selectedMcpIds, serverId];
      setSelectedMcpIds(next);
    },
    [selectedMcpIds, setSelectedMcpIds],
  );

  const clearAll = useCallback(() => {
    setSelectedMcpIds([]);
  }, [setSelectedMcpIds]);

  const renderServer = ({ item }: { item: McpServer }) => {
    const selected = selectedMcpIds.includes(item.id);
    return (
      <TouchableOpacity
        onPress={() => toggle(item.id)}
        activeOpacity={0.7}
        className="flex-row items-center px-4 py-3.5"
        style={{
          backgroundColor: selected ? Colors.ctaLight : Colors.white,
          borderBottomWidth: 0.5,
          borderBottomColor: Colors.borderLight,
        }}
      >
        <View
          className="h-9 w-9 rounded-lg items-center justify-center mr-3"
          style={{ backgroundColor: selected ? Colors.cta : Colors.bg }}
        >
          <Ionicons
            name="hardware-chip-outline"
            size={18}
            color={selected ? Colors.white : Colors.textMuted}
          />
        </View>
        <View className="flex-1">
          <Text className="text-[15px] font-semibold" style={{ color: Colors.text }}>
            {item.name}
          </Text>
          <Text className="text-xs mt-0.5" style={{ color: Colors.textMuted }} numberOfLines={1}>
            {item.url}
          </Text>
        </View>
        <Ionicons
          name={selected ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={selected ? Colors.cta : Colors.borderLight}
        />
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1" style={{ backgroundColor: Colors.bg, paddingTop: insets.top }}>
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-4 pb-3 pt-2"
          style={{
            backgroundColor: Colors.white,
            borderBottomWidth: 0.5,
            borderBottomColor: Colors.borderLight,
          }}
        >
          <View>
            <Text className="text-lg font-bold" style={{ color: Colors.text }}>
              Select MCP Servers
            </Text>
            {selectedMcpIds.length > 0 && (
              <Text className="text-xs" style={{ color: Colors.cta }}>
                Selected {selectedMcpIds.length} servers
              </Text>
            )}
          </View>
          <View className="flex-row items-center" style={{ gap: 12 }}>
            {selectedMcpIds.length > 0 && (
              <TouchableOpacity onPress={clearAll}>
                <Text className="text-sm font-medium" style={{ color: Colors.error }}>
                  Clear all
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose}>
              <Text className="text-sm font-semibold" style={{ color: Colors.cta }}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Server list */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={Colors.cta} />
          </View>
        ) : (
          <FlatList
            data={servers}
            renderItem={renderServer}
            keyExtractor={(item) => item.id}
            contentContainerStyle={servers.length === 0 ? { flex: 1 } : undefined}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-20">
                <Ionicons name="hardware-chip-outline" size={48} color={Colors.textLight} />
                <Text className="text-sm mt-3 text-center px-8" style={{ color: Colors.textMuted }}>
                  No active MCP servers found.{'\n'}
                  Add servers in MCP settings.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}
