import * as z from "zod";
import {
    DISPLAY_NAME_ALLOWED_REGEX,
    DISPLAY_NAME_INVALID_MESSAGE,
    USERNAME_ALLOWED_REGEX,
    USERNAME_INVALID_MESSAGE,
} from "@/constants/username";

export const registerSchema = z.object({
    identifier: z
        .string()
        .min(1, "Email or phone number cannot be empty")
        .refine(
            (val) => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
                return emailRegex.test(val) || phoneRegex.test(val);
            },
            {
                message: "Invalid email or phone number",
            },
        ),
    displayName: z
        .string()
        .min(1, "Display name cannot be empty")
        .max(50, "Display name must be at most 50 characters")
        .regex(DISPLAY_NAME_ALLOWED_REGEX, DISPLAY_NAME_INVALID_MESSAGE),
    username: z
        .string()
        .min(3, "Username must be at least 3 characters")
        .regex(USERNAME_ALLOWED_REGEX, USERNAME_INVALID_MESSAGE),
    password: z.string().min(6, "Password must be at least 6 characters"),
    month: z.string().min(1, "Please select month"),
    day: z.string().min(1, "Please select day"),
    year: z.string().min(4, "Please select year"),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
