import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { reelService } from '@/services/reel.service';
import type { Reel } from '@/types/reel';
import { ReelSlide } from './components/ReelSlide';
import { ReelCommentsModal } from './components/ReelCommentsModal';
import { ShareReelModal } from './components/ShareReelModal';
import { CreateReelModal } from './components/CreateReelModal';
import { getApiErrorMessage } from '@/utils/errorHandler';

const PAGE_SIZE = 10;

function mergeReels(existing: Reel[], incoming: Reel[]) {
  const existingIds = new Set(existing.map((reel) => reel.id));
  return [...existing, ...incoming.filter((reel) => !existingIds.has(reel.id))];
}

export default function ReelsScreen() {
  const router = useRouter();
  const { reelId: focusedReelId } = useLocalSearchParams<{ reelId?: string }>();
  const { width, height } = useWindowDimensions();

  const [reels, setReels] = useState<Reel[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCommentsReel, setSelectedCommentsReel] = useState<Reel | null>(null);
  const [selectedShareReel, setSelectedShareReel] = useState<Reel | null>(null);
  const [busyReelId, setBusyReelId] = useState<string | null>(null);
  const viewedIdsRef = useRef<Set<string>>(new Set());

  const activeReel = reels[activeIndex];
  const isEmpty = !isLoading && reels.length === 0;

  const updateReel = useCallback((updatedReel: Reel) => {
    setReels((current) =>
      current.map((reel) => (reel.id === updatedReel.id ? updatedReel : reel))
    );
    setSelectedCommentsReel((current) =>
      current?.id === updatedReel.id ? updatedReel : current
    );
  }, []);

  const incrementCommentCount = useCallback((reelId: string) => {
    setReels((current) =>
      current.map((reel) =>
        reel.id === reelId ? { ...reel, commentCount: reel.commentCount + 1 } : reel
      )
    );
    setSelectedCommentsReel((current) =>
      current?.id === reelId ? { ...current, commentCount: current.commentCount + 1 } : current
    );
  }, []);

  const loadReels = useCallback(async (cursor: string | null, shouldReplace = false) => {
    setIsLoading(true);
    try {
      const response = await reelService.getFeed(cursor, PAGE_SIZE);
      if (response.code !== 1000 || !response.result) {
        Alert.alert('Error', response.message ?? 'Could not load reels.');
        return;
      }

      setReels((current) =>
        shouldReplace ? response.result.items : mergeReels(current, response.result.items)
      );
      setNextCursor(response.result.nextCursor);
      setHasMore(response.result.hasMore);

      if (shouldReplace) {
        setActiveIndex(0);
        viewedIdsRef.current = new Set();
      }
    } catch (error: unknown) {
      Alert.alert('Error', getApiErrorMessage(error, 'Could not load reels.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!focusedReelId) {
      void loadReels(null, true);
      return;
    }

    setIsLoading(true);
    Promise.all([reelService.getById(focusedReelId), reelService.getFeed(null, PAGE_SIZE)])
      .then(([focusedResponse, feedResponse]) => {
        if (focusedResponse.code !== 1000 || !focusedResponse.result) {
          Alert.alert('Error', focusedResponse.message ?? 'Could not load reel.');
          return;
        }
        const feed = feedResponse.result;
        setReels(mergeReels([focusedResponse.result], feed?.items ?? []));
        setNextCursor(feed?.nextCursor ?? null);
        setHasMore(feed?.hasMore ?? false);
        setActiveIndex(0);
        viewedIdsRef.current = new Set();
      })
      .catch((error: unknown) => {
        Alert.alert('Error', getApiErrorMessage(error, 'Could not load focused reel.'));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [focusedReelId, loadReels]);

  useEffect(() => {
    if (!activeReel || viewedIdsRef.current.has(activeReel.id)) return;
    viewedIdsRef.current.add(activeReel.id);
    void reelService.recordView(activeReel.id);
  }, [activeReel]);

  const loadMoreReels = useCallback(() => {
    if (!hasMore || isLoading || !nextCursor) return;
    void loadReels(nextCursor);
  }, [hasMore, isLoading, nextCursor, loadReels]);

  const handleToggleLike = async (reel: Reel) => {
    setBusyReelId(reel.id);
    try {
      const hasReacted = reel.reactions?.some((reaction) => reaction.reactedByMe);
      const response = hasReacted
        ? await reelService.removeReaction(reel.id)
        : await reelService.react(reel.id, { type: 'LIKE' });
      if (response.code === 1000 && response.result) {
        updateReel(response.result);
      }
    } catch (error: unknown) {
      Alert.alert('Error', getApiErrorMessage(error, 'Could not update reaction.'));
    } finally {
      setBusyReelId(null);
    }
  };

  const handleCreated = () => {
    void loadReels(null, true);
  };

  return (
    <View className="flex-1 bg-black">
      {/* Floating Header */}
      <SafeAreaView
        edges={['top']}
        className="absolute top-0 left-0 right-0 z-20 flex-row items-center justify-between px-4 py-2 pointer-events-box-none">
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          className="h-10 w-10 rounded-full bg-black/40 items-center justify-center border border-white/10 shadow">
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>

        <Text className="text-white font-bold text-lg shadow-sm">Reels</Text>

        <TouchableOpacity
          onPress={() => setIsCreateOpen(true)}
          activeOpacity={0.7}
          className="flex-row items-center gap-1 bg-white/20 border border-white/10 rounded-full px-4 py-2 shadow">
          <Ionicons name="add" size={18} color="white" />
          <Text className="text-white text-xs font-bold">Create</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Empty State */}
      {isEmpty && (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="film-outline" size={48} color="white" className="opacity-60 mb-2" />
          <Text className="text-white font-bold text-lg">No reels yet</Text>
          <Text className="text-white/60 text-sm mt-1 text-center max-w-xs">
            Create the first reel or check back later once more people upload videos.
          </Text>
        </View>
      )}

      {/* Main Snap Scrolling Feed */}
      {reels.length > 0 && (
        <FlatList
          data={reels}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <View style={{ width, height }}>
              <ReelSlide
                reel={item}
                isActive={index === activeIndex}
                isBusy={busyReelId === item.id}
                onToggleLike={handleToggleLike}
                onOpenComments={setSelectedCommentsReel}
                onShare={setSelectedShareReel}
              />
            </View>
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const offset = e.nativeEvent.contentOffset.y;
            const index = Math.round(offset / height);
            if (index !== activeIndex) {
              setActiveIndex(index);
            }
          }}
          onEndReached={loadMoreReels}
          onEndReachedThreshold={0.5}
        />
      )}

      {/* Loading Overlay */}
      {isLoading && reels.length === 0 && (
        <View className="absolute inset-0 items-center justify-center bg-black/40">
          <ActivityIndicator size="large" color="white" />
        </View>
      )}

      {/* Modals */}
      <CreateReelModal
        visible={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />

      <ReelCommentsModal
        reel={selectedCommentsReel}
        visible={selectedCommentsReel !== null}
        onClose={() => setSelectedCommentsReel(null)}
        onCommentAdded={incrementCommentCount}
      />

      <ShareReelModal
        reel={selectedShareReel}
        visible={selectedShareReel !== null}
        onClose={() => setSelectedShareReel(null)}
        onShared={updateReel}
      />
    </View>
  );
}
