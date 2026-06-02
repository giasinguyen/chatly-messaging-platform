import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";

export function ChangePasswordSettings() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const clearAuth = useAuthStore((s) => s.clearAuth);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [changingPassword, setChangingPassword] = useState(false);

    const onChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error(t("settings.change_password.fill_required"));
            return;
        }
        if (newPassword.length < 6) {
            toast.error(t("settings.change_password.too_short"));
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error(t("settings.change_password.not_match"));
            return;
        }

        try {
            setChangingPassword(true);
            await authService.changePassword({
                currentPassword,
                newPassword,
                confirmPassword,
            });
            toast.success(t("settings.change_password.success"));
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            try {
                await authService.logout();
            } catch {
                // Tokens may already be invalid; still clear client session
            }
            clearAuth();
            navigate("/auth/login", { replace: true });
        } catch (error: unknown) {
            const msg =
                error instanceof AxiosError
                    ? error.response?.data?.message ?? t("settings.change_password.failed")
                    : t("settings.change_password.failed");
            toast.error(msg);
        } finally {
            setChangingPassword(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto flex max-w-2xl flex-col gap-6">
                <section className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-lg font-bold text-foreground">{t("settings.change_password.title")}</h3>
                        <p className="text-sm text-muted-foreground">
                            {t("settings.change_password.description")}
                        </p>
                    </div>
                    <div className="space-y-4 rounded-xl border border-border bg-card/40 p-6 transition-all hover:border-border/80">
                        <div className="space-y-2">
                            <Label htmlFor="current-password">{t("settings.change_password.current")}</Label>
                            <Input
                                id="current-password"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new-password">{t("settings.change_password.new_password")}</Label>
                            <Input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">{t("settings.change_password.confirm")}</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-end">
                            <Button
                                onClick={onChangePassword}
                                disabled={changingPassword}
                                className="bg-brand text-white hover:bg-brand-hover disabled:opacity-70"
                            >
                                {changingPassword
                                    ? t("settings.change_password.processing")
                                    : t("settings.change_password.update")}
                            </Button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
