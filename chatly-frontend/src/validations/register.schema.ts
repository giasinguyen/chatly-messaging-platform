import * as z from "zod";

export const registerSchema = z.object({
    email: z
        .string()
        .email("Email không hợp lệ")
        .min(1, "Email không được để trống"),
    displayName: z.string().min(1, "Tên hiển thị không được để trống"),
    username: z.string().min(3, "Username phải chứa ít nhất 3 ký tự"),
    password: z.string().min(6, "Mật khẩu phải chứa ít nhất 6 ký tự"),
    month: z.string().min(1, "Vui lòng chọn tháng"),
    day: z.string().min(1, "Vui lòng chọn ngày"),
    year: z.string().min(4, "Vui lòng chọn năm"),
    promo: z.boolean().optional(),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;

