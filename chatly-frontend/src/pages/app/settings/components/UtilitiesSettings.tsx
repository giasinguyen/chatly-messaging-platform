import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UtilitiesSettings() {
    return (
        <div className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto flex max-w-2xl flex-col gap-10">
                <section className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-lg font-bold text-foreground">Bộ nhớ tạm</h3>
                        <p className="text-sm text-muted-foreground">
                            Kiểm tra dung lượng tạm và dọn dẹp để tăng hiệu năng
                        </p>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-border bg-card/40 p-6 transition-all hover:border-border/80">
                        <div>
                            <p className="text-sm font-semibold text-foreground">1.2 GB dữ liệu tạm</p>
                            <p className="text-xs text-muted-foreground">Bao gồm ảnh preview và lịch sử tìm kiếm cục bộ</p>
                        </div>
                        <Button variant="outline">Dọn dẹp ngay</Button>
                    </div>
                </section>

                <section className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-foreground">Xuất dữ liệu cá nhân</h3>
                    <div className="space-y-4 rounded-xl border border-border bg-card/40 p-6 transition-all hover:border-border/80">
                        <div className="space-y-2">
                            <Label htmlFor="export-email">Email nhận file xuất</Label>
                            <Input
                                id="export-email"
                                type="email"
                                defaultValue="minhanh@chatly.vn"
                            />
                        </div>
                        <div className="flex justify-end">
                            <Button className="bg-brand text-white hover:bg-brand-hover">
                                Yêu cầu xuất dữ liệu
                            </Button>
                        </div>
                    </div>
                </section>

                <section className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-foreground">Phím tắt nhanh</h3>
                    <div className="space-y-3 rounded-xl border border-border bg-card/40 p-6 transition-all hover:border-border/80">
                        <ShortcutRow shortcut="Ctrl + K" description="Tìm kiếm hội thoại" />
                        <ShortcutRow shortcut="Ctrl + Shift + M" description="Tắt/Bật âm cuộc trò chuyện" />
                        <ShortcutRow shortcut="Ctrl + /" description="Mở bảng phím tắt" />
                    </div>
                </section>
            </div>
        </div>
    );
}

interface ShortcutRowProps {
    shortcut: string;
    description: string;
}

function ShortcutRow({ shortcut, description }: ShortcutRowProps) {
    return (
        <div className="flex items-center justify-between rounded-lg bg-muted/60 px-4 py-3 dark:bg-muted/40">
            <span className="text-sm text-foreground">{description}</span>
            <kbd className="rounded-md bg-background px-2 py-1 text-xs text-muted-foreground shadow-sm">
                {shortcut}
            </kbd>
        </div>
    );
}