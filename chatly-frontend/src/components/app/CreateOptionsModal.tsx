import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PenSquare, PlaySquare } from "lucide-react";

interface CreateOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectPost: () => void;
    onSelectStory: () => void;
}

export function CreateOptionsModal({ isOpen, onClose, onSelectPost, onSelectStory }: CreateOptionsModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px] p-6 bg-background rounded-2xl">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-2xl font-bold text-center">Create</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={onSelectPost}
                        className="flex flex-col items-center justify-center p-8 border border-border rounded-xl hover:bg-muted transition-colors group"
                    >
                        <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <PenSquare className="w-8 h-8 text-blue-500" />
                        </div>
                        <span className="font-semibold text-foreground text-lg">Create Post</span>
                        <span className="text-sm text-muted-foreground text-center mt-2">Share thoughts, photos, or videos to your feed.</span>
                    </button>

                    <button
                        onClick={onSelectStory}
                        className="flex flex-col items-center justify-center p-8 border border-border rounded-xl hover:bg-muted transition-colors group"
                    >
                        <div className="w-16 h-16 rounded-full bg-pink-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <PlaySquare className="w-8 h-8 text-pink-500" />
                        </div>
                        <span className="font-semibold text-foreground text-lg">Create Story</span>
                        <span className="text-sm text-muted-foreground text-center mt-2">Share a photo or write text that disappears in 24h.</span>
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
