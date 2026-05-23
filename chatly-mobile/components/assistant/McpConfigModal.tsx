import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { mcpService } from '@/services/mcp.service';
import type { McpServer, McpTool } from '@/types/agent';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function McpConfigModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  // Add form
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [headerKey, setHeaderKey] = useState('');
  const [headerVal, setHeaderVal] = useState('');
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  // Tools expand
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);

  const loadServers = useCallback(async () => {
    try {
      const data = await mcpService.list();
      setServers(data);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      loadServers().finally(() => setLoading(false));
    }
  }, [visible, loadServers]);

  const handleToggle = async (server: McpServer) => {
    try {
      const updated = await mcpService.toggle(server.id, !server.is_active);
      setServers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch {
      Alert.alert('Error', 'Could not change status');
    }
  };

  const handleDelete = (server: McpServer) => {
    Alert.alert('Delete MCP Server?', `"${server.name}" will be permanently deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await mcpService.delete(server.id);
            setServers((prev) => prev.filter((s) => s.id !== server.id));
            if (expandedId === server.id) setExpandedId(null);
          } catch {
            Alert.alert('Error', 'Could not delete server');
          }
        },
      },
    ]);
  };

  const handleExpandTools = async (serverId: string) => {
    if (expandedId === serverId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(serverId);
    setLoadingTools(true);
    try {
      const data = await mcpService.listTools(serverId);
      setTools(data);
    } catch {
      setTools([]);
    } finally {
      setLoadingTools(false);
    }
  };

  const handleCreate = async () => {
    const trimName = name.trim();
    const trimUrl = url.trim();
    if (!trimName || !trimUrl) {
      Alert.alert('Missing information', 'Please enter name and URL');
      return;
    }
    setCreating(true);
    try {
      const server = await mcpService.create({ name: trimName, url: trimUrl, headers });
      setServers((prev) => [server, ...prev]);
      resetForm();
    } catch {
      Alert.alert('Error', 'Could not add MCP server');
    } finally {
      setCreating(false);
    }
  };

  const addHeader = () => {
    const k = headerKey.trim();
    const v = headerVal.trim();
    if (!k) return;
    setHeaders((prev) => ({ ...prev, [k]: v }));
    setHeaderKey('');
    setHeaderVal('');
  };

  const removeHeader = (key: string) => {
    setHeaders((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const resetForm = () => {
    setName('');
    setUrl('');
    setHeaderKey('');
    setHeaderVal('');
    setHeaders({});
    setShowAdd(false);
  };

  const renderServer = ({ item }: { item: McpServer }) => {
    const isExpanded = expandedId === item.id;
    return (
      <View
        style={{
          backgroundColor: Colors.white,
          borderBottomWidth: 0.5,
          borderBottomColor: Colors.borderLight,
        }}
      >
        <View className="flex-row items-center px-4 py-3">
          {/* Info */}
          <TouchableOpacity
            onPress={() => handleExpandTools(item.id)}
            className="flex-1 mr-3"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <View
                className="h-9 w-9 rounded-lg items-center justify-center mr-3"
                style={{ backgroundColor: item.is_active ? Colors.ctaLight : Colors.bg }}
              >
                <Ionicons
                  name="hardware-chip-outline"
                  size={18}
                  color={item.is_active ? Colors.cta : Colors.textLight}
                />
              </View>
              <View className="flex-1">
                <Text
                  className="text-[15px] font-semibold"
                  style={{ color: Colors.text }}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text className="text-xs mt-0.5" style={{ color: Colors.textMuted }} numberOfLines={1}>
                  {item.url}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Toggle */}
          <Switch
            value={item.is_active}
            onValueChange={() => handleToggle(item)}
            trackColor={{ false: Colors.borderLight, true: Colors.cta }}
            thumbColor={Colors.white}
          />

          {/* Delete */}
          <TouchableOpacity
            onPress={() => handleDelete(item)}
            className="ml-3 p-1"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
          </TouchableOpacity>
        </View>

        {/* Expanded tools */}
        {isExpanded && (
          <View className="px-4 pb-3" style={{ paddingLeft: 60 }}>
            {loadingTools ? (
              <ActivityIndicator size="small" color={Colors.cta} />
            ) : tools.length === 0 ? (
              <Text className="text-xs" style={{ color: Colors.textLight }}>
                No tools available
              </Text>
            ) : (
              tools.map((t) => (
                <View key={t.name} className="mb-2">
                  <View className="flex-row items-center">
                    <Ionicons name="construct-outline" size={12} color={Colors.cta} />
                    <Text className="text-xs font-semibold ml-1.5" style={{ color: Colors.text }}>
                      {t.name}
                    </Text>
                  </View>
                  <Text className="text-[11px] mt-0.5 ml-4" style={{ color: Colors.textMuted }}>
                    {t.description}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}
      </View>
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
          <Text className="text-lg font-bold" style={{ color: Colors.text }}>
            MCP Servers
          </Text>
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <TouchableOpacity
              onPress={() => setShowAdd(!showAdd)}
              className="h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: Colors.ctaLight }}
            >
              <Ionicons name={showAdd ? 'close' : 'add'} size={20} color={Colors.cta} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} className="p-1">
              <Ionicons name="close" size={24} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Add form */}
        {showAdd && (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              className="px-4 py-3"
              style={{ backgroundColor: Colors.white, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight }}
              keyboardShouldPersistTaps="handled"
            >
              <Text className="text-sm font-semibold mb-2" style={{ color: Colors.text }}>
                Add MCP Server
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Server name"
                placeholderTextColor={Colors.textLight}
                className="rounded-lg px-3 py-2.5 text-sm mb-2"
                style={{ backgroundColor: Colors.bg, color: Colors.text, borderWidth: 0.5, borderColor: Colors.borderLight }}
              />
              <TextInput
                value={url}
                onChangeText={setUrl}
                placeholder="URL (https://...)"
                placeholderTextColor={Colors.textLight}
                autoCapitalize="none"
                keyboardType="url"
                className="rounded-lg px-3 py-2.5 text-sm mb-2"
                style={{ backgroundColor: Colors.bg, color: Colors.text, borderWidth: 0.5, borderColor: Colors.borderLight }}
              />

              {/* Custom headers */}
              <Text className="text-xs font-medium mb-1.5" style={{ color: Colors.textMuted }}>
                Headers (optional)
              </Text>
              {Object.entries(headers).map(([k, v]) => (
                <View key={k} className="flex-row items-center mb-1.5">
                  <View className="flex-1 flex-row items-center rounded-lg px-2 py-1.5" style={{ backgroundColor: Colors.bg }}>
                    <Text className="text-xs font-medium" style={{ color: Colors.cta }}>{k}</Text>
                    <Text className="text-xs mx-1" style={{ color: Colors.textLight }}>:</Text>
                    <Text className="text-xs flex-1" style={{ color: Colors.text }} numberOfLines={1}>{v}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeHeader(k)} className="ml-2 p-1">
                    <Ionicons name="close-circle" size={16} color={Colors.textLight} />
                  </TouchableOpacity>
                </View>
              ))}
              <View className="flex-row items-center gap-2 mb-3">
                <TextInput
                  value={headerKey}
                  onChangeText={setHeaderKey}
                  placeholder="Key"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="none"
                  className="flex-1 rounded-lg px-2.5 py-2 text-xs"
                  style={{ backgroundColor: Colors.bg, color: Colors.text, borderWidth: 0.5, borderColor: Colors.borderLight }}
                />
                <TextInput
                  value={headerVal}
                  onChangeText={setHeaderVal}
                  placeholder="Value"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="none"
                  className="flex-1 rounded-lg px-2.5 py-2 text-xs"
                  style={{ backgroundColor: Colors.bg, color: Colors.text, borderWidth: 0.5, borderColor: Colors.borderLight }}
                />
                <TouchableOpacity
                  onPress={addHeader}
                  disabled={!headerKey.trim()}
                  className="h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: headerKey.trim() ? Colors.ctaLight : Colors.bg }}
                >
                  <Ionicons name="add" size={18} color={headerKey.trim() ? Colors.cta : Colors.textLight} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleCreate}
                disabled={creating || !name.trim() || !url.trim()}
                className="items-center rounded-lg py-2.5 mb-2"
                style={{
                  backgroundColor: name.trim() && url.trim() ? Colors.cta : Colors.borderLight,
                }}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text className="text-sm font-semibold" style={{ color: Colors.white }}>
                    Add server
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        )}

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
                <Text className="text-sm mt-3" style={{ color: Colors.textMuted }}>
                  No MCP servers yet
                </Text>
                <TouchableOpacity
                  onPress={() => setShowAdd(true)}
                  className="flex-row items-center mt-4 px-4 py-2 rounded-full"
                  style={{ backgroundColor: Colors.cta }}
                >
                  <Ionicons name="add" size={16} color={Colors.white} />
                  <Text className="ml-1 text-sm font-semibold" style={{ color: Colors.white }}>
                    Add server
                  </Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}
