import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import qrCode from "@/mocks/images/QR-fake.png";
import { ForgotPasswordDialog } from "./components/ForgotPasswordDialog";
import {
    loginSchema,
    smsLoginSchema,
    type LoginFormValues,
} from "@/validations/login.schema";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    InputGroupButton,
} from "@/components/ui/input-group";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import "./login.css";

export default function LoginPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [loginMethod, setLoginMethod] = useState<"password" | "sms">(
        "password",
    );

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(
            loginMethod === "password" ? loginSchema : smsLoginSchema,
        ) as any,
        defaultValues: {
            identifier: "",
            password: "",
        },
    });

    const setAuth = useAuthStore((s) => s.setAuth);
    const setGlobalLoading = useAuthStore((s) => s.setLoading);
    const isGlobalLoading = useAuthStore((s) => s.loading);
    const navigate = useNavigate();

    const onSubmit = async (data: LoginFormValues) => {
        if (loginMethod === "sms") {
            return toast.info("Development in progress...");
        }

        const payload = {
            identifier: data.identifier,
            password: data.password || "",
        };

        try {
            setGlobalLoading(true);
            const response = await authService.login(payload);

            if (response.code === 1000) {
                setAuth(response.result);
                toast.success("Đăng nhập thành công!");
                navigate("/");
            } else {
                toast.error(response.message || "Đăng nhập thất bại");
            }
        } catch (error: any) {
            console.error("Login error:", error);
            const msg = error.response?.data?.message || "Đã có lỗi xảy ra";
            toast.error(msg);
        } finally {
            setGlobalLoading(false);
        }
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

            {/* Center card */}
            <div className="login-card-enter mt-10 relative z-5 flex w-[90%] max-w-[780px] overflow-hidden rounded-[20px] border border-black/10 bg-white/90 shadow-[0_4px_20px_rgba(0,0,0,0.08)] backdrop-blur-[20px] dark:border-white/8 dark:bg-[rgba(30,33,40,0.92)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                {/* Left — form */}
                <div className="flex-1 p-9 pb-8">
                    <h1 className="mb-1.5 text-center text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Welcome back!
                    </h1>
                    <p className="mb-6 text-center text-sm text-gray-500 dark:text-[#a0a3ab]">
                        We're so excited to see you again!
                    </p>

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
                                        <FieldLabel
                                            htmlFor="login-identifier"
                                            className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#b0b3bc]"
                                        >
                                            {loginMethod === "password"
                                                ? "Email, Phone or Username"
                                                : "Phone Number"}{" "}
                                            <span className="text-red-400">
                                                *
                                            </span>
                                        </FieldLabel>
                                        <InputGroup className="rounded-xl border-gray-200 bg-gray-50 dark:border-white/8 dark:bg-[#1a1c23] transition-all has-[[data-slot=input-group-control]:focus]:border-brand has-[[data-slot=input-group-control]:focus]:ring-brand/30">
                                            <InputGroupAddon align="inline-start">
                                                <Mail
                                                    size={16}
                                                    className="text-gray-400 dark:text-[#6c6f78]"
                                                />
                                            </InputGroupAddon>
                                            <InputGroupInput
                                                id="login-identifier"
                                                name={field.name}
                                                value={
                                                    typeof field.value ===
                                                    "string"
                                                        ? field.value
                                                        : ""
                                                }
                                                onChange={field.onChange}
                                                onBlur={field.onBlur}
                                                ref={field.ref}
                                                type="text"
                                                placeholder={
                                                    loginMethod === "password"
                                                        ? "Enter email, phone or username"
                                                        : "Enter your phone number"
                                                }
                                                autoComplete="username"
                                                aria-invalid={
                                                    fieldState.invalid
                                                }
                                                className="py-2.5 text-[15px] text-gray-900! dark:text-white!"
                                            />
                                        </InputGroup>
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />

                            {/* Password */}
                            {loginMethod === "password" && (
                                <Controller
                                    name="password"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field
                                            data-invalid={fieldState.invalid}
                                        >
                                            <FieldLabel
                                                htmlFor="login-password"
                                                className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#b0b3bc]"
                                            >
                                                Password{" "}
                                                <span className="text-red-400">
                                                    *
                                                </span>
                                            </FieldLabel>
                                            <InputGroup className="rounded-xl border-gray-200 bg-gray-50 dark:border-white/8 dark:bg-[#1a1c23] transition-all has-[[data-slot=input-group-control]:focus]:border-brand has-[[data-slot=input-group-control]:focus]:ring-brand/30">
                                                <InputGroupAddon align="inline-start">
                                                    <Lock
                                                        size={16}
                                                        className="text-gray-400 dark:text-[#6c6f78]"
                                                    />
                                                </InputGroupAddon>
                                                <InputGroupInput
                                                    {...field}
                                                    id="login-password"
                                                    type={
                                                        showPassword
                                                            ? "text"
                                                            : "password"
                                                    }
                                                    autoComplete="current-password"
                                                    aria-invalid={
                                                        fieldState.invalid
                                                    }
                                                    className="py-2.5 text-[15px] text-gray-900! dark:text-white! pr-0"
                                                />
                                                <InputGroupAddon align="inline-end">
                                                    <InputGroupButton
                                                        type="button"
                                                        onClick={() =>
                                                            setShowPassword(
                                                                !showPassword,
                                                            )
                                                        }
                                                        variant="ghost"
                                                        size="icon-xs"
                                                        className="text-gray-400 hover:text-gray-700 dark:text-[#6c6f78] dark:hover:text-white"
                                                    >
                                                        {showPassword ? (
                                                            <EyeOff size={16} />
                                                        ) : (
                                                            <Eye size={16} />
                                                        )}
                                                    </InputGroupButton>
                                                </InputGroupAddon>
                                            </InputGroup>
                                            {fieldState.invalid && (
                                                <FieldError
                                                    errors={[fieldState.error]}
                                                />
                                            )}
                                            <ForgotPasswordDialog
                                                email={form.getValues(
                                                    "identifier",
                                                )}
                                            />
                                        </Field>
                                    )}
                                />
                            )}
                        </FieldGroup>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isGlobalLoading}
                            className="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-none bg-brand py-3 text-[15px] font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:bg-brand-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {isGlobalLoading ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            ) : (
                                <>
                                    <span>
                                        {loginMethod === "password"
                                            ? "Đăng nhập"
                                            : "Gửi mã OTP"}
                                    </span>
                                </>
                            )}
                        </button>

                        <div className="flex items-center justify-between text-[13px]">
                            <p className="text-left text-gray-500 dark:text-[#6c6f78]">
                                Need an account?{" "}
                                <Link
                                    to="/auth/register"
                                    className="font-medium text-brand no-underline transition-colors duration-200 hover:text-brand-light hover:underline dark:text-brand-light dark:hover:text-brand-light"
                                >
                                    Register
                                </Link>
                            </p>
                            <button
                                type="button"
                                onClick={() =>
                                    setLoginMethod(
                                        loginMethod === "password"
                                            ? "sms"
                                            : "password",
                                    )
                                }
                                className="cursor-pointer bg-transparent border-none p-0 font-medium text-brand no-underline transition-colors duration-200 hover:text-brand-light hover:underline dark:text-brand-light dark:hover:text-brand-light"
                            >
                                {loginMethod === "password"
                                    ? "Log in via SMS"
                                    : "Log in via Password"}
                            </button>
                        </div>
                    </form>

                    {/* Divider */}
                    <div className="my-2 flex items-center gap-3">
                        <span className="h-px flex-1 bg-gray-200 dark:bg-white/8" />
                        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-[#6c6f78]">
                            OR
                        </span>
                        <span className="h-px flex-1 bg-gray-200 dark:bg-white/8" />
                    </div>

                    {/* Social login */}
                    <div className="flex flex-col gap-2.5">
                        <button
                            type="button"
                            onClick={() =>
                                toast(
                                    "Xin lỗi, tính năng đang trong giai đoạn thử nghiệm và phát triển",
                                )
                            }
                            className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 hover:scale-[1.02] hover:border-gray-300 hover:bg-gray-100 active:scale-[0.99] dark:border-white/10 dark:bg-white/4 dark:text-[#d1d3da] dark:hover:border-white/18 dark:hover:bg-white/8"
                        >
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            <span>Continue with Google</span>
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                toast(
                                    "Xin lỗi, tính năng đang trong giai đoạn thử nghiệm và phát triển",
                                )
                            }
                            className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 hover:scale-[1.02] hover:border-gray-300 hover:bg-gray-100 active:scale-[0.99] dark:border-white/10 dark:bg-white/4 dark:text-[#d1d3da] dark:hover:border-white/18 dark:hover:bg-white/8"
                        >
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="#1877F2"
                            >
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                            <span>Continue with Facebook</span>
                        </button>
                    </div>
                </div>

                {/* Right — QR Code */}
                <div className="hidden w-[240px] flex-col items-center justify-center border-l border-gray-200 p-9 px-7 text-center dark:border-white/6 md:flex">
                    <div className="mb-5 h-[160px] w-[160px] rounded-[20px] bg-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                        <img
                            src={qrCode}
                            alt="QR Code"
                            className="h-full w-full rounded-md object-contain"
                        />
                    </div>
                    <h3 className="mb-2 text-base font-bold tracking-tight text-gray-900 dark:text-white">
                        Log in with QR Code
                    </h3>
                    <p className="text-[13px] leading-relaxed text-gray-500 dark:text-[#a0a3ab]">
                        Scan this with the{" "}
                        <strong className="text-gray-700 dark:text-[#d1d3da]">
                            Chatly mobile app
                        </strong>{" "}
                        to log in instantly.
                    </p>
                </div>
            </div>
        </div>
    );
}
