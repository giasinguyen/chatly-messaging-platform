import { Users, Video, X } from "lucide-react";

interface GroupVideoUpgradeRequestDialogProps {
    visible: boolean;
    requesterName: string;
    onAccept: () => void;
    onDecline: () => void;
}

export function GroupVideoUpgradeRequestDialog({
    visible,
    requesterName,
    onAccept,
    onDecline,
}: GroupVideoUpgradeRequestDialogProps) {
    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">
                        Switch Group Call To Video?
                    </h3>
                    <button
                        onClick={onDecline}
                        className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted"
                        aria-label="Decline group video upgrade request"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="mb-6 flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
                        <Users size={20} />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">{requesterName}</p>
                        <p className="text-xs text-muted-foreground">
                            wants to upgrade this group voice call to a video call for everyone.
                        </p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onDecline}
                        className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    >
                        Decline
                    </button>
                    <button
                        onClick={onAccept}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand/90"
                    >
                        <Video size={16} />
                        Accept
                    </button>
                </div>
            </div>
        </div>
    );
}
