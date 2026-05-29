import { cn } from "@/lib/utils";
import type { ChatUser } from "@/types/message";
import { isGroupInviteLink } from "@/utils/groupInviteLink";
import { getYouTubePreview } from "@/utils/youtubePreview";
import { useTranslation } from "react-i18next";
import { isRichTextHtml, sanitizeRichTextHtml } from "./richTextMessage.utils";

interface TextMessageBodyProps {
    content: string;
    isMe: boolean;
    participantDirectory: Record<string, ChatUser>;
    highlightKeyword?: string | null;
    onOpenSenderProfile?: (userId: string) => void;
}

function renderHighlightedText(
    text: string,
    highlightKeyword?: string | null,
): React.ReactNode {
    if (!highlightKeyword?.trim()) return text;
    const escaped = highlightKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escaped})`, "gi"));
    if (parts.length === 1) return text;
    return (
        <>
            {parts.map((part, i) =>
                i % 2 === 1 ? (
                    <mark
                        key={i}
                        className="bg-yellow-200 dark:bg-yellow-800 text-inherit rounded px-0.5"
                    >
                        {part}
                    </mark>
                ) : (
                    part
                ),
            )}
        </>
    );
}

function buildCombinedRegex(participantDirectory: Record<string, ChatUser>): RegExp {
    const mentionNames = [
        ...Object.values(participantDirectory).flatMap((u) => [
            u.displayName,
            u.username,
        ]),
        "all",
        "AI",
    ].filter(Boolean).sort((a, b) => b.length - a.length);
    const escapedNames = mentionNames.map((n) =>
        n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    );
    const mentionPart =
        escapedNames.length > 0 ? `@(?:${escapedNames.join("|")})` : "@\\S+";
    return new RegExp(`(https?:\\/\\/[^\\s<>"]+|${mentionPart})`, "g");
}

export function TextMessageBody({
    content,
    isMe,
    participantDirectory,
    highlightKeyword,
    onOpenSenderProfile,
}: TextMessageBodyProps) {
    const { t } = useTranslation();

    if (!content) return null;

    if (isRichTextHtml(content)) {
        const safeHtml = sanitizeRichTextHtml(content);
        return (
            <div
                className={cn(
                    "chat-rich-text break-words",
                    isMe && "text-white [&_a]:text-white/90",
                    !isMe && "text-foreground",
                )}
                dangerouslySetInnerHTML={{ __html: safeHtml }}
            />
        );
    }

    const combinedRegex = buildCombinedRegex(participantDirectory);
    const parts = content.split(combinedRegex);
    const hasSpecial = parts.some((p) => /^https?:\/\//.test(p) || /^@/.test(p));

    if (!hasSpecial) {
        return <span>{renderHighlightedText(content, highlightKeyword)}</span>;
    }

    return (
        <span>
            {parts.map((part, i) => {
                if (/^https?:\/\//.test(part)) {
                    const shouldOpenInCurrentTab = isGroupInviteLink(part);
                    const youtubePreview = getYouTubePreview(part);
                    return (
                        <span key={i} className="inline-flex max-w-full flex-col gap-1 align-top">
                            <a
                                href={part}
                                target={shouldOpenInCurrentTab ? undefined : "_blank"}
                                rel={shouldOpenInCurrentTab ? undefined : "noopener noreferrer"}
                                className={cn(
                                    "underline break-all",
                                    isMe
                                        ? "text-white/90 hover:text-white"
                                        : "text-[#1a146b] hover:text-[#312e81] dark:text-[#818cf8] dark:hover:text-[#a5b4fc]",
                                )}
                            >
                                {part}
                            </a>
                            {youtubePreview && (
                                <a
                                    href={part}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={cn(
                                        "mt-1 block w-60 max-w-full overflow-hidden rounded-lg border no-underline transition hover:opacity-90",
                                        isMe
                                            ? "border-white/20 bg-white/10 text-white"
                                            : "border-border/60 bg-background text-foreground",
                                    )}
                                >
                                    <img
                                        src={youtubePreview.thumbnailUrl}
                                        alt={t("chat.youtube_thumbnail_alt")}
                                        loading="lazy"
                                        className="aspect-video w-full object-cover"
                                    />
                                    <span className="block px-2 py-1.5 text-[11px] font-medium">
                                        {t("chat.youtube_preview")}
                                    </span>
                                </a>
                            )}
                        </span>
                    );
                }
                if (/^@/.test(part)) {
                    const mentionName = part.replace(/^@/, "");

                    if (mentionName === "AI") {
                        return (
                            <span
                                key={i}
                                className={cn(
                                    "inline-flex items-center gap-0.5 font-semibold rounded px-0.5",
                                    isMe
                                        ? "text-white/90 bg-white/15"
                                        : "text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30",
                                )}
                            >
                                {part}
                            </span>
                        );
                    }

                    const mentionedUser =
                        mentionName === "all"
                            ? null
                            : Object.values(participantDirectory).find(
                                  (u) =>
                                      u.displayName === mentionName ||
                                      u.username === mentionName,
                              );
                    if (mentionedUser && onOpenSenderProfile) {
                        return (
                            <button
                                key={i}
                                type="button"
                                onClick={() => onOpenSenderProfile(mentionedUser.id)}
                                className={cn(
                                    "font-semibold cursor-pointer hover:underline",
                                    isMe ? "text-white/90" : "text-[#1a146b] dark:text-[#818cf8]",
                                )}
                            >
                                {part}
                            </button>
                        );
                    }
                    return (
                        <span
                            key={i}
                            className={cn(
                                "font-semibold",
                                isMe ? "text-white/90" : "text-[#1a146b] dark:text-[#818cf8]",
                            )}
                        >
                            {part}
                        </span>
                    );
                }
                return (
                    <span key={i}>{renderHighlightedText(part, highlightKeyword)}</span>
                );
            })}
        </span>
    );
}
