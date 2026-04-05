import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Socket Service for React Native
 * Uses native WebSocket via @stomp/stompjs connecting to /ws-raw
 */
class SocketService {
  private client: Client | null = null;
  private connectionPromise: Promise<void> | null = null;

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
        debug: (str) => {
          if (__DEV__) console.log('STOMP:', str);
        },
        forceBinaryWSFrames: true,
        appendMissingNULLonIncoming: true,
      });

      client.onConnect = () => {
        console.log('WebSocket connected');
        resolve();
      };

      client.onStompError = (frame) => {
        console.error('STOMP error:', frame.headers['message']);
        reject(new Error(frame.headers['message']));
      };

      client.onWebSocketClose = () => {
        console.log('WebSocket closed');
      };

      client.activate();
      this.client = client;
    });

    return this.connectionPromise;
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
  subscribe(
    destination: string,
    callback: (message: IMessage) => void,
  ): StompSubscription | null {
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
}

export const socketService = new SocketService();
