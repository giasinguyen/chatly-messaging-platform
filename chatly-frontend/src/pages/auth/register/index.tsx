import { Link } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import chatlyLogo from "@/assets/brand/chatly-logo-transparent.png";
import { useThemeStore } from "@/store/theme.store";
import {
    registerSchema,
    type RegisterFormValues,
} from "@/validations/register.schema";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import "../login/login.css";

export default function RegisterPage() {
    const toggleTheme = useThemeStore((s) => s.toggleTheme);

    const form = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            identifier: "",
            displayName: "",
            username: "",
            password: "",
            month: "",
            day: "",
            year: "",
            promo: false,
        },
    });

    const onSubmit = (data: RegisterFormValues) => {
        const { identifier, month, day, year, ...rest } = data;
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

        // Construct Date of Birth as ISO Instant string
        const dobDate = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
        );
        const dob = dobDate.toISOString();

        const payload = {
            ...rest,
            email: isEmail ? identifier : null,
            phone: !isEmail ? identifier : null,
            dob,
        };

        toast("Registration initiated", {
            description: `Username: ${payload.username}`,
        });
        console.log("Register payload:", payload);
    };

    return (
        <div className="login-page relative flex min-h-screen flex-col items-center justify-center overflow-y-auto py-12 font-[Inter,-apple-system,BlinkMacSystemFont,sans-serif]">
            {/* Background decorations */}
            <div className="login-blob absolute -top-[10%] -left-[5%] h-[400px] w-[400px] rounded-full bg-brand-light opacity-35 blur-[80px]" />
            <div className="login-blob absolute -right-[3%] -bottom-[8%] h-[300px] w-[300px] rounded-full bg-brand opacity-35 blur-[80px] [animation-delay:3s]" />
            <div className="login-blob absolute top-[20%] right-[10%] h-[200px] w-[200px] rounded-full bg-brand-light opacity-35 blur-[80px] [animation-delay:6s]" />
            <div className="login-blob absolute bottom-[15%] left-[8%] h-[250px] w-[250px] rounded-full bg-brand-dark opacity-35 blur-[80px] [animation-delay:9s]" />

            {/* Stars */}
            <div className="pointer-events-none absolute inset-0">
                {Array.from({ length: 20 }).map((_, i) => (
                    <div
                        key={i}
                        className="login-star absolute rounded-full bg-white/70 dark:bg-white/70"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 4}s`,
                            width: `${2 + Math.random() * 3}px`,
                            height: `${2 + Math.random() * 3}px`,
                        }}
                    />
                ))}
            </div>

            {/* Logo top-left */}
            <div className="absolute top-7 left-8 z-10 flex items-center gap-2.5">
                <img
                    src={chatlyLogo}
                    alt="Chatly"
                    className="h-16 w-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
                />
            </div>

            {/* Theme toggle top-right */}
            <button
                onClick={toggleTheme}
                className="absolute top-7 right-8 z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-white/20 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                aria-label="Toggle theme"
            >
                <Sun size={18} className="block dark:hidden" />
                <Moon size={18} className="hidden dark:block" />
            </button>

            {/* Center card */}
            <div className="login-card-enter relative z-5 flex w-[90%] max-w-[480px] flex-col overflow-hidden rounded-[20px] border border-black/10 bg-white/90 p-8 shadow-[0_4px_20px_rgba(0,0,0,0.08)] backdrop-blur-[20px] dark:border-white/8 dark:bg-[rgba(30,33,40,0.92)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                <h1 className="mb-6 text-center text-[22px] font-bold tracking-tight text-gray-900 dark:text-white">
                    Create an account
                </h1>

                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="flex flex-col gap-4"
                >
                    <FieldGroup>
                        {/* Email */}
                        <Controller
                            name="identifier"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#b0b3bc]">
                                        Email or Phone{" "}
                                        <span className="text-red-400">*</span>
                                    </FieldLabel>
                                    <Input
                                        id="register-identifier"
                                        name={field.name}
                                        value={
                                            typeof field.value === "string"
                                                ? field.value
                                                : ""
                                        }
                                        onChange={field.onChange}
                                        onBlur={field.onBlur}
                                        ref={field.ref}
                                        type="text"
                                        placeholder="Enter your email or phone"
                                        aria-invalid={fieldState.invalid}
                                        className="h-auto w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[15px] text-gray-900 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,113_227,0.15)] dark:border-white/8 dark:bg-[#1a1c23] dark:text-white dark:focus:shadow-[0_0_0_3px_rgba(0,113_227,0.2)] focus-visible:ring-0 focus-visible:ring-offset-0"
                                    />
                                    {fieldState.invalid && (
                                        <FieldError
                                            errors={[fieldState.error]}
                                        />
                                    )}
                                </Field>
                            )}
                        />

                        {/* Display Name */}
                        <Controller
                            name="displayName"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#b0b3bc]">
                                        Display Name{" "}
                                        <span className="text-red-400">*</span>
                                    </FieldLabel>
                                    <Input
                                        {...field}
                                        type="text"
                                        aria-invalid={fieldState.invalid}
                                        className="h-auto w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[15px] text-gray-900 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,113,227,0.15)] dark:border-white/8 dark:bg-[#1a1c23] dark:text-white dark:focus:shadow-[0_0_0_3px_rgba(0,113,227,0.2)] focus-visible:ring-0 focus-visible:ring-offset-0"
                                    />
                                    {fieldState.invalid && (
                                        <FieldError
                                            errors={[fieldState.error]}
                                        />
                                    )}
                                </Field>
                            )}
                        />

                        {/* Username */}
                        <Controller
                            name="username"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#b0b3bc]">
                                        Username{" "}
                                        <span className="text-red-400">*</span>
                                    </FieldLabel>
                                    <Input
                                        {...field}
                                        type="text"
                                        aria-invalid={fieldState.invalid}
                                        className="h-auto w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[15px] text-gray-900 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,113,227,0.15)] dark:border-white/8 dark:bg-[#1a1c23] dark:text-white dark:focus:shadow-[0_0_0_3px_rgba(0,113,227,0.2)] focus-visible:ring-0 focus-visible:ring-offset-0"
                                    />
                                    {fieldState.invalid && (
                                        <FieldError
                                            errors={[fieldState.error]}
                                        />
                                    )}
                                </Field>
                            )}
                        />

                        {/* Password */}
                        <Controller
                            name="password"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#b0b3bc]">
                                        Password{" "}
                                        <span className="text-red-400">*</span>
                                    </FieldLabel>
                                    <Input
                                        {...field}
                                        type="password"
                                        aria-invalid={fieldState.invalid}
                                        className="h-auto w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[15px] text-gray-900 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,113,227,0.15)] dark:border-white/8 dark:bg-[#1a1c23] dark:text-white dark:focus:shadow-[0_0_0_3px_rgba(0,113,227,0.2)] focus-visible:ring-0 focus-visible:ring-offset-0"
                                    />
                                    {fieldState.invalid && (
                                        <FieldError
                                            errors={[fieldState.error]}
                                        />
                                    )}
                                </Field>
                            )}
                        />

                        {/* Date of Birth Group */}
                        <div className="flex flex-col gap-1.5">
                            <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#b0b3bc]">
                                Date of Birth{" "}
                                <span className="text-red-400">*</span>
                            </FieldLabel>
                            <div className="flex gap-3">
                                {/* Month */}
                                <Controller
                                    name="month"
                                    control={form.control}
                                    render={({ field }) => (
                                        <div className="relative flex-1 cursor-pointer">
                                            <select
                                                {...field}
                                                className="w-full cursor-pointer appearance-none rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[14px] text-gray-900 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,113,227,0.15)] dark:border-white/8 dark:bg-[#1a1c23] dark:text-white dark:focus:shadow-[0_0_0_3px_rgba(0,113,227,0.2)]"
                                            >
                                                <option
                                                    value=""
                                                    disabled
                                                    hidden
                                                >
                                                    Month
                                                </option>
                                                {Array.from({ length: 12 }).map(
                                                    (_, i) => (
                                                        <option
                                                            key={i}
                                                            value={i + 1}
                                                        >
                                                            {new Date(
                                                                0,
                                                                i,
                                                            ).toLocaleString(
                                                                "en",
                                                                {
                                                                    month: "long",
                                                                },
                                                            )}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
                                                <svg
                                                    width="12"
                                                    height="12"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <path d="m6 9 6 6 6-6" />
                                                </svg>
                                            </div>
                                        </div>
                                    )}
                                />
                                {/* Day */}
                                <Controller
                                    name="day"
                                    control={form.control}
                                    render={({ field }) => (
                                        <div className="relative flex-1 cursor-pointer">
                                            <select
                                                {...field}
                                                className="w-full cursor-pointer appearance-none rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[14px] text-gray-900 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,113,227,0.15)] dark:border-white/8 dark:bg-[#1a1c23] dark:text-white dark:focus:shadow-[0_0_0_3px_rgba(0,113,227,0.2)]"
                                            >
                                                <option
                                                    value=""
                                                    disabled
                                                    hidden
                                                >
                                                    Day
                                                </option>
                                                {Array.from({ length: 31 }).map(
                                                    (_, i) => (
                                                        <option
                                                            key={i}
                                                            value={i + 1}
                                                        >
                                                            {i + 1}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
                                                <svg
                                                    width="12"
                                                    height="12"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <path d="m6 9 6 6 6-6" />
                                                </svg>
                                            </div>
                                        </div>
                                    )}
                                />
                                {/* Year */}
                                <Controller
                                    name="year"
                                    control={form.control}
                                    render={({ field }) => (
                                        <div className="relative flex-1 cursor-pointer">
                                            <select
                                                {...field}
                                                className="w-full cursor-pointer appearance-none rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[14px] text-gray-900 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,113,227,0.15)] dark:border-white/8 dark:bg-[#1a1c23] dark:text-white dark:focus:shadow-[0_0_0_3px_rgba(0,113,227,0.2)]"
                                            >
                                                <option
                                                    value=""
                                                    disabled
                                                    hidden
                                                >
                                                    Year
                                                </option>
                                                {Array.from({
                                                    length: 100,
                                                }).map((_, i) => {
                                                    const y =
                                                        new Date().getFullYear() -
                                                        i;
                                                    return (
                                                        <option
                                                            key={y}
                                                            value={y}
                                                        >
                                                            {y}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
                                                <svg
                                                    width="12"
                                                    height="12"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <path d="m6 9 6 6 6-6" />
                                                </svg>
                                            </div>
                                        </div>
                                    )}
                                />
                            </div>
                            {/* Global DOB error */}
                            {form.formState.errors.month ||
                            form.formState.errors.day ||
                            form.formState.errors.year ? (
                                <FieldError
                                    errors={[
                                        {
                                            message:
                                                "Please specify complete Date of Birth",
                                        },
                                    ]}
                                />
                            ) : null}
                        </div>

                        {/* Promo Checkbox */}
                        <Controller
                            name="promo"
                            control={form.control}
                            render={({ field }) => (
                                <label className="mt-1 flex cursor-pointer items-start gap-3">
                                    <div className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                                        <input
                                            type="checkbox"
                                            className="peer h-5 w-5 cursor-pointer appearance-none rounded-[6px] border border-gray-300 bg-white transition-all checked:border-brand checked:bg-brand dark:border-white/20 dark:bg-black/20 dark:checked:border-brand dark:checked:bg-brand"
                                            checked={field.value}
                                            onChange={(e) =>
                                                field.onChange(e.target.checked)
                                            }
                                        />
                                        <svg
                                            className="pointer-events-none absolute hidden h-3.5 w-3.5 text-white peer-checked:block"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </div>
                                    <span className="text-[12px] leading-snug text-gray-500 dark:text-[#a0a3ab]">
                                        (Optional) It's okay to send me emails
                                        with Chatly updates, tips, and special
                                        offers. You can opt out at any time.
                                    </span>
                                </label>
                            )}
                        />
                    </FieldGroup>

                    {/* Terms and Submit */}
                    <div className="mt-1 flex flex-col gap-4">
                        <p className="text-[12px] leading-snug text-gray-500 dark:text-[#a0a3ab]">
                            By clicking "Create Account," you agree to Chatly's{" "}
                            <Link
                                to="/terms"
                                className="font-medium text-brand hover:underline"
                            >
                                Terms of Service
                            </Link>{" "}
                            and have read the{" "}
                            <Link
                                to="/privacy"
                                className="font-medium text-brand hover:underline"
                            >
                                Privacy Policy
                            </Link>
                        </p>

                        <button
                            type="submit"
                            className="w-full cursor-pointer rounded-full border-none bg-brand py-3.5 text-[15px] font-bold text-white transition-all duration-300 hover:scale-[1.02] hover:bg-brand-hover active:scale-[0.99]"
                        >
                            Create Account
                        </button>

                        <Link
                            to="/auth/login"
                            className="text-left text-[13px] font-medium text-brand no-underline transition-colors duration-200 hover:text-brand-light hover:underline dark:text-brand-light dark:hover:text-brand-light"
                        >
                            Already have an account? Log in
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
