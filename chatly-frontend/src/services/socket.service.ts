import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

/**
 * Socket Service
 * Quản lý kết nối STOMP qua SockJS tới Backend.
 */
class SocketService {
    private client: Client | null = null;
    private connectionPromise: Promise<void> | null = null;

    /**
     * Khởi tạo và kết nối
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
     * Ngắt kết nối
     */
    disconnect() {
        if (this.client) {
            this.client.deactivate();
            this.client = null;
            this.connectionPromise = null;
        }
    }

    /**
     * Lấy client hiện tại
     */
    getClient(): Client | null {
        return this.client;
    }

    /**
     * Kiểm tra trạng thái kết nối
     */
    isConnected(): boolean {
        return this.client?.connected ?? false;
    }
}

export const socketService = new SocketService();
