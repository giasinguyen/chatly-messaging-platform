import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function SyncSettings() {
    return (
        <div className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto flex max-w-2xl flex-col gap-10">
                <section className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-lg font-bold text-foreground">
                            Đồng bộ tự động
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Điều chỉnh tần suất đồng bộ tin nhắn lên cloud
                        </p>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-border bg-card/40 p-6 transition-all hover:border-border/80">
                        <Label htmlFor="sync-frequency">Tần suất đồng bộ</Label>
                        <Select defaultValue="15m">
                            <SelectTrigger id="sync-frequency" className="w-[220px]">
                                <SelectValue placeholder="Chọn tần suất" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="5m">Mỗi 5 phút</SelectItem>
                                <SelectItem value="15m">Mỗi 15 phút</SelectItem>
                                <SelectItem value="60m">Mỗi 60 phút</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </section>

                <section className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-foreground">Mạng sử dụng</h3>
                    <div className="rounded-xl border border-border bg-card/40 p-6 transition-all hover:border-border/80">
                        <RadioGroup defaultValue="wifi" className="flex flex-col gap-5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="network-any">Wi-Fi và Dữ liệu di động</Label>
                                <RadioGroupItem value="any" id="network-any" />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="network-wifi">Chỉ Wi-Fi</Label>
                                <RadioGroupItem value="wifi" id="network-wifi" />
                            </div>
                        </RadioGroup>
                    </div>
                </section>

                <section className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-foreground">Thiết bị đã đăng nhập</h3>
                    <div className="space-y-3 rounded-xl border border-border bg-card/40 p-6 transition-all hover:border-border/80">
                        <div className="flex items-center justify-between rounded-lg bg-muted/60 px-4 py-3">
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-foreground">Chrome on Windows</p>
                                <p className="text-xs text-muted-foreground">Hoạt động 2 phút trước</p>
                            </div>
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/20">
                                Thiết bị hiện tại
                            </Badge>
                        </div>

                        <div className="flex items-center justify-between rounded-lg bg-muted/60 px-4 py-3">
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-foreground">iPhone 14 Pro</p>
                                <p className="text-xs text-muted-foreground">Hoạt động 1 giờ trước</p>
                            </div>
                            <Badge variant="secondary">Đang kết nối</Badge>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}