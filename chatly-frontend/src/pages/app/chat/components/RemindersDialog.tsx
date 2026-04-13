import { useState, useEffect, useCallback } from "react";
import { groupService } from "@/services/group.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    Clock,
    CheckCircle2,
    Circle,
    CalendarClock,
    Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { GroupReminderResponse } from "@/types/group";

function toDatetimeLocalString(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return (
        date.getFullYear() +
        "-" +
        pad(date.getMonth() + 1) +
        "-" +
        pad(date.getDate()) +
        "T" +
        pad(date.getHours()) +
        ":" +
        pad(date.getMinutes())
    );
}

interface RemindersDialogProps {
    conversationId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function RemindersDialog({
    conversationId,
    open,
    onOpenChange,
}: RemindersDialogProps) {
    const [reminders, setReminders] = useState<GroupReminderResponse[]>([]);
    const [loading, setLoading] = useState(false);

    // New reminder form
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [remindAt, setRemindAt] = useState("");
    const [creating, setCreating] = useState(false);

    // Edit reminder state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editRemindAt, setEditRemindAt] = useState("");
    const [updating, setUpdating] = useState(false);

    const fetchReminders = useCallback(async () => {
        if (!conversationId) return;
        setLoading(true);
        try {
            const res = await groupService.getReminders(conversationId);
            setReminders(res.result ?? []);
        } catch {
            toast.error("Could not load reminders");
        } finally {
            setLoading(false);
        }
    }, [conversationId]);

    useEffect(() => {
        if (open) {
            fetchReminders();
            setShowForm(false);
            setTitle("");
            setDescription("");
            setRemindAt(toDatetimeLocalString(new Date()));
        }
    }, [open, fetchReminders]);

    const handleCreate = async () => {
        if (!title.trim()) {
            toast.error("Title cannot be empty");
            return;
        }
        if (remindAt && new Date(remindAt) <= new Date()) {
            toast.error("Reminder time must be in the future");
            return;
        }
        setCreating(true);
        try {
            await groupService.createReminder(conversationId, {
                title: title.trim(),
                description: description.trim() || undefined,
                remindAt: remindAt ? new Date(remindAt).toISOString() : undefined,
            });
            toast.success("Reminder created");
            setTitle("");
            setDescription("");
            setRemindAt("");
            setShowForm(false);
            fetchReminders();
        } catch {
            toast.error("Could not create reminder");
        } finally {
            setCreating(false);
        }
    };

    const handleToggle = async (id: string) => {
        try {
            await groupService.toggleReminder(id);
            fetchReminders();
        } catch {
            toast.error("Could not update reminder");
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await groupService.deleteReminder(id);
            toast.success("Reminder deleted");
            fetchReminders();
        } catch {
            toast.error("Could not delete reminder");
        }
    };

    const startEdit = (r: GroupReminderResponse) => {
        setEditingId(r.id);
        setEditTitle(r.title);
        setEditDescription(r.description ?? "");
        setEditRemindAt(
            r.remindAt ? new Date(r.remindAt).toISOString().slice(0, 16) : "",
        );
    };

    const handleUpdate = async () => {
        if (!editingId || !editTitle.trim()) {
            toast.error("Title cannot be empty");
            return;
        }
        if (editRemindAt && new Date(editRemindAt) <= new Date()) {
            toast.error("Reminder time must be in the future");
            return;
        }
        setUpdating(true);
        try {
            await groupService.updateReminder(editingId, {
                title: editTitle.trim(),
                description: editDescription.trim() || undefined,
                remindAt: editRemindAt ? new Date(editRemindAt).toISOString() : undefined,
            });
            toast.success("Reminder updated");
            setEditingId(null);
            fetchReminders();
        } catch {
            toast.error("Could not update reminder");
        } finally {
            setUpdating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden max-h-[80vh] flex flex-col">
                <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <CalendarClock size={16} className="text-brand" />
                        Reminders list
                    </DialogTitle>
                </DialogHeader>

                <div className="px-5 pb-2 shrink-0">
                    {!showForm ? (
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1.5 w-full border-dashed"
                            onClick={() => setShowForm(true)}
                        >
                            <Plus size={13} />
                            Create new reminder
                        </Button>
                    ) : (
                        <div className="space-y-2 rounded-lg border border-border/50 bg-muted/20 p-3">
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Reminder title..."
                                className="h-8 text-sm"
                            />
                            <Input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Description (optional)..."
                                className="h-8 text-sm"
                            />
                            <Input
                                type="datetime-local"
                                value={remindAt}
                                min={toDatetimeLocalString(new Date())}
                                onChange={(e) => setRemindAt(e.target.value)}
                                className="h-8 text-sm"
                            />
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    className="h-7 text-xs flex-1 gap-1"
                                    onClick={handleCreate}
                                    disabled={creating}
                                >
                                    {creating ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                                    Create
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs"
                                    onClick={() => setShowForm(false)}
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
                    ) : reminders.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                            <Clock size={24} className="opacity-30" />
                            <p className="text-xs">No reminders yet</p>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            {reminders.map((r) =>
                                editingId === r.id ? (
                                    <div
                                        key={r.id}
                                        className="space-y-2 rounded-lg border border-brand/40 bg-muted/20 p-3"
                                    >
                                        <Input
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            placeholder="Reminder title..."
                                            className="h-8 text-sm"
                                        />
                                        <Input
                                            value={editDescription}
                                            onChange={(e) => setEditDescription(e.target.value)}
                                            placeholder="Description (optional)..."
                                            className="h-8 text-sm"
                                        />
                                        <Input
                                            type="datetime-local"
                                            value={editRemindAt}
                                            min={toDatetimeLocalString(new Date())}
                                            onChange={(e) => setEditRemindAt(e.target.value)}
                                            className="h-8 text-sm"
                                        />
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                className="h-7 text-xs flex-1 gap-1"
                                                onClick={handleUpdate}
                                                disabled={updating}
                                            >
                                                {updating ? <Loader2 size={11} className="animate-spin" /> : <Pencil size={11} />}
                                                Update
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 text-xs"
                                                onClick={() => setEditingId(null)}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                <div
                                    key={r.id}
                                    className={cn(
                                        "group flex items-start gap-2.5 rounded-lg border border-border/50 px-3 py-2.5 transition-colors hover:bg-muted/30",
                                        r.completed && "opacity-60",
                                    )}
                                >
                                    <button
                                        type="button"
                                        className="mt-0.5 shrink-0"
                                        onClick={() => handleToggle(r.id)}
                                    >
                                        {r.completed ? (
                                            <CheckCircle2 size={16} className="text-green-500" />
                                        ) : (
                                            <Circle size={16} className="text-muted-foreground" />
                                        )}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <p className={cn("text-sm font-medium", r.completed && "line-through")}>
                                            {r.title}
                                        </p>
                                        {r.description && (
                                            <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                                        )}
                                        {r.remindAt && (
                                            <p className="text-[10px] text-brand mt-1 flex items-center gap-1">
                                                <Clock size={10} />
                                                {new Date(r.remindAt).toLocaleString("en-US")}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                            onClick={() => startEdit(r)}
                                        >
                                            <Pencil size={12} />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                            onClick={() => handleDelete(r.id)}
                                        >
                                            <Trash2 size={12} />
                                        </Button>
                                    </div>
                                </div>
                                ),
                            )}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
