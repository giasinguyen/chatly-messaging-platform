import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent as ReactKeyboardEvent,
    type RefObject,
} from "react";
import { contactService } from "@/services/contact.service";
import {
    buildMentionSuggestions,
    detectMentionQuery,
    extractMentionTargets,
    getTextareaMentionAnchor,
    insertMentionAtCursor,
    type MentionCandidate,
    type MentionDropdownAnchor,
    type MentionSuggestion,
} from "@/utils/mention";

interface UsePostMentionsOptions {
    currentUserId?: string;
    content: string;
    setContent: (content: string) => void;
    textareaRef: RefObject<HTMLTextAreaElement | null>;
    isActive: boolean;
}

export function usePostMentions({
    currentUserId,
    content,
    setContent,
    textareaRef,
    isActive,
}: UsePostMentionsOptions) {
    const [friends, setFriends] = useState<MentionCandidate[]>([]);
    const [query, setQuery] = useState<string | null>(null);
    const [anchor, setAnchor] = useState<MentionDropdownAnchor | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const cursorPosRef = useRef(content.length);

    const suggestions = useMemo(
        () =>
            buildMentionSuggestions(query, friends, {
                includeAi: true,
                includeAll: false,
                currentUserId,
                maxUsers: 8,
            }),
        [currentUserId, friends, query],
    );

    useEffect(() => {
        if (!isActive || !currentUserId) {
            return;
        }

        const loadFriends = async () => {
            try {
                const response = await contactService.getByStatus("ACCEPTED");
                if (response.code !== 1000 || !response.result) {
                    setFriends([]);
                    return;
                }

                setFriends(
                    response.result
                        .map((item) => {
                            const peer =
                                item.user.id === currentUserId
                                    ? item.contact
                                    : item.user;
                            return {
                                id: peer.id,
                                displayName: peer.displayName,
                                username: peer.username,
                                avatarUrl: peer.avatarUrl,
                            } satisfies MentionCandidate;
                        })
                        .filter((item) => item.id !== currentUserId),
                );
            } catch {
                setFriends([]);
            }
        };

        void loadFriends();
    }, [currentUserId, isActive]);

    const updateQuery = (nextContent: string, cursorFromEvent?: number | null) => {
        const textarea = textareaRef.current;
        const cursorPos =
            cursorFromEvent ?? textarea?.selectionStart ?? nextContent.length;
        cursorPosRef.current = cursorPos;
        const nextQuery = detectMentionQuery(nextContent, cursorPos);

        if (nextQuery === null) {
            setQuery(null);
            setAnchor(null);
            return;
        }

        setQuery(nextQuery);
        setActiveIndex(0);
        if (textarea) {
            setAnchor(getTextareaMentionAnchor(textarea, cursorPos));
        }
    };

    const selectSuggestion = (suggestion: MentionSuggestion) => {
        const cursorPos = cursorPosRef.current;
        setContent(
            insertMentionAtCursor(content, cursorPos, suggestion, {
                userMentionField: "username",
            }),
        );
        setQuery(null);
        setAnchor(null);
        requestAnimationFrame(() => textareaRef.current?.focus());
    };

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
        if (query === null || !suggestions.length) {
            return;
        }
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((current) => (current + 1) % suggestions.length);
        }
        if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex(
                (current) => (current - 1 + suggestions.length) % suggestions.length,
            );
        }
        if (event.key === "Enter" || event.key === "Tab") {
            event.preventDefault();
            selectSuggestion(suggestions[activeIndex]);
        }
        if (event.key === "Escape") {
            event.preventDefault();
            setQuery(null);
            setAnchor(null);
        }
    };

    const reset = () => {
        setQuery(null);
        setAnchor(null);
        setActiveIndex(0);
        cursorPosRef.current = content.length;
    };

    const getMentionIds = (nextContent: string) =>
        extractMentionTargets(nextContent, friends, {
            includeAi: false,
            includeAll: false,
        });

    return {
        activeIndex,
        anchor,
        getMentionIds,
        handleKeyDown,
        query,
        reset,
        selectSuggestion,
        suggestions,
        updateQuery,
    };
}
