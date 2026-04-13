import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";

export function ChangePasswordSettings() {
    const navigate = useNavigate();
    const clearAuth = useAuthStore((s) => s.clearAuth);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [changingPassword, setChangingPassword] = useState(false);

    const onChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error("Please fill in all information.");
            return;
        }
        if (newPassword.length < 6) {
            toast.error("The new password must be at least 6 characters long.");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("Password confirmation does not match.");
            return;
        }

        try {
            setChangingPassword(true);
            await authService.changePassword({
                currentPassword,
                newPassword,
                confirmPassword,
            });
            toast.success(
                "Password updated. Please sign in again with your new password.",
            );
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
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message || "Could not change password.",
            );
        } finally {
            setChangingPassword(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto flex max-w-2xl flex-col gap-6">
                <section className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-lg font-bold text-foreground">Change Password</h3>
                        <p className="text-sm text-muted-foreground">
                            Update your password to increase account security.
                        </p>
                    </div>
                    <div className="space-y-4 rounded-xl border border-border bg-card/40 p-6 transition-all hover:border-border/80">
                        <div className="space-y-2">
                            <Label htmlFor="current-password">Current password</Label>
                            <Input
                                id="current-password"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new-password">New password</Label>
                            <Input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">Confirm new password</Label>
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
                                {changingPassword ? "Processing..." : "Change Password"}
                            </Button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
