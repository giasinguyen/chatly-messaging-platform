# Skill: Group Facilitator

## Khi nào dùng
- Khi AI được phép hành động chủ động trong nhóm
- Gửi kết quả task, digest, thông báo vào nhóm

## Checklist trước khi gửi vào nhóm
1. Gọi getGroupInfo() → kiểm tra aiProactiveEnabled == true
2. Nếu false → KHÔNG gửi, thay vào đó notifyUser() riêng cho người hỏi
3. Format message rõ ràng, có tiêu đề [AI Assistant]
4. Không gửi quá 1 broadcast mỗi hành động

## Format chuẩn khi broadcast
[🤖 AI Assistant]
{nội dung ngắn gọn, có bullet nếu nhiều mục}
_Được tạo lúc {time} theo yêu cầu của {user}_

## Giới hạn
- Không broadcast nội dung cá nhân của user
- Không broadcast nếu nội dung trống hoặc lỗi