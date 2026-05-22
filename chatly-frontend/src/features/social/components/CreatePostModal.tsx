import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { usePostStore } from "@/store/post.store";
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

interface CreatePostModalProps {
    open: boolean;
    onClose: () => void;
}

export function CreatePostModal({ open, onClose }: CreatePostModalProps) {
    const [mediaUrls, setMediaUrls] = useState<string[]>([]);
    const prependPost = usePostStore((s) => s.prependPost);

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

    const handleClose = () => {
        if (isSubmitting) return;
        reset();
        setMediaUrls([]);
        onClose();
    };

    const onSubmit = async (values: FormValues) => {
        try {
            const response = await postService.create({
                content: values.content,
                mediaUrls,
                visibility: values.visibility,
            });

            if (response.code === 1000 && response.result) {
                prependPost(response.result);
                toast.success("Post published!");
                handleClose();
            }
        } catch {
            toast.error("Failed to publish post. Please try again.");
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
            <DialogContent className="max-w-lg rounded-3xl p-0 overflow-hidden shadow-xl">
                <DialogHeader className="px-6 pt-6 pb-0">
                    <DialogTitle className="text-lg font-semibold text-gray-900">
                        Create Post
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-6 pb-6 pt-4">
                    {/* Text area */}
                    <div>
                        <Textarea
                            {...register("content")}
                            placeholder="What's on your mind?"
                            rows={4}
                            disabled={isSubmitting}
                            className="resize-none rounded-2xl border-gray-200 bg-gray-50 text-sm focus-visible:ring-indigo-500 focus-visible:border-indigo-400"
                        />
                        {errors.content && (
                            <p className="mt-1 text-xs text-red-500">{errors.content.message}</p>
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
                            onValueChange={(v) => setValue("visibility", v as PostVisibility)}
                            disabled={isSubmitting}
                        >
                            <SelectTrigger className="w-40 rounded-xl border-gray-200 text-xs h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                {VISIBILITY_OPTIONS.map(({ value, label, icon: Icon }) => (
                                    <SelectItem key={value} value={value} className="text-xs">
                                        <span className="flex items-center gap-1.5">
                                            <Icon className="size-3.5 text-indigo-500" />
                                            {label}
                                        </span>
                                    </SelectItem>
                                ))}
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
                                disabled={isSubmitting}
                                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-5"
                            >
                                {isSubmitting && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                                Post
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
