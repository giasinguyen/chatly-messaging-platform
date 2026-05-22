import type { ReportReason, ReportResponse } from "@/types/post";

export interface CreateUserReportRequest {
    reason: ReportReason;
    description?: string;
}

export type UserReportResponse = Omit<ReportResponse, "postId">;
