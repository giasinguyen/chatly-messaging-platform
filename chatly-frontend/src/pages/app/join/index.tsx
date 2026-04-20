import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { groupService } from "@/services/group.service";
import { Loader2, CheckCircle2, XCircle, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { InviteLinkInfoResponse } from "@/types/group";

type PageStatus = "loading" | "preview" | "joining" | "success" | "pending" | "error";

export default function JoinByInvitePage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [status, setStatus] = useState<PageStatus>("loading");
    const [groupInfo, setGroupInfo] = useState<InviteLinkInfoResponse | null>(null);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState("Failed to join group");
    const calledRef = useRef(false);

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setErrorMsg("Invalid invite link");
            return;
        }
        if (calledRef.current) return;
        calledRef.current = true;

        groupService
            .getInviteLinkInfo(token)
            .then((res) => {
                const info = res.result;
                setGroupInfo(info);
                setConversationId(info.conversationId);

                if (info.alreadyMember) {
                    setStatus("success");
                } else if (info.hasPendingRequest) {
                    setStatus("pending");
                } else {
                    setStatus("preview");
                }
            })
            .catch(() => {
                setErrorMsg("Failed to load group info. The link might have expired or is invalid.");
                setStatus("error");
            });
    }, [token]);

    const handleJoin = async () => {
        if (!token) return;
        setStatus("joining");
        try {
            const res = await groupService.joinByInviteLink(token);
            setConversationId(res.result.conversationId);
            if (res.result.role === null || res.result.role === undefined) {
                setStatus("pending");
            } else {
                setStatus("success");
            }
        } catch (err: unknown) {
            const msg =
                err instanceof Error
                    ? err.message
                    : "Failed to join group. The link might have expired or is invalid.";
            setErrorMsg(msg);
            setStatus("error");
        }
    };

    const groupInitial = groupInfo?.name?.charAt(0)?.toUpperCase() ?? "G";

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="max-w-sm w-full text-center space-y-4">
                {(status === "loading" || status === "joining") && (
                    <>
                        <Loader2 className="h-10 w-10 animate-spin text-brand mx-auto" />
                        <p className="text-muted-foreground">
                            {status === "loading" ? "Loading group info..." : "Joining group..."}
                        </p>
                    </>
                )}

                {status === "preview" && groupInfo && (
                    <>
                        <Avatar className="h-20 w-20 mx-auto">
                            <AvatarImage src={groupInfo.avatarUrl ?? undefined} alt={groupInfo.name} />
                            <AvatarFallback className="text-2xl">{groupInitial}</AvatarFallback>
                        </Avatar>
                        <h2 className="text-lg font-semibold">{groupInfo.name}</h2>
                        <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>{groupInfo.memberCount} members</span>
                        </div>
                        {groupInfo.requireApproval && (
                            <p className="text-xs text-muted-foreground">
                                This group requires admin approval to join
                            </p>
                        )}
                        <Button className="w-full" onClick={handleJoin}>
                            {groupInfo.requireApproval ? "Request to join" : "Join group"}
                        </Button>
                        <Button variant="outline" className="w-full" onClick={() => navigate("/chat")}>
                            Cancel
                        </Button>
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

                {status === "pending" && (
                    <>
                        <Clock className="h-12 w-12 text-amber-500 mx-auto" />
                        <h2 className="text-lg font-semibold">Request pending</h2>
                        <p className="text-sm text-muted-foreground">
                            Your join request has been sent. Please wait for the group owner to approve.
                        </p>
                        <Button className="w-full" onClick={() => navigate("/chat")}>
                            Go to chats
                        </Button>
                    </>
                )}

                {status === "error" && (
                    <>
                        <XCircle className="h-12 w-12 text-destructive mx-auto" />
                        <h2 className="text-lg font-semibold">Failed to join</h2>
                        <p className="text-sm text-muted-foreground">{errorMsg}</p>
                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={() => navigate("/")}>
                                Go to home
                            </Button>
                            <Button className="flex-1" onClick={() => navigate("/chat")}>
                                Open Chat
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
