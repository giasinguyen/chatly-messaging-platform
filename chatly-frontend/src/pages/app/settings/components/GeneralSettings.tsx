import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function GeneralSettings() {
    return (
        <div className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-2xl mx-auto flex flex-col gap-10">
                {/* Contacts Section */}
                <section className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-lg font-bold text-foreground">
                            Danh bạ
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Danh sách bạn bè được hiển thị trong danh bạ
                        </p>
                    </div>

                    <div className="bg-card/40 border border-border rounded-xl p-6 transition-all hover:border-border/80">
                        <RadioGroup
                            defaultValue="only-zalo"
                            className="flex flex-col gap-6"
                        >
                            <div className="flex items-center justify-between group cursor-pointer">
                                <Label
                                    htmlFor="all-friends"
                                    className="text-sm font-medium leading-none cursor-pointer group-hover:text-foreground/80 transition-colors"
                                >
                                    Hiển thị tất cả bạn bè
                                </Label>
                                <RadioGroupItem
                                    value="all-friends"
                                    id="all-friends"
                                />
                            </div>
                            <div className="flex items-center justify-between group cursor-pointer">
                                <Label
                                    htmlFor="only-zalo"
                                    className="text-sm font-medium leading-none cursor-pointer group-hover:text-foreground/80 transition-colors"
                                >
                                    Chỉ hiển thị bạn bè đang sử dụng Chatly
                                </Label>
                                <RadioGroupItem
                                    value="only-zalo"
                                    id="only-zalo"
                                />
                            </div>
                        </RadioGroup>
                    </div>
                </section>

                {/* Language Section */}
                <section className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-lg font-bold text-foreground">
                            Ngôn ngữ
                        </h3>
                    </div>

                    <div className="bg-card/40 border border-border rounded-xl p-6 transition-all hover:border-border/80 flex items-center justify-between">
                        <span className="text-sm font-medium">
                            Thay đổi ngôn ngữ
                        </span>
                        <Select defaultValue="vi">
                            <SelectTrigger className="w-[180px] bg-card border-border">
                                <SelectValue placeholder="Chọn ngôn ngữ" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="vi">Tiếng Việt</SelectItem>
                                <SelectItem value="en">
                                    English (Coming Soon)
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </section>
            </div>
        </div>
    );
}

