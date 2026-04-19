import { Loader2, Send, Trash2 } from "lucide-react";
import { AudioWaveform } from "@/components/AudioWaveform";
import { Button } from "@/components/ui/button";

function formatElapsed(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

interface AudioRecordingBarProps {
    elapsedSeconds: number;
    analyserNode: AnalyserNode | null;
    onSend: () => Promise<void>;
    onCancel: () => void;
    isSending: boolean;
}

export function AudioRecordingBar({ elapsedSeconds, analyserNode, onSend, onCancel, isSending }: AudioRecordingBarProps) {
    return (
        <div className="flex items-center gap-3 px-6 py-3 bg-background border-t border-border animate-in slide-in-from-bottom-2 duration-200">
            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onCancel}
                disabled={isSending}
                className="h-9 w-9 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                title="Cancel recording"
            >
                <Trash2 size={16} />
            </Button>

            <div className="flex-1 flex items-center gap-3 min-w-0">
                <span className="text-sm font-medium text-brand tabular-nums shrink-0">
                    {formatElapsed(elapsedSeconds)}
                </span>
                <AudioWaveform
                    analyserNode={analyserNode}
                    isActive={true}
                    barCount={24}
                    className="flex-1"
                />
            </div>

            <Button
                type="button"
                onClick={onSend}
                disabled={isSending || elapsedSeconds === 0}
                className="h-9 w-9 shrink-0 bg-brand text-white hover:bg-brand/90 rounded-full p-0"
                title="Send voice message"
            >
                {isSending ? (
                    <Loader2 size={16} className="animate-spin" />
                ) : (
                    <Send size={16} />
                )}
            </Button>
        </div>
    );
}
