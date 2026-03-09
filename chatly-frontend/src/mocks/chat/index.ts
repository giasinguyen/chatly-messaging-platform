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
    u4: {
        id: "u4",
        name: "Hoàng Tùng",
        avatar: "https://i.pravatar.cc/150?u=4",
        status: "offline",
    },
    u5: {
        id: "u5",
        name: "Tidesquare",
        avatar: "https://i.pravatar.cc/150?u=5",
        status: "online",
    },
    u6: {
        id: "u6",
        name: "Đức Hưởng",
        avatar: "https://i.pravatar.cc/150?u=6",
        status: "offline",
    },
    u7: {
        id: "u7",
        name: "CELLPHONES",
        avatar: "https://i.pravatar.cc/150?u=7",
        status: "online",
    },
    u8: {
        id: "u8",
        name: "Cynex Community",
        avatar: "https://i.pravatar.cc/150?u=8",
        status: "offline",
    },
    u9: {
        id: "u9",
        name: "Trần Văn A",
        avatar: "https://i.pravatar.cc/150?u=9",
        status: "online",
    },
    u10: {
        id: "u10",
        name: "Nguyễn Thị B",
        avatar: "https://i.pravatar.cc/150?u=10",
        status: "away",
    },
};

export const priorityChats: ChatSnippet[] = [
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
    {
        id: "c4",
        user: mockUsers.u4,
        lastMessage: "Bạn: dạ rồi ạ",
        timestamp: "11 giờ",
        isPriority: true,
    },
    {
        id: "c5",
        user: mockUsers.u5,
        lastMessage: "GIẬT LẤY LIGHTSTICK BLACKPINK",
        timestamp: "11 giờ",
        isPriority: true,
    },
    {
        id: "c6",
        user: mockUsers.u6,
        lastMessage: "Bạn: dạ e bỏ vô trong giúp e là đc e c...",
        timestamp: "Hôm qua",
        isPriority: true,
    },
    {
        id: "c7",
        user: mockUsers.u7,
        lastMessage: "SALE 3.3 - 8.3: Voucher 3.3 Triệu -...",
        timestamp: "3 ngày",
        unreadCount: 3,
        isPriority: true,
    },
    {
        id: "c8",
        user: mockUsers.u8,
        lastMessage: "Gia Bảo: Gpt 1 năm mới thả cửa 1 h...",
        timestamp: "3 ngày",
        isPriority: true,
    },
];

export const otherChats: ChatSnippet[] = [
    {
        id: "c9",
        user: mockUsers.u9,
        lastMessage: "OK nhé",
        timestamp: "4 ngày",
        isPriority: false,
    },
    {
        id: "c10",
        user: mockUsers.u10,
        lastMessage: "Hôm nay ăn gì bạn?",
        timestamp: "1 tuần",
        unreadCount: 1,
        isPriority: false,
    },
];

