import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { UserResponse } from "@/types/auth";
import { ImagePlus, MapPin, SmilePlus, UserPlus, Send, Globe, ChevronDown } from "lucide-react";

interface CreatePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: UserResponse | null;
}

export function CreatePostModal({ isOpen, onClose, user }: CreatePostModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-background border-border shadow-2xl rounded-xl">
                <DialogHeader className="px-6 py-4 border-b border-border">
                    <DialogTitle className="text-xl font-bold">Create Post</DialogTitle>
                </DialogHeader>

                <div className="p-6 flex flex-col gap-6">
                    {/* User Context & Privacy Selector */}
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-muted shadow-sm">
                            <img
                                alt="User Avatar"
                                className="w-full h-full object-cover"
                                src={user?.avatarUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuBkBUiR9tUTXPHbOqc7Ivznf7tEN__jgWpMUMP4JxSGRgJRlWssTxrQOj5pXnHsHSjKAsDLGKQBV1TJEw-xlGbZxtHLZS4LV-Ege3ySxwFia10uI3eWy0QfWiAISnb0DuJ2kzUd_rYM9A9wD0CgKl8afcZKfoKevvRk0bppdi7cSyveNZcMxWxRipmAheBfSHtJ8jTtPZxXIxYtU_IT-RTZRBDkywn6efP_WB9jwJewHGTDyx7TELeOeuqNC8AZKVWJGrkRD7hsuHw"}
                            />
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="font-bold text-foreground">
                                {user?.displayName || "Sarah Jenkins"}
                            </span>
                            <button className="flex items-center gap-1 px-3 py-1 mt-1 rounded-full bg-muted/50 border border-border text-muted-foreground hover:bg-muted transition-colors group">
                                <Globe className="w-4 h-4 group-hover:text-brand transition-colors" />
                                <span className="font-semibold text-[11px] group-hover:text-brand transition-colors">Public</span>
                                <ChevronDown className="w-4 h-4 group-hover:text-brand transition-colors" />
                            </button>
                        </div>
                    </div>

                    {/* Text Area */}
                    <textarea
                        className="w-full bg-transparent border-none focus:ring-0 resize-none text-base text-foreground placeholder:text-muted-foreground min-h-[140px] p-0 outline-none"
                        placeholder="What's on your mind?"
                    ></textarea>

                    {/* Media Upload Area */}
                    <div className="border-2 border-dashed border-border rounded-lg p-10 flex flex-col items-center justify-center gap-3 hover:border-brand/50 hover:bg-brand/5 transition-all cursor-pointer group">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-brand/10 transition-colors shadow-sm">
                            <ImagePlus className="w-6 h-6 text-muted-foreground group-hover:text-brand transition-colors" />
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-foreground">Click to upload or drag and drop</p>
                            <p className="text-sm text-muted-foreground mt-1">SVG, PNG, JPG or GIF (max. 800x400px)</p>
                        </div>
                    </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-between px-6 py-4 bg-background border-t border-border">
                    <div className="flex items-center gap-1">
                        {/* Tag Users */}
                        <button className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-brand transition-colors" title="Tag People">
                            <UserPlus className="w-5 h-5" />
                        </button>
                        {/* Location */}
                        <button className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-green-500 transition-colors" title="Location">
                            <MapPin className="w-5 h-5" />
                        </button>
                        {/* Feeling/Activity */}
                        <button className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-yellow-500 transition-colors" title="Feeling/Activity">
                            <SmilePlus className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Primary Action */}
                    <button className="px-6 py-2.5 rounded-full bg-brand text-white font-bold hover:bg-brand/90 transition-colors shadow-md active:scale-95 flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        Post
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
