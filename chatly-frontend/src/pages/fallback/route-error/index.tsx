import { RefreshCw } from "lucide-react";
import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";

function getErrorMessage(error: unknown): string {
    if (isRouteErrorResponse(error)) {
        return error.statusText || "The page could not be loaded.";
    }
    if (error instanceof Error) {
        return error.message;
    }
    return "The page could not be loaded.";
}

export default function RouteErrorPage() {
    const error = useRouteError();

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg">
                <p className="text-sm font-medium text-muted-foreground">
                    Page load failed
                </p>
                <h1 className="mt-2 text-2xl font-semibold">
                    Chatly could not open this page.
                </h1>
                <p className="mt-3 break-words text-sm text-muted-foreground">
                    {getErrorMessage(error)}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                        <RefreshCw className="size-4" />
                        Reload page
                    </button>
                    <Link
                        to="/"
                        className="inline-flex items-center rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                    >
                        Back to home
                    </Link>
                </div>
            </div>
        </div>
    );
}
