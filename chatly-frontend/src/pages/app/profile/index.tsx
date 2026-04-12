import {
    Camera,
    CalendarDays,
    Edit3,
    Loader2,
    Mail,
    MapPin,
    Phone,
    ShieldCheck,
} from "lucide-react";
import {
    type ChangeEvent,
    type ComponentType,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useBlocker } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { fileService } from "@/services/file.service";
import { userService } from "@/services/user.service";
import { useAuthStore } from "@/store/auth.store";
import type { UserResponse } from "@/types/auth";
import { toast } from "sonner";

interface ProfileFormData {
    displayName: string;
    username: string;
    email: string;
    phone: string;
    bio: string;
    dob: string;
    avatarUrl: string;
}

const emptyForm: ProfileFormData = {
    displayName: "",
    username: "",
    email: "",
    phone: "",
    bio: "",
    dob: "",
    avatarUrl: "",
};

function toDateInput(iso?: string) {
    if (!iso) return "";
    return iso.slice(0, 10);
}

function mapUserToForm(user?: UserResponse | null): ProfileFormData {
    if (!user) return emptyForm;
    return {
        displayName: user.displayName ?? "",
        username: user.username ?? "",
        email: user.email ?? "",
        phone: user.phone ?? "",
        bio: user.bio ?? "",
        dob: toDateInput(user.dob),
        avatarUrl: user.avatarUrl ?? "",
    };
}

function formatJoinedAt(createdAt?: string) {
    if (!createdAt) return "-";
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("vi-VN", {
        month: "long",
        year: "numeric",
    }).format(date);
}

