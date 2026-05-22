import { useRef, useState, type ChangeEvent } from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { ImageIcon, Loader2, Send, Smile, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MediaPicker } from "@/components/media-picker/MediaPicker";
import { fileService } from "@/services/file.service";
import { getDisplayUrl, type KlipyItem } from "@/services/klipy.service";
import { useAuthStore } from "@/store/auth.store";
import type { PostComment } from "@/types/post";

interface ReelCommentComposerProps {
    draft: string;
    mediaUrls: string[];
    replyToComment: PostComment | null;
    isSubmitting: boolean;
    onDraftChange: (value: string) => void;
    onMediaUrlsChange: (urls: string[]) => void;
    onClearReply: () => void;
    onSubmit: () => void;
}

export function ReelCommentComposer({
    draft,
    mediaUrls,
    replyToComment,
    isSubmitting,
    onDraftChange,
    onMediaUrlsChange,
    onClearReply,
    onSubmit,
}: ReelCommentComposerProps) {
    const imageInputRef = useRef<HTMLInputElement>(null);
    const user = useAuthStore((state) => state.user);
    const [isEmojiOpen, setIsEmojiOpen] = useState(false);
    const [isGifOpen, setIsGifOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const handleEmojiSelect = (emoji: { native: string }) => {
        onDraftChange(draft + emoji.native);
        setIsEmojiOpen(false);
    };

    const handleImageSelect = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = event.currentTarget.files;
        if (!files) return;

        setIsUploading(true);
        try {
            const uploads = await Promise.all(
                Array.from(files).map((file) => fileService.upload(file)),
            );
            onMediaUrlsChange([...mediaUrls, ...uploads.map((upload) => upload.url)]);
        } catch {
            toast.error("Could not upload image.");
        } finally {
            setIsUploading(false);
            if (imageInputRef.current) {
                imageInputRef.current.value = "";
            }
        }
    };

    const handleGifSelect = (item: KlipyItem) => {
        const url = getDisplayUrl(item);
        if (url) {
            onMediaUrlsChange([...mediaUrls, url]);
        }
        setIsGifOpen(false);
    };

    return (
        <div className="border-t border-border p-4">
            {replyToComment && (
                <div className="mb-2 flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                    <span>
                        Replying to{" "}
                        <span className="font-medium text-foreground">
                            {replyToComment.userDisplayName}
                        </span>
                    </span>
                    <button type="button" onClick={onClearReply}>
                        Cancel
                    </button>
                </div>
            )}

            {mediaUrls.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                    {mediaUrls.map((url) => (
                        <div key={url} className="relative">
                            <img
                                src={url}
                                alt="Comment attachment"
                                className="h-16 w-16 rounded-lg object-cover"
                            />
                            <button
                                type="button"
                                onClick={() => onMediaUrlsChange(mediaUrls.filter((item) => item !== url))}
                                className="absolute -right-1 -top-1 rounded-full bg-black/70 p-0.5 text-white"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <textarea
                value={draft}
                rows={3}
                disabled={isSubmitting}
                onChange={(event) => onDraftChange(event.target.value)}
                placeholder="Add a comment..."
                className="min-h-20 w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm leading-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />

            <div className="relative mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                    <div className="relative">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-muted-foreground"
                            onClick={() => setIsEmojiOpen((current) => !current)}
                        >
                            <Smile className="h-4 w-4" />
                        </Button>
                        {isEmojiOpen && (
                            <div className="absolute bottom-full left-0 z-50 mb-2 rounded-2xl border border-border bg-card p-2 shadow-xl">
                                <Picker data={data} onEmojiSelect={handleEmojiSelect} />
                            </div>
                        )}
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={isUploading}
                        className="h-8 w-8 rounded-lg text-muted-foreground"
                        onClick={() => imageInputRef.current?.click()}
                    >
                        {isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <ImageIcon className="h-4 w-4" />
                        )}
                    </Button>
                    <input
                        ref={imageInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageSelect}
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-lg px-2 text-xs text-muted-foreground"
                        onClick={() => setIsGifOpen((current) => !current)}
                    >
                        GIF
                    </Button>
                    {isGifOpen && (
                        <div className="absolute bottom-10 left-0 z-40 w-full max-w-sm">
                            <MediaPicker
                                initialTab="gif"
                                customerId={user?.id ?? "anonymous"}
                                onSelect={handleGifSelect}
                                onClose={() => setIsGifOpen(false)}
                            />
                        </div>
                    )}
                </div>

                <Button
                    type="button"
                    disabled={(!draft.trim() && mediaUrls.length === 0) || isSubmitting}
                    onClick={onSubmit}
                    className="rounded-xl bg-black px-5 text-white hover:bg-black/90"
                >
                    {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            <Send className="mr-1.5 h-4 w-4" />
                            Post
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
