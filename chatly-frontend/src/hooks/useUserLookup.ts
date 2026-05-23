import { useEffect, useReducer } from "react";
import { adminService } from "@/services/admin.service";
import type { UserResponse } from "@/types/auth";

// Module-level cache — lives for the entire browser session, shared across all components.
const userCache = new Map<string, UserResponse>();
const pendingIds = new Set<string>();

/**
 * Resolves a list of user IDs → UserResponse using the admin API.
 * Results are cached globally so each ID is only fetched once per session.
 * Returns the current snapshot of the cache (re-renders whenever new users arrive).
 */
export function useUserLookup(userIds: string[]): Map<string, UserResponse> {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    const toFetch = userIds.filter((id) => id && !userCache.has(id) && !pendingIds.has(id));
    if (toFetch.length === 0) return;

    for (const id of toFetch) {
      pendingIds.add(id);
      adminService
        .getUser(id)
        .then((response) => {
          pendingIds.delete(id);
          if (response.code === 1000 && response.result) {
            userCache.set(id, response.result);
            forceUpdate();
          }
        })
        .catch(() => {
          pendingIds.delete(id);
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userIds.join(",")]);

  return userCache;
}
