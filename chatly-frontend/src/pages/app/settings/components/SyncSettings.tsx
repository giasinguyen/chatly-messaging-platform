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
                            Auto Sync
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Adjust the frequency of syncing messages to the cloud
                        </p>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-border bg-card/40 p-6 transition-all hover:border-border/80">
                        <Label htmlFor="sync-frequency">Sync frequency</Label>
                        <Select defaultValue="15m">
                            <SelectTrigger id="sync-frequency" className="w-[220px]">
                                <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="5m">Every 5 minutes</SelectItem>
                                <SelectItem value="15m">Every 15 minutes</SelectItem>
                                <SelectItem value="60m">Every 60 minutes</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </section>

                <section className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-foreground">Network Usage</h3>
                    <div className="rounded-xl border border-border bg-card/40 p-6 transition-all hover:border-border/80">
                        <RadioGroup defaultValue="wifi" className="flex flex-col gap-5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="network-any">Wi-Fi and mobile data</Label>
                                <RadioGroupItem value="any" id="network-any" />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="network-wifi">Wi-Fi only</Label>
                                <RadioGroupItem value="wifi" id="network-wifi" />
                            </div>
                        </RadioGroup>
                    </div>
                </section>

                <section className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-foreground">Logged-in devices</h3>
                    <div className="space-y-3 rounded-xl border border-border bg-card/40 p-6 transition-all hover:border-border/80">
                        <div className="flex items-center justify-between rounded-lg bg-muted/60 px-4 py-3">
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-foreground">Chrome on Windows</p>
                                <p className="text-xs text-muted-foreground">Active 2 minutes ago</p>
                            </div>
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/20">
                                Current device
                            </Badge>
                        </div>

                        <div className="flex items-center justify-between rounded-lg bg-muted/60 px-4 py-3">
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-foreground">iPhone 14 Pro</p>
                                <p className="text-xs text-muted-foreground">Active 1 hour ago</p>
                            </div>
                            <Badge variant="secondary">Connected</Badge>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}