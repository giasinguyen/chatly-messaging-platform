import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Mail, Lock, Eye, EyeOff, RefreshCw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";

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
import type { ApiResponse } from "@/types/auth";
import "./login.css";

const SMS_LOGIN_MAINTENANCE_MESSAGE = "SMS login is currently under maintenance.";
const LOGIN_ERROR_MESSAGE = "An error occurred";

export default function LoginPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [loginMethod, setLoginMethod] = useState<"password" | "sms">(
        "password",
    );
    
    const [qrToken, setQrToken] = useState<string | null>(null);
    const [qrStatus, setQrStatus] = useState<"PENDING" | "EXPIRED" | "LOADING">("LOADING");
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    const form = useForm<LoginFormValues>({
        // The active schema matches the login method before submit validation runs.
        resolver: zodResolver(
            loginMethod === "password" ? loginSchema : smsLoginSchema,
        ) as Resolver<LoginFormValues>,
        defaultValues: {
            identifier: "",
            password: "",
        },
    });

    const setAuth = useAuthStore((s) => s.setAuth);
    const setGlobalLoading = useAuthStore((s) => s.setLoading);
    const isGlobalLoading = useAuthStore((s) => s.loading);
    const navigate = useNavigate();

    const fetchQrToken = async () => {
        try {
            setQrStatus("LOADING");
            const response = await authService.generateQrLogin();
            if (response.code === 1000 && response.result) {
                setQrToken(response.result.token);
                setQrStatus("PENDING");
                startPolling(response.result.token);
            }
        } catch (error) {
            console.error("Failed to generate QR token", error);
            setQrStatus("EXPIRED");
        }
    };

    const startPolling = (token: string) => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        
        pollingRef.current = setInterval(async () => {
            try {
                const response = await authService.checkQrLoginStatus(token);
                if (response.code === 1000 && response.result) {
                    if (response.result.status === "SUCCESS" && response.result.result) {
                        if (pollingRef.current) clearInterval(pollingRef.current);
                        setAuth(response.result.result);
                        toast.success("Login successful via QR!");
                        navigate("/");
                    } else if (response.result.status === "EXPIRED") {
                        if (pollingRef.current) clearInterval(pollingRef.current);
                        setQrStatus("EXPIRED");
                    }
                }
            } catch (error) {
                console.error("Failed to check QR status", error);
            }
        }, 2000);
    };

    useEffect(() => {
        fetchQrToken();
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, []);

    const handleLoginMethodToggle = () => {
        if (loginMethod === "password") {
            toast.info(SMS_LOGIN_MAINTENANCE_MESSAGE);
            return;
        }

        setLoginMethod("password");
    };

    const onSubmit = async (data: LoginFormValues) => {
        if (loginMethod === "sms") {
            toast.info(SMS_LOGIN_MAINTENANCE_MESSAGE);
            return;
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
                toast.success("Login successful!");
                navigate("/");
            } else {
                toast.error(response.message || "Login failed");
            }
        } catch (error: unknown) {
            console.error("Login error:", error);
            const msg = axios.isAxiosError<ApiResponse<unknown>>(error)
                ? error.response?.data?.message ?? LOGIN_ERROR_MESSAGE
                : LOGIN_ERROR_MESSAGE;
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
                                            <ForgotPasswordDialog />
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
                                            ? "Log In"
                                            : "Send OTP"}
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
                                onClick={handleLoginMethodToggle}
                                className="cursor-pointer bg-transparent border-none p-0 font-medium text-brand no-underline transition-colors duration-200 hover:text-brand-light hover:underline dark:text-brand-light dark:hover:text-brand-light"
                            >
                                {loginMethod === "password"
                                    ? "Log in via SMS"
                                    : "Log in via Password"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Right — QR Code */}
                <div className="hidden w-[240px] flex-col items-center justify-center border-l border-gray-200 p-9 px-7 text-center dark:border-white/6 md:flex">
                    <div className="relative mb-5 flex h-[160px] w-[160px] items-center justify-center overflow-hidden rounded-[20px] bg-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                        {qrStatus === "LOADING" ? (
                            <div className="flex h-full w-full items-center justify-center">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
                            </div>
                        ) : qrStatus === "EXPIRED" || !qrToken ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/80 backdrop-blur-sm dark:bg-black/40 z-10">
                                <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-300">QR Expired</p>
                                <button
                                    type="button"
                                    onClick={fetchQrToken}
                                    className="flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-brand-hover"
                                >
                                    <RefreshCw size={14} /> Refresh
                                </button>
                            </div>
                        ) : null}
                        
                        {qrToken && (
                            <QRCodeSVG
                                value={qrToken}
                                size={144}
                                level="H"
                                includeMargin={false}
                                className={`h-full w-full rounded-md object-contain transition-opacity duration-300 ${qrStatus === "EXPIRED" ? "opacity-30" : "opacity-100"}`}
                            />
                        )}
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
