import { useState, useRef } from "react";
import { domToPng } from "modern-screenshot";
import { toast } from "sonner";

import {
    Play,
    Pause,
    X,
    Loader2,
    Bookmark,
    ImageIcon,
    TypeIcon,
    ChevronLeft,
    Globe,
    Users,
    UserCheck,
    Lock,
    Music,
    RotateCw,
    Video,
} from "lucide-react";

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
import { Slider } from "@/components/ui/slider";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { musicService } from "@/services/music.service";
import { storyService } from "@/services/story.service";
import { fileService } from "@/services/file.service";
import type { MusicTrack } from "@/types/music";
import { StoryPrivacy, StoryType } from "@/types/story";

interface CreateStoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type StoryStep = "choose" | "text" | "photo" | "video";

const BACKGROUNDS = [
    "bg-gradient-to-br from-blue-500 to-cyan-400",
    "bg-gradient-to-br from-purple-500 to-pink-500",
    "bg-gradient-to-br from-orange-400 to-rose-400",
    "bg-gradient-to-br from-emerald-400 to-teal-500",
    "bg-gradient-to-br from-slate-800 to-slate-900",
    "bg-gradient-to-br from-yellow-400 to-orange-500",
];

const PRIVACY_OPTIONS: {
    value: StoryPrivacy;
    label: string;
    description: string;
    icon: typeof Globe;
}[] = [
    {
        value: StoryPrivacy.EVERYONE,
        label: "Everyone",
        description: "Anyone on Chatly",
        icon: Globe,
    },
    {
        value: StoryPrivacy.FRIENDS_ONLY,
        label: "Friends",
        description: "People you are friends with",
        icon: Users,
    },
    {
        value: StoryPrivacy.CLOSE_FRIENDS,
        label: "Close friends",
        description: "A selected list",
        icon: UserCheck,
    },
    {
        value: StoryPrivacy.ONLY_ME,
        label: "Only me",
        description: "Visible only to you",
        icon: Lock,
    },
];

const MUSIC_CATEGORIES = [
    { id: "chill", name: "Chill", icon: "🍃" },
    { id: "lofi", name: "Lofi", icon: "☕" },
    { id: "hiphop", name: "Hip Hop", icon: "🎤" },
    { id: "rap", name: "Rap", icon: "🔥" },
    { id: "pop", name: "Pop", icon: "✨" },
    { id: "acoustic", name: "Acoustic", icon: "🎸" },
    { id: "jazz", name: "Jazz", icon: "🎷" },
    { id: "electronic", name: "EDM", icon: "⚡" },
    { id: "rock", name: "Rock", icon: "🎸" },
    { id: "rnb", name: "R&B", icon: "🍷" },
    { id: "classical", name: "Classic", icon: "🎻" },
    { id: "reggae", name: "Reggae", icon: "🌴" },
    { id: "blues", name: "Blues", icon: "🎼" },
    { id: "country", name: "Country", icon: "🤠" },
    { id: "metal", name: "Metal", icon: "🤘" },
    { id: "ambient", name: "Ambient", icon: "🌫️" },
    { id: "disco", name: "Disco", icon: "🕺" },
    { id: "funk", name: "Funk", icon: "🎸" },
    { id: "soul", name: "Soul", icon: "🎵" },
    { id: "techno", name: "Techno", icon: "🎹" },
];