export default function ProfilePage() {
    const user = useAuthStore((s) => s.user);
    const updateUser = useAuthStore((s) => s.updateUser);

    const [form, setForm] = useState<ProfileFormData>(emptyForm);
    const [initialForm, setInitialForm] = useState<ProfileFormData>(emptyForm);
    const [loading, setLoading] = useState(!user);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const isDirty = useMemo(
        () => JSON.stringify(form) !== JSON.stringify(initialForm),
        [form, initialForm],
    );

    // Warn user before navigating away with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (isDirty) {
                event.preventDefault();
                event.returnValue = "";
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () =>
            window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isDirty]);

    // Block navigation to other routes with unsaved changes
    const blocker = useBlocker(({ currentLocation, nextLocation }) => {
        if (!isDirty) return false;
        if (currentLocation.pathname === nextLocation.pathname) return false;

        setShowConfirmDialog(true);
        return true;
    });

    const joinedAt = formatJoinedAt(user?.createdAt);
    const fullName = form.displayName || user?.displayName || "User";
    const userInitial = fullName.charAt(0).toUpperCase() || "U";

    const onConfirmLeave = () => {
        setShowConfirmDialog(false);
        blocker.proceed?.();
    };

    const onCancelLeave = () => {
        setShowConfirmDialog(false);
        blocker.reset?.();
    };

    useEffect(() => {
        if (!user) return;

        const fallback = mapUserToForm(user);
        setForm((prev) =>
            prev.username || prev.displayName ? prev : fallback,
        );
        setInitialForm((prev) =>
            prev.username || prev.displayName ? prev : fallback,
        );
        setLoading(false);
    }, [user?.id]);

    useEffect(() => {
        let active = true;
        const timeoutId = window.setTimeout(() => {
            if (!active) return;
            setLoading(false);
            toast.error("Tải hồ sơ quá lâu, vui lòng thử lại");
        }, 12000);

        const loadProfile = async () => {
            try {
                const response = await userService.getMe();
                if (!active) return;

                updateUser(response.result);
                const nextForm = mapUserToForm(response.result);
                setForm(nextForm);
                setInitialForm(nextForm);
            } catch (error) {
                if (!active) return;

                if (user) {
                    const fallback = mapUserToForm(user);
                    setForm(fallback);
                    setInitialForm(fallback);
                }
                toast.error("Không thể tải thông tin profile");
            } finally {
                window.clearTimeout(timeoutId);
                if (active) setLoading(false);
            }
        };

        loadProfile();

        return () => {
            active = false;
            window.clearTimeout(timeoutId);
        };
    }, [updateUser]);

    const onInputChange =
        (field: keyof ProfileFormData) =>
        (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            const value = event.target.value;
            setForm((prev) => ({ ...prev, [field]: value }));
        };

    const onPickAvatar = () => {
        fileInputRef.current?.click();
    };

    const onAvatarSelected = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Vui lòng chọn file ảnh hợp lệ");
            return;
        }

        event.target.value = "";

        setSelectedAvatarFile(file);

        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result;
            if (typeof dataUrl === "string") {
                setForm((prev) => ({ ...prev, avatarUrl: dataUrl }));
            }
        };
        reader.onerror = () => {
            toast.error("Không thể đọc file ảnh");
        };
        reader.readAsDataURL(file);
    };

    const onReset = () => {
        setForm(initialForm);
    };

    const onSave = async () => {
        if (!user?.id) {
            toast.error("Không xác định được người dùng hiện tại");
            return;
        }

        if (!form.displayName.trim() || !form.username.trim()) {
            toast.error("Tên hiển thị và username không được để trống");
            return;
        }

        try {
            setSaving(true);
            let avatarUrl = form.avatarUrl;

            // Nếu chọn ảnh mới (là data URL), upload lên S3 trước
            if (selectedAvatarFile && avatarUrl?.startsWith("data:")) {
                setUploadingAvatar(true);
                try {
                    const uploaded = await fileService.upload(selectedAvatarFile);
                    avatarUrl = uploaded.url;
                    setSelectedAvatarFile(null);
                } catch {
                    toast.error("Không thể tải ảnh lên, vui lòng thử lại");
                    return;
                } finally {
                    setUploadingAvatar(false);
                }
            }

            const response = await userService.update(user.id, {
                displayName: form.displayName.trim(),
                username: form.username.trim(),
                email: form.email.trim() || undefined,
                phone: form.phone.trim() || undefined,
                bio: form.bio.trim() || undefined,
                dob: form.dob || undefined,
                avatarUrl: avatarUrl || undefined,
            });

            updateUser(response.result);
            const nextForm = mapUserToForm(response.result);
            setForm(nextForm);
            setInitialForm(nextForm);
            toast.success("Đã lưu thông tin cá nhân");
        } catch (error) {
            toast.error("Lưu thông tin thất bại. Vui lòng thử lại");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-background">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Đang tải hồ sơ...</span>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="h-full w-full overflow-y-auto bg-[linear-gradient(145deg,#f8fbff_0%,#edf5ff_55%,#ffffff_100%)] px-6 py-8 dark:bg-[linear-gradient(145deg,#0b1220_0%,#0f1e38_55%,#111827_100%)] md:px-10">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 animate-in fade-in duration-300">
                <section className="overflow-hidden rounded-3xl border border-brand/10 bg-card shadow-[0_20px_60px_-35px_rgba(0,113,227,0.45)] dark:border-brand/25 dark:shadow-[0_24px_70px_-40px_rgba(52,170,220,0.45)]">
                    <div className="h-28 w-full bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.4)_0%,rgba(255,255,255,0)_35%),linear-gradient(110deg,#0a1628_0%,#0d3b7a_40%,#0071e3_75%,#34aadc_100%)]" />

                    <div className="relative grid gap-5 px-6 pb-7 pt-0 md:grid-cols-[auto_1fr_auto] md:items-end md:gap-6 md:px-8">
                        <div className="-mt-12">
                            <div className="group relative w-fit">
                                <Avatar className="h-24 w-24 border-4 border-background shadow-lg md:h-28 md:w-28">
                                    <AvatarImage
                                        src={form.avatarUrl}
                                        className="object-cover"
                                    />
                                    <AvatarFallback className="text-2xl font-semibold">
                                        {userInitial}
                                    </AvatarFallback>
                                </Avatar>
                                <button
                                    type="button"
                                    className="absolute -bottom-1 -right-1 rounded-full border border-white bg-brand p-2 text-white shadow-md transition hover:scale-105 hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed"
                                    aria-label="Đổi ảnh đại diện"
                                    onClick={onPickAvatar}
                                    disabled={uploadingAvatar || saving}
                                >
                                    {uploadingAvatar ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Camera size={14} />
                                    )}
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={onAvatarSelected}
                                />
                            </div>
                        </div>

                        <div className="space-y-2 md:pb-1">
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                                    {fullName}
                                </h1>
                            </div>

                            <p className="text-sm font-medium text-muted-foreground">
                                @{form.username || "username"}
                            </p>
                            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                                {form.bio || "Bạn chưa cập nhật tiểu sử."}
                            </p>
                        </div>

                        <div className="flex gap-2 md:pb-1">
                            <Button
                                variant="outline"
                                onClick={onReset}
                                disabled={!isDirty || saving}
                            >
                                Hoàn tác
                            </Button>
                            <Button
                                className="gap-2 bg-brand text-white hover:bg-brand-hover"
                                onClick={onSave}
                                disabled={!isDirty || saving}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Đang lưu...
                                    </>
                                ) : (
                                    <>
                                        <Edit3 size={16} />
                                        Lưu thay đổi
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-brand/20 dark:shadow-[0_16px_45px_-32px_rgba(52,170,220,0.5)] md:p-6">
                        <h2 className="mb-4 text-base font-semibold text-foreground md:text-lg">
                            Thông tin liên hệ
                        </h2>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="display-name">Tên hiển thị</Label>
                                <Input
                                    id="display-name"
                                    value={form.displayName}
                                    onChange={onInputChange("displayName")}
                                    placeholder="Nhập tên hiển thị"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    value={form.username}
                                    onChange={onInputChange("username")}
                                    placeholder="Nhập username"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={form.email}
                                    onChange={onInputChange("email")}
                                    placeholder="you@chatly.vn"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Số điện thoại</Label>
                                <Input
                                    id="phone"
                                    value={form.phone}
                                    onChange={onInputChange("phone")}
                                    placeholder="+84..."
                                />
                            </div>
                        </div>
                    </article>

                    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-brand/20 dark:shadow-[0_16px_45px_-32px_rgba(52,170,220,0.5)] md:p-6">
                        <h2 className="mb-4 text-base font-semibold text-foreground md:text-lg">
                            Trạng thái tài khoản
                        </h2>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="dob">Ngày sinh</Label>
                                <Input
                                    id="dob"
                                    type="date"
                                    value={form.dob}
                                    onChange={onInputChange("dob")}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="bio">Tiểu sử</Label>
                                <Textarea
                                    id="bio"
                                    value={form.bio}
                                    onChange={onInputChange("bio")}
                                    placeholder="Giới thiệu ngắn về bạn"
                                    className="min-h-28"
                                />
                            </div>

                            <InfoRow icon={Mail} label="Email" value={form.email || "-"} />
                            <InfoRow icon={Phone} label="Điện thoại" value={form.phone || "-"} />
                            <InfoRow icon={MapPin} label="Username" value={form.username || "-"} />
                            <InfoRow icon={CalendarDays} label="Tham gia từ" value={joinedAt} />

                            <div className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3 dark:bg-muted/40">
                                <div className="flex items-center gap-3 text-foreground">
                                    <ShieldCheck className="text-brand" size={18} />
                                    <span className="text-sm font-medium">Trạng thái tài khoản</span>
                                </div>
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/20">
                                    {user?.status || "Đang hoạt động"}
                                </Badge>
                            </div>
                        </div>
                    </article>
                </section>
            </div>
        </div>

        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent showCloseButton={false}>
                    <DialogHeader>
                        <DialogTitle>Rời trang?</DialogTitle>
                        <DialogDescription>
                            Bạn có những thay đổi chưa lưu. Nếu rời trang, những thay đổi sẽ bị mất.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={onCancelLeave}
                        >
                            Huỷ
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={onConfirmLeave}
                        >
                            Rời trang
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

interface InfoRowProps {
    icon: ComponentType<{ className?: string; size?: number }>;
    label: string;
    value: string;
}

function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
    return (
        <div className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3 dark:bg-muted/40">
            <div className="flex items-center gap-3 text-foreground">
                <Icon className="text-brand" size={18} />
                <span className="text-sm font-medium">{label}</span>
            </div>
            <span className="text-sm text-muted-foreground">{value}</span>
        </div>
    );
}