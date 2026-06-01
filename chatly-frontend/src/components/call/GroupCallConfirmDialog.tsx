import { useEffect, useState, useCallback } from "react";
import { Phone, Video, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CallType } from "@/types/call";

const COUNTDOWN_SECONDS = 3;

interface GroupCallConfirmDialogProps {
    visible: boolean;
    groupName: string;
    callType: CallType;
    onConfirm: () => void;
    onCancel: () => void;
}

export function GroupCallConfirmDialog({
    visible,
    groupName,
    callType,
    onConfirm,
    onCancel,
}: GroupCallConfirmDialogProps) {
    const { t } = useTranslation();
    const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

    const handleConfirm = useCallback(() => {
        onConfirm();
    }, [onConfirm]);

    // Reset countdown when dialog becomes visible
    useEffect(() => {
        if (!visible) {
            setCountdown(COUNTDOWN_SECONDS);
            return;
        }

        setCountdown(COUNTDOWN_SECONDS);
        const interval = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [visible]);

    if (!visible) return null;

    const callLabel =
        callType === "VIDEO" ? t("chat.call_video") : t("chat.call_voice");
    const CallIcon = callType === "VIDEO" ? Video : Phone;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">
                        {t("chat.call_start_group_title", {
                            type: callLabel.toLowerCase(),
                        })}
                    </h3>
                    <button
                        onClick={onCancel}
                        className="rounded-full p-1 text-muted-foreground hover:bg-muted transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
                        <CallIcon size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-foreground">
                            {groupName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {t("chat.call_notify_group_members")}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    >
                        {t("common.cancel")}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand/90"
                    >
                        {countdown > 0
                            ? t("chat.call_start_countdown", {
                                  count: countdown,
                              })
                            : t("chat.call_start")}
                    </button>
                </div>
            </div>
        </div>
    );
}
