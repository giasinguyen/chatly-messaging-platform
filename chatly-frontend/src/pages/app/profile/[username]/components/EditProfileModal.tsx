import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
    const { t } = useTranslation();
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
                    {t("profile.edit_profile")}
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("profile.open_editor_title")}</DialogTitle>
                    <DialogDescription>
                        {t("profile.open_editor_desc")}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        {t("common.cancel")}
                    </Button>
                    <Button onClick={handleContinue}>{t("profile.continue")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
