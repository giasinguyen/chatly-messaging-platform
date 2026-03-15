import * as z from "zod";

export const registerSchema = z.object({
    identifier: z
        .string()
        .min(1, "Email hoặc số điện thoại không được để trống")
        .refine(
            (val) => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
                return emailRegex.test(val) || phoneRegex.test(val);
            },
            {
                message: "Email hoặc số điện thoại không hợp lệ",
            },
        ),
    displayName: z.string().min(1, "Tên hiển thị không được để trống"),
    username: z.string().min(3, "Username phải chứa ít nhất 3 ký tự"),
    password: z.string().min(6, "Mật khẩu phải chứa ít nhất 6 ký tự"),
    month: z.string().min(1, "Vui lòng chọn tháng"),
    day: z.string().min(1, "Vui lòng chọn ngày"),
    year: z.string().min(4, "Vui lòng chọn năm"),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
