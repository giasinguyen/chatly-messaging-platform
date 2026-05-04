import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Globe, Users, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
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
import { useAuthStore } from "@/store/auth.store";
import { useFeedStore } from "@/store/feed.store";
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

export default function CreatePage() {
    const user = useAuthStore((s) => s.user);
    const addNewPost = useFeedStore((s) => s.addNewPost);
    const navigate = useNavigate();
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

    const handleVisibilityChange = (value: string) => {
        if (isPostVisibility(value)) {
            setValue("visibility", value);
        }
    };

    const handleCancel = () => {
        if (isSubmitting) return;
        reset();
        setMediaUrls([]);
        navigate("/home");
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
                reset();
                setMediaUrls([]);
                navigate("/home");
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
        <div className="h-full w-full overflow-y-auto bg-background">
            <div className="mx-auto w-full max-w-2xl px-4 py-8">
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-semibold text-foreground">
                                Create post
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Share something with your network.
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleCancel}
                        >
                            Back to feed
                        </Button>
                    </div>

                    <div className="mt-6 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                            {user?.displayName?.slice(0, 1).toUpperCase() ?? "U"}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-foreground">
                                {user?.displayName ?? "Your profile"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {user?.email ?? ""}
                            </p>
                        </div>
                    </div>

                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="mt-6 flex flex-col gap-4"
                    >
                        <div>
                            <textarea
                                {...register("content")}
                                placeholder="What is happening?"
                                rows={5}
                                disabled={isSubmitting}
                                className="w-full resize-none rounded-2xl bg-muted/40 border border-input px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                            {errors.content && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.content.message}
                                </p>
                            )}
                        </div>

                        <MediaUploadZone
                            value={mediaUrls}
                            onChange={setMediaUrls}
                            disabled={isSubmitting}
                        />

                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <Select
                                value={visibility}
                                onValueChange={handleVisibilityChange}
                                disabled={isSubmitting}
                            >
                                <SelectTrigger className="h-9 w-44 rounded-xl text-xs">
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

                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={isSubmitting}
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={isSubmitting}
                                    className="bg-indigo-600 text-white hover:bg-indigo-700"
                                >
                                    {isSubmitting && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Publish
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
