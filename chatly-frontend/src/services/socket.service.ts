import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

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
        // If already connected fire immediately
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
                debug: (str) => {
                    if (import.meta.env.DEV) console.log("STOMP:", str);
                },
                reconnectDelay: 5000,
                heartbeatIncoming: 10000,
                heartbeatOutgoing: 10000,
            });

            client.onConnect = (frame) => {
                console.log("Connected to WebSocket", frame);
                this.connectListeners.forEach((cb) => cb());
                resolve();
            };

            client.onStompError = (frame) => {
                console.error("Broker reported error: " + frame.headers["message"]);
                console.error("Additional details: " + frame.body);
                reject(new Error(frame.headers["message"]));
            };

            client.onWebSocketClose = () => {
                console.log("WebSocket connection closed");
            };

            client.activate();
            this.client = client;
        });

        return this.connectionPromise;
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
}

export const socketService = new SocketService();
