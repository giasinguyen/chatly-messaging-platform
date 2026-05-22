import { useEffect, useMemo, useRef, useState } from "react";
import { Clapperboard, Globe, Loader2, Lock, Upload, Users, X } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { reelService } from "@/services/reel.service";
import {
    REEL_ALLOWED_VIDEO_TYPES,
    REEL_MAX_VIDEO_SIZE_BYTES,
    REEL_MAX_VIDEO_SIZE_MB,
} from "@/constants/reel";
import type { UserResponse } from "@/types/auth";
import type { PostVisibility } from "@/types/post";

const VISIBILITY_OPTIONS: { value: PostVisibility; label: string; icon: typeof Globe }[] = [
    { value: "PUBLIC", label: "Everyone", icon: Globe },
    { value: "FRIENDS_ONLY", label: "Friends", icon: Users },
    { value: "ONLY_ME", label: "Only me", icon: Lock },
];

const MAX_CAPTION_LENGTH = 1000;

interface CreateReelModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: UserResponse | null;
    onCreated?: () => void;
}

export function CreateReelModal({
    isOpen,
    onClose,
    user,
    onCreated,
}: CreateReelModalProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [caption, setCaption] = useState("");
    const [visibility, setVisibility] = useState<PostVisibility>("PUBLIC");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const previewUrl = useMemo(
        () => (videoFile ? URL.createObjectURL(videoFile) : null),
        [videoFile],
    );

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleClose = () => {
        if (isSubmitting) return;
        setVideoFile(null);
        setCaption("");
        setVisibility("PUBLIC");
        onClose();
    };

    const handleVideoSelect = (file: File | undefined) => {
        if (!file) return;
        if (!REEL_ALLOWED_VIDEO_TYPES.includes(file.type)) {
            toast.error("Only MP4, WebM, MOV, and 3GP videos are supported.");
            return;
        }
        if (file.size > REEL_MAX_VIDEO_SIZE_BYTES) {
            toast.error(`Video size must not exceed ${REEL_MAX_VIDEO_SIZE_MB}MB.`);
            return;
        }
        setVideoFile(file);
    };

    const handleSubmit = async () => {
        const trimmedCaption = caption.trim();
        if (!videoFile) {
            toast.error("Please select a video.");
            return;
        }
        if (trimmedCaption.length > MAX_CAPTION_LENGTH) {
            toast.error("Caption must not exceed 1000 characters.");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await reelService.create({
                video: videoFile,
                caption: trimmedCaption,
                visibility,
            });
            if (response.code === 1000) {
                toast.success("Reel created.");
                onCreated?.();
                handleClose();
            } else {
                toast.error(response.message ?? "Failed to create reel.");
            }
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : "Failed to create reel.";
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-[720px] p-0 overflow-hidden rounded-2xl bg-background text-foreground">
                <DialogHeader className="border-b border-border px-6 py-4">
                    <DialogTitle className="text-xl font-bold">Create Reel</DialogTitle>
                </DialogHeader>

                <div className="grid gap-0 sm:grid-cols-[260px_1fr]">
                    <div className="border-r border-border bg-muted/30 p-4">
                        <div className="relative flex aspect-[9/16] items-center justify-center overflow-hidden rounded-xl border border-border bg-card">
                            {previewUrl ? (
                                <>
                                    <video
                                        src={previewUrl}
                                        controls
                                        className="h-full w-full object-contain"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setVideoFile(null)}
                                        disabled={isSubmitting}
                                        className="absolute right-2 top-2 rounded-full border border-border bg-background/90 p-1.5 text-foreground shadow-sm"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() => inputRef.current?.click()}
                                    className="flex h-full w-full flex-col items-center justify-center gap-3 text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    <Clapperboard className="h-10 w-10" />
                                    <span className="text-sm font-medium">Select video</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-5 p-6">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-11 w-11">
                                <AvatarImage src={user?.avatarUrl} className="object-cover" />
                                <AvatarFallback>
                                    {user?.displayName?.slice(0, 1).toUpperCase() ?? "U"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">
                                    {user?.displayName ?? "Your profile"}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {user?.email ?? ""}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-3">
                                <label
                                    htmlFor="reel-caption"
                                    className="text-sm font-medium text-foreground"
                                >
                                    Description
                                </label>
                                <span className="text-xs text-muted-foreground">
                                    {caption.length}/{MAX_CAPTION_LENGTH}
                                </span>
                            </div>
                            <textarea
                                id="reel-caption"
                                value={caption}
                                onChange={(event) => setCaption(event.target.value)}
                                rows={5}
                                maxLength={MAX_CAPTION_LENGTH}
                                disabled={isSubmitting}
                                placeholder="Describe your reel..."
                                className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm leading-6 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                            />
                        </div>

                        <Select
                            value={visibility}
                            onValueChange={(value) => setVisibility(value as PostVisibility)}
                            disabled={isSubmitting}
                        >
                            <SelectTrigger className="h-10 w-full rounded-xl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {VISIBILITY_OPTIONS.map(({ value, label, icon: Icon }) => (
                                    <SelectItem key={value} value={value}>
                                        <span className="flex items-center gap-2">
                                            <Icon className="h-4 w-4 text-indigo-500" />
                                            {label}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button
                            type="button"
                            variant="outline"
                            className="justify-start rounded-xl"
                            disabled={isSubmitting}
                            onClick={() => inputRef.current?.click()}
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            {videoFile ? "Replace video" : "Upload video"}
                        </Button>

                        <div className="mt-auto flex items-center justify-end gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={isSubmitting}
                                onClick={handleClose}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                disabled={!videoFile || isSubmitting}
                                onClick={() => void handleSubmit()}
                                className="bg-indigo-600 text-white hover:bg-indigo-700"
                            >
                                {isSubmitting && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Publish Reel
                            </Button>
                        </div>
                    </div>
                </div>

                <input
                    ref={inputRef}
                    type="file"
                    accept={REEL_ALLOWED_VIDEO_TYPES.join(",")}
                    className="hidden"
                    disabled={isSubmitting}
                    onChange={(event) => handleVideoSelect(event.target.files?.[0])}
                />
            </DialogContent>
        </Dialog>
    );
}
