import { useState } from "react";
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
import type { UserResponse } from "@/types/auth";
import type { PostVisibility } from "@/types/post";

const VISIBILITY_OPTIONS: { value: PostVisibility; label: string; icon: typeof Globe }[] = [
    { value: "PUBLIC", label: "Everyone", icon: Globe },
    { value: "FOLLOWERS_ONLY", label: "Followers", icon: Users },
    { value: "FRIENDS_ONLY", label: "Friends", icon: Users },
    { value: "ONLY_ME", label: "Only me", icon: Lock },
];

const schema = z.object({
    content: z
        .string()
        .min(1, "Post content cannot be empty")
        .max(2000, "Content must not exceed 2000 characters"),
    visibility: z.enum(["PUBLIC", "FOLLOWERS_ONLY", "FRIENDS_ONLY", "ONLY_ME"]),
});

type FormValues = z.infer<typeof schema>;

const isPostVisibility = (value: string): value is PostVisibility =>
    value === "PUBLIC" ||
    value === "FOLLOWERS_ONLY" ||
    value === "FRIENDS_ONLY" ||
    value === "ONLY_ME";

const hasImageMedia = (urls: string[]) => urls.some((url) => !/\.(mp4|webm)$/i.test(url));

interface CreatePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: UserResponse | null;
}

export function CreatePostModal({ isOpen, onClose, user }: CreatePostModalProps) {
    const addNewPost = useFeedStore((s) => s.addNewPost);
    const [mediaUrls, setMediaUrls] = useState<string[]>([]);

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
    const canSubmit = hasImageMedia(mediaUrls);

    const handleVisibilityChange = (value: string) => {
        if (isPostVisibility(value)) {
            setValue("visibility", value);
        }
    };

    const handleClose = () => {
        if (isSubmitting) return;
        reset();
        setMediaUrls([]);
        onClose();
    };

    const onSubmit = async (values: FormValues) => {
        if (!hasImageMedia(mediaUrls)) {
            toast.error("Please add at least one image.");
            return;
        }

        try {
            const response = await postService.create({
                content: values.content,
                mediaUrls,
                visibility: values.visibility,
            });

            if (response.code === 1000 && response.result) {
                addNewPost(response.result);
                toast.success("Post created.");
                handleClose();
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
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-background border-border shadow-2xl rounded-xl">
                <DialogHeader className="px-6 py-4 border-b border-border">
                    <DialogTitle className="text-xl font-bold">Create Post</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-muted shadow-sm">
                            <img
                                alt="User Avatar"
                                className="w-full h-full object-cover"
                                src={
                                    user?.avatarUrl ||
                                    "https://lh3.googleusercontent.com/aida-public/AB6AXuBkBUiR9tUTXPHbOqc7Ivznf7tEN__jgWpMUMP4JxSGRgJRlWssTxrQOj5pXnHsHSjKAsDLGKQBV1TJEw-xlGbZxtHLZS4LV-Ege3ySxwFia10uI3eWy0QfWiAISnb0DuJ2kzUd_rYM9A9wD0CgKl8afcZKfoKevvRk0bppdi7cSyveNZcMxWxRipmAheBfSHtJ8jTtPZxXIxYtU_IT-RTZRBDkywn6efP_WB9jwJewHGTDyx7TELeOeuqNC8AZKVWJGrkRD7hsuHw"
                                }
                            />
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="font-bold text-foreground">
                                {user?.displayName || "Your profile"}
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

                    <div>
                        <textarea
                            {...register("content")}
                            placeholder="What's on your mind?"
                            rows={5}
                            disabled={isSubmitting}
                            className="w-full resize-none rounded-2xl bg-muted/40 border border-input px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
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
                            disabled={isSubmitting || !canSubmit}
                            className="bg-brand text-white hover:bg-brand/90"
                        >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Post
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
