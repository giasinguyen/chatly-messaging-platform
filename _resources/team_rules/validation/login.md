# Quy tắc Validation - Trang Đăng nhập (Login)

Tài liệu này quy định các quy tắc kiểm tra dữ liệu đầu vào cho form đăng nhập của hệ thống Chatly.

## 1. Các trường dữ liệu (Fields)

| Trường             | Yêu cầu             | Thông báo lỗi                                  |
| :----------------- | :------------------ | :--------------------------------------------- |
| **Email hoặc SĐT** | Không được để trống | "Email hoặc số điện thoại không được để trống" |
| **Mật khẩu**       | Tối thiểu 6 ký tự   | "Mật khẩu phải chứa ít nhất 6 ký tự"           |

## 2. Công nghệ sử dụng

- **Thư viện:** `Zod`
- **File định nghĩa:** `src/validations/login.schema.ts`

