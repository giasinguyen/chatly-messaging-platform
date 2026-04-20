# Skill: Reminder Detector

## Khi nào dùng
- Sau khi đọc tin nhắn có chứa thời gian, lịch hẹn
- User hỏi "có deadline gì không", "lịch hẹn tuần này thế nào"
- Pattern: giờ cụ thể, ngày trong tuần, "deadline", "họp", "meet"

## Workflow chuẩn
1. Gọi detectRemindersFromMessages() để lấy gợi ý
2. Map với listGroupReminders() để tránh duplicate
3. Trình bày gợi ý:
   "Mình phát hiện các mốc thời gian sau, bạn muốn tạo reminder không?"
4. Chờ confirm → gọi createGroupReminder()

## Xử lý thời gian
- Luôn convert sang ISO-8601 trước khi gọi API
- Nếu chỉ có "thứ 6" không có giờ → hỏi user giờ cụ thể
- Timezone mặc định: Asia/Ho_Chi_Minh (UTC+7)