import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { groupService } from "@/services/group.service";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function JoinByInvitePage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState("Failed to join group");

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setErrorMsg("Invalid invite link");
            return;
        }

        groupService
            .joinByInviteLink(token)
            .then((res) => {
                setConversationId(res.result.conversationId);
                setStatus("success");
            })
            .catch((err) => {
                    err?.response?.data?.message ?? "Failed to join group. The link might have expired or is invalid.";
                setErrorMsg(msg);
                setStatus("error");
            });
    }, [token]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="max-w-sm w-full text-center space-y-4">
                {status === "loading" && (
                    <>
                        <Loader2 className="h-10 w-10 animate-spin text-brand mx-auto" />
                        <p className="text-muted-foreground">Joining group...</p>
                    </>
                )}

                {status === "success" && (
                    <>
                        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                        <h2 className="text-lg font-semibold">Joined group successfully!</h2>
                        <p className="text-sm text-muted-foreground">
                            You have been added to the group. Start chatting now!
                        </p>
                        <Button
                            className="w-full"
                            onClick={() => navigate(conversationId ? `/chat/${conversationId}` : "/chat")}
                        >
                            Open conversation
                        </Button>
                    </>
                )}

                {status === "error" && (
                    <>
                        <XCircle className="h-12 w-12 text-destructive mx-auto" />
                        <h2 className="text-lg font-semibold">Failed to join</h2>
                        <p className="text-sm text-muted-foreground">{errorMsg}</p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => navigate("/")}
                            >
                                Go to home
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={() => navigate("/chat")}
                            >
                                Open Chat
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
