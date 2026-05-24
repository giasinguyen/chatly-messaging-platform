import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';
import type { Post } from '@/types/post';

/**
 * Socket Service for React Native
 * Uses native WebSocket via @stomp/stompjs connecting to /ws-raw
 */
class SocketService {
  private client: Client | null = null;
  private connectionPromise: Promise<void> | null = null;
  private connectListeners: Set<() => void> = new Set();

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

    const wsUrl = process.env.EXPO_PUBLIC_WS_URL ?? 'ws://10.0.2.2:8080/ws-raw';

    this.connectionPromise = new Promise<void>((resolve, reject) => {
      const client = new Client({
        brokerURL: `${wsUrl}?token=${token}`,
        reconnectDelay: 5000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        debug: () => undefined,
        forceBinaryWSFrames: true,
        appendMissingNULLonIncoming: true,
      });

      client.onConnect = () => {
        this.connectListeners.forEach((callback) => callback());
        resolve();
      };

      client.onStompError = (frame) => {
        console.error('[SocketService] STOMP Error:', frame.headers['message']);
        reject(new Error(frame.headers['message']));
      };

      client.onWebSocketClose = (evt) => {
        console.warn('[SocketService] WebSocket Closed:', evt);
      };

      client.activate();
      this.client = client;
    });

    return this.connectionPromise;
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
