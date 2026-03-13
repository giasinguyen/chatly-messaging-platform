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
    isFriend: boolean;
}

export interface Message {
    id: string;
    senderId: string;
    text: string;
    timestamp: string;
    status: "sent" | "delivered" | "read";
    type: "text" | "image" | "file";
    fileUrl?: string;
    replyTo?: string; // id của message được reply
}

export const mockMessagesPage2: Record<string, Message[]> = {
    c1: [
        {
            id: "m_old1",
            senderId: "u1",
            text: "Ê bạn ơi, hôm qua mình gửi file chưa?",
            timestamp: "Hôm qua 09:00",
            status: "read",
            type: "text",
        },
        {
            id: "m_old2",
            senderId: "me",
            text: "Rồi, mình gửi qua email rồi nhé",
            timestamp: "Hôm qua 09:05",
            status: "read",
            type: "text",
        },
        {
            id: "m_old3",
            senderId: "u1",
            text: "Ok cảm ơn bạn nhiều!",
            timestamp: "Hôm qua 09:06",
            status: "read",
            type: "text",
        },
        {
            id: "m_old4",
            senderId: "me",
            text: "Không có gì, cần gì cứ nhắn mình nhé",
            timestamp: "Hôm qua 09:08",
            status: "read",
            type: "text",
        },
        {
            id: "m_old5",
            senderId: "u1",
            text: "Bạn có rảnh hôm nay không? Mình muốn hỏi thêm vài thứ",
            timestamp: "Hôm qua 09:10",
            status: "read",
            type: "text",
        },
    ],
};

export const mockMessages: Record<string, Message[]> = {
    c1: [
        {
            id: "m1",
            senderId: "u1",
            text: "Xin chào!",
            timestamp: "10:30",
            status: "read",
            type: "text",
        },
        {
            id: "m2",
            senderId: "me",
            text: "Chào bạn, mình có thể giúp gì?",
            timestamp: "10:31",
            status: "read",
            type: "text",
        },
        {
            id: "m3",
            senderId: "u1",
            text: "Anh: chờ mời 2 người thì chả thấy cả...",
            timestamp: "10:32",
            status: "read",
            type: "text",
        },
    ],
    c2: [
        {
            id: "m1",
            senderId: "u2",
            text: "Bạn ơi check giúp mình bài tập này với",
            timestamp: "09:00",
            status: "read",
            type: "text",
        },
        {
            id: "m2",
            senderId: "me",
            text: "Ok gửi qua đây nhé",
            timestamp: "09:05",
            status: "delivered",
            type: "text",
        },
        {
            id: "m3",
            senderId: "u2",
            text: "Cảm ơn bạn nha! Mình đang xem",
            timestamp: "09:06",
            status: "read",
            type: "text",
        },
        {
            id: "m4",
            senderId: "me",
            text: "Không có gì, hỏi thêm mình nhé",
            timestamp: "09:10",
            status: "read",
            type: "text",
            replyTo: "m3", // reply vào "Cảm ơn bạn nha!"
        },
        {
            id: "m5",
            senderId: "u2",
            text: "Gia Sĩ IUH: [Sticker]",
            timestamp: "09:12",
            status: "read",
            type: "text",
        },
    ],
    c3: [
        {
            id: "m1",
            senderId: "u3",
            text: "Remote Tech Jobs: Frontend Developer (React)",
            timestamp: "08:00",
            status: "read",
            type: "text",
        },
        {
            id: "m2",
            senderId: "u3",
            text: "Diễm Quỳnh: REMOTE TECH JOBS – 0...",
            timestamp: "08:01",
            status: "read",
            type: "text",
        },
    ],
};

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
        isFriend: false,
    },
    {
        id: "c2",
        user: mockUsers.u2,
        lastMessage: "Gia Sĩ IUH: [Sticker]",
        timestamp: "1 giờ",
        isPriority: true,
        isFriend: true,
    },
    {
        id: "c3",
        user: mockUsers.u3,
        lastMessage: "Diễm Quỳnh: REMOTE TECH JOBS – 0...",
        timestamp: "3 giờ",
        isPriority: true,
        isFriend: true,
    },
];
