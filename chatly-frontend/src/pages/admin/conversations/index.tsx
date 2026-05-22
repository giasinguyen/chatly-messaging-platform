import React from "react";
import { TodoPage } from "@/components/admin/TodoPage";
import { MessagesSquare } from "lucide-react";

export const ConversationsPage: React.FC = () => {
  return (
    <TodoPage
      title="Conversations Management"
      description="Monitor and manage system chat rooms and group properties"
      icon={<MessagesSquare size={28} />}
      todoItems={[
        "List all active direct chats and channels",
        "View conversation membership rosters and roles",
        "Modify channel details (title, description, avatar)",
        "Dissolve inactive group chats or demote group owners",
        "Archiving and data exports of channels",
      ]}
      requiredApis={[
        "GET /api/admin/conversations?type={type}&page={page}&size={size}",
        "DELETE /api/admin/conversations/{id}",
        "PUT /api/admin/conversations/{id}/members/{userId}",
      ]}
    />
  );
};
export default ConversationsPage;
