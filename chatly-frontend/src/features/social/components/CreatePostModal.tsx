import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Loader2, Globe, Users, Lock } from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { MediaUploadZone } from "./MediaUploadZone";
import { postService } from "@/services/post.service";
import { contactService } from "@/services/contact.service";
import { usePostStore } from "@/store/post.store";
import { useAuthStore } from "@/store/auth.store";
import type { PostVisibility } from "@/types/post";
import { MentionSuggestionsDropdown } from "@/components/mention/MentionSuggestionsDropdown";
import {
    buildMentionSuggestions,
    detectMentionQuery,
    extractMentionTargets,
    insertMentionAtCursor,
    type MentionCandidate,
    type MentionSuggestion,
} from "@/utils/mention";

const VISIBILITY_OPTIONS: { value: PostVisibility; label: string; icon: typeof Globe }[] = [
    { value: "PUBLIC", label: "Everyone", icon: Globe },
    { value: "FRIENDS_ONLY", label: "Friends", icon: Users },
    { value: "ONLY_ME", label: "Only me", icon: Lock },
];

const MAX_CONTENT_LENGTH = 2000;

interface CreatePostModalProps {
    open: boolean;
    onClose: () => void;
}

export function CreatePostModal({ open, onClose }: CreatePostModalProps) {
    const currentUserId = useAuthStore((s) => s.user?.id);
    const [mediaUrls, setMediaUrls] = useState<string[]>([]);
    const [friends, setFriends] = useState<MentionCandidate[]>([]);
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionIndex, setMentionIndex] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const prependPost = usePostStore((s) => s.prependPost);
    const [content, setContent] = useState("");
    const [visibility, setVisibility] = useState<PostVisibility>("PUBLIC");
    const [contentError, setContentError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const canSubmit = content.trim().length > 0 && content.trim().length <= MAX_CONTENT_LENGTH;

    const mentionSuggestions = useMemo(
        () =>
            buildMentionSuggestions(mentionQuery, friends, {
                includeAi: true,
                includeAll: false,
                currentUserId,
                maxUsers: 8,
            }),
        [mentionQuery, friends, currentUserId],
    );

    useEffect(() => {
        if (!open || !currentUserId) {
            return;
        }

        const loadFriends = async () => {
            try {
                const response = await contactService.getByStatus("ACCEPTED");
                if (response.code !== 1000 || !response.result) {
                    setFriends([]);
                    return;
                }

                const mapped = response.result
                    .map((item) => {
                        const peer = item.user.id === currentUserId ? item.contact : item.user;
                        return {
                            id: peer.id,
                            displayName: peer.displayName,
                            username: peer.username,
                            avatarUrl: peer.avatarUrl,
                        } satisfies MentionCandidate;
                    })
                    .filter((item) => item.id !== currentUserId);

                setFriends(mapped);
            } catch {
                setFriends([]);
            }
        };

        void loadFriends();
    }, [open, currentUserId]);

    const handleMentionAwareContentChange = (
        nextValue: string,
        cursorFromEvent?: number | null,
    ) => {
        const cursorPos = cursorFromEvent ?? textareaRef.current?.selectionStart ?? nextValue.length;
        const nextMentionQuery = detectMentionQuery(nextValue, cursorPos);
        if (nextMentionQuery !== null) {
            setMentionQuery(nextMentionQuery);
            setMentionIndex(0);
            return;
        }
        setMentionQuery(null);
    };

    const handleSelectMention = (suggestion: MentionSuggestion) => {
        const currentContent = content;
        const cursorPos = textareaRef.current?.selectionStart ?? currentContent.length;
        const nextContent = insertMentionAtCursor(currentContent, cursorPos, suggestion, {
            userMentionField: "username",
        });

        setContent(nextContent);
        setMentionQuery(null);
        requestAnimationFrame(() => {
            textareaRef.current?.focus();
        });
    };

    const handleMentionKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
        if (mentionQuery === null || !mentionSuggestions.length) {
            return;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();
            setMentionIndex((prev) => (prev + 1) % mentionSuggestions.length);
            return;
        }
        if (event.key === "ArrowUp") {
            event.preventDefault();
            setMentionIndex((prev) => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length);
            return;
        }
        if (event.key === "Enter" || event.key === "Tab") {
            event.preventDefault();
            handleSelectMention(mentionSuggestions[mentionIndex]);
            return;
        }
        if (event.key === "Escape") {
            event.preventDefault();
            setMentionQuery(null);
        }
    };

    const handleClose = () => {
        if (isSubmitting) return;
        setContent("");
        setVisibility("PUBLIC");
        setContentError(null);
        setMediaUrls([]);
        setMentionQuery(null);
        setMentionIndex(0);
        onClose();
    };

    const onSubmit = async () => {
        const trimmedContent = content.trim();
        if (!trimmedContent) {
            setContentError("Post content cannot be empty");
            return;
        }
        if (trimmedContent.length > MAX_CONTENT_LENGTH) {
            setContentError("Content must not exceed 2000 characters");
            return;
        }

        setContentError(null);
        setIsSubmitting(true);

        try {
            const mentionIds = extractMentionTargets(trimmedContent, friends, {
                includeAi: false,
                includeAll: false,
            });
            const response = await postService.create({
                content: trimmedContent,
                mediaUrls,
                visibility,
                mentionIds,
            });

            if (response.code === 1000 && response.result) {
                prependPost(response.result);
                toast.success("Post published!");
                handleClose();
            }
        } catch {
            toast.error("Failed to publish post. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
            <DialogContent className="max-w-lg rounded-3xl p-0 overflow-visible shadow-xl">
                <DialogHeader className="px-6 pt-6 pb-0">
                    <DialogTitle className="text-lg font-semibold text-gray-900">
                        Create Post
                    </DialogTitle>
                </DialogHeader>

                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        void onSubmit();
                    }}
                    className="flex flex-col gap-4 px-6 pb-6 pt-4"
                >
                    {/* Text area */}
                    <div>
                        <div className="relative">
                            <Textarea
                                ref={textareaRef}
                                placeholder="What's on your mind?"
                                rows={4}
                                disabled={isSubmitting}
                                value={content}
                                onChange={(event) => {
                                    setContent(event.target.value);
                                    setContentError(null);
                                    handleMentionAwareContentChange(
                                        event.target.value,
                                        event.target.selectionStart,
                                    );
                                }}
                                onKeyDown={handleMentionKeyDown}
                                className="resize-none rounded-2xl border-gray-200 bg-gray-50 text-sm focus-visible:ring-indigo-500 focus-visible:border-indigo-400"
                            />
                            {mentionQuery !== null &&
                                mentionSuggestions.length > 0 && (
                                    <MentionSuggestionsDropdown
                                        suggestions={mentionSuggestions}
                                        activeIndex={mentionIndex}
                                        onSelect={handleSelectMention}
                                        placement="bottom"
                                    />
                                )}
                        </div>
                        {contentError && (
                            <p className="mt-1 text-xs text-red-500">
                                {contentError}
                            </p>
                        )}
                    </div>

                    {/* Media upload */}
                    <MediaUploadZone
                        value={mediaUrls}
                        onChange={setMediaUrls}
                        disabled={isSubmitting}
                    />

                    {/* Footer: visibility selector + submit */}
                    <div className="flex items-center justify-between gap-3 pt-1">
                        <Select
                            value={visibility}
                            onValueChange={(v) => setVisibility(v as PostVisibility)}
                            disabled={isSubmitting}
                        >
                            <SelectTrigger className="w-40 rounded-xl border-gray-200 text-xs h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                {VISIBILITY_OPTIONS.map(
                                    ({ value, label, icon: Icon }) => (
                                        <SelectItem
                                            key={value}
                                            value={value}
                                            className="text-xs"
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <Icon className="size-3.5 text-indigo-500" />
                                                {label}
                                            </span>
                                        </SelectItem>
                                    ),
                                )}
                            </SelectContent>
                        </Select>

                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={isSubmitting}
                                onClick={handleClose}
                                className="rounded-xl"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={isSubmitting || !canSubmit}
                                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-5"
                            >
                                {isSubmitting && (
                                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                                )}
                                Post
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

