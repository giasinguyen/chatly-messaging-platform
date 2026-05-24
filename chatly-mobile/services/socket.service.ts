import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';
import type { Post } from '@/types/post';
import { refreshAccessToken } from '@/lib/axiosClient';

interface WebSocketCloseEventLike {
  code?: number;
  reason?: string;
  _code?: number;
  _reason?: string;
}

const FORBIDDEN_HANDSHAKE_STATUS = '403';
const UNAUTHORIZED_RECONNECT_DELAY = 0;
const DEFAULT_RECONNECT_DELAY = 5000;
const SOCKET_AUTH_ERROR_MESSAGE = 'WebSocket handshake rejected. Please sign in again.';

export function isSocketAuthError(error: unknown): boolean {
  return error instanceof Error && error.message === SOCKET_AUTH_ERROR_MESSAGE;
}

/**
 * Socket Service for React Native
 * Uses native WebSocket via @stomp/stompjs connecting to /ws-raw
 */
class SocketService {
  private client: Client | null = null;
  private connectionPromise: Promise<void> | null = null;
  private connectListeners: Set<() => void> = new Set();
  private rejectedToken: string | null = null;

  onConnect(callback: () => void): () => void {
    this.connectListeners.add(callback);
    if (this.client?.connected) callback();
    return () => this.connectListeners.delete(callback);
  }

  /**
   * Connect to the STOMP broker
   */
  async connect(token: string): Promise<void> {
    if (this.client?.connected) return;
    if (this.connectionPromise) return this.connectionPromise;

    this.connectionPromise = (async () => {
      const wsUrl = process.env.EXPO_PUBLIC_WS_URL ?? 'ws://10.0.2.2:8080/ws-raw';
      const connectToken = await this.getFreshToken(token).catch(() => token);
      if (this.rejectedToken === connectToken) {
        throw new Error(SOCKET_AUTH_ERROR_MESSAGE);
      }

      await this.openConnection(wsUrl, connectToken, true);
    })().catch((error: unknown) => {
      this.connectionPromise = null;
      throw error;
    });

    return this.connectionPromise;
  }

  private openConnection(
    wsUrl: string,
    token: string,
    shouldRefreshOnForbidden: boolean
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let isResolved = false;
      const client = new Client({
        brokerURL: `${wsUrl}?token=${encodeURIComponent(token)}`,
        reconnectDelay: DEFAULT_RECONNECT_DELAY,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        debug: () => undefined,
        forceBinaryWSFrames: true,
        appendMissingNULLonIncoming: true,
      });

      client.onConnect = () => {
        isResolved = true;
        this.rejectedToken = null;
        this.connectionPromise = null;
        this.connectListeners.forEach((callback) => callback());
        resolve();
      };

      client.onStompError = (frame) => {
        this.connectionPromise = null;
        console.error('[SocketService] STOMP Error:', frame.headers['message']);
        reject(new Error(frame.headers['message']));
      };

      client.onWebSocketClose = (evt) => {
        const closeEvent = evt as WebSocketCloseEventLike;
        console.warn('[SocketService] WebSocket Closed:', sanitizeCloseEvent(closeEvent));

        if (isForbiddenHandshake(closeEvent)) {
          client.reconnectDelay = UNAUTHORIZED_RECONNECT_DELAY;
          void client.deactivate();
          this.client = null;
          this.connectionPromise = null;

          if (isResolved) return;

          if (shouldRefreshOnForbidden) {
            refreshAccessToken()
              .then((newToken) => this.openConnection(wsUrl, newToken, false))
              .then(resolve)
              .catch(reject);
            return;
          }

          this.rejectedToken = token;
          reject(new Error(SOCKET_AUTH_ERROR_MESSAGE));
        }
      };

      client.activate();
      this.client = client;
    });
  }

  private async getFreshToken(token: string): Promise<string> {
    if (!isJwtExpiredOrNearExpiry(token)) return token;
    return refreshAccessToken();
  }

  subscribeToFeed(userId: string, onPost: (post: Post) => void): () => void {
    const destination = `/topic/feed/${userId}`;
    let currentSubscription: StompSubscription | null = null;

    const subscribe = () => {
      if (!this.client?.connected) return;
      currentSubscription?.unsubscribe();
      currentSubscription = this.client.subscribe(destination, (message) => {
        const post = this.parsePost(message);
        if (post) onPost(post);
      });
    };

    const removeConnectListener = this.onConnect(subscribe);
    return () => {
      removeConnectListener();
      currentSubscription?.unsubscribe();
    };
  }

  /**
   * Disconnect from the broker
   */
  disconnect(): void {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
      this.connectionPromise = null;
    }
  }

  /**
   * Get the active STOMP client
   */
  getClient(): Client | null {
    return this.client;
  }

  /**
   * Check connection status
   */
  isConnected(): boolean {
    return this.client?.connected ?? false;
  }

  /**
   * Subscribe to a topic
   */
  subscribe(destination: string, callback: (message: IMessage) => void): StompSubscription | null {
    if (!this.client?.connected) return null;
    return this.client.subscribe(destination, callback);
  }

  subscribeOnConnect(destination: string, callback: (message: IMessage) => void): () => void {
    let subscription: StompSubscription | null = null;

    const subscribe = () => {
      if (!this.client?.connected) return;
      subscription?.unsubscribe();
      subscription = this.client.subscribe(destination, callback);
    };

    const removeConnectListener = this.onConnect(subscribe);

    return () => {
      removeConnectListener();
      subscription?.unsubscribe();
      subscription = null;
    };
  }

  /**
   * Publish a message to a destination
   */
  publish(destination: string, body: object): boolean {
    if (!this.client?.connected) return false;
    this.client.publish({
      destination,
      body: JSON.stringify(body),
    });
    return true;
  }

  private parsePost(message: IMessage): Post | null {
    try {
      return JSON.parse(message.body) as Post;
    } catch {
      return null;
    }
  }
}

export const socketService = new SocketService();

function isJwtExpiredOrNearExpiry(token: string): boolean {
  try {
    const [, payload] = token.split('.');
    if (!payload) return true;
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    if (typeof globalThis.atob !== 'function') return true;
    const decoded = globalThis.atob(normalizedPayload);
    const claims = JSON.parse(decoded) as { exp?: number };
    if (!claims.exp) return true;

    const nowSeconds = Math.floor(Date.now() / 1000);
    return claims.exp - nowSeconds < 60;
  } catch {
    return true;
  }
}

function sanitizeCloseEvent(evt: WebSocketCloseEventLike) {
  return {
    code: evt.code ?? evt._code,
    reason: evt.reason ?? evt._reason,
  };
}

function isForbiddenHandshake(evt: WebSocketCloseEventLike): boolean {
  const reason = evt.reason ?? evt._reason ?? '';
  return reason.includes(FORBIDDEN_HANDSHAKE_STATUS);
}
