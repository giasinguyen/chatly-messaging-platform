import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function GeneralSettings() {
    return (
        <div className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-2xl mx-auto flex flex-col gap-10">
                {/* Language Section */}
                <section className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-lg font-bold text-foreground">
                            Language
                        </h3>
                    </div>

                    <div className="bg-card/40 border border-border rounded-xl p-6 transition-all hover:border-border/80 flex items-center justify-between">
                        <span className="text-sm font-medium">
                            Change language
                        </span>
                        <Select defaultValue="vi">
                            <SelectTrigger className="w-[180px] bg-card border-border">
                                <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="vi">
                                    Vietnamese (Coming Soon)
                                </SelectItem>
                                <SelectItem value="en">English</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </section>
            </div>
        </div>
    );
}
