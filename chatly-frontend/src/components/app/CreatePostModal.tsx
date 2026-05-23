import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Globe, Users, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { MediaUploadZone } from "@/features/social/components/MediaUploadZone";
import { postService } from "@/services/post.service";
import { useFeedStore } from "@/store/feed.store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdminBadge } from "@/components/customize/AdminBadge";
import { MentionSuggestionsDropdown } from "@/components/mention/MentionSuggestionsDropdown";
import { usePostMentions } from "@/features/social/hooks/usePostMentions";
import type { UserResponse } from "@/types/auth";
import type { PostVisibility } from "@/types/post";

const VISIBILITY_OPTIONS: { value: PostVisibility; label: string; icon: typeof Globe }[] = [
    { value: "PUBLIC", label: "Everyone", icon: Globe },
    { value: "FRIENDS_ONLY", label: "Friends", icon: Users },
    { value: "ONLY_ME", label: "Only me", icon: Lock },
];

const schema = z.object({
    content: z
        .string()
        .min(1, "Post content cannot be empty")
        .max(2000, "Content must not exceed 2000 characters"),
    visibility: z.enum(["PUBLIC", "FRIENDS_ONLY", "ONLY_ME"]),
});

type FormValues = z.infer<typeof schema>;

const isPostVisibility = (value: string): value is PostVisibility =>
    value === "PUBLIC" ||
    value === "FRIENDS_ONLY" ||
    value === "ONLY_ME";

interface CreatePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: UserResponse | null;
}

export function CreatePostModal({ isOpen, onClose, user }: CreatePostModalProps) {
    const addNewPost = useFeedStore((s) => s.addNewPost);
    const [mediaUrls, setMediaUrls] = useState<string[]>([]);
    const [isDiscardOpen, setIsDiscardOpen] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { content: "", visibility: "PUBLIC" },
    });

    const visibility = watch("visibility");
    const content = watch("content");
    const hasChanges =
        content.trim().length > 0 ||
        visibility !== "PUBLIC" ||
        mediaUrls.length > 0;
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const contentRegistration = register("content");
    const mentions = usePostMentions({
        currentUserId: user?.id,
        content,
        setContent: (nextContent) =>
            setValue("content", nextContent, { shouldValidate: true }),
        textareaRef,
        isActive: isOpen,
    });

    const handleVisibilityChange = (value: string) => {
        if (isPostVisibility(value)) {
            setValue("visibility", value);
        }
    };

    const handleDiscard = () => {
        if (isSubmitting) return;
        reset();
        setMediaUrls([]);
        mentions.reset();
        setIsDiscardOpen(false);
        onClose();
    };

    const handleClose = () => {
        if (isSubmitting) return;
        if (hasChanges) {
            setIsDiscardOpen(true);
            return;
        }
        handleDiscard();
    };

    const onSubmit = async (values: FormValues) => {
        try {
            const response = await postService.create({
                content: values.content,
                mediaUrls,
                visibility: values.visibility,
                mentionIds: mentions.getMentionIds(values.content),
            });

            if (response.code === 1000 && response.result) {
                addNewPost(response.result);
                toast.success("Post created.");
                handleDiscard();
            }
        } catch (error: unknown) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to create post. Please try again.";
            toast.error(message);
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
                <DialogContent className="max-h-[90vh] overflow-y-auto bg-background p-0 shadow-2xl sm:max-w-2xl rounded-xl border-border">
                <DialogHeader className="px-6 py-4 border-b border-border">
                    <DialogTitle className="text-xl font-bold">Create Post</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-6">
                    <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                            <AvatarImage
                                src={user?.avatarUrl}
                                alt={user?.displayName || "User Avatar"}
                                className="object-cover"
                            />
                            <AvatarFallback className="bg-linear-to-tr from-pink-400 to-indigo-500 text-white text-sm font-semibold">
                                {user?.displayName?.charAt(0)?.toUpperCase() ?? "U"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-start">
                            <span className="flex items-center gap-1.5 font-bold text-foreground">
                                <span className="truncate">
                                    {user?.displayName || "Your profile"}
                                </span>
                                {user?.role === "ADMIN" && <AdminBadge />}
                            </span>
                            <Select
                                value={visibility}
                                onValueChange={handleVisibilityChange}
                                disabled={isSubmitting}
                            >
                                <SelectTrigger className="mt-1 h-8 w-[140px] rounded-full text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {VISIBILITY_OPTIONS.map(({ value, label, icon: Icon }) => (
                                        <SelectItem key={value} value={value} className="text-xs">
                                            <span className="flex items-center gap-1.5">
                                                <Icon className="h-3.5 w-3.5 text-indigo-500" />
                                                {label}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="relative">
                        <textarea
                            {...contentRegistration}
                            ref={(node) => {
                                contentRegistration.ref(node);
                                textareaRef.current = node;
                            }}
                            onChange={(event) => {
                                void contentRegistration.onChange(event);
                                mentions.updateQuery(
                                    event.target.value,
                                    event.target.selectionStart,
                                );
                            }}
                            onKeyDown={mentions.handleKeyDown}
                            onScroll={() => mentions.updateQuery(content)}
                            placeholder="What's on your mind?"
                            rows={5}
                            disabled={isSubmitting}
                            className="field-sizing-content min-h-36 max-h-[42vh] w-full resize-none overflow-y-auto rounded-2xl border border-input bg-muted/40 px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        {mentions.query !== null &&
                            mentions.suggestions.length > 0 && (
                                <MentionSuggestionsDropdown
                                    suggestions={mentions.suggestions}
                                    activeIndex={mentions.activeIndex}
                                    onSelect={mentions.selectSuggestion}
                                    anchor={mentions.anchor}
                                    placement="bottom"
                                />
                            )}
                        {errors.content && (
                            <p className="mt-1 text-xs text-red-500">{errors.content.message}</p>
                        )}
                    </div>

                    <MediaUploadZone
                        value={mediaUrls}
                        onChange={setMediaUrls}
                        disabled={isSubmitting}
                    />

                    <div className="flex items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isSubmitting}
                            onClick={handleClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={isSubmitting}
                            className="bg-brand text-white hover:bg-brand/90"
                        >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Post
                        </Button>
                    </div>
                </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDiscardOpen} onOpenChange={setIsDiscardOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Discard post?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Your post changes will be lost.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep editing</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDiscard}>
                            Discard
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
