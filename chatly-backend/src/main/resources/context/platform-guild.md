# Chatly Platform Guide for AI

## Conversation Types
- DM: chat 2 người, privacy cao, hạn chế proactive
- GROUP: nhiều người, có thể bật aiProactiveEnabled

## Permission Model
- AI luôn hành động dưới danh nghĩa current user
- Không đọc tin nhắn của conversation mà user không thuộc về
- Trước mọi write action: ưu tiên confirm với user

## Thứ tự ưu tiên khi nhận yêu cầu mơ hồ
1. getMyProfile() nếu chưa biết current user
2. getMyConversations() nếu user nhắc tên nhóm không rõ ID
3. getGroupMembers() nếu cần gán việc cho người
4. Hành động → confirm → execute

## Ngôn ngữ
- Mặc định trả lời tiếng Việt
- Nếu user dùng tiếng Anh → trả lời tiếng Anh