export interface User {
    id: string;
    name: string;
    avatar: string;
    status: "online" | "offline" | "away";
}

export interface ChatSnippet {
    id: string;
    user: User;
    lastMessage: string;
    timestamp: string;
    unreadCount?: number;
    isPriority: boolean;
}

const mockUsers: Record<string, User> = {
    u1: {
        id: "u1",
        name: "Bảo Sự Kiện Binance",
        avatar: "https://i.pravatar.cc/150?u=1",
        status: "away",
    },
    u2: {
        id: "u2",
        name: "Ai Thông Minh Hơn Học Sinh 5",
        avatar: "https://i.pravatar.cc/150?u=2",
        status: "online",
    },
    u3: {
        id: "u3",
        name: "Backend Dev Community",
        avatar: "https://i.pravatar.cc/150?u=3",
        status: "online",
    },
};

export const chatList: ChatSnippet[] = [
    {
        id: "c1",
        user: mockUsers.u1,
        lastMessage: "Anh: chờ mời 2 người thì chả thấy cả...",
        timestamp: "12 phút",
        isPriority: true,
    },
    {
        id: "c2",
        user: mockUsers.u2,
        lastMessage: "Gia Sĩ IUH: [Sticker]",
        timestamp: "1 giờ",
        isPriority: true,
    },
    {
        id: "c3",
        user: mockUsers.u3,
        lastMessage: "Diễm Quỳnh: REMOTE TECH JOBS – 0...",
        timestamp: "3 giờ",
        isPriority: true,
    },
];

