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
    const [errorMsg, setErrorMsg] = useState("Không thể tham gia nhóm");

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setErrorMsg("Link mời không hợp lệ");
            return;
        }

        groupService
            .joinByInviteLink(token)
            .then((res) => {
                setConversationId(res.result.conversationId);
                setStatus("success");
            })
            .catch((err) => {
                const msg =
                    err?.response?.data?.message ?? "Không thể tham gia nhóm. Link có thể đã hết hạn hoặc không hợp lệ.";
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
                        <p className="text-muted-foreground">Đang tham gia nhóm...</p>
                    </>
                )}

                {status === "success" && (
                    <>
                        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                        <h2 className="text-lg font-semibold">Tham gia nhóm thành công!</h2>
                        <p className="text-sm text-muted-foreground">
                            Bạn đã được thêm vào nhóm. Hãy bắt đầu trò chuyện ngay!
                        </p>
                        <Button
                            className="w-full"
                            onClick={() => navigate(conversationId ? `/chat/${conversationId}` : "/chat")}
                        >
                            Mở cuộc trò chuyện
                        </Button>
                    </>
                )}

                {status === "error" && (
                    <>
                        <XCircle className="h-12 w-12 text-destructive mx-auto" />
                        <h2 className="text-lg font-semibold">Không thể tham gia</h2>
                        <p className="text-sm text-muted-foreground">{errorMsg}</p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => navigate("/")}
                            >
                                Về trang chủ
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={() => navigate("/chat")}
                            >
                                Mở Chat
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
