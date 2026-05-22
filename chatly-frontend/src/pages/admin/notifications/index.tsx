import React from "react";
import { TodoPage } from "@/components/admin/TodoPage";
import { Bell } from "lucide-react";

export const NotificationsPage: React.FC = () => {
  return (
    <TodoPage
      title="Notification Dispatch"
      description="Send global notices or target pushes to segmented subsets of active devices"
      icon={<Bell size={28} />}
      todoItems={[
        "Compose and dispatch system-wide announcement alerts",
        "Target notices to specific user demographics or platforms",
        "Audit push delivery success/failure counts",
        "Trigger remote configuration variables refresh",
        "Schedule future system maintenance announcements",
      ]}
      requiredApis={[
        "POST /api/admin/notifications/broadcast",
        "POST /api/admin/notifications/targeted",
        "GET /api/admin/notifications/history",
      ]}
    />
  );
};
export default NotificationsPage;
