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

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function detectMentionQuery(text: string, cursorPos: number): string | null {
    const textBeforeCursor = text.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@([^\s@]*)$/);
    return mentionMatch ? mentionMatch[1] : null;
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
