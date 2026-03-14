import { Monitor, MoonStar, Sun } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useThemeStore, getResolvedTheme } from "@/store/theme.store";
import { cn } from "@/lib/utils";

type ThemeMode = "light" | "dark" | "system";

const appearanceOptions: Array<{
    value: ThemeMode;
    title: string;
    Icon: typeof Sun;
}> = [
    { value: "light", title: "Sáng", Icon: Sun },
    { value: "dark", title: "Tối", Icon: MoonStar },
    { value: "system", title: "Hệ thống", Icon: Monitor },
];

export function AppearanceSettings() {
    const theme = useThemeStore((s) => s.theme);
    const setTheme = useThemeStore((s) => s.setTheme);
    const resolvedTheme = getResolvedTheme(theme);

    return (
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
                <section className="space-y-3">
                    <h3 className="text-2xl font-bold tracking-tight text-foreground">
                        Cài đặt giao diện
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Chọn chế độ hiển thị bạn thấy dễ chịu nhất.
                    </p>
                </section>

                <section className="rounded-2xl border border-border bg-card/45 p-5 md:p-6">
                    <RadioGroup
                        value={theme}
                        onValueChange={(value) => setTheme(value as ThemeMode)}
                        className="grid grid-cols-1 gap-4 md:grid-cols-3"
                    >
                        {appearanceOptions.map((option) => {
                            const selected = theme === option.value;
                            return (
                                <label
                                    key={option.value}
                                    htmlFor={`theme-${option.value}`}
                                    className={cn(
                                        "cursor-pointer rounded-xl border p-3 transition",
                                        selected
                                            ? "border-brand bg-brand/10 shadow-[0_0_0_1px_rgba(0,113,227,0.5)]"
                                            : "border-border bg-background/30 hover:border-border/80",
                                    )}
                                >
                                    <ThemePreview mode={option.value} />

                                    <div className="mt-4 flex items-center gap-2">
                                        <RadioGroupItem
                                            id={`theme-${option.value}`}
                                            value={option.value}
                                        />
                                        <span className="text-base font-medium text-foreground">
                                            {option.title}
                                        </span>
                                        <option.Icon className="ml-auto h-4 w-4 text-muted-foreground" />
                                    </div>
                                </label>
                            );
                        })}
                    </RadioGroup>

                    <div className="mt-5 rounded-lg bg-background/60 px-4 py-3 text-sm text-muted-foreground">
                        Chế độ hiện tại:{" "}
                        <span className="font-semibold text-foreground">
                            {theme === "light"
                                ? "Sáng"
                                : theme === "dark"
                                  ? "Tối"
                                  : "Theo hệ thống"}
                        </span>
                        {theme === "system" && (
                            <>
                                {" "}
                                (đang hiển thị {resolvedTheme === "dark" ? "Tối" : "Sáng"})
                            </>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}

function ThemePreview({ mode }: { mode: ThemeMode }) {
    if (mode === "dark") {
        return (
            <div className="relative h-24 overflow-hidden rounded-lg border border-[#101726] bg-[#0f1625]">
                <div className="absolute left-3 top-3 h-3 w-3 rounded-full bg-[#68a4ff]" />
                <div className="absolute left-8 top-3 h-3 w-11 rounded-sm bg-[#ffffff29]" />
                <div className="absolute left-3 top-10 h-9 w-20 rounded-md bg-[#161f31]" />
                <div className="absolute right-3 bottom-3 h-5 w-10 rounded-sm bg-[#5f9eff]" />
            </div>
        );
    }

    if (mode === "system") {
        return (
            <div className="relative h-24 overflow-hidden rounded-lg border border-brand/40 bg-gradient-to-r from-[#c7d4e5] to-[#11182a]">
                <div className="absolute inset-y-0 left-1/2 w-px bg-white/70" />
                <div className="absolute left-3 top-3 h-3 w-3 rounded-full bg-[#95bbe8]" />
                <div className="absolute left-8 top-3 h-3 w-11 rounded-sm bg-white/65" />
                <div className="absolute right-3 bottom-3 h-5 w-10 rounded-sm bg-[#6ea9ff]" />
                <div className="absolute right-[46px] top-3 h-3 w-11 rounded-sm bg-white/20" />
            </div>
        );
    }

    return (
        <div className="relative h-24 overflow-hidden rounded-lg border border-[#d5dfeb] bg-[#c7d4e5]">
            <div className="absolute left-3 top-3 h-3 w-3 rounded-full bg-[#95bbe8]" />
            <div className="absolute left-8 top-3 h-3 w-11 rounded-sm bg-white/65" />
            <div className="absolute left-3 top-10 h-9 w-20 rounded-md bg-[#d7e2ef]" />
            <div className="absolute right-3 bottom-3 h-5 w-10 rounded-sm bg-[#8db8ea]" />
        </div>
    );
}
