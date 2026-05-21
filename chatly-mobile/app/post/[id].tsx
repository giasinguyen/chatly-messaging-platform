import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { postService } from '@/services/post.service';
import { Colors } from '@/constants/theme';
import type { Post } from '@/types/post';
import { getApiErrorMessage } from '@/utils/errorHandler';

function PostMedia({ mediaUrls }: { mediaUrls: string[] }) {
  if (mediaUrls.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      className="mt-3"
    >
      {mediaUrls.map((url, index) => (
        <Image
          key={`${url}-${index}`}
          source={{ uri: url }}
          contentFit="cover"
          className="mr-2 h-80 w-[300px] rounded-2xl bg-[#E5E5EA]"
        />
      ))}
    </ScrollView>
  );
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPost = useCallback(async () => {
    if (!id) {
      setErrorMessage('Invalid post id.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      setErrorMessage(null);
      const response = await postService.getById(id);
      if (response.code !== 1000 || !response.result) {
        throw new Error(response.message ?? 'Could not load post.');
      }
      setPost(response.result);
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, 'Could not load post.'));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadPost();
  }, [loadPost]);

  return (
    <View className="flex-1 bg-[#F5F5F7]">
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-row items-center border-b border-[#E5E5EA] bg-white px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} className="rounded-full p-1.5" activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text className="ml-2 text-lg font-semibold text-[#1D1D1F]">Post</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.cta} />
        </View>
      ) : errorMessage ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-base font-semibold text-[#1D1D1F]">Could not load post</Text>
          <Text className="mt-1 text-center text-sm text-[#6E6E73]">{errorMessage}</Text>
          <TouchableOpacity
            className="mt-4 rounded-full bg-[#0A7AFF] px-4 py-2 active:opacity-85"
            onPress={() => void loadPost()}
          >
            <Text className="text-sm font-semibold text-white">Try again</Text>
          </TouchableOpacity>
        </View>
      ) : post ? (
        <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
          <Text className="text-lg font-semibold text-[#1D1D1F]">
            {post.authorDisplayName ?? post.authorUsername ?? 'Unknown user'}
          </Text>
          <Text className="mt-1 text-sm text-[#6E6E73]">{new Date(post.createdAt).toLocaleString()}</Text>

          {post.content?.trim() ? (
            <Text className="mt-3 text-base leading-6 text-[#1D1D1F]">{post.content}</Text>
          ) : null}

          <PostMedia mediaUrls={post.mediaUrls} />

          {post.hashtags.length > 0 && (
            <View className="mt-4 flex-row flex-wrap">
              {post.hashtags.map((tag) => (
                <View key={tag} className="mr-2 mb-2 rounded-full bg-[#EEF5FF] px-3 py-1.5">
                  <Text className="text-xs font-semibold text-[#0A7AFF]">#{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-base font-semibold text-[#1D1D1F]">Post not found</Text>
        </View>
      )}
    </View>
  );
}
