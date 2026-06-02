import { useState } from "react";
import { Link } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { Trans, useTranslation } from "react-i18next";
import { ArrowRight, MailCheck } from "lucide-react";

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
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import "../login/login.css";

export default function RegisterPage() {
    const { t, i18n } = useTranslation();
    const [isRegistrationComplete, setIsRegistrationComplete] = useState(false);
    const [verificationEmail, setVerificationEmail] = useState<string | null>(
        null,
    );
    const form = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        mode: "onChange",
        reValidateMode: "onChange",
        defaultValues: {
            identifier: "",
            displayName: "",
            username: "",
            password: "",
            month: "",
            day: "",
            year: "",
        },
    });

    const setGlobalLoading = useAuthStore((s) => s.setLoading);
    const isGlobalLoading = useAuthStore((s) => s.loading);

    const onSubmit = async (data: RegisterFormValues) => {
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

        try {
            setGlobalLoading(true);
            const response = await authService.register(payload);

            if (response.code === 1000) {
                setVerificationEmail(identifier);
                setIsRegistrationComplete(true);
                form.reset();
            } else {
                toast.error(response.message || t("auth.register.failed"));
            }
        } catch (error: unknown) {
            const msg =
                error instanceof AxiosError
                    ? error.response?.data?.message ?? t("auth.register.failed")
                    : t("auth.register.unexpected_error");
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
            <div className="login-card-enter mt-10 relative z-5 flex w-[90%] max-w-[480px] flex-col overflow-hidden rounded-[20px] border border-black/10 bg-white/90 p-8 shadow-[0_4px_20px_rgba(0,0,0,0.08)] backdrop-blur-[20px] dark:border-white/8 dark:bg-[rgba(30,33,40,0.92)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                <h1 className="mb-6 text-center text-[22px] font-bold tracking-tight text-gray-900 dark:text-white">
                    {t("auth.register.title")}
                </h1>

                {isRegistrationComplete ? (
                    <div className="flex flex-col items-center gap-5 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-brand ring-8 ring-brand/5">
                            <MailCheck className="h-8 w-8" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold text-gray-950 dark:text-white">
                                {t("auth.register.verify_email_title")}
                            </h2>
                            <p className="text-sm leading-6 text-gray-600 dark:text-[#b0b3bc]">
                                {t("auth.register.verify_email_description")}
                            </p>
                            {verificationEmail ? (
                                <p className="rounded-xl border border-brand/20 bg-brand/5 px-3 py-2 text-sm font-semibold text-brand">
                                    {verificationEmail}
                                </p>
                            ) : null}
                            <p className="text-xs leading-5 text-gray-500 dark:text-[#a0a3ab]">
                                {t("auth.register.verify_email_hint")}
                            </p>
                        </div>
                        <Link
                            to="/auth/login"
                            className="flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3.5 text-[15px] font-bold text-white transition-all duration-300 hover:scale-[1.02] hover:bg-brand-hover active:scale-[0.99]"
                        >
                            <span>{t("auth.register.go_to_login")}</span>
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                ) : (
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
                                        {t("auth.register.identifier")}{" "}
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
                                        placeholder={t("auth.register.identifier_placeholder")}
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
                                        {t("auth.register.display_name")}{" "}
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
                                        {t("auth.register.username")}{" "}
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
                                        {t("auth.register.password")}{" "}
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
                                {t("auth.register.dob")}{" "}
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
                                                    {t("auth.register.month")}
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
                                                                i18n.language,
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
                                                    {t("auth.register.day")}
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
                                                    {t("auth.register.year")}
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
                                            message: t("auth.register.dob_full_required"),
                                        },
                                    ]}
                                />
                            ) : null}
                        </div>
                    </FieldGroup>

                    {/* Terms and Submit */}
                    <div className="mt-1 flex flex-col gap-4">
                        <p className="text-[12px] leading-snug text-gray-500 dark:text-[#a0a3ab]">
                            <Trans
                                i18nKey="auth.register.terms_prefix"
                            />{" "}
                            <Link
                                to="/terms"
                                className="font-medium text-brand hover:underline"
                            >
                                {t("auth.register.terms_link")}
                            </Link>{" "}
                            {t("auth.register.terms_and")}{" "}
                            <Link
                                to="/privacy"
                                className="font-medium text-brand hover:underline"
                            >
                                {t("auth.register.privacy_link")}
                            </Link>
                        </p>

                        <button
                            type="submit"
                            disabled={isGlobalLoading}
                            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-none bg-brand py-3.5 text-[15px] font-bold text-white transition-all duration-300 hover:scale-[1.02] hover:bg-brand-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {isGlobalLoading ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            ) : (
                                <>
                                    <span>{t("auth.register.create_account_button")}</span>
                                </>
                            )}
                        </button>

                        <Link
                            to="/auth/login"
                            className="text-left text-[13px] font-medium text-brand no-underline transition-colors duration-200 hover:text-brand-light hover:underline dark:text-brand-light dark:hover:text-brand-light"
                        >
                            {t("auth.register.already_have_account")}
                        </Link>
                    </div>
                    </form>
                )}
            </div>
        </div>
    );
}
