import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/theme';
import { groupService } from '@/services/group.service';
import { useAuthStore } from '@/store/auth.store';
import type { CallType } from '@/types/call';
import type { GroupMemberResponse } from '@/types/group';

interface GroupCallMemberPickerProps {
  visible: boolean;
  conversationId: string;
  groupName: string;
  groupAvatar?: string | null;
  callType: CallType;
  onCall: (selectedMemberIds: string[]) => void;
  onClose: () => void;
}

export function GroupCallMemberPicker({
  visible,
  conversationId,
  groupName,
  groupAvatar,
  callType,
  onCall,
  onClose,
}: GroupCallMemberPickerProps) {
  const currentUser = useAuthStore((s) => s.user);
  const [members, setMembers] = useState<GroupMemberResponse[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !conversationId) return;
    setLoading(true);
    groupService
      .getMembers(conversationId)
      .then((res) => {
        const others = (res.result ?? []).filter((m) => m.userId !== currentUser?.id);
        setMembers(others);
        setSelectedIds(new Set(others.map((m) => m.userId)));
      })
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [visible, conversationId, currentUser?.id]);

  if (!visible) return null;

  const toggleMember = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const callLabel = callType === 'VIDEO' ? 'Video call' : 'Voice call';
  const iconName = callType === 'VIDEO' ? 'videocam' : 'call';
  const selectedMembers = members.filter((m) => selectedIds.has(m.userId));

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: Colors.white,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '80%',
            paddingBottom: 24,
          }}
          onPress={() => {}}
        >
          {/* Handle bar */}
          <View style={{ alignItems: 'center', paddingTop: 12, marginBottom: 4 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.borderLight }} />
          </View>

          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderBottomWidth: 0.5,
              borderBottomColor: Colors.borderLight,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.text }}>
              Call group members
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Group info */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderBottomWidth: 0.5,
              borderBottomColor: Colors.borderLight,
              gap: 12,
            }}
          >
            <Avatar uri={groupAvatar ?? null} name={groupName} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.text }} numberOfLines={1}>
                {groupName}
              </Text>
              <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 2 }}>
                Non-selected members can join anytime
              </Text>
            </View>
          </View>

          {/* Selected tags */}
          {selectedMembers.length > 0 && (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 6,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderBottomWidth: 0.5,
                borderBottomColor: Colors.borderLight,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 12, color: Colors.textMuted, marginRight: 4 }}>Ringing:</Text>
              {selectedMembers.map((m) => (
                <TouchableOpacity
                  key={m.userId}
                  onPress={() => toggleMember(m.userId)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: `${Colors.cta}18`,
                    borderRadius: 20,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '500', color: Colors.cta }}>
                    {m.displayName.split(' ').slice(-1)[0]}
                  </Text>
                  <Ionicons name="close" size={12} color={Colors.cta} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Member list */}
          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <ActivityIndicator color={Colors.cta} />
            </View>
          ) : (
            <FlatList
              data={members}
              keyExtractor={(item) => item.userId}
              style={{ maxHeight: 320 }}
              ListHeaderComponent={
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: Colors.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    paddingHorizontal: 20,
                    paddingTop: 12,
                    paddingBottom: 4,
                  }}
                >
                  Members
                </Text>
              }
              renderItem={({ item }) => {
                const isSelected = selectedIds.has(item.userId);
                return (
                  <TouchableOpacity
                    onPress={() => toggleMember(item.userId)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      gap: 12,
                    }}
                    activeOpacity={0.7}
                  >
                    <Avatar uri={item.avatar} name={item.displayName} size={44} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '500', color: Colors.text }} numberOfLines={1}>
                        {item.displayName}
                      </Text>
                      <Text style={{ fontSize: 12, color: Colors.textMuted }} numberOfLines={1}>
                        @{item.username}
                      </Text>
                    </View>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 4,
                        borderWidth: 2,
                        borderColor: isSelected ? Colors.cta : Colors.borderLight,
                        backgroundColor: isSelected ? Colors.cta : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={14} color={Colors.white} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {/* Call button */}
          <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
            <TouchableOpacity
              onPress={() => onCall(Array.from(selectedIds))}
              disabled={selectedIds.size === 0}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: selectedIds.size === 0 ? Colors.borderLight : Colors.cta,
                borderRadius: 14,
                paddingVertical: 14,
              }}
              activeOpacity={0.8}
            >
              <Ionicons name={iconName} size={18} color={Colors.white} />
              <Text style={{ fontSize: 15, fontWeight: '600', color: Colors.white }}>
                {callLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
