import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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

function formatWhen(iso: string | null | undefined, locale: string): string {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleString(locale);
    } catch {
        return iso;
    }
}

/** revoked false = still valid → show Active (user can revoke). revoked true = ended → Logged out. */
function isRevoked(s: UserSessionInfo): boolean {
    return s.revoked === true;
}

export function SessionSettings() {
    const { t, i18n } = useTranslation();
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
            toast.error(t("settings.sessions.load_failed"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        load();
    }, [load]);

    const onPurgeAll = async () => {
        if (!window.confirm(t("settings.sessions.purge_confirm"))) {
            return;
        }
        try {
            setPurging(true);
            await sessionService.purgeAll();
            toast.success(t("settings.sessions.purge_success"));
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
                    ?.data?.message ?? t("settings.sessions.purge_failed");
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
                    ? t("settings.sessions.device_signed_out")
                    : t("settings.sessions.session_revoked"),
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
                    ?.data?.message ?? t("settings.sessions.revoke_failed");
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
                                {t("settings.sessions.title")}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {t("settings.sessions.description")}
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
                            {purging
                                ? t("settings.sessions.clearing")
                                : t("settings.sessions.purge_all")}
                        </Button>
                    </div>

                    {loading ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            {t("settings.sessions.loading")}
                        </div>
                    ) : sessions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("settings.sessions.no_sessions")}</p>
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
                                                        ? t("settings.sessions.platform_mobile")
                                                        : t("settings.sessions.platform_web")}
                                                </span>
                                                {isRevoked(s) ? (
                                                    <span className="text-xs rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                                                        {t("settings.sessions.logged_out")}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 px-2 py-0.5">
                                                        {t("settings.sessions.active")}
                                                    </span>
                                                )}
                                                {s.current && !isRevoked(s) && (
                                                    <span className="text-xs rounded-full bg-brand/15 text-brand px-2 py-0.5">
                                                        {t("settings.sessions.this_device")}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground break-words">
                                                {s.deviceLabel || t("settings.sessions.unknown_device")}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {s.locationLabel && (
                                                    <span>{s.locationLabel} · </span>
                                                )}
                                                {s.ipAddress && (
                                                    <span>{t("settings.sessions.ip_label")} {s.ipAddress} · </span>
                                                )}
                                                {t("settings.sessions.last_seen", {
                                                    time: formatWhen(s.lastSeenAt ?? s.createdAt, i18n.language),
                                                })}
                                                {isRevoked(s) && s.revokedAt && (
                                                    <>
                                                        {" · "}
                                                        {t("settings.sessions.logged_out_at", {
                                                            time: formatWhen(s.revokedAt, i18n.language),
                                                        })}
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
                                                  ? t("settings.sessions.sign_out_this_device")
                                                  : t("settings.sessions.revoke")}
                                        </Button>
                                    ) : (
                                        <span className="text-xs text-muted-foreground self-center max-w-[8rem] text-right">
                                            {t("settings.sessions.logged_out")}
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
