# Quy tắc Validation - Trang Đăng ký (Register)

Tài liệu này quy định các quy tắc kiểm tra dữ liệu đầu vào cho form đăng ký tài khoản Chatly.

## 1. Các trường dữ liệu (Fields)

| Trường                  | Yêu cầu                                | Thông báo lỗi                                      |
| :---------------------- | :------------------------------------- | :------------------------------------------------- |
| **Email**               | Định dạng email hợp lệ, không để trống | "Email không hợp lệ" / "Email không được để trống" |
| **Họ tên hiển thị**     | Tùy chọn (Optional)                    | N/A                                                |
| **Tên đăng nhập**       | Tối thiểu 3 ký tự                      | "Username phải chứa ít nhất 3 ký tự"               |
| **Mật khẩu**            | Tối thiểu 6 ký tự                      | "Mật khẩu phải chứa ít nhất 6 ký tự"               |
| **Ngày/Tháng/Năm sinh** | Phải chọn đầy đủ                       | "Vui lòng chọn..."                                 |

## 2. Công nghệ sử dụng

- **Thư viện:** `Zod`
- **File định nghĩa:** `src/validations/register.schema.ts`

