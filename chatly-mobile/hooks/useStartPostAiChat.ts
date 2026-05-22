import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { agentService } from '@/services/agent.service';
import { getApiErrorMessage } from '@/utils/errorHandler';

function useStartPostAiChat() {
  const router = useRouter();
  const [isStartingAiChat, setIsStartingAiChat] = useState(false);

  const startPostAiChat = useCallback(
    async (postId?: string) => {
      if (!postId || isStartingAiChat) {
        return;
      }

      setIsStartingAiChat(true);
      try {
        const response = await agentService.startChatFromPost(postId);
        if (response.code !== 1000 || !response.result) {
          throw new Error(response.message ?? 'Could not start AI chat.');
        }

        router.push(`/assistant/${response.result.sessionId}`);
      } catch (error: unknown) {
        Alert.alert('Error', getApiErrorMessage(error, 'Could not start AI chat.'));
      } finally {
        setIsStartingAiChat(false);
      }
    },
    [isStartingAiChat, router],
  );

  return {
    isStartingAiChat,
    startPostAiChat,
  };
}

export { useStartPostAiChat };
export default useStartPostAiChat;