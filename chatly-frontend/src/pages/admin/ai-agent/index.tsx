import React from "react";
import { TodoPage } from "@/components/admin/TodoPage";
import { Cpu } from "lucide-react";

export const AiAgentPage: React.FC = () => {
  return (
    <TodoPage
      title="AI Support Control"
      description="Monitor AI Agent sessions, prompt structures, context windows, and model configurations"
      icon={<Cpu size={28} />}
      todoItems={[
        "Track active LLM support conversations and context tokens",
        "Fine-tune agent behavior by altering prompt templates",
        "Inspect prompt routing variables and tool execution history",
        "Configure model parameters: temperature, top-k, system instructions",
        "View usage cost analytics and API quota compliance",
      ]}
      requiredApis={[
        "GET /internal/agent/sessions",
        "POST /internal/agent/prompts/update",
        "GET /internal/agent/metrics",
      ]}
    />
  );
};
export default AiAgentPage;
