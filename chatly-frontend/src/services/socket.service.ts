import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type { Post } from "@/types/post";

/**
 * Socket Service
 * Manages STOMP connections via SockJS to the Backend.
 */
class SocketService {
    private client: Client | null = null;
    private connectionPromise: Promise<void> | null = null;
    private connectListeners: Set<() => void> = new Set();

    /** Register a callback to be called every time the STOMP client connects/reconnects */
    onConnect(cb: () => void): () => void {
        this.connectListeners.add(cb);
        if (this.client?.connected) cb();
        return () => this.connectListeners.delete(cb);
    }

    /**
     * Initialize and connect
     */
    async connect(token: string): Promise<void> {
        if (this.client?.connected) return;
        if (this.connectionPromise) return this.connectionPromise;

        this.connectionPromise = new Promise((resolve, reject) => {
            const socketUrl = `${import.meta.env.VITE_BACKEND_BASE_URL}/ws?token=${token}`;

            const client = new Client({
                webSocketFactory: () => new SockJS(socketUrl),
                debug: () => undefined,
                reconnectDelay: 5000,
                heartbeatIncoming: 10000,
                heartbeatOutgoing: 10000,
            });

            client.onConnect = () => {
                this.connectListeners.forEach((cb) => cb());
                resolve();
            };

            client.onStompError = (frame) => {
                console.error('[SocketService] STOMP Error:', frame.headers['message']);
                reject(new Error(frame.headers["message"]));
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
            currentSubscription = this.client.subscribe(
                destination,
                (message) => {
                    const post = this.parsePost(message);
                    if (post) onPost(post);
                },
            );
        };

        const removeConnectListener = this.onConnect(subscribe);
        return () => {
            removeConnectListener();
            currentSubscription?.unsubscribe();
        };
    }

    /**
     * Disconnect
     */
    disconnect() {
        if (this.client) {
            this.client.deactivate();
            this.client = null;
            this.connectionPromise = null;
        }
    }

    /**
     * Get current client
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

    private parsePost(message: IMessage): Post | null {
        try {
            return JSON.parse(message.body) as Post;
        } catch {
            return null;
        }
    }
}

export const socketService = new SocketService();
