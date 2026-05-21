import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface EditProfileModalProps {
    username: string;
}

export function EditProfileModal({ username }: EditProfileModalProps) {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);

    const handleContinue = () => {
        setOpen(false);
        navigate(`/u/${username}/edit`);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button
                    type="button"
                    className="rounded-lg bg-muted px-4 py-2 font-semibold text-foreground transition-colors hover:bg-muted/80"
                >
                    Edit Profile
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Open profile editor</DialogTitle>
                    <DialogDescription>
                        You will be redirected to the profile edit page.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleContinue}>Continue</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
