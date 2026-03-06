import { Suspense } from "react";
import PageLoader from "./PageLoader";

export const LazyWrapper = ({ children }: { children: React.ReactNode }) => (
    <Suspense fallback={<PageLoader />}>{children}</Suspense>
);
