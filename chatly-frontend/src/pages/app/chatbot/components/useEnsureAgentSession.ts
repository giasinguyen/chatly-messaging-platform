import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { DRAFT_AGENT_SESSION_ID } from "@/constants/ai";
import { agentService } from "@/services/agent.service";
import { useChatbotStore } from "@/store/chatbot.store";

export function useEnsureAgentSession(sessionId?: string) {
    const navigate = useNavigate();
    const addSession = useChatbotStore((state) => state.addSession);
    const setDraft = useChatbotStore((state) => state.setDraft);

    return useCallback(async () => {
        if (sessionId) return sessionId;
        try {
            const newSession = await agentService.createSession();
            const draft = useChatbotStore.getState().draftsBySession[DRAFT_AGENT_SESSION_ID] ?? "";
            addSession(newSession);
            if (draft) {
                setDraft(newSession.id, draft);
                setDraft(DRAFT_AGENT_SESSION_ID, "");
            }
            navigate(`/chatbot/${newSession.id}`);
            return newSession.id;
        } catch {
            toast.error("Failed to create new conversation");
            return null;
        }
    }, [sessionId, addSession, navigate, setDraft]);
}
