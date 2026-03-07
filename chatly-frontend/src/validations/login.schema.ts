import * as z from "zod";

export const loginSchema = z.object({
    email: z.string().min(1, "Email hoặc số điện thoại không được để trống"),
    password: z.string().min(6, "Mật khẩu phải chứa ít nhất 6 ký tự"),
});

// For SMS login where password is not required
export const smsLoginSchema = z.object({
    email: z.string().min(1, "Email hoặc số điện thoại không được để trống"),
    password: z.string().optional(),
});

export type LoginFormValues =
    | z.infer<typeof loginSchema>
    | z.infer<typeof smsLoginSchema>;

