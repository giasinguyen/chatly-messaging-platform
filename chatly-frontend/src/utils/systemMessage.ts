import type { TFunction } from "i18next";

const SYSTEM_MESSAGE_PATTERNS: Array<{
    pattern: RegExp;
    key: string;
    getValues: (match: RegExpMatchArray) => Record<string, string>;
}> = [
    {
        pattern: /^(.+) added (.+) to the group$/,
        key: "chat.system_messages.member_added_by",
        getValues: (match) => ({ actor: match[1], target: match[2] }),
    },
    {
        pattern: /^(.+) joined the group$/,
        key: "chat.system_messages.member_joined",
        getValues: (match) => ({ name: match[1] }),
    },
    {
        pattern: /^(.+) left the group$/,
        key: "chat.system_messages.member_left",
        getValues: (match) => ({ name: match[1] }),
    },
    {
        pattern: /^(.+) removed (.+) from the group$/,
        key: "chat.system_messages.member_removed_by",
        getValues: (match) => ({ actor: match[1], target: match[2] }),
    },
    {
        pattern: /^(.+) is now the group owner$/,
        key: "chat.system_messages.owner_transferred",
        getValues: (match) => ({ name: match[1] }),
    },
    {
        pattern: /^(.+) changed the group avatar$/,
        key: "chat.system_messages.group_avatar_changed_by",
        getValues: (match) => ({ name: match[1] }),
    },
    {
        pattern: /^(.+) changed the group name to (.+)$/,
        key: "chat.system_messages.group_name_changed_by",
        getValues: (match) => ({ name: match[1], groupName: match[2] }),
    },
];

export function formatSystemMessage(content: string, t: TFunction): string {
    for (const item of SYSTEM_MESSAGE_PATTERNS) {
        const match = content.match(item.pattern);
        if (match) {
            return t(item.key, item.getValues(match));
        }
    }

    return content;
}
