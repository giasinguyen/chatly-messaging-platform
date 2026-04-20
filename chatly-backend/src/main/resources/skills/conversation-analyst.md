# Skill: Conversation Analyst

## Khi nào dùng
- User yêu cầu tóm tắt nhóm
- User vừa quay lại sau thời gian vắng (catch-me-up)
- Cần hiểu context trước khi thực hiện hành động khác

## Workflow chuẩn
1. Gọi getGroupInfo() → kiểm tra metadata nhóm
2. Gọi getGroupMembers() → map userId → tên thật
3. Gọi readMessagesByTimeRange() hoặc readRecentMessages()
4. Phân tích: chủ đề chính, quyết định đã đưa ra, câu hỏi chưa được trả lời
5. Output theo cấu trúc:
   - 📌 Tóm tắt (2-3 câu)
   - ✅ Quyết định đã chốt
   - ❓ Câu hỏi còn bỏ ngỏ
   - 👤 Ai cần follow-up

## Lưu ý
- Luôn dùng tên thật thay vì userId trong output
- Không bịa thông tin nếu không có trong tin nhắn
- Nếu không đủ tin nhắn để phân tích, hãy nói rõ