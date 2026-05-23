import { useCallback, type RefObject } from "react";
import type { ChatInputRef } from "./ChatInput";

interface UseFileDropHandlersOptions {
    chatInputRef: RefObject<ChatInputRef>;
    setIsDragging: (dragging: boolean) => void;
}

export function useFileDropHandlers({
    chatInputRef,
    setIsDragging,
}: UseFileDropHandlersOptions) {
    const handleDragEnter = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(true);
        },
        [setIsDragging],
    );

    const handleDragLeave = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (
                e.relatedTarget === null ||
                !e.currentTarget.contains(e.relatedTarget as Node)
            ) {
                setIsDragging(false);
            }
        },
        [setIsDragging],
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) chatInputRef.current?.addFiles(files);
        },
        [chatInputRef, setIsDragging],
    );

    return { handleDragEnter, handleDragLeave, handleDragOver, handleDrop };
}
