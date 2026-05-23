import { AlertTriangle } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface SocialErrorBoundaryProps {
    children: ReactNode;
    title?: string;
    message?: string;
}

interface SocialErrorBoundaryState {
    hasError: boolean;
}

export class SocialErrorBoundary extends Component<
    SocialErrorBoundaryProps,
    SocialErrorBoundaryState
> {
    state: SocialErrorBoundaryState = {
        hasError: false,
    };

    static getDerivedStateFromError(): SocialErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Social page render error", error, errorInfo);
    }

    private handleRetry = () => {
        this.setState({ hasError: false });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex h-full w-full items-center justify-center bg-background px-6">
                    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">
                            <AlertTriangle className="h-6 w-6" />
                        </div>
                        <h2 className="text-lg font-semibold text-foreground">
                            {this.props.title ?? "Something went wrong"}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {this.props.message ??
                                "This section failed to render. Try again."}
                        </p>
                        <Button className="mt-4" onClick={this.handleRetry}>
                            Try again
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
