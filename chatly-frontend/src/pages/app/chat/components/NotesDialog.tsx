import { useState, useEffect, useCallback } from "react";
import { groupService } from "@/services/group.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Plus,
    Trash2,
    Loader2,
    FileText,
    Pin,
    PinOff,
    Pencil,
    Save,
    X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { GroupNoteResponse } from "@/types/group";

interface NotesDialogProps {
    conversationId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function NotesDialog({
    conversationId,
    open,
    onOpenChange,
}: NotesDialogProps) {
    const [notes, setNotes] = useState<GroupNoteResponse[]>([]);
    const [loading, setLoading] = useState(false);

    // New / edit form
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [saving, setSaving] = useState(false);

    const fetchNotes = useCallback(async () => {
        if (!conversationId) return;
        setLoading(true);
        try {
            const res = await groupService.getNotes(conversationId);
            setNotes(res.result ?? []);
        } catch {
            toast.error("Could not load notes");
        } finally {
            setLoading(false);
        }
    }, [conversationId]);

    useEffect(() => {
        if (open) {
            fetchNotes();
            resetForm();
        }
    }, [open, fetchNotes]);

    const resetForm = () => {
        setShowForm(false);
        setEditingId(null);
        setTitle("");
        setContent("");
    };

    const handleSave = async () => {
        if (!title.trim()) {
            toast.error("Title cannot be empty");
            return;
        }
        setSaving(true);
        try {
            if (editingId) {
                await groupService.updateNote(editingId, {
                    title: title.trim(),
                    content: content.trim() || undefined,
                });
                toast.success("Note updated");
            } else {
                await groupService.createNote(conversationId, {
                    title: title.trim(),
                    content: content.trim() || undefined,
                });
                toast.success("Note created");
            }
            resetForm();
            fetchNotes();
        } catch {
            toast.error("Could not save note");
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (note: GroupNoteResponse) => {
        setEditingId(note.id);
        setTitle(note.title);
        setContent(note.content ?? "");
        setShowForm(true);
    };

    const handleTogglePin = async (note: GroupNoteResponse) => {
        try {
            await groupService.updateNote(note.id, {
                title: note.title,
                pinned: !note.pinned,
            });
            fetchNotes();
        } catch {
            toast.error("Could not update pin");
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await groupService.deleteNote(id);
            toast.success("Note deleted");
            fetchNotes();
        } catch {
            toast.error("Could not delete note");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden max-h-[80vh] flex flex-col">
                <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <FileText size={16} className="text-brand" />
                        Notes
                    </DialogTitle>
                </DialogHeader>

                <div className="px-5 pb-2 shrink-0">
                    {!showForm ? (
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1.5 w-full border-dashed"
                            onClick={() => {
                                resetForm();
                                setShowForm(true);
                            }}
                        >
                            <Plus size={13} />
                            Create new note
                        </Button>
                    ) : (
                        <div className="space-y-2 rounded-lg border border-border/50 bg-muted/20 p-3">
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Title..."
                                className="h-8 text-sm"
                            />
                            <Textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Note content..."
                                className="text-sm min-h-[80px] resize-none"
                            />
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    className="h-7 text-xs flex-1 gap-1"
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                                    {editingId ? "Update" : "Create"}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs"
                                    onClick={resetForm}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <ScrollArea className="flex-1 min-h-0 px-5 pb-5">
                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : notes.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                            <FileText size={24} className="opacity-30" />
                            <p className="text-xs">No notes yet</p>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            {notes.map((note) => (
                                <div
                                    key={note.id}
                                    className={cn(
                                        "group rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/30",
                                        note.pinned
                                            ? "border-brand/30 bg-brand/5"
                                            : "border-border/50",
                                    )}
                                >
                                    <div className="flex items-start gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                {note.pinned && <Pin size={11} className="text-brand shrink-0" />}
                                                <p className="text-sm font-medium truncate">{note.title}</p>
                                            </div>
                                            {note.content && (
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">
                                                    {note.content}
                                                </p>
                                            )}
                                            <p className="text-[10px] text-muted-foreground/70 mt-1.5">
                                                {new Date(note.createdAt).toLocaleString("en-US")}
                                            </p>
                                        </div>
                                        <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6 text-muted-foreground hover:text-brand"
                                                onClick={() => handleTogglePin(note)}
                                                title={note.pinned ? "Unpin" : "Pin"}
                                            >
                                                {note.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                onClick={() => startEdit(note)}
                                                title="Edit"
                                            >
                                                <Pencil size={12} />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleDelete(note.id)}
                                                title="Delete"
                                            >
                                                <Trash2 size={12} />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
