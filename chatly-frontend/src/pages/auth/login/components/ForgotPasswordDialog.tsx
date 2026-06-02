import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { authService } from "@/services/auth.service";

export function ForgotPasswordDialog() {
    const { t } = useTranslation();
    const [email, setEmail] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        const trimmed = email.trim();
        if (!trimmed) {
            toast.error(t("auth.forgot_password.email"));
            return;
        }
        const simpleEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!simpleEmailRegex.test(trimmed)) {
            toast.error(t("validation.email_invalid"));
            return;
        }

        try {
            setSubmitting(true);
            const response = await authService.forgotPassword(trimmed);
            toast.success(response.message || t("auth.forgot_password.code_sent"));
        } catch (error: unknown) {
            const msg =
                error instanceof AxiosError
                    ? error.response?.data?.message ?? t("errors.request_failed")
                    : t("errors.unexpected");
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <button
                    type="button"
                    className="mt-0.5 w-fit cursor-pointer border-none bg-transparent p-0 text-left text-[13px] text-brand no-underline transition-colors duration-200 hover:text-brand-light hover:underline dark:text-brand-light dark:hover:text-brand-light"
                >
                    {t("auth.forgot_password.trigger")}
                </button>
            </DialogTrigger>
            <DialogContent className="w-[90%] max-w-[420px] rounded-[24px] border-none bg-white p-6 shadow-2xl dark:bg-[rgba(30,33,40,0.98)] dark:text-white sm:rounded-[24px]">
                <DialogHeader className="space-y-3 text-center sm:text-left">
                    <DialogTitle className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                        {t("auth.forgot_password.title")}
                    </DialogTitle>
                    <DialogDescription className="text-[15px] leading-relaxed text-gray-600 dark:text-[#a0a3ab]">
                        {t("auth.forgot_password.description")}
                    </DialogDescription>
                </DialogHeader>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("auth.forgot_password.email")}
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-brand dark:border-white/10 dark:bg-[#1a1c23] dark:text-white"
                />
                <div className="mt-4 flex w-full">
                    <button
                        onClick={handleSubmit}
                        type="button"
                        disabled={submitting}
                        className="w-full cursor-pointer rounded-full border-none bg-brand py-2.5 text-[15px] font-semibold text-white transition-all duration-300 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {submitting ? t("common.loading") : t("common.submit")}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
