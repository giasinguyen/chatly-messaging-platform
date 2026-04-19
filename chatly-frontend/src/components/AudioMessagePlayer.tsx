import { useState, useRef, useCallback, useEffect } from "react";
import { Play, Pause, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioMessagePlayerProps {
    url: string;
    name?: string;
    durationSeconds?: number;
    isMe?: boolean;
    className?: string;
}

function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioMessagePlayer({ url, name, durationSeconds, isMe = false, className }: AudioMessagePlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(durationSeconds ?? 0);
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleDurationChange = () => {
            if (isFinite(audio.duration)) setDuration(audio.duration);
        };
        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
            audio.currentTime = 0;
        };
        const handleError = () => {
            setHasError(true);
            setIsLoading(false);
        };
        const handleCanPlay = () => setIsLoading(false);

        audio.addEventListener("timeupdate", handleTimeUpdate);
        audio.addEventListener("durationchange", handleDurationChange);
        audio.addEventListener("ended", handleEnded);
        audio.addEventListener("error", handleError);
        audio.addEventListener("canplay", handleCanPlay);

        return () => {
            audio.removeEventListener("timeupdate", handleTimeUpdate);
            audio.removeEventListener("durationchange", handleDurationChange);
            audio.removeEventListener("ended", handleEnded);
            audio.removeEventListener("error", handleError);
            audio.removeEventListener("canplay", handleCanPlay);
        };
    }, []);

    const handleTogglePlay = useCallback(async () => {
        const audio = audioRef.current;
        if (!audio || hasError) return;
        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            setIsLoading(true);
            try {
                await audio.play();
                setIsPlaying(true);
            } catch {
                setHasError(true);
            } finally {
                setIsLoading(false);
            }
        }
    }, [isPlaying, hasError]);

    const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const audio = audioRef.current;
        if (!audio) return;
        const time = parseFloat(e.target.value);
        audio.currentTime = time;
        setCurrentTime(time);
    }, []);

    const progress = duration > 0 ? currentTime / duration : 0;
    const displayDuration = duration > 0 ? formatDuration(duration) : (durationSeconds ? formatDuration(durationSeconds) : (name ?? "--:--"));
    const displayCurrent = isPlaying || currentTime > 0 ? formatDuration(currentTime) : formatDuration(0);

    return (
        <div
            className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 min-w-52 max-w-72",
                isMe ? "bg-black/15" : "bg-muted/60 border border-border/50",
                className,
            )}
        >
            <audio ref={audioRef} src={url} preload="metadata" />

            <button
                type="button"
                onClick={handleTogglePlay}
                disabled={isLoading}
                className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
                    isMe
                        ? "bg-white/20 hover:bg-white/30 text-white"
                        : "bg-brand/10 hover:bg-brand/20 text-brand",
                    isLoading && "opacity-50 cursor-wait",
                )}
                aria-label={isPlaying ? "Pause" : "Play"}
            >
                {hasError ? (
                    <AlertCircle size={16} />
                ) : isPlaying ? (
                    <Pause size={16} fill="currentColor" />
                ) : (
                    <Play size={16} fill="currentColor" />
                )}
            </button>

            <div className="flex-1 min-w-0 space-y-1.5">
                <div className="relative h-1.5 w-full">
                    <div className={cn("h-full w-full rounded-full", isMe ? "bg-white/20" : "bg-muted-foreground/20")} />
                    <div
                        className={cn("absolute top-0 left-0 h-full rounded-full transition-all", isMe ? "bg-white/80" : "bg-brand")}
                        style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                    <input
                        type="range"
                        min={0}
                        max={duration || 1}
                        step={0.1}
                        value={currentTime}
                        onChange={handleSeek}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        aria-label="Seek"
                    />
                </div>

                <div className={cn("flex justify-between text-[10px] font-medium", isMe ? "text-white/70" : "text-muted-foreground")}>
                    <span>{displayCurrent}</span>
                    <span className="truncate max-w-24 text-right">
                        {hasError ? "Load error" : displayDuration}
                    </span>
                </div>
            </div>
        </div>
    );
}
