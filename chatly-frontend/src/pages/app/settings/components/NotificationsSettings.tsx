import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function NotificationsSettings() {
    return (
        <div className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto flex max-w-2xl flex-col gap-10">
                <section className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-lg font-bold text-foreground">Thông báo đẩy</h3>
                        <p className="text-sm text-muted-foreground">
                            Quản lý thông báo trên desktop và trình duyệt
                        </p>
                    </div>

                    <div className="rounded-xl border border-border bg-card/40 p-6 transition-all hover:border-border/80">
                        <RadioGroup defaultValue="enabled" className="flex flex-col gap-5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="push-enabled">Bật thông báo đẩy</Label>
                                <RadioGroupItem value="enabled" id="push-enabled" />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="push-disabled">Tắt thông báo đẩy</Label>
                                <RadioGroupItem value="disabled" id="push-disabled" />
                            </div>
                        </RadioGroup>
                    </div>
                </section>

                <section className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-foreground">Âm thanh thông báo</h3>
                    <div className="flex items-center justify-between rounded-xl border border-border bg-card/40 p-6 transition-all hover:border-border/80">
                        <Label htmlFor="notification-sound">Kiểu âm thanh</Label>
                        <Select defaultValue="soft-bell">
                            <SelectTrigger id="notification-sound" className="w-[220px]">
                                <SelectValue placeholder="Chọn âm thanh" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="soft-bell">Soft Bell</SelectItem>
                                <SelectItem value="classic-pop">Classic Pop</SelectItem>
                                <SelectItem value="silent">Im lặng</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </section>

                <section className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-foreground">Không làm phiền</h3>
                    <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-card/40 p-6 transition-all hover:border-border/80 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="dnd-start">Bắt đầu</Label>
                            <Input id="dnd-start" type="time" defaultValue="22:00" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dnd-end">Kết thúc</Label>
                            <Input id="dnd-end" type="time" defaultValue="07:00" />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}