import { memo, useRef } from "react";
import { toast } from "sonner";
import {
    Copy,
    Loader2,
    LogOut,
    Pencil,
    Settings,
    Upload,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { ChatUser } from "@/types/message";
import type { ConversationResponse } from "@/types/conversation";

export interface ChatGroupProfileContentProps {
    participant: ChatUser;
    conversation: ConversationResponse;
    groupMembers: ChatUser[];
    inviteLink: string;
    isEditingGroup: boolean;
    groupNameDraft: string;
    groupAvatarDraft: string;
    groupAvatarUploading: boolean;
    groupProfileSaving: boolean;
    onToggleEditing: () => void;
    onChangeName: (value: string) => void;
    onChangeAvatarDraft: (value: string) => void;
    onAvatarFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSaveGroupProfile: () => void;
    onOpenGroupPanel: () => void;
    onLeaveGroup: () => void;
}

export const ChatGroupProfileContent = memo(function ChatGroupProfileContent({
    participant,
    conversation,
    groupMembers,
    inviteLink,
    isEditingGroup,
    groupNameDraft,
    groupAvatarDraft,
    groupAvatarUploading,
    groupProfileSaving,
    onToggleEditing,
    onChangeName,
    onChangeAvatarDraft,
    onAvatarFileChange,
    onSaveGroupProfile,
    onOpenGroupPanel,
    onLeaveGroup,
}: ChatGroupProfileContentProps) {
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(inviteLink);
            toast.success("Group link copied");
        } catch {
            toast.error("Could not copy link");
        }
    };

    const handleCancelEdit = () => {
        onChangeName(
            participant.displayName || conversation.name || "Chat group",
        );
        onChangeAvatarDraft(
            participant.avatarUrl || conversation.avatarUrl || "",
        );
        onToggleEditing();
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle>Group Information</DialogTitle>
                <DialogDescription>
                    Manage group info and members.
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
                <div className="rounded-xl border border-border bg-muted/25 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="h-14 w-14 border border-border/60">
                                <AvatarImage
                                    src={
                                        isEditingGroup
                                            ? groupAvatarDraft || participant.avatarUrl
                                            : participant.avatarUrl
                                    }
                                />
                                <AvatarFallback>
                                    {(isEditingGroup
                                        ? groupNameDraft
                                        : participant.displayName
                                    )
                                        .charAt(0)
                                        .toUpperCase() || "N"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                {isEditingGroup ? (
                                    <Input
                                        value={groupNameDraft}
                                        onChange={(e) => onChangeName(e.target.value)}
                                        placeholder="Group Name"
                                        className="h-8"
                                    />
                                ) : (
                                    <p className="text-base font-semibold text-foreground truncate">
                                        {participant.displayName}
                                    </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Group Chat • {groupMembers.length} members
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={onToggleEditing}
                        >
                            <Pencil size={14} />
                        </Button>
                    </div>

                    {isEditingGroup && (
                        <div className="mt-3 space-y-2">
                            <input
                                ref={avatarInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={onAvatarFileChange}
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                disabled={groupAvatarUploading}
                                onClick={() => avatarInputRef.current?.click()}
                            >
                                {groupAvatarUploading ? (
                                    <>
                                        <Loader2 size={14} className="mr-2 animate-spin" />
                                        Uploading image...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={14} className="mr-2" />
                                        {groupAvatarDraft
                                            ? "Change avatar"
                                            : "Select avatar"}
                                    </>
                                )}
                            </Button>
                            <div className="flex items-center justify-end gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={groupProfileSaving}
                                    onClick={handleCancelEdit}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    disabled={groupProfileSaving || groupAvatarUploading}
                                    onClick={onSaveGroupProfile}
                                >
                                    {groupProfileSaving ? (
                                        <>
                                            <Loader2 size={14} className="mr-1 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        "Save"
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
                    <p className="text-sm font-semibold text-foreground">
                        Members ({groupMembers.length})
                    </p>
                    <div className="flex items-center -space-x-2">
                        {groupMembers.slice(0, 6).map((member) => (
                            <Avatar
                                key={member.id}
                                className="h-9 w-9 border-2 border-background"
                                title={member.displayName}
                            >
                                <AvatarImage src={member.avatarUrl} />
                                <AvatarFallback>
                                    {member.displayName.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                        ))}
                        {groupMembers.length > 6 && (
                            <div className="h-9 w-9 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[11px] text-muted-foreground font-semibold">
                                +{groupMembers.length - 6}
                            </div>
                        )}
                    </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/20 p-3">
                    <p className="text-sm font-medium text-foreground">
                        Group Join Link
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                        <a
                            href={inviteLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-brand hover:underline truncate"
                        >
                            {inviteLink}
                        </a>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={handleCopyLink}
                        >
                            <Copy size={14} />
                        </Button>
                    </div>
                </div>

                <div className="space-y-1">
                    <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={onOpenGroupPanel}
                    >
                        <Settings className="mr-2 h-4 w-4" />
                        Group management
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={onLeaveGroup}
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Leave group
                    </Button>
                </div>
            </div>
        </>
    );
});
