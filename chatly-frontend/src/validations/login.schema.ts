import * as z from "zod";

const identifierValidation = z
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
    );

export const loginSchema = z.object({
    identifier: identifierValidation,
    password: z.string().min(6, "Mật khẩu phải chứa ít nhất 6 ký tự"),
});

// For SMS login where password is not required
export const smsLoginSchema = z.object({
    identifier: identifierValidation,
    password: z.string().optional(),
});

export type LoginFormValues =
    | z.infer<typeof loginSchema>
    | z.infer<typeof smsLoginSchema>;
