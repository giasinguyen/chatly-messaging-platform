import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UtilitiesSettings() {
    return (
        <div className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto flex max-w-2xl flex-col gap-10">
                <section className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-foreground">Export personal data</h3>
                    <div className="space-y-4 rounded-xl border border-border bg-card/40 p-6 transition-all hover:border-border/80">
                        <div className="space-y-2">
                            <Label htmlFor="export-email">Email to receive exported file</Label>
                            <Input
                                id="export-email"
                                type="email"
                                defaultValue="thechallenger@iuh.edu.vn"
                            />
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={() => alert("Development mode")} className="bg-brand text-white hover:bg-brand-hover">
                                Request data export
                            </Button>
                        </div>
                    </div>
                </section>

                <section className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-foreground">Keyboard Shortcuts</h3>
                    <div className="space-y-3 rounded-xl border border-border bg-card/40 p-6 transition-all hover:border-border/80">
                        <ShortcutRow shortcut="Ctrl + K" description="Search conversation" />
                        <ShortcutRow shortcut="Ctrl + Shift + M" description="Mute/Unmute conversation" />
                        <ShortcutRow shortcut="Ctrl + /" description="Open shortcut panel" />
                    </div>
                </section>
            </div>
        </div>
    );
}

interface ShortcutRowProps {
    shortcut: string;
    description: string;
}

function ShortcutRow({ shortcut, description }: ShortcutRowProps) {
    return (
        <div className="flex items-center justify-between rounded-lg bg-muted/60 px-4 py-3 dark:bg-muted/40">
            <span className="text-sm text-foreground">{description}</span>
            <kbd className="rounded-md bg-background px-2 py-1 text-xs text-muted-foreground shadow-sm">
                {shortcut}
            </kbd>
        </div>
    );
}