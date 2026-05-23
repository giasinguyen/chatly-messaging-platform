import * as z from "zod";

const identifierValidation = z
    .string()
    .min(1, "Please enter email, phone number or username")
    .refine(
        (val) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
            const usernameRegex = /^[a-zA-Z0-9_.-]{3,}$/;
            return (
                emailRegex.test(val) ||
                phoneRegex.test(val) ||
                usernameRegex.test(val)
            );
        },
        {
            message: "Invalid email, phone number or username",
        },
    );

const phoneOnlyValidation = z
    .string()
    .min(1, "Please enter phone number")
    .refine(
        (val) => {
            const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
            return phoneRegex.test(val);
        },
        {
            message: "Invalid phone number",
        },
    );

export const loginSchema = z.object({
    identifier: identifierValidation,
    password: z.string().min(6, "Password must be at least 6 characters"),
});

// For SMS login where password is not required
export const smsLoginSchema = z.object({
    identifier: phoneOnlyValidation,
    password: z.string().optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema> & {
    identifier: string;
    password?: string;
};