export function CreateStoryModal({ isOpen, onClose }: CreateStoryModalProps) {
    const [step, setStep] = useState<StoryStep>("choose");

    // Text Story State
    const [textValue, setTextValue] = useState("");
    const [bgIndex, setBgIndex] = useState(0);
    const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const [imageScale, setImageScale] = useState(1);
    const [imageRotation, setImageRotation] = useState(0);
    const [fontSize, setFontSize] = useState(30);
    const [font, setFont] = useState("Clean");

    // Global Story State
    const [privacy, setPrivacy] = useState<StoryPrivacy>(StoryPrivacy.EVERYONE);

    // Photo Story State
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
    const isImageDragging = useRef(false);
    const imageDragStart = useRef({ x: 0, y: 0 });

    // Video Story State
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [storyFile, setStoryFile] = useState<File | null>(null);
    const [isSharing, setIsSharing] = useState(false);

    // Music State
    const [isMusicModalOpen, setIsMusicModalOpen] = useState(false);
    const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
    const [tracks, setTracks] = useState<MusicTrack[]>([]);
    const [isLoadingMusic, setIsLoadingMusic] = useState(false);
    const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [selectedCategory, setSelectedCategory] = useState("chill");
    const [showMusicSticker, setShowMusicSticker] = useState(true);

    const previewContainerRef = useRef<HTMLDivElement>(null);
    const storyRef = useRef<HTMLDivElement>(null);

    const onPointerDown = (e: React.PointerEvent) => {
        isDragging.current = true;
        dragStart.current = {
            x: e.clientX - textPosition.x,
            y: e.clientY - textPosition.y,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!isDragging.current) return;
        let newX = e.clientX - dragStart.current.x;
        let newY = e.clientY - dragStart.current.y;
        setTextPosition({ x: newX, y: newY });
    };

    const onPointerUp = (e: React.PointerEvent) => {
        isDragging.current = false;
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    const onImagePointerDown = (e: React.PointerEvent) => {
        isImageDragging.current = true;
        imageDragStart.current = {
            x: e.clientX - imagePosition.x,
            y: e.clientY - imagePosition.y,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const onImagePointerMove = (e: React.PointerEvent) => {
        if (!isImageDragging.current) return;
        let newX = e.clientX - imageDragStart.current.x;
        let newY = e.clientY - imageDragStart.current.y;
        setImagePosition({ x: newX, y: newY });
    };

    const onImagePointerUp = (e: React.PointerEvent) => {
        isImageDragging.current = false;
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    const handleShare = async () => {
        setIsSharing(true);
        try {
            let mediaUrl = "";
            if (storyFile) {
                const uploadRes = await fileService.upload(storyFile);
                mediaUrl = uploadRes.url;
            }

            const payload = {
                type:
                    step === "text"
                        ? StoryType.TEXT
                        : step === "photo"
                          ? StoryType.PHOTO
                          : StoryType.VIDEO,
                content: textValue,
                mediaUrl: mediaUrl,
                musicUrl: selectedTrack?.audioUrl,
                musicName: selectedTrack?.name,
                bgIndex: bgIndex,
                fontSize: fontSize,
                privacy: privacy,
            };

            const response = await storyService.create(payload);
            if (response.code === 1000) {
                toast.success("Story shared successfully!");
                handleClose();
                window.location.href = "/home";
            } else {
                toast.error(response.message || "Failed to share story");
            }
        } catch (error: unknown) {
            console.error("Failed to share story", error);
            toast.error("An error occurred while sharing your story");
        } finally {
            setIsSharing(false);
        }
    };

    const handleExport = async () => {
        if (step === "video" && videoUrl) {
            const link = document.createElement("a");
            link.download = "story-video.mp4";
            link.href = videoUrl;
            link.click();
            return;
        }

        if (!storyRef.current) return;
        try {
            const dataUrl = await domToPng(storyRef.current, {
                scale: 2, // Higher quality
                features: {
                    // Disable features that might cause issues if necessary
                },
            });
            const link = document.createElement("a");
            link.download = "story.png";
            link.href = dataUrl;
            link.click();
        } catch (err: any) {
            console.error("Failed to export image", err);
            alert("Export failed: " + (err?.message || String(err)));
        }
    };

    const fetchMusic = async (genre: string) => {
        setIsLoadingMusic(true);
        try {
            const response = await musicService.search(genre);
            if (response.code === 1000) {
                setTracks(response.result);
            }
        } catch (error) {
            console.error("Failed to fetch music:", error);
        } finally {
            setIsLoadingMusic(false);
        }
    };

    const handleOpenMusic = () => {
        setIsMusicModalOpen(true);
        fetchMusic(selectedCategory);
    };

    const togglePlay = (track: MusicTrack) => {
        if (playingTrackId === track.id) {
            audioRef.current?.pause();
            setPlayingTrackId(null);
        } else {
            if (audioRef.current) {
                audioRef.current.src = track.audioUrl;
                audioRef.current.play();
                setPlayingTrackId(track.id);
            }
        }
    };

    const selectTrack = (track: MusicTrack) => {
        setSelectedTrack(track);
        setIsMusicModalOpen(false);
        // Don't pause, keep playing if selected?
        // User asked for "nút phát nhạc" when selected, so let's keep it playing
        if (audioRef.current) {
            audioRef.current.src = track.audioUrl;
            audioRef.current.play();
            setPlayingTrackId(track.id);
        }
    };

    const handleClose = () => {
        setStep("choose");
        setTextValue("");
        setTextPosition({ x: 0, y: 0 });
        setPhotoUrl(null);
        setVideoUrl(null);
        setStoryFile(null);
        setImagePosition({ x: 0, y: 0 });
        setBgIndex(0);
        setFontSize(30);
        setPrivacy(StoryPrivacy.EVERYONE);
        setSelectedTrack(null);
        setPlayingTrackId(null);
        if (audioRef.current) audioRef.current.pause();
        onClose();
    };

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setStoryFile(file);
            const url = URL.createObjectURL(file);
            setPhotoUrl(url);
            setStep("photo");
        }
    };

    const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("Video size must be less than 5MB");
                return;
            }
            setStoryFile(file);
            const url = URL.createObjectURL(file);
            setVideoUrl(url);
            setStep("video");
        }
    };

    const triggerVideoInput = () => {
        videoInputRef.current?.click();
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent
                className={cn(
                    "p-0 bg-background overflow-hidden flex flex-col",
                    step === "choose"
                        ? "sm:max-w-[700px] w-[90vw] rounded-2xl"
                        : "sm:max-w-[1400px] w-[95vw] h-[90vh] rounded-xl",
                )}
            >
                {step === "choose" && (
                    <>
                        <DialogHeader className="p-6 pb-2">
                            <DialogTitle className="text-2xl font-bold">
                                Create Story
                            </DialogTitle>
                        </DialogHeader>
                        <div className="flex gap-6 p-10 justify-center">
                            <button
                                onClick={triggerFileInput}
                                className="w-48 h-72 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex flex-col items-center justify-center gap-4 hover:scale-105 transition-transform shadow-lg relative overflow-hidden group"
                            >
                                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-blue-500 shadow-md">
                                    <ImageIcon className="w-6 h-6" />
                                </div>
                                <span className="text-white font-bold text-center px-4">
                                    Create a photo story
                                </span>
                                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>

                            <button
                                onClick={triggerVideoInput}
                                className="w-48 h-72 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 flex flex-col items-center justify-center gap-4 hover:scale-105 transition-transform shadow-lg relative overflow-hidden group"
                            >
                                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-emerald-500 shadow-md">
                                    <Video className="w-6 h-6" />
                                </div>
                                <span className="text-white font-bold text-center px-4">
                                    Create a video story
                                </span>
                                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>

                            <button
                                onClick={() => setStep("text")}
                                className="w-48 h-72 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex flex-col items-center justify-center gap-4 hover:scale-105 transition-transform shadow-lg relative overflow-hidden group"
                            >
                                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-purple-500 shadow-md">
                                    <TypeIcon className="w-6 h-6" />
                                </div>
                                <span className="text-white font-bold text-center px-4">
                                    Create a text story
                                </span>
                                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        </div>
                    </>
                )}

                {step !== "choose" && (
                    <div className="flex h-full w-full">
                        {/* LEFT SIDEBAR */}
                        <div className="w-[320px] bg-card border-r border-border flex flex-col">
                            <div className="p-4 border-b border-border flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="rounded-full"
                                        onClick={() => setStep("choose")}
                                    >
                                        <ChevronLeft className="w-6 h-6" />
                                    </Button>
                                    <div className="flex-1">
                                        <h2 className="font-bold text-xl leading-none">
                                            Your story
                                        </h2>
                                    </div>
                                </div>

                                {/* Privacy Selector */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Privacy
                                    </label>
                                    <Select
                                        value={privacy}
                                        onValueChange={(value) =>
                                            setPrivacy(value as StoryPrivacy)
                                        }
                                    >
                                        <SelectTrigger className="h-10 rounded-xl border-border text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {PRIVACY_OPTIONS.map(
                                                ({
                                                    value,
                                                    label,
                                                    description,
                                                    icon: Icon,
                                                }) => (
                                                    <SelectItem
                                                        key={value}
                                                        value={value}
                                                        className="py-2.5"
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <Icon className="h-4 w-4 text-brand" />
                                                            <span className="flex flex-col">
                                                                <span className="text-sm font-medium">
                                                                    {label}
                                                                </span>
                                                                <span className="text-[11px] text-muted-foreground">
                                                                    {
                                                                        description
                                                                    }
                                                                </span>
                                                            </span>
                                                        </span>
                                                    </SelectItem>
                                                ),
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
                                {step === "text" && (
                                    <>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-semibold text-muted-foreground">
                                                Content
                                            </label>
                                            <textarea
                                                className="w-full h-32 bg-background border border-border rounded-xl p-3 resize-none focus:outline-none focus:border-brand transition-colors"
                                                placeholder="Start typing..."
                                                value={textValue}
                                                onChange={(e) =>
                                                    setTextValue(e.target.value)
                                                }
                                            />
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-semibold text-muted-foreground">
                                                Backgrounds
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {BACKGROUNDS.map((bg, idx) => (
                                                    <button
                                                        key={bg}
                                                        onClick={() =>
                                                            setBgIndex(idx)
                                                        }
                                                        className={cn(
                                                            "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                                                            bg,
                                                            bgIndex === idx
                                                                ? "border-foreground scale-110 shadow-md"
                                                                : "border-transparent",
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {step === "photo" && (
                                    <>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-semibold text-muted-foreground">
                                                Add Text
                                            </label>
                                            <Input
                                                placeholder="Add text to your photo..."
                                                value={textValue}
                                                onChange={(e) =>
                                                    setTextValue(e.target.value)
                                                }
                                                className="h-12 rounded-xl border-border bg-muted/20 focus-visible:ring-brand"
                                            />
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-semibold text-muted-foreground">
                                                Image Edit
                                            </label>
                                            <div className="space-y-4 p-3 bg-muted/20 rounded-xl">
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground">
                                                        <span>Scale</span>
                                                        <span>
                                                            {Math.round(
                                                                imageScale *
                                                                    100,
                                                            )}
                                                            %
                                                        </span>
                                                    </div>
                                                    <Slider
                                                        value={[imageScale]}
                                                        onValueChange={(vals) =>
                                                            setImageScale(
                                                                vals[0],
                                                            )
                                                        }
                                                        min={0.5}
                                                        max={3}
                                                        step={0.1}
                                                    />
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full h-8 text-xs gap-2 rounded-lg"
                                                    onClick={() =>
                                                        setImageRotation(
                                                            (prev) =>
                                                                (prev + 90) %
                                                                360,
                                                        )
                                                    }
                                                >
                                                    <RotateCw className="w-3.5 h-3.5" />{" "}
                                                    Rotate 90°
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-semibold text-muted-foreground">
                                                Backgrounds
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() =>
                                                        setBgIndex(-1)
                                                    }
                                                    className={cn(
                                                        "w-8 h-8 rounded-full border-2 bg-black transition-transform hover:scale-110",
                                                        bgIndex === -1
                                                            ? "border-foreground scale-110 shadow-md"
                                                            : "border-transparent",
                                                    )}
                                                />
                                                {BACKGROUNDS.map((bg, idx) => (
                                                    <button
                                                        key={bg}
                                                        onClick={() =>
                                                            setBgIndex(idx)
                                                        }
                                                        className={cn(
                                                            "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                                                            bg,
                                                            bgIndex === idx
                                                                ? "border-foreground scale-110 shadow-md"
                                                                : "border-transparent",
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Music Controls */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-semibold text-muted-foreground">
                                            Music
                                        </label>
                                        {selectedTrack && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs gap-1.5"
                                                onClick={() =>
                                                    setShowMusicSticker(
                                                        !showMusicSticker,
                                                    )
                                                }
                                            >
                                                {showMusicSticker
                                                    ? "Hide sticker"
                                                    : "Show sticker"}
                                            </Button>
                                        )}
                                    </div>
                                    <div
                                        className={cn(
                                            "w-full flex items-center gap-3 h-12 rounded-xl border border-border px-4 transition-all relative overflow-hidden cursor-pointer hover:bg-muted/50",
                                            selectedTrack &&
                                                "border-brand bg-brand/5 text-brand",
                                        )}
                                        onClick={handleOpenMusic}
                                    >
                                        <Music className="w-5 h-5 flex-shrink-0" />
                                        {selectedTrack ? (
                                            <div className="flex-1 flex items-center justify-between overflow-hidden">
                                                <span className="truncate font-bold text-sm">
                                                    {selectedTrack.name}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <div
                                                        className="p-1.5 hover:bg-brand/10 rounded-md transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            togglePlay(
                                                                selectedTrack,
                                                            );
                                                        }}
                                                    >
                                                        {playingTrackId ===
                                                        selectedTrack.id ? (
                                                            <Pause className="w-4 h-4 fill-current" />
                                                        ) : (
                                                            <Play className="w-4 h-4 fill-current" />
                                                        )}
                                                    </div>
                                                    <div
                                                        className="p-1.5 hover:bg-red-100 hover:text-red-500 rounded-md transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedTrack(
                                                                null,
                                                            );
                                                            setPlayingTrackId(
                                                                null,
                                                            );
                                                            if (
                                                                audioRef.current
                                                            )
                                                                audioRef.current.pause();
                                                        }}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-sm font-medium">
                                                Add music
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border-t border-border flex gap-3">
                                <Button
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={handleClose}
                                >
                                    Discard
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={handleExport}
                                >
                                    Export
                                </Button>
                                <Button
                                    className="flex-1 rounded-xl h-12 font-bold bg-brand hover:bg-brand/90"
                                    onClick={handleShare}
                                    disabled={isSharing}
                                >
                                    {isSharing ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        "Share"
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* RIGHT PREVIEW */}
                        <div
                            ref={previewContainerRef}
                            className="flex-1 bg-muted flex items-center justify-center relative overflow-hidden"
                        >
                            <h3 className="absolute top-6 left-6 font-semibold text-muted-foreground">
                                Preview
                            </h3>

                            <div
                                ref={storyRef}
                                className={cn(
                                    "h-[90%] max-h-[800px] aspect-[9/16] rounded-2xl shadow-2xl overflow-hidden relative flex items-center justify-center text-center break-words whitespace-pre-wrap transition-colors duration-500",
                                    step === "text"
                                        ? BACKGROUNDS[bgIndex] + " p-8"
                                        : bgIndex === -1
                                          ? "bg-black"
                                          : BACKGROUNDS[bgIndex],
                                )}
                            >
                                {step === "text" && (
                                    <div className="flex items-center justify-center w-full h-full z-10">
                                        <span
                                            className="text-white font-bold block text-center font-sans cursor-move touch-none"
                                            style={{
                                                fontSize: "30px",
                                                lineHeight: 1.2,
                                                transform: `translate(${textPosition.x}px, ${textPosition.y}px)`,
                                            }}
                                            onPointerDown={onPointerDown}
                                            onPointerMove={onPointerMove}
                                            onPointerUp={onPointerUp}
                                            onPointerCancel={onPointerUp}
                                        >
                                            {textValue || "YOUR FEELING ?"}
                                        </span>
                                    </div>
                                )}

                                {step === "photo" && photoUrl && (
                                    <div
                                        className={cn(
                                            "w-full h-full relative overflow-hidden flex items-center justify-center transition-colors duration-500",
                                            bgIndex === -1
                                                ? "bg-black"
                                                : BACKGROUNDS[bgIndex],
                                        )}
                                    >
                                        <img
                                            src={photoUrl}
                                            alt="Story preview"
                                            className="w-full h-full object-cover select-none origin-center cursor-move touch-none relative z-10"
                                            style={{
                                                transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale}) rotate(${imageRotation}deg)`,
                                            }}
                                            onPointerDown={onImagePointerDown}
                                            onPointerMove={onImagePointerMove}
                                            onPointerUp={onImagePointerUp}
                                            onPointerCancel={onImagePointerUp}
                                        />

                                        {/* Overlays on photo */}
                                        {textValue && (
                                            <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                                                <span
                                                    className="text-white font-bold block drop-shadow-lg select-none text-center font-sans cursor-move touch-none pointer-events-auto"
                                                    style={{
                                                        fontSize: "30px",
                                                        lineHeight: 1.2,
                                                        transform: `translate(${textPosition.x}px, ${textPosition.y}px)`,
                                                    }}
                                                    onPointerDown={
                                                        onPointerDown
                                                    }
                                                    onPointerMove={
                                                        onPointerMove
                                                    }
                                                    onPointerUp={onPointerUp}
                                                    onPointerCancel={
                                                        onPointerUp
                                                    }
                                                >
                                                    {textValue}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {step === "video" && videoUrl && (
                                    <div className="w-full h-full bg-black flex items-center justify-center transition-colors duration-500">
                                        <video
                                            src={videoUrl}
                                            controls
                                            autoPlay
                                            loop
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                )}

                                {/* Music Sticker */}
                                {selectedTrack && showMusicSticker && (
                                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md rounded-2xl p-3 flex items-center gap-3 shadow-xl border border-white/50 w-[80%] max-w-[280px] animate-in fade-in zoom-in slide-in-from-bottom-4 duration-300 z-20">
                                        <img
                                            src={selectedTrack.albumImage}
                                            className="w-12 h-12 rounded-lg shadow-sm pointer-events-none select-none"
                                            alt="Album"
                                        />
                                        <div className="flex-1 text-left overflow-hidden pointer-events-none select-none">
                                            <p className="text-black font-bold text-sm truncate">
                                                {selectedTrack.name}
                                            </p>
                                            <p className="text-black/60 text-xs truncate">
                                                {selectedTrack.artistName}
                                            </p>
                                        </div>
                                        <button
                                            className="w-8 h-8 bg-brand rounded-full flex items-center justify-center text-white hover:scale-105 transition-transform"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                togglePlay(selectedTrack);
                                            }}
                                        >
                                            {playingTrackId ===
                                            selectedTrack.id ? (
                                                <Pause className="w-4 h-4 fill-current" />
                                            ) : (
                                                <Play className="w-4 h-4 fill-current" />
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>

            {/* Music Selection Dialog */}
            <Dialog open={isMusicModalOpen} onOpenChange={setIsMusicModalOpen}>
                <DialogContent className="sm:max-w-[420px] p-0 bg-background rounded-3xl overflow-hidden border-none shadow-2xl h-[600px] flex flex-col">
                    <div className="p-4 border-b border-border flex items-center justify-center relative">
                        <DialogTitle className="text-xl font-bold">
                            Add Music
                        </DialogTitle>
                    </div>

                    <div className="px-4 py-3 border-b border-border bg-muted/20">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                            Categories
                        </p>
                        <ScrollArea className="w-full whitespace-nowrap pb-1">
                            <div className="flex gap-2">
                                {MUSIC_CATEGORIES.map((cat) => (
                                    <Button
                                        key={cat.id}
                                        variant={
                                            selectedCategory === cat.id
                                                ? "default"
                                                : "outline"
                                        }
                                        size="sm"
                                        className={cn(
                                            "rounded-full h-9 px-4 gap-2 transition-all",
                                            selectedCategory === cat.id
                                                ? "bg-brand hover:bg-brand/90"
                                                : "hover:bg-muted",
                                        )}
                                        onClick={() => {
                                            setSelectedCategory(cat.id);
                                            fetchMusic(cat.id);
                                        }}
                                    >
                                        <span>{cat.icon}</span>
                                        <span>{cat.name}</span>
                                    </Button>
                                ))}
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-col p-2">
                        <div className="px-3 py-2 flex items-center justify-between">
                            <h3 className="font-bold text-lg">
                                Trending{" "}
                                {
                                    MUSIC_CATEGORIES.find(
                                        (c) => c.id === selectedCategory,
                                    )?.name
                                }
                            </h3>
                        </div>
                        <ScrollArea className="flex-1 px-1">
                            {isLoadingMusic ? (
                                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground mt-20">
                                    <Loader2 className="w-8 h-8 animate-spin text-brand" />
                                    <p>Loading tracks...</p>
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    {tracks.map((track) => (
                                        <div
                                            key={track.id}
                                            className={cn(
                                                "flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors group cursor-pointer",
                                                selectedTrack?.id ===
                                                    track.id && "bg-brand/5",
                                            )}
                                            onClick={() => selectTrack(track)}
                                        >
                                            <div className="relative w-12 h-12 rounded-lg overflow-hidden shadow-sm">
                                                <img
                                                    src={track.albumImage}
                                                    className="w-full h-full object-cover"
                                                    alt=""
                                                />
                                                <div
                                                    className={cn(
                                                        "absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                                                        playingTrackId ===
                                                            track.id &&
                                                            "opacity-100",
                                                    )}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        togglePlay(track);
                                                    }}
                                                >
                                                    {playingTrackId ===
                                                    track.id ? (
                                                        <Pause className="w-5 h-5 text-white fill-white" />
                                                    ) : (
                                                        <Play className="w-5 h-5 text-white fill-white" />
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <p className="font-bold text-sm truncate">
                                                    {track.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {track.artistName}
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="rounded-full text-muted-foreground hover:text-brand"
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                <Bookmark className="w-4 h-4" />
                                            </Button>
                                            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-muted group-hover:bg-brand/10 group-hover:text-brand transition-colors">
                                                <Play className="w-3 h-3 fill-current" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>

            <audio
                ref={audioRef}
                className="hidden"
                onEnded={() => setPlayingTrackId(null)}
            />

            {/* Hidden video input */}
            <input
                type="file"
                ref={videoInputRef}
                accept="video/*"
                className="hidden"
                onChange={handleVideoSelect}
            />

            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelect}
            />
        </Dialog>
    );
}
