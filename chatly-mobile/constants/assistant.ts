export type AssistantContextMode = 'group' | 'post' | null;

export const SOCIAL_POST_CONTEXT_PREFIX = 'social:post:';

export function getAssistantContextMode(
  contextConversationId?: string | null,
): AssistantContextMode {
  if (!contextConversationId) {
    return null;
  }

  return contextConversationId.startsWith(SOCIAL_POST_CONTEXT_PREFIX) ? 'post' : 'group';
}