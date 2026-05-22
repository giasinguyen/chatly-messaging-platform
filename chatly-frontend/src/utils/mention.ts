export type MentionKind = "user" | "ai" | "all";

export interface MentionCandidate {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
}

export interface MentionSuggestion extends MentionCandidate {
    kind: MentionKind;
}

export interface MentionDropdownAnchor {
    left: number;
    top: number;
    placement: "top" | "bottom";
    maxHeight?: number;
}

interface BuildSuggestionsOptions {
    includeAi?: boolean;
    includeAll?: boolean;
    currentUserId?: string;
    maxUsers?: number;
}

interface InsertMentionOptions {
    userMentionField?: "displayName" | "username";
}

interface ExtractMentionTargetsOptions {
    includeAi?: boolean;
    includeAll?: boolean;
}

const MENTION_DROPDOWN_WIDTH = 288;
const MENTION_DROPDOWN_MAX_HEIGHT = 208;
const MENTION_DROPDOWN_GUTTER = 8;
const MENTION_DROPDOWN_MIN_HEIGHT = 72;

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function detectMentionQuery(text: string, cursorPos: number): string | null {
    const textBeforeCursor = text.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@([^\s@]*)$/);
    return mentionMatch ? mentionMatch[1] : null;
}

export function getTextareaMentionAnchor(
    textarea: HTMLTextAreaElement,
    cursorPos: number,
): MentionDropdownAnchor {
    const computed = window.getComputedStyle(textarea);
    const mirror = document.createElement("div");
    const marker = document.createElement("span");
    const copiedStyles = [
        "borderTopWidth",
        "borderRightWidth",
        "borderBottomWidth",
        "borderLeftWidth",
        "boxSizing",
        "fontFamily",
        "fontSize",
        "fontStyle",
        "fontWeight",
        "letterSpacing",
        "lineHeight",
        "paddingTop",
        "paddingRight",
        "paddingBottom",
        "paddingLeft",
        "textTransform",
        "textIndent",
        "wordSpacing",
    ] as const;

    mirror.className = "pointer-events-none absolute invisible whitespace-pre-wrap break-words overflow-hidden";
    mirror.style.width = `${textarea.offsetWidth}px`;
    copiedStyles.forEach((property) => {
        mirror.style[property] = computed[property];
    });
    mirror.textContent = textarea.value.slice(0, cursorPos);
    marker.textContent = textarea.value.slice(cursorPos, cursorPos + 1) || ".";
    mirror.appendChild(marker);
    document.body.appendChild(mirror);

    const lineHeight = Number.parseFloat(computed.lineHeight) || Number.parseFloat(computed.fontSize) * 1.2;
    const maxLeft = textarea.clientWidth - MENTION_DROPDOWN_WIDTH - MENTION_DROPDOWN_GUTTER;
    const left = Math.max(
        MENTION_DROPDOWN_GUTTER,
        Math.min(marker.offsetLeft - textarea.scrollLeft, maxLeft),
    );
    const caretTop = marker.offsetTop - textarea.scrollTop;
    const maxHeight = Math.max(
        MENTION_DROPDOWN_MIN_HEIGHT,
        Math.min(
            MENTION_DROPDOWN_MAX_HEIGHT,
            textarea.clientHeight - MENTION_DROPDOWN_GUTTER * 2,
        ),
    );
    const maxTop = Math.max(
        MENTION_DROPDOWN_GUTTER,
        textarea.clientHeight - maxHeight - MENTION_DROPDOWN_GUTTER,
    );
    const top = Math.max(
        MENTION_DROPDOWN_GUTTER,
        Math.min(caretTop + lineHeight + 6, maxTop),
    );

    mirror.remove();

    return {
        left,
        top,
        placement: "bottom",
        maxHeight,
    };
}

export function buildMentionSuggestions(
    query: string | null,
    candidates: MentionCandidate[],
    options: BuildSuggestionsOptions = {},
): MentionSuggestion[] {
    if (query === null) return [];

    const q = query.toLowerCase();
    const includeAi = options.includeAi ?? true;
    const includeAll = options.includeAll ?? false;
    const maxUsers = options.maxUsers ?? 8;
    const currentUserId = options.currentUserId;

    const results: MentionSuggestion[] = [];

    if (includeAll && "all".startsWith(q)) {
        results.push({
            id: "all",
            displayName: "All members",
            username: "all",
            kind: "all",
        });
    }

    if (includeAi && "ai".startsWith(q)) {
        results.push({
            id: "AI",
            displayName: "AI",
            username: "AI",
            kind: "ai",
        });
    }

    for (const candidate of candidates) {
        if (currentUserId && candidate.id === currentUserId) {
            continue;
        }
        if (
            candidate.displayName.toLowerCase().includes(q)
            || candidate.username.toLowerCase().includes(q)
        ) {
            results.push({ ...candidate, kind: "user" });
        }
        if (results.filter((item) => item.kind === "user").length >= maxUsers) {
            break;
        }
    }

    return results;
}

export function insertMentionAtCursor(
    text: string,
    cursorPos: number,
    suggestion: MentionSuggestion,
    options: InsertMentionOptions = {},
): string {
    const mentionStart = text.slice(0, cursorPos).lastIndexOf("@");
    if (mentionStart < 0) {
        return text;
    }

    const userMentionField = options.userMentionField ?? "displayName";
    const mentionToken = suggestion.kind === "all"
        ? "@all"
        : suggestion.kind === "ai"
            ? "@AI"
            : `@${userMentionField === "username" ? suggestion.username : suggestion.displayName}`;

    return text.slice(0, mentionStart) + mentionToken + " " + text.slice(cursorPos);
}

export function extractMentionTargets(
    text: string,
    candidates: MentionCandidate[],
    options: ExtractMentionTargetsOptions = {},
): string[] {
    const includeAi = options.includeAi ?? false;
    const includeAll = options.includeAll ?? false;

    const parts: string[] = [
        ...candidates.flatMap((candidate) => [candidate.displayName, candidate.username]),
    ];
    if (includeAll) {
        parts.push("all");
    }
    if (includeAi) {
        parts.push("AI");
    }

    const uniqueParts = [...new Set(parts.filter(Boolean))].sort((a, b) => b.length - a.length);
    if (!uniqueParts.length) {
        return [];
    }

    const escaped = uniqueParts.map(escapeRegExp);
    const mentionRegex = new RegExp(`@(${escaped.join("|")})`, "gi");

    const targets = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = mentionRegex.exec(text)) !== null) {
        const token = match[1];
        const normalized = token.toLowerCase();

        if (includeAll && normalized === "all") {
            targets.add("all");
            continue;
        }
        if (includeAi && normalized === "ai") {
            targets.add("AI");
            continue;
        }

        const user = candidates.find((candidate) =>
            candidate.displayName.toLowerCase() === normalized
            || candidate.username.toLowerCase() === normalized,
        );
        if (user) {
            targets.add(user.id);
        }
    }

    return [...targets];
}
