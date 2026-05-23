import DOMPurify from "dompurify";

const ALLOWED_RICH_TEXT_TAGS = [
    "p",
    "br",
    "b",
    "strong",
    "i",
    "em",
    "u",
    "s",
    "ul",
    "ol",
    "li",
    "span",
];

const ALLOWED_RICH_TEXT_ATTRS = ["style"];

const SAFE_STYLE_NAME_SET = new Set([
    "font-size",
    "background-color",
    "color",
]);

export function isRichTextHtml(content: string): boolean {
    if (!content) {
        return false;
    }
    return /<\/?(p|strong|b|i|em|u|s|ul|ol|li|span)\b/i.test(content);
}

export function sanitizeRichTextHtml(content: string): string {
    const sanitizedHtml = DOMPurify.sanitize(content, {
        ALLOWED_TAGS: ALLOWED_RICH_TEXT_TAGS,
        ALLOWED_ATTR: ALLOWED_RICH_TEXT_ATTRS,
        ALLOW_DATA_ATTR: false,
        FORBID_TAGS: ["script", "style", "iframe", "object", "embed"],
        FORBID_ATTR: ["onerror", "onload", "onclick", "src", "href"],
    });

    return sanitizedHtml.replace(/style="([^"]*)"/gi, (_full, styleValue: string) => {
        const safeDeclarations = styleValue
            .split(";")
            .map((item) => item.trim())
            .filter(Boolean)
            .filter((declaration) => {
                const propertyName = declaration.split(":")[0]?.trim().toLowerCase();
                return propertyName ? SAFE_STYLE_NAME_SET.has(propertyName) : false;
            });
        if (safeDeclarations.length === 0) {
            return "";
        }
        return `style="${safeDeclarations.join("; ")}"`;
    });
}

export function toMessagePreviewText(content: string): string {
    if (!content) {
        return "";
    }
    if (!isRichTextHtml(content)) {
        return content;
    }
    const parsed = new DOMParser().parseFromString(content, "text/html");
    return parsed.body.textContent?.replace(/\s+/g, " ").trim() ?? "";
}
