import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface AudioWaveformProps {
    analyserNode: AnalyserNode | null;
    isActive: boolean;
    barCount?: number;
    className?: string;
}

export function AudioWaveform({ analyserNode, isActive, barCount = 20, className }: AudioWaveformProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animFrameRef = useRef<number | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const draw = () => {
            animFrameRef.current = requestAnimationFrame(draw);
            const { width, height } = canvas;
            ctx.clearRect(0, 0, width, height);

            let values: number[];
            if (analyserNode && isActive) {
                const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
                analyserNode.getByteFrequencyData(dataArray);
                const step = Math.floor(dataArray.length / barCount);
                values = Array.from({ length: barCount }, (_, i) => dataArray[i * step] / 255);
            } else {
                values = Array.from({ length: barCount }, () => 0.08);
            }

            const barWidth = width / barCount - 2;
            values.forEach((v, i) => {
                const barHeight = Math.max(4, v * height);
                const x = i * (barWidth + 2);
                const y = (height - barHeight) / 2;
                const radius = barWidth / 2;

                ctx.beginPath();
                ctx.roundRect(x, y, barWidth, barHeight, radius);
                ctx.fillStyle = isActive ? "hsl(var(--brand))" : "hsl(var(--muted-foreground))";
                ctx.globalAlpha = isActive ? 0.85 : 0.4;
                ctx.fill();
            });
        };

        draw();
        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [analyserNode, isActive, barCount]);

    return (
        <canvas
            ref={canvasRef}
            width={barCount * 8}
            height={32}
            className={cn("shrink-0", className)}
        />
    );
}
