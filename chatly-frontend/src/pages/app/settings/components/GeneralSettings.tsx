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
                            Contacts
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            List of friends displayed in the contact list
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
                                    Show all friends
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
                                    Show only friends using Chatly
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
