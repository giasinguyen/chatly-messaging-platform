import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageIcon, TypeIcon, Music, ChevronLeft, Image as ImageIcon2 } from "lucide-react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CreateStoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type StoryStep = "choose" | "text" | "photo";

const BACKGROUNDS = [
    "bg-gradient-to-br from-blue-500 to-cyan-400",
    "bg-gradient-to-br from-purple-500 to-pink-500",
    "bg-gradient-to-br from-orange-400 to-rose-400",
    "bg-gradient-to-br from-emerald-400 to-teal-500",
    "bg-gradient-to-br from-slate-800 to-slate-900",
    "bg-gradient-to-br from-yellow-400 to-orange-500",
];

const FONTS = ["Clean", "Headline", "Casual", "Neon"];

export function CreateStoryModal({ isOpen, onClose }: CreateStoryModalProps) {
    const [step, setStep] = useState<StoryStep>("choose");

    // Text Story State
    const [textValue, setTextValue] = useState("");
    const [bgIndex, setBgIndex] = useState(0);
    const [font, setFont] = useState("Clean");

    // Photo Story State
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleClose = () => {
        setStep("choose");
        setTextValue("");
        setPhotoUrl(null);
        setBgIndex(0);
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
                                <h2 className="font-bold text-xl">Your story</h2>
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

                                <Button variant="outline" className="w-full justify-start gap-3 h-12 rounded-xl">
                                    <Music className="w-5 h-5" /> Add music
                                </Button>
                            </div>

                            <div className="p-4 border-t border-border flex gap-3">
                                <Button variant="secondary" className="flex-1" onClick={handleClose}>Discard</Button>
                                <Button className="flex-1">Share to story</Button>
                            </div>
                        </div>

                        {/* RIGHT PREVIEW */}
                        <div className="flex-1 bg-muted flex items-center justify-center p-8 relative">
                            <h3 className="absolute top-6 left-6 font-semibold text-muted-foreground">Preview</h3>

                            <div className={cn(
                                "h-[90%] max-h-[800px] aspect-[9/16] rounded-2xl shadow-2xl overflow-hidden relative flex items-center justify-center text-center p-8 break-words whitespace-pre-wrap",
                                step === "text" ? BACKGROUNDS[bgIndex] : "bg-black"
                            )}>
                                {step === "text" && (
                                    <span className={cn(
                                        "text-white font-bold",
                                        font === "Clean" ? "font-sans text-3xl" :
                                            font === "Headline" ? "font-serif text-4xl uppercase tracking-wider" :
                                                font === "Casual" ? "font-mono text-2xl" :
                                                    "font-sans text-3xl italic"
                                    )}>
                                        {textValue || "Start typing..."}
                                    </span>
                                )}

                                {step === "photo" && photoUrl && (
                                    <img src={photoUrl} alt="Story preview" className="w-full h-full object-cover" />
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>

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
