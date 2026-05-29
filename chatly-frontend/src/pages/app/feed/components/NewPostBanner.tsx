import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewPostBannerProps {
    count: number;
    onClick: () => void;
}

export function NewPostBanner({ count, onClick }: NewPostBannerProps) {
    const label =
        count === 1 ? "New post available" : `${count} new posts available`;
    if (count <= 0) return null;

    return (
        <div className="sticky top-0 z-10 h-10">
            <button
                type="button"
                onClick={onClick}
                className={cn(
                    "mx-auto flex h-10 items-center gap-2 rounded-full bg-brand px-4 text-xs font-semibold text-white shadow-md",
                    "hover:bg-brand/90 active:scale-[0.99]",
                )}
            >
                <ArrowUp className="h-3.5 w-3.5" />
                {label}
            </button>
        </div>
    );
}
