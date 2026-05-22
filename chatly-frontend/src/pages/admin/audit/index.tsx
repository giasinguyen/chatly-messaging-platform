import React from "react";
import { TodoPage } from "@/components/admin/TodoPage";
import { ScrollText } from "lucide-react";

export const AuditLogsPage: React.FC = () => {
  return (
    <TodoPage
      title="Audit Logs"
      description="Track all administrative actions for platform accountability and forensic security"
      icon={<ScrollText size={28} />}
      todoItems={[
        "Log all admin actions (suspend, delete, report status change)",
        "Filterable by admin user, action type, and date range",
        "Detailed action payloads and before/after states",
        "Export audit log to CSV / JSON format",
        "Retention policy configuration",
      ]}
      requiredApis={[
        "GET /api/admin/audit-logs?type={type}&from={date}&to={date}",
        "GET /api/admin/audit-logs/export?format=csv",
      ]}
    />
  );
};
export default AuditLogsPage;
