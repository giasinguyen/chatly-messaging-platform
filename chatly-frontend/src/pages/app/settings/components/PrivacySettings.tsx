import { useState } from "react";
import type { ReactNode } from "react";
import { ChevronRight, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";

export function PrivacySettings() {
    const user = useAuthStore((s) => s.user);
    const [showOnlineStatus, setShowOnlineStatus] = useState(true);
    const [showSeenStatus, setShowSeenStatus] = useState(true);
    const [allowSearchByPhone, setAllowSearchByPhone] = useState(true);

    return (
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
                <section className="space-y-3">
                    <h3 className="text-2xl font-bold tracking-tight text-foreground">
                        Privacy
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Manage what information you display and who can contact
                        you.
                    </p>
                </section>

                <section className="space-y-4">
                    <h4 className="text-xl font-semibold text-foreground">
                        Personal
                    </h4>
                    <div className="space-y-1 rounded-xl border border-border bg-card/40 p-4 md:p-5">
                        <SettingRow label="Show date of birth">
                            <Select defaultValue="hidden">
                                <SelectTrigger className="w-[170px] bg-background/60">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="hidden">Hide</SelectItem>
                                    <SelectItem value="friends">
                                        Friends
                                    </SelectItem>
                                    <SelectItem value="everyone">
                                        Everyone
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </SettingRow>

                        <SettingRow label="Show online status">
                            <SettingSwitch
                                checked={showOnlineStatus}
                                onToggle={() =>
                                    setShowOnlineStatus((prev) => !prev)
                                }
                            />
                        </SettingRow>
                    </div>
                </section>

                <section className="space-y-4">
                    <h4 className="text-xl font-semibold text-foreground">
                        Messages and Calls
                    </h4>
                    <div className="space-y-1 rounded-xl border border-border bg-card/40 p-4 md:p-5">
                        <SettingRow label='Show "Seen" status'>
                            <SettingSwitch
                                checked={showSeenStatus}
                                onToggle={() =>
                                    setShowSeenStatus((prev) => !prev)
                                }
                            />
                        </SettingRow>

                        <SettingRow
                            label="Allow messaging"
                            description="Who can message you"
                        >
                            <Select defaultValue="all">
                                <SelectTrigger className="w-[170px] bg-background/60">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Everyone
                                    </SelectItem>
                                    <SelectItem value="friends">
                                        Friends
                                    </SelectItem>
                                    <SelectItem value="none">None</SelectItem>
                                </SelectContent>
                            </Select>
                        </SettingRow>

                        <SettingRow
                            label="Allow calls"
                            description="Who can call you"
                        >
                            <Select defaultValue="friends-contacted">
                                <SelectTrigger className="w-[260px] bg-background/60">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Everyone
                                    </SelectItem>
                                    <SelectItem value="friends-contacted">
                                        Friends and previously contacted
                                        strangers
                                    </SelectItem>
                                    <SelectItem value="friends">
                                        Only friends
                                    </SelectItem>
                                    <SelectItem value="none">None</SelectItem>
                                </SelectContent>
                            </Select>
                        </SettingRow>
                    </div>
                </section>

                <section className="space-y-4">
                    <h4 className="text-xl font-semibold text-foreground">
                        Blocked messages
                    </h4>
                    <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-xl border border-border bg-card/40 px-4 py-4 text-left transition hover:border-border/80"
                    >
                        <span className="text-base font-medium text-foreground">
                            Block list
                        </span>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </button>
                </section>

                <section className="space-y-4">
                    <h4 className="text-xl font-semibold text-foreground">
                        Search criteria
                    </h4>
                    <div className="rounded-xl border border-border bg-card/40 p-4 md:p-5">
                        <SettingRow
                            label={`Allow strangers to find and add you via phone number ${user?.phone || "N/A"}`}
                        >
                            <SettingSwitch
                                checked={allowSearchByPhone}
                                onToggle={() =>
                                    setAllowSearchByPhone((prev) => !prev)
                                }
                            />
                        </SettingRow>
                    </div>
                </section>

                <section className="space-y-4">
                    <h4 className="text-xl font-semibold text-foreground">
                        Allow strangers to add friend
                    </h4>
                    <div className="space-y-1 rounded-xl border border-border bg-card/40 p-4 md:p-5">
                        <CheckboxRow label="My QR code" checked />
                        <CheckboxRow label="Common groups" checked />
                        <CheckboxRow label="Chatly business cards" checked />
                    </div>
                </section>
            </div>
        </div>
    );
}

function SettingRow({
    label,
    description,
    children,
}: {
    label: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-lg px-2 py-3">
            <div className="space-y-1">
                <p className="text-base font-medium text-foreground">{label}</p>
                {description && (
                    <p className="text-sm text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
            {children}
        </div>
    );
}

function SettingSwitch({
    checked,
    onToggle,
}: {
    checked: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={onToggle}
            className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                checked ? "bg-brand" : "bg-muted",
            )}
        >
            <span
                className={cn(
                    "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
                    checked ? "translate-x-5" : "translate-x-0.5",
                )}
            />
        </button>
    );
}

function CheckboxRow({ label, checked }: { label: string; checked?: boolean }) {
    return (
        <Label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-base font-medium text-foreground">
            <span
                className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-md border",
                    checked
                        ? "border-brand bg-brand text-white"
                        : "border-border bg-background text-transparent",
                )}
            >
                <Check className="h-3.5 w-3.5" />
            </span>
            {label}
        </Label>
    );
}
