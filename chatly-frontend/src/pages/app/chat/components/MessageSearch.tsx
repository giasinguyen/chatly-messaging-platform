import { useState, useCallback, useRef, useEffect } from "react";
import { Search, X, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { messageService } from "@/services/message.service";
import type { Message } from "@/types/message";

interface MessageSearchProps {
    conversationId: string;
    onClose: () => void;
    onNavigateToMessage: (messageId: string) => void;
    onKeywordChange?: (keyword: string) => void;
}

export function MessageSearch({ conversationId, onClose, onNavigateToMessage, onKeywordChange }: MessageSearchProps) {
    const [keyword, setKeyword] = useState("");
    const [results, setResults] = useState<Message[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const doSearch = useCallback(async (q: string) => {
        if (!q.trim()) {
            setResults([]);
            setSearched(false);
            return;
        }
        setLoading(true);
        setSearched(true);
        try {
            const res = await messageService.search(conversationId, q.trim(), 0, 50);
            setResults(res.result ?? []);
            setCurrentIndex(0);
            if (res.result?.length > 0) {
                onNavigateToMessage(res.result[0].id);
            }
        } catch {
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, [conversationId, onNavigateToMessage]);

    const handleChange = (value: string) => {
        setKeyword(value);
        onKeywordChange?.(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(value), 400);
    };

    const navigatePrev = () => {
        if (results.length === 0) return;
        const newIdx = (currentIndex - 1 + results.length) % results.length;
        setCurrentIndex(newIdx);
        onNavigateToMessage(results[newIdx].id);
    };

    const navigateNext = () => {
        if (results.length === 0) return;
        const newIdx = (currentIndex + 1) % results.length;
        setCurrentIndex(newIdx);
        onNavigateToMessage(results[newIdx].id);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (e.shiftKey) navigatePrev();
            else navigateNext();
        }
        if (e.key === "Escape") onClose();
    };

    return (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
            <Search size={16} className="text-muted-foreground shrink-0" />
            <Input
                ref={inputRef}
                value={keyword}
                onChange={(e) => handleChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tìm kiếm tin nhắn..."
                className="h-8 text-sm flex-1 bg-transparent border-transparent focus-visible:ring-0 shadow-none"
            />
            {loading && <Loader2 size={14} className="animate-spin text-muted-foreground shrink-0" />}
            {searched && !loading && results.length > 0 && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {currentIndex + 1}/{results.length}
                </span>
            )}
            {searched && !loading && results.length === 0 && keyword.trim() && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">Không tìm thấy</span>
            )}
            <div className="flex items-center gap-0.5">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={navigatePrev}
                    disabled={results.length === 0}
                >
                    <ChevronUp size={14} />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={navigateNext}
                    disabled={results.length === 0}
                >
                    <ChevronDown size={14} />
                </Button>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
                <X size={14} />
            </Button>
        </div>
    );
}
