import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { sessionService } from "@/services/session.service";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import type { UserSessionInfo } from "@/types/auth";
import { Loader2, Monitor, Smartphone } from "lucide-react";

function geoDetailLine(s: UserSessionInfo): string | null {
    const g = s.geoSnapshot;
    if (!g || typeof g !== "object") return null;
    const parts: string[] = [];
    if (g.connection?.isp) parts.push(g.connection.isp);
    if (g.timezone?.id) parts.push(g.timezone.id);
    if (g.country_code && !parts.length) parts.push(g.country_code);
    return parts.length ? parts.join(" · ") : null;
}

function formatWhen(iso?: string | null) {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
}

/** revoked false = still valid → show Active (user can revoke). revoked true = ended → Logged out. */
function isRevoked(s: UserSessionInfo): boolean {
    return s.revoked === true;
}

export function SessionSettings() {
    const navigate = useNavigate();
    const clearAuth = useAuthStore((s) => s.clearAuth);
    const [sessions, setSessions] = useState<UserSessionInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [revoking, setRevoking] = useState<string | null>(null);
    const [purging, setPurging] = useState(false);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res = await sessionService.list();
            if (res.code === 1000 && res.result) {
                setSessions(res.result);
            }
        } catch {
            toast.error("Could not load sessions.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const onPurgeAll = async () => {
        if (
            !window.confirm(
                "Remove ALL session history and sign out every device (including this one)? You will need to sign in again.",
            )
        ) {
            return;
        }
        try {
            setPurging(true);
            await sessionService.purgeAll();
            toast.success("All sessions cleared.");
            try {
                await authService.logout();
            } catch {
                /* ignore */
            }
            clearAuth();
            navigate("/auth/login", { replace: true });
        } catch (e: unknown) {
            const msg =
                (e as { response?: { data?: { message?: string } } })?.response
                    ?.data?.message ?? "Could not clear sessions.";
            toast.error(msg);
        } finally {
            setPurging(false);
        }
    };

    const onRevoke = async (row: UserSessionInfo) => {
        if (row.revoked) return;
        try {
            setRevoking(row.id);
            await sessionService.revoke(row.id);
            toast.success(
                row.current
                    ? "This device was signed out."
                    : "Session revoked.",
            );
            if (row.current) {
                try {
                    await authService.logout();
                } catch {
                    /* ignore */
                }
                clearAuth();
                navigate("/auth/login", { replace: true });
            } else {
                await load();
            }
        } catch (e: unknown) {
            const msg =
                (e as { response?: { data?: { message?: string } } })?.response
                    ?.data?.message ?? "Could not revoke session.";
            toast.error(msg);
        } finally {
            setRevoking(null);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto flex max-w-2xl flex-col gap-6">
                <section className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-lg font-bold text-foreground">
                                Devices &amp; sessions
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Lists every sign-in record, including ended sessions. At most one active web and
                                one active mobile session; older rows are kept as history until you clear them.
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="shrink-0"
                            disabled={purging || loading}
                            onClick={onPurgeAll}
                        >
                            {purging ? "Clearing…" : "Clear all & sign out everywhere"}
                        </Button>
                    </div>

                    {loading ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Loading sessions…
                        </div>
                    ) : sessions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No session history.</p>
                    ) : (
                        <ul className="space-y-3">
                            {sessions.map((s) => {
                                const geoLine = geoDetailLine(s);
                                return (
                                <li
                                    key={s.id}
                                    className={`rounded-xl border border-border p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${
                                        isRevoked(s) ? "bg-muted/30 opacity-90" : "bg-card/40"
                                    }`}
                                >
                                    <div className="flex gap-3 min-w-0">
                                        <div className="mt-0.5 text-muted-foreground shrink-0">
                                            {s.platform === "MOBILE" ? (
                                                <Smartphone className="h-5 w-5" />
                                            ) : (
                                                <Monitor className="h-5 w-5" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-medium text-foreground">
                                                    {s.platform === "MOBILE"
                                                        ? "Mobile"
                                                        : "Web"}
                                                </span>
                                                {isRevoked(s) ? (
                                                    <span
                                                        className="text-xs rounded-full bg-muted px-2 py-0.5 text-muted-foreground"
                                                        title="Session revoked — already logged out on this device"
                                                    >
                                                        Logged out
                                                    </span>
                                                ) : (
                                                    <span
                                                        className="text-xs rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 px-2 py-0.5"
                                                        title="Still active — use Revoke to sign out this session"
                                                    >
                                                        Active
                                                    </span>
                                                )}
                                                {s.current && !isRevoked(s) && (
                                                    <span className="text-xs rounded-full bg-brand/15 text-brand px-2 py-0.5">
                                                        This device
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground break-words">
                                                {s.deviceLabel || "Unknown device"}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {s.locationLabel && (
                                                    <span>{s.locationLabel} · </span>
                                                )}
                                                {s.ipAddress && (
                                                    <span>IP {s.ipAddress} · </span>
                                                )}
                                                Last seen {formatWhen(s.lastSeenAt ?? s.createdAt)}
                                                {isRevoked(s) && s.revokedAt && (
                                                    <>
                                                        {" "}
                                                        · Logged out {formatWhen(s.revokedAt)}
                                                    </>
                                                )}
                                            </p>
                                            {geoLine && (
                                                <p className="text-xs text-muted-foreground/90 mt-0.5">
                                                    {geoLine}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {!isRevoked(s) ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="shrink-0 self-start sm:self-center"
                                            disabled={revoking === s.id}
                                            onClick={() => onRevoke(s)}
                                        >
                                            {revoking === s.id
                                                ? "…"
                                                : s.current
                                                  ? "Sign out this device"
                                                  : "Revoke"}
                                        </Button>
                                    ) : (
                                        <span
                                            className="text-xs text-muted-foreground self-center max-w-[8rem] text-right"
                                            title="Already logged out"
                                        >
                                            Logged out
                                        </span>
                                    )}
                                </li>
                            );
                            })}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}
