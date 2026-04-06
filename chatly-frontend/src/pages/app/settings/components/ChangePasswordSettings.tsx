import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/auth.service";

export function ChangePasswordSettings() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [changingPassword, setChangingPassword] = useState(false);

    const onChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error("Vui lòng điền đầy đủ thông tin.");
            return;
        }
        if (newPassword.length < 6) {
            toast.error("Mật khẩu mới phải có ít nhất 6 ký tự.");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("Xác nhận mật khẩu không khớp.");
            return;
        }

        try {
            setChangingPassword(true);
            const response = await authService.changePassword({
                currentPassword,
                newPassword,
                confirmPassword,
            });
            toast.success(response.message || "Đổi mật khẩu thành công.");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message || "Không thể đổi mật khẩu.",
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
                        <h3 className="text-lg font-bold text-foreground">Đổi mật khẩu</h3>
                        <p className="text-sm text-muted-foreground">
                            Cập nhật mật khẩu để tăng bảo mật tài khoản của bạn.
                        </p>
                    </div>
                    <div className="space-y-4 rounded-xl border border-border bg-card/40 p-6 transition-all hover:border-border/80">
                        <div className="space-y-2">
                            <Label htmlFor="current-password">Mật khẩu hiện tại</Label>
                            <Input
                                id="current-password"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new-password">Mật khẩu mới</Label>
                            <Input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">Xác nhận mật khẩu mới</Label>
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
                                {changingPassword ? "Đang xử lý..." : "Đổi mật khẩu"}
                            </Button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
