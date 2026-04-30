import { useState, useRef, useEffect } from "react";
import { motion, useDragControls } from "framer-motion";

import {
    Search,
    Play,
    Pause,
    X,
    Check,
    Loader2,
    Bookmark,
    ImageIcon,
    TypeIcon,
    ChevronLeft,
    Settings,
    Globe,
    Users,
    Lock,
    Minus,
    Plus,
    Music
} from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import { cn } from "@/lib/utils";

import { musicService } from "@/services/music.service";
import type { MusicTrack } from "@/types/music";


interface CreateStoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type StoryStep = "choose" | "text" | "photo";
type StoryPrivacy = "public" | "friends" | "custom";

const BACKGROUNDS = [
    "bg-gradient-to-br from-blue-500 to-cyan-400",
    "bg-gradient-to-br from-purple-500 to-pink-500",
    "bg-gradient-to-br from-orange-400 to-rose-400",
    "bg-gradient-to-br from-emerald-400 to-teal-500",
    "bg-gradient-to-br from-slate-800 to-slate-900",
    "bg-gradient-to-br from-yellow-400 to-orange-500",
];

const FONTS = ["Clean", "Headline", "Casual", "Neon"];

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
    const [font, setFont] = useState("Clean");
    const [fontSize, setFontSize] = useState(30); // Default font size

    // Global Story State
    const [privacy, setPrivacy] = useState<StoryPrivacy>("public");

    // Photo Story State
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Music State
    const [isMusicModalOpen, setIsMusicModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
    const [tracks, setTracks] = useState<MusicTrack[]>([]);
    const [isLoadingMusic, setIsLoadingMusic] = useState(false);
    const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [activeTab, setActiveTab] = useState("for-you");
    const [selectedCategory, setSelectedCategory] = useState("chill");
    const [showMusicSticker, setShowMusicSticker] = useState(true);

    const previewContainerRef = useRef<HTMLDivElement>(null);

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
        setPhotoUrl(null);
        setBgIndex(0);
        setFontSize(30);
        setPrivacy("public");
        setSelectedTrack(null);
        setPlayingTrackId(null);
        if (audioRef.current) audioRef.current.pause();
        onClose();
    };

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const url = URL.createObjectURL(e.target.files[0]);
            setPhotoUrl(url);
            setStep("photo");
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className={cn(
                "p-0 bg-background overflow-hidden flex flex-col",
                step === "choose" ? "sm:max-w-[700px] w-[90vw] rounded-2xl" : "sm:max-w-[1400px] w-[95vw] h-[90vh] rounded-xl"
            )}>
                {step === "choose" && (
                    <>
                        <DialogHeader className="p-6 pb-2">
                            <DialogTitle className="text-2xl font-bold">Create Story</DialogTitle>
                        </DialogHeader>
                        <div className="flex gap-6 p-10 justify-center">
                            <button
                                onClick={triggerFileInput}
                                className="w-48 h-72 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex flex-col items-center justify-center gap-4 hover:scale-105 transition-transform shadow-lg relative overflow-hidden group"
                            >
                                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-blue-500 shadow-md">
                                    <ImageIcon className="w-6 h-6" />
                                </div>
                                <span className="text-white font-bold text-center px-4">Create a photo story</span>
                                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>

                            <button
                                onClick={() => setStep("text")}
                                className="w-48 h-72 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex flex-col items-center justify-center gap-4 hover:scale-105 transition-transform shadow-lg relative overflow-hidden group"
                            >
                                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-purple-500 shadow-md">
                                    <TypeIcon className="w-6 h-6" />
                                </div>
                                <span className="text-white font-bold text-center px-4">Create a text story</span>
                                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        </div>
                    </>
                )}

                {step !== "choose" && (
                    <div className="flex h-full w-full">
                        {/* LEFT SIDEBAR */}
                        <div className="w-[320px] bg-card border-r border-border flex flex-col">
                            <div className="p-4 border-b border-border flex items-center gap-3">
                                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setStep("choose")}>
                                    <ChevronLeft className="w-6 h-6" />
                                </Button>
                                <div className="flex-1">
                                    <h2 className="font-bold text-xl leading-none">Your story</h2>
                                </div>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="icon" className="rounded-full">
                                            <Settings className="w-5 h-5 text-muted-foreground" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 p-0 rounded-xl overflow-hidden shadow-2xl" align="end">
                                        <div className="p-4 border-b border-border bg-muted/30">
                                            <h3 className="font-bold text-lg">Story privacy</h3>
                                            <p className="text-sm text-muted-foreground">Who can see your story?</p>
                                        </div>
                                        <div className="p-4">
                                            <RadioGroup
                                                value={privacy}
                                                onValueChange={(v) => setPrivacy(v as StoryPrivacy)}
                                                className="gap-4"
                                            >
                                                <div className="flex items-center justify-between group cursor-pointer" onClick={() => setPrivacy("public")}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                                            <Globe className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <Label className="font-bold cursor-pointer">Public</Label>
                                                            <p className="text-xs text-muted-foreground">Anyone on ChatLy</p>
                                                        </div>
                                                    </div>
                                                    <RadioGroupItem value="public" />
                                                </div>
                                                <div className="flex items-center justify-between group cursor-pointer" onClick={() => setPrivacy("friends")}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                                            <Users className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <Label className="font-bold cursor-pointer">Friends</Label>
                                                            <p className="text-xs text-muted-foreground">Only your friends</p>
                                                        </div>
                                                    </div>
                                                    <RadioGroupItem value="friends" />
                                                </div>
                                                <div className="flex items-center justify-between group cursor-pointer" onClick={() => setPrivacy("custom")}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                                            <Lock className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <Label className="font-bold cursor-pointer">Custom</Label>
                                                            <p className="text-xs text-muted-foreground">Choose people</p>
                                                        </div>
                                                    </div>
                                                    <RadioGroupItem value="custom" />
                                                </div>
                                            </RadioGroup>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
                                {step === "text" && (
                                    <>
                                        <div className="flex flex-col gap-2">
                                            <textarea
                                                className="w-full h-32 bg-background border border-border rounded-xl p-3 resize-none focus:outline-none focus:border-brand transition-colors"
                                                placeholder="Start typing..."
                                                value={textValue}
                                                onChange={(e) => setTextValue(e.target.value)}
                                            />
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-semibold text-muted-foreground">Font</label>
                                            <select
                                                className="w-full bg-background border border-border rounded-lg p-2 focus:outline-none"
                                                value={font}
                                                onChange={(e) => setFont(e.target.value)}
                                            >
                                                {FONTS.map(f => (
                                                    <option key={f} value={f}>{f}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-semibold text-muted-foreground">Font Size</label>
                                                <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded-md">{fontSize}px</span>
                                            </div>
                                            <div className="flex items-center gap-3 px-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-full bg-muted/50"
                                                    onClick={() => setFontSize(prev => Math.max(12, prev - 2))}
                                                >
                                                    <Minus className="w-4 h-4" />
                                                </Button>
                                                <Slider
                                                    value={[fontSize]}
                                                    min={12}
                                                    max={100}
                                                    step={1}
                                                    onValueChange={(v) => setFontSize(v[0])}
                                                    className="flex-1"
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-full bg-muted/50"
                                                    onClick={() => setFontSize(prev => Math.min(100, prev + 2))}
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-semibold text-muted-foreground">Backgrounds</label>
                                            <div className="flex flex-wrap gap-2">
                                                {BACKGROUNDS.map((bg, idx) => (
                                                    <button
                                                        key={bg}
                                                        onClick={() => setBgIndex(idx)}
                                                        className={cn(
                                                            "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                                                            bg,
                                                            bgIndex === idx ? "border-foreground scale-110 shadow-md" : "border-transparent"
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {step === "photo" && (
                                    <>
                                        <Button variant="outline" className="w-full justify-start gap-3 h-12 rounded-xl">
                                            <TypeIcon className="w-5 h-5" /> Add text
                                        </Button>
                                    </>
                                )}

                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-semibold text-muted-foreground">Music</label>
                                        {selectedTrack && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs gap-1.5"
                                                onClick={() => setShowMusicSticker(!showMusicSticker)}
                                            >
                                                {showMusicSticker ? "Hide sticker" : "Show sticker"}
                                            </Button>
                                        )}
                                    </div>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start gap-3 h-12 rounded-xl border-border transition-all relative overflow-hidden",
                                            selectedTrack && "border-brand bg-brand/5 text-brand"
                                        )}
                                        onClick={handleOpenMusic}
                                    >
                                        <Music className="w-5 h-5" />
                                        {selectedTrack ? (
                                            <div className="flex-1 flex items-center justify-between overflow-hidden">
                                                <span className="truncate font-bold">{selectedTrack.name}</span>
                                                <div className="flex items-center gap-1">
                                                    <div
                                                        className="p-1 hover:bg-brand/10 rounded-md transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            togglePlay(selectedTrack);
                                                        }}
                                                    >
                                                        {playingTrackId === selectedTrack.id ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                                                    </div>
                                                    <X
                                                        className="w-4 h-4 hover:text-red-500 cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedTrack(null);
                                                            setPlayingTrackId(null);
                                                            if (audioRef.current) audioRef.current.pause();
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ) : "Add music"}
                                    </Button>
                                </div>
                            </div>

                            <div className="p-4 border-t border-border flex gap-3">
                                <Button variant="secondary" className="flex-1" onClick={handleClose}>Discard</Button>
                                <Button className="flex-1">Share to story</Button>
                            </div>
                        </div>

                        {/* RIGHT PREVIEW */}
                        <div
                            ref={previewContainerRef}
                            className="flex-1 bg-muted flex items-center justify-center p-8 relative overflow-hidden"
                        >
                            <h3 className="absolute top-6 left-6 font-semibold text-muted-foreground">Preview</h3>

                            <div className={cn(
                                "h-[90%] max-h-[800px] aspect-[9/16] rounded-2xl shadow-2xl overflow-hidden relative flex items-center justify-center text-center p-8 break-words whitespace-pre-wrap",
                                step === "text" ? BACKGROUNDS[bgIndex] : "bg-black"
                            )}>
                                {step === "text" && (
                                    <motion.div
                                        drag
                                        dragConstraints={previewContainerRef}
                                        dragMomentum={false}
                                        className="cursor-move z-10"
                                    >
                                        <span
                                            className={cn(
                                                "text-white font-bold block",
                                                font === "Clean" ? "font-sans" :
                                                    font === "Headline" ? "font-serif uppercase tracking-wider" :
                                                        font === "Casual" ? "font-mono" :
                                                            "font-sans italic"
                                            )}
                                            style={{ fontSize: `${fontSize}px`, lineHeight: 1.2 }}
                                        >
                                            {textValue || "Start typing..."}
                                        </span>
                                    </motion.div>
                                )}

                                {step === "photo" && photoUrl && (
                                    <img src={photoUrl} alt="Story preview" className="w-full h-full object-cover select-none pointer-events-none" />
                                )}

                                {/* Music Sticker */}
                                {selectedTrack && showMusicSticker && (
                                    <motion.div
                                        drag
                                        dragConstraints={previewContainerRef}
                                        dragMomentum={false}
                                        className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md rounded-2xl p-3 flex items-center gap-3 shadow-xl border border-white/50 w-[80%] max-w-[280px] animate-in fade-in zoom-in slide-in-from-bottom-4 duration-300 cursor-move z-20"
                                    >
                                        <img src={selectedTrack.albumImage} className="w-12 h-12 rounded-lg shadow-sm pointer-events-none select-none" alt="Album" />
                                        <div className="flex-1 text-left overflow-hidden pointer-events-none select-none">
                                            <p className="text-black font-bold text-sm truncate">{selectedTrack.name}</p>
                                            <p className="text-black/60 text-xs truncate">{selectedTrack.artistName}</p>
                                        </div>
                                        <button
                                            className="w-8 h-8 bg-brand rounded-full flex items-center justify-center text-white hover:scale-105 transition-transform"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                togglePlay(selectedTrack);
                                            }}
                                        >
                                            {playingTrackId === selectedTrack.id ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                                        </button>
                                    </motion.div>
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
                        <DialogTitle className="text-xl font-bold">Add Music</DialogTitle>
                    </div>

                    <div className="px-4 py-3 border-b border-border bg-muted/20">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">Categories</p>
                        <ScrollArea className="w-full whitespace-nowrap pb-1">
                            <div className="flex gap-2">
                                {MUSIC_CATEGORIES.map(cat => (
                                    <Button
                                        key={cat.id}
                                        variant={selectedCategory === cat.id ? "default" : "outline"}
                                        size="sm"
                                        className={cn(
                                            "rounded-full h-9 px-4 gap-2 transition-all",
                                            selectedCategory === cat.id ? "bg-brand hover:bg-brand/90" : "hover:bg-muted"
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
                            <h3 className="font-bold text-lg">Trending {MUSIC_CATEGORIES.find(c => c.id === selectedCategory)?.name}</h3>
                        </div>
                        <ScrollArea className="flex-1 px-1">
                            {isLoadingMusic ? (
                                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground mt-20">
                                    <Loader2 className="w-8 h-8 animate-spin text-brand" />
                                    <p>Loading tracks...</p>
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    {tracks.map(track => (
                                        <div
                                            key={track.id}
                                            className={cn(
                                                "flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors group cursor-pointer",
                                                selectedTrack?.id === track.id && "bg-brand/5"
                                            )}
                                            onClick={() => selectTrack(track)}
                                        >
                                            <div className="relative w-12 h-12 rounded-lg overflow-hidden shadow-sm">
                                                <img src={track.albumImage} className="w-full h-full object-cover" alt="" />
                                                <div
                                                    className={cn(
                                                        "absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                                                        playingTrackId === track.id && "opacity-100"
                                                    )}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        togglePlay(track);
                                                    }}
                                                >
                                                    {playingTrackId === track.id ? (
                                                        <Pause className="w-5 h-5 text-white fill-white" />
                                                    ) : (
                                                        <Play className="w-5 h-5 text-white fill-white" />
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <p className="font-bold text-sm truncate">{track.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{track.artistName}</p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="rounded-full text-muted-foreground hover:text-brand"
                                                onClick={(e) => e.stopPropagation()}
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

            <audio ref={audioRef} className="hidden" onEnded={() => setPlayingTrackId(null)} />

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
