import { cn } from "@/lib/utils";

interface IPageLoader {
    type?: "spinner" | "dots" | "pulse";
    message?: string;
    className?: string;
}

export default function PageLoader({
    type = "dots",
    message,
    className,
}: IPageLoader) {
    const displayMessage = message || "Loading...";

    return (
        <div
            className={cn(
                "flex h-screen w-full items-center justify-center bg-background",
                className,
            )}
        >
            <div className="flex flex-col items-center gap-6">
                {type === "spinner" && <SpinnerAnimation />}
                {type === "dots" && <DotsAnimation />}
                {type === "pulse" && <PulseAnimation />}

                <div className="flex flex-col items-center gap-2">
                    <h1 className="text-2xl font-bold text-foreground">
                        Chatly
                    </h1>
                    {displayMessage && (
                        <p className="animate-pulse text-sm font-medium text-muted-foreground">
                            {displayMessage}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

function SpinnerAnimation() {
    return (
        <div className="relative h-16 w-16">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary/30" />
            <div
                className="absolute inset-0 animate-spin rounded-full border-4 border-primary border-t-transparent"
                style={{ animationDuration: "0.8s" }}
            />
        </div>
    );
}

function DotsAnimation() {
    return (
        <div className="flex items-center gap-2">
            <div
                className="h-3 w-3 animate-bounce rounded-full bg-primary"
                style={{ animationDelay: "0ms" }}
            />
            <div
                className="h-3 w-3 animate-bounce rounded-full bg-primary"
                style={{ animationDelay: "150ms" }}
            />
            <div
                className="h-3 w-3 animate-bounce rounded-full bg-primary"
                style={{ animationDelay: "300ms" }}
            />
        </div>
    );
}

function PulseAnimation() {
    return (
        <div className="relative h-16 w-16">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/40" />
            <div
                className="absolute inset-0 animate-pulse rounded-full bg-primary/60"
                style={{ animationDuration: "1.5s" }}
            />
            <div className="absolute inset-0 rounded-full bg-primary" />
        </div>
    );
}
