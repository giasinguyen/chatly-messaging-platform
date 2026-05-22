import React from "react";
import { TodoPage } from "@/components/admin/TodoPage";
import { Settings } from "lucide-react";

export const SettingsPage: React.FC = () => {
  return (
    <TodoPage
      title="System Settings"
      description="Configure backend parameters, API rate limits, security rules, and user limits"
      icon={<Settings size={28} />}
      todoItems={[
        "Adjust global API rate limiter thresholds",
        "Toggle public registration availability status",
        "Configure session timeouts and token expiration periods",
        "Manage allowed file types and max upload size boundaries",
        "Configure SMTP gateway and mobile push credentials",
      ]}
      requiredApis={[
        "GET /api/admin/settings",
        "PUT /api/admin/settings",
      ]}
    />
  );
};
export default SettingsPage;
