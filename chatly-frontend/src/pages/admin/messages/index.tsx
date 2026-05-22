import React from "react";
import { TodoPage } from "@/components/admin/TodoPage";
import { MessageSquare } from "lucide-react";

export const MessagesPage: React.FC = () => {
  return (
    <TodoPage
      title="Message Ledger"
      description="System-wide message logging, routing analytics, and visibility controls"
      icon={<MessageSquare size={28} />}
      todoItems={[
        "Search message content database using keywords or sender metadata",
        "Override message status (Sent, Delivered, Seen, Recalled)",
        "Audit deleted messages for forensic compliance logs",
        "Inspect attachments and shared links payload metadata",
        "Review end-to-end WebSocket routing integrity",
      ]}
      requiredApis={[
        "GET /api/admin/messages?sender={id}&query={keyword}&page={page}&size={size}",
        "DELETE /api/admin/messages/{id}",
      ]}
    />
  );
};
export default MessagesPage;
