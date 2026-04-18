import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatUser } from "@/types/message";

interface PollVoterPopoverProps {
    voterIds: string[];
    participantDirectory: Record<string, ChatUser>;
    optionLabel: string;
    anonymous?: boolean;
    children: React.ReactNode;
}

export function PollVoterPopover({
    voterIds,
    participantDirectory,
    optionLabel,
    anonymous = false,
    children,
}: PollVoterPopoverProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    if (voterIds.length === 0) return <>{children}</>;

    return (
        <div ref={ref} className="relative inline-flex">
            <span
                role="button"
                tabIndex={0}
                onClick={() => setOpen((v) => !v)}
                onKeyDown={(e) => e.key === "Enter" && setOpen((v) => !v)}
                className="cursor-pointer"
            >
                {children}
            </span>

            {open && (
                <div className="absolute bottom-full right-0 mb-1.5 z-50 w-52 rounded-xl border border-border/50 bg-background shadow-lg overflow-hidden">
                    <div className="px-3 py-2 border-b border-border/50">
                        <p className="text-xs font-medium text-foreground truncate">{optionLabel}</p>
                        <p className="text-[10px] text-muted-foreground">
                            {anonymous
                                ? `${voterIds.length} vote${voterIds.length !== 1 ? "s" : ""} (anonymous)`
                                : `${voterIds.length} vote${voterIds.length !== 1 ? "s" : ""}`}
                        </p>
                    </div>
                    {!anonymous && (
                        <ScrollArea className="max-h-40">
                            <div className="p-1.5 space-y-0.5">
                                {voterIds.map((id) => {
                                    const user = participantDirectory[id];
                                    const name = user?.displayName ?? user?.username ?? "Unknown";
                                    return (
                                        <div
                                            key={id}
                                            className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted/50"
                                        >
                                            <Avatar className="h-5 w-5">
                                                <AvatarImage src={user?.avatarUrl} />
                                                <AvatarFallback className="text-[9px]">
                                                    {name.charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs text-foreground truncate">{name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            )}
        </div>
    );
}
