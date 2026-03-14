import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function MessagesSettings() {
    return (
        <div className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto flex max-w-2xl flex-col gap-10">
                <section className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-lg font-bold text-foreground">Soạn tin nhắn</h3>
                        <p className="text-sm text-muted-foreground">
                            Tùy chỉnh cách gửi và hiển thị nội dung chat
                        </p>
                    </div>

                    <div className="rounded-xl border border-border bg-card/40 p-6 transition-all hover:border-border/80">
                        <RadioGroup defaultValue="enter-send" className="flex flex-col gap-5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="send-enter">Enter để gửi</Label>
                                <RadioGroupItem value="enter-send" id="send-enter" />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="send-ctrl-enter">Ctrl + Enter để gửi</Label>
                                <RadioGroupItem value="ctrl-enter-send" id="send-ctrl-enter" />
                            </div>
                        </RadioGroup>
                    </div>
                </section>

                <section className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-foreground">Xem trước liên kết</h3>
                    <div className="rounded-xl border border-border bg-card/40 p-6 transition-all hover:border-border/80">
                        <RadioGroup defaultValue="enabled" className="flex flex-col gap-5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="link-preview-enabled">Bật xem trước</Label>
                                <RadioGroupItem value="enabled" id="link-preview-enabled" />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="link-preview-disabled">Tắt xem trước</Label>
                                <RadioGroupItem value="disabled" id="link-preview-disabled" />
                            </div>
                        </RadioGroup>
                    </div>
                </section>

                <section className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-foreground">Tự động xóa tin nhắn</h3>
                    <div className="flex items-center justify-between rounded-xl border border-border bg-card/40 p-6 transition-all hover:border-border/80">
                        <Label htmlFor="auto-delete">Chu kỳ xóa</Label>
                        <Select defaultValue="never">
                            <SelectTrigger id="auto-delete" className="w-[220px]">
                                <SelectValue placeholder="Chọn chu kỳ" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="24h">24 giờ</SelectItem>
                                <SelectItem value="7d">7 ngày</SelectItem>
                                <SelectItem value="30d">30 ngày</SelectItem>
                                <SelectItem value="never">Không tự động xóa</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </section>
            </div>
        </div>
    );
}