import { useState, useRef, useEffect } from "react";
import { MessageSquare, MoreHorizontal, ShieldOff, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FriendActionsProps {
    onMessage: () => void;
    onBlock: () => void;
    onRemove: () => void;
}

// Shadcn DropdownMenu not work here!. Implement DropdownMenu with html/Tailwind. 
export function FriendActions({ onMessage, onBlock, onRemove }: FriendActionsProps) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    return (
        <div className={cn("flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity", open && "opacity-100")}>
            <Button size="sm" variant="ghost" onClick={onMessage} className="h-8 rounded-full px-3">
                <MessageSquare className="h-4 w-4 mr-1" /> Message
            </Button>

            <div ref={menuRef} className="relative">
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 rounded-full p-0"
                    onClick={() => setOpen((v) => !v)}
                >
                    <MoreHorizontal className="h-4 w-4" />
                </Button>

                {open && (
                    <div className="absolute right-0 top-full mt-1 z-50 min-w-[8rem] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
                        <button
                            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                setOpen(false);
                                onBlock();
                            }}
                        >
                            <ShieldOff className="h-4 w-4" /> Block
                        </button>
                        <button
                            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                setOpen(false);
                                onRemove();
                            }}
                        >
                            <UserMinus className="h-4 w-4" /> Remove
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
