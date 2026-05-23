import { useEffect, useState } from 'react';
import { contactService } from '@/services/contact.service';
import { useAuthStore } from '@/store/auth.store';
import type { MentionCandidate } from '@/utils/mention';

export function useMentionCandidates(enabled: boolean) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [candidates, setCandidates] = useState<MentionCandidate[]>([]);

  useEffect(() => {
    if (!enabled || !currentUserId) {
      return;
    }

    let isActive = true;

    const loadCandidates = async () => {
      try {
        const response = await contactService.getByStatus('ACCEPTED');
        if (!isActive || response.code !== 1000 || !response.result) {
          return;
        }

        const mapped = response.result
          .map((item) => {
            const peer = item.user.id === currentUserId ? item.contact : item.user;
            return {
              id: peer.id,
              displayName: peer.displayName,
              username: peer.username,
              avatarUrl: peer.avatarUrl,
            } satisfies MentionCandidate;
          })
          .filter((item) => item.id !== currentUserId);

        setCandidates(mapped);
      } catch {
        if (isActive) {
          setCandidates([]);
        }
      }
    };

    void loadCandidates();

    return () => {
      isActive = false;
    };
  }, [currentUserId, enabled]);

  return { candidates, currentUserId };
}