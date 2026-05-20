import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth.store';
import { storyService } from '@/services/story.service';
import type {
  StoryGroup,
  StoryReactionResponse,
  StoryReplyResponse,
  StoryResponse,
} from '@/types/story';
import type { UserResponse } from '@/types/auth';
import { StoryMusicPlayback } from './StoryMusicPlayback';
import { StoryVideoPreview } from './StoryVideoPreview';

const STORY_DURATION_MS = 5000;
const TICK_MS = 50;
const STEP = (TICK_MS / STORY_DURATION_MS) * 100;

const QUICK_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👏'];

const BG_GRADIENTS = [
  ['#9333ea', '#ec4899'],
  ['#2563eb', '#06b6d4'],
  ['#e11d48', '#f59e0b'],
  ['#4f46e5', '#a855f7'],
  ['#0d9488', '#84cc16'],
  ['#334155', '#6b7280'],
];

type OwnerPanelTab = 'viewers' | 'reactions' | 'replies';

interface StoryViewerModalProps {
  groups: StoryGroup[];
  initialGroupIndex: number;
  visible: boolean;
  onClose: () => void;
  onStoryDeleted?: (storyId: string) => void;
  onStoryViewed?: (storyId: string) => void;
}

export function StoryViewerModal({
  groups,
  initialGroupIndex,
  visible,
  onClose,
  onStoryDeleted,
  onStoryViewed,
}: StoryViewerModalProps) {
  const currentUser = useAuthStore((s) => s.user);
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  // Interaction state
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Owner panel
  const [isOwnerPanelOpen, setIsOwnerPanelOpen] = useState(false);
  const [ownerTab, setOwnerTab] = useState<OwnerPanelTab>('viewers');
  const [viewers, setViewers] = useState<UserResponse[]>([]);
  const [reactions, setReactions] = useState<StoryReactionResponse[]>([]);
  const [replies, setReplies] = useState<StoryReplyResponse[]>([]);
  const [isPanelLoading, setIsPanelLoading] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentGroup = groups[groupIndex];
  const currentStory: StoryResponse | undefined = currentGroup?.stories[storyIndex];
  const totalStories = currentGroup?.stories.length ?? 0;
  const isOwnStory = !!currentUser && currentStory?.userId === currentUser.id;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const goNext = useCallback(() => {
    if (storyIndex < totalStories - 1) {
      setStoryIndex((p) => p + 1);
      setProgress(0);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex((p) => p + 1);
      setStoryIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [storyIndex, totalStories, groupIndex, groups.length, onClose]);

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((p) => p - 1);
      setProgress(0);
    } else if (groupIndex > 0) {
      setGroupIndex((p) => p - 1);
      const prevGroup = groups[groupIndex - 1];
      setStoryIndex(prevGroup.stories.length - 1);
      setProgress(0);
    }
  }, [storyIndex, groupIndex, groups]);

  // Auto-advance timer
  useEffect(() => {
    const storyId = currentStory?.id;
    clearTimer();
    if (isPaused || !storyId || isOwnerPanelOpen) return;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + STEP;
        if (next >= 100) {
          goNext();
          return 0;
        }
        return next;
      });
    }, TICK_MS);

    return clearTimer;
  }, [isPaused, currentStory?.id, isOwnerPanelOpen, clearTimer, goNext]);

  // Record view + reset state when story changes
  useEffect(() => {
    const storyId = currentStory?.id;
    if (!storyId) return;
    storyService
      .recordView(storyId)
      .then(() => onStoryViewed?.(storyId))
      .catch(() => {});
    setViewers([]);
    setReactions([]);
    setReplies([]);
    setIsOwnerPanelOpen(false);
    setMyReaction(null);
    setReplyText('');
  }, [currentStory?.id, onStoryViewed]);

  // Reset to initial group when modal becomes visible
  useEffect(() => {
    if (visible) {
      setGroupIndex(initialGroupIndex);
      setStoryIndex(0);
      setProgress(0);
    }
  }, [visible, initialGroupIndex]);

  const loadPanelData = useCallback(
    async (tab: OwnerPanelTab, forceReload = false) => {
      if (!currentStory?.id) return;
      setIsPanelLoading(true);
      try {
        if (tab === 'viewers' && (viewers.length === 0 || forceReload)) {
          const res = await storyService.getViewers(currentStory.id);
          setViewers(res.result ?? []);
        } else if (tab === 'reactions' && (reactions.length === 0 || forceReload)) {
          const res = await storyService.getReactions(currentStory.id);
          setReactions(res.result ?? []);
        } else if (tab === 'replies' && (replies.length === 0 || forceReload)) {
          const res = await storyService.getReplies(currentStory.id);
          setReplies(res.result ?? []);
        }
      } catch {
        // Non-critical: panel data failure
      } finally {
        setIsPanelLoading(false);
      }
    },
    [currentStory?.id, viewers.length, reactions.length, replies.length]
  );

  const handleOpenOwnerPanel = useCallback(
    (tab: OwnerPanelTab) => {
      setOwnerTab(tab);
      setIsOwnerPanelOpen(true);
      setIsPaused(true);
      void loadPanelData(tab);
    },
    [loadPanelData]
  );

  const handleTabChange = useCallback(
    (tab: OwnerPanelTab) => {
      setOwnerTab(tab);
      void loadPanelData(tab);
    },
    [loadPanelData]
  );

  const handleReact = useCallback(
    async (emoji: string) => {
      if (!currentStory?.id) return;
      try {
        if (myReaction === emoji) {
          await storyService.removeReaction(currentStory.id);
          setMyReaction(null);
        } else {
          await storyService.reactToStory(currentStory.id, emoji);
          setMyReaction(emoji);
        }
      } catch {
        // Non-critical
      }
    },
    [currentStory?.id, myReaction]
  );

  const handleSendReply = useCallback(async () => {
    if (!currentStory?.id || !replyText.trim()) return;
    setIsSendingReply(true);
    try {
      await storyService.replyToStory(currentStory.id, replyText.trim());
      setReplyText('');
    } catch {
      // Non-critical
    } finally {
      setIsSendingReply(false);
    }
  }, [currentStory?.id, replyText]);

  const handleDelete = useCallback(async () => {
    if (!currentStory?.id) return;
    try {
      await storyService.deleteStory(currentStory.id);
      onStoryDeleted?.(currentStory.id);
      onClose();
    } catch {
      // Non-critical
    }
  }, [currentStory?.id, onStoryDeleted, onClose]);

  if (!visible || !currentGroup || !currentStory) return null;

  const user = currentGroup.user;
  const bgColors = BG_GRADIENTS[(currentStory.bgIndex ?? 0) % BG_GRADIENTS.length];

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-black">
        {/* Story background */}
        <View className="relative flex-1">
          {currentStory.musicUrl && !isOwnerPanelOpen ? (
            <StoryMusicPlayback uri={currentStory.musicUrl} shouldPlay={!isPaused} />
          ) : null}

          {currentStory.mediaUrl && currentStory.type === 'VIDEO' ? (
            <StoryVideoPreview uri={currentStory.mediaUrl} shouldAutoPlay={!isPaused} />
          ) : currentStory.mediaUrl ? (
            <Image
              source={{ uri: currentStory.mediaUrl }}
              style={{ position: 'absolute', inset: 0 }}
              contentFit="cover"
            />
          ) : (
            <View
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: bgColors[0],
                alignItems: 'center',
                justifyContent: 'center',
                padding: 32,
              }}>
              <Text
                style={{
                  color: 'white',
                  fontSize: currentStory.fontSize ?? 24,
                  fontWeight: '600',
                  textAlign: 'center',
                }}>
                {currentStory.content}
              </Text>
            </View>
          )}

          {/* Overlay */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.25)',
            }}
          />

          {/* Progress bars */}
          <View className="absolute left-3 right-3 top-12 z-10 flex-row gap-1">
            {currentGroup.stories.map((_, idx) => (
              <View key={idx} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
                <View
                  className="h-full rounded-full bg-white"
                  style={{
                    width: idx < storyIndex ? '100%' : idx === storyIndex ? `${progress}%` : '0%',
                  }}
                />
              </View>
            ))}
          </View>

          {/* Header */}
          <View className="absolute left-0 right-0 top-16 z-10 flex-row items-center justify-between px-4">
            <View className="flex-row items-center gap-3">
              <View className="h-9 w-9 overflow-hidden rounded-full bg-white/20">
                {user.avatarUrl ? (
                  <Image
                    source={{ uri: user.avatarUrl }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Text className="text-sm font-bold text-white">
                      {(user.displayName ?? user.username).charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-sm font-semibold text-white">
                {user.displayName ?? user.username}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              {isOwnStory && (
                <TouchableOpacity onPress={handleDelete} className="p-1.5">
                  <Ionicons name="trash-outline" size={20} color="white" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setIsPaused((p) => !p)} className="p-1.5">
                <Ionicons name={isPaused ? 'play' : 'pause'} size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} className="p-1.5">
                <Ionicons name="close" size={22} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Tap zones */}
          <View style={{ position: 'absolute', inset: 0, flexDirection: 'row' }}>
            <Pressable style={{ flex: 1 }} onPress={goPrev} />
            <Pressable style={{ flex: 1 }} onPress={() => setIsPaused((p) => !p)} />
            <Pressable style={{ flex: 1 }} onPress={goNext} />
          </View>

          {/* Music indicator */}
          {currentStory.musicName && !isOwnerPanelOpen && (
            <View className="absolute bottom-28 left-4 right-4 z-10 flex-row items-center gap-2 rounded-full bg-black/40 px-3 py-2">
              <Text className="text-xs text-white">♫</Text>
              <Text className="flex-1 text-xs text-white/80" numberOfLines={1}>
                {currentStory.musicName}
              </Text>
            </View>
          )}

          {/* Own story: view count bar */}
          {isOwnStory && !isOwnerPanelOpen && (
            <TouchableOpacity
              onPress={() => handleOpenOwnerPanel('viewers')}
              className="absolute bottom-6 left-4 right-4 z-10 flex-row items-center gap-2 rounded-full bg-black/50 px-4 py-3"
              activeOpacity={0.8}>
              <Ionicons name="eye-outline" size={16} color="white" />
              <Text className="flex-1 text-sm font-medium text-white">
                {currentStory.viewCount} {currentStory.viewCount === 1 ? 'view' : 'views'}
              </Text>
              <Text className="text-xs text-white/50">Tap to see</Text>
            </TouchableOpacity>
          )}

          {/* Others' story: emoji reactions + reply input */}
          {!isOwnStory && (
            <View className="absolute bottom-6 left-4 right-4 z-10 gap-2">
              {/* Quick reactions */}
              <View className="flex-row justify-center gap-2">
                {QUICK_EMOJIS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => void handleReact(emoji)}
                    style={{
                      padding: 8,
                      borderRadius: 999,
                      backgroundColor:
                        myReaction === emoji ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)',
                      transform: [{ scale: myReaction === emoji ? 1.2 : 1 }],
                    }}
                    activeOpacity={0.75}>
                    <Text style={{ fontSize: 20 }}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {/* Reply input */}
              <View className="flex-row items-center gap-2 rounded-full bg-black/50 px-4 py-2">
                <TextInput
                  value={replyText}
                  onChangeText={setReplyText}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => setIsPaused(false)}
                  placeholder="Reply to story..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  className="flex-1 text-sm text-white"
                  returnKeyType="send"
                  onSubmitEditing={() => void handleSendReply()}
                  maxLength={500}
                  blurOnSubmit={false}
                />
                <TouchableOpacity
                  onPress={() => void handleSendReply()}
                  disabled={!replyText.trim() || isSendingReply}
                  style={{ opacity: replyText.trim() && !isSendingReply ? 1 : 0.4 }}>
                  {isSendingReply ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="send" size={18} color="white" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Owner panel */}
          {isOwnStory && isOwnerPanelOpen && (
            <View className="absolute bottom-0 left-0 right-0 z-20 max-h-72 rounded-t-2xl bg-black/85">
              {/* Tabs */}
              <View className="flex-row items-center justify-between px-4 pb-0 pt-3">
                <View className="flex-row gap-4">
                  {(['viewers', 'reactions', 'replies'] as OwnerPanelTab[]).map((tab) => (
                    <TouchableOpacity
                      key={tab}
                      onPress={() => handleTabChange(tab)}
                      style={{
                        paddingBottom: 8,
                        borderBottomWidth: 2,
                        borderBottomColor: ownerTab === tab ? 'white' : 'transparent',
                      }}>
                      <Text
                        style={{
                          color: ownerTab === tab ? 'white' : 'rgba(255,255,255,0.4)',
                          fontSize: 13,
                          fontWeight: '600',
                          textTransform: 'capitalize',
                        }}>
                        {tab}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setIsOwnerPanelOpen(false);
                    setIsPaused(false);
                  }}>
                  <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              </View>
              <View className="mx-4 mt-0 border-b border-white/10" />

              {/* Content */}
              {isPanelLoading ? (
                <View className="items-center py-8">
                  <ActivityIndicator color="white" />
                </View>
              ) : (
                <View style={{ maxHeight: 200, overflow: 'hidden' }}>
                  {ownerTab === 'viewers' &&
                    (viewers.length === 0 ? (
                      <Text className="py-6 text-center text-sm text-white/40">No viewers yet</Text>
                    ) : (
                      viewers.map((v) => (
                        <View key={v.id} className="flex-row items-center gap-3 px-4 py-2">
                          <AvatarBubble name={v.displayName ?? v.username} uri={v.avatarUrl} />
                          <Text className="text-sm text-white">{v.displayName ?? v.username}</Text>
                        </View>
                      ))
                    ))}

                  {ownerTab === 'reactions' &&
                    (reactions.length === 0 ? (
                      <Text className="py-6 text-center text-sm text-white/40">
                        No reactions yet
                      </Text>
                    ) : (
                      reactions.map((r) => (
                        <View key={r.id} className="flex-row items-center gap-3 px-4 py-2">
                          <AvatarBubble
                            name={r.user?.displayName ?? r.user?.username ?? '?'}
                            uri={r.user?.avatarUrl}
                          />
                          <Text className="flex-1 text-sm text-white">
                            {r.user?.displayName ?? r.user?.username}
                          </Text>
                          <Text style={{ fontSize: 20 }}>{r.emoji}</Text>
                        </View>
                      ))
                    ))}

                  {ownerTab === 'replies' &&
                    (replies.length === 0 ? (
                      <Text className="py-6 text-center text-sm text-white/40">No replies yet</Text>
                    ) : (
                      replies.map((r) => (
                        <View key={r.id} className="flex-row items-start gap-3 px-4 py-2">
                          <AvatarBubble
                            name={r.user?.displayName ?? r.user?.username ?? '?'}
                            uri={r.user?.avatarUrl}
                          />
                          <View>
                            <Text className="text-xs text-white/60">
                              {r.user?.displayName ?? r.user?.username}
                            </Text>
                            <Text className="text-sm text-white">{r.content}</Text>
                          </View>
                        </View>
                      ))
                    ))}
                </View>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface AvatarBubbleProps {
  name: string;
  uri?: string;
}

function AvatarBubble({ name, uri }: AvatarBubbleProps) {
  return (
    <View className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white/20">
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text className="text-xs font-bold text-white">{name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
    </View>
  );
}
