import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function MessagesSettings() {
    return (
        <div className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto flex max-w-2xl flex-col gap-10">
                <section className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-lg font-bold text-foreground">Compose Message</h3>
                        <p className="text-sm text-muted-foreground">
                            Customize how to send and display chat content
                        </p>
                    </div>

                    <div className="rounded-xl border border-border bg-card/40 p-6 transition-all hover:border-border/80">
                        <RadioGroup disabled defaultValue="enter-send" className="flex flex-col gap-5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="send-enter">Enter to send</Label>
                                <RadioGroupItem value="enter-send" id="send-enter" />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="send-ctrl-enter">Ctrl + Enter to send</Label>
                                <RadioGroupItem value="ctrl-enter-send" id="send-ctrl-enter" />
                            </div>
                        </RadioGroup>
                    </div>
                </section>

                <section className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-foreground">Link Preview</h3>
                    <div className="rounded-xl border border-border bg-card/40 p-6 transition-all hover:border-border/80">
                        <RadioGroup disabled defaultValue="enabled" className="flex flex-col gap-5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="link-preview-enabled">Enable preview</Label>
                                <RadioGroupItem value="enabled" id="link-preview-enabled" />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="link-preview-disabled">Disable preview</Label>
                                <RadioGroupItem value="disabled" id="link-preview-disabled" />
                            </div>
                        </RadioGroup>
                    </div>
                </section>
            </div>
        </div>
    );
}