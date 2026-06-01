import i18n from '@/lib/i18n';

interface SystemMessagePattern {
  pattern: RegExp;
  key: string;
  groups: string[];
}

const SYSTEM_MESSAGE_PATTERNS: SystemMessagePattern[] = [
  {
    pattern: /^(?<actor>.+) added (?<target>.+) to the group$/,
    key: 'chat.system_messages.member_added_by',
    groups: ['actor', 'target'],
  },
  {
    pattern: /^(?<name>.+) joined the group$/,
    key: 'chat.system_messages.member_joined',
    groups: ['name'],
  },
  {
    pattern: /^(?<name>.+) left the group$/,
    key: 'chat.system_messages.member_left',
    groups: ['name'],
  },
  {
    pattern: /^(?<actor>.+) removed (?<target>.+) from the group$/,
    key: 'chat.system_messages.member_removed_by',
    groups: ['actor', 'target'],
  },
  {
    pattern: /^(?<name>.+) is now the group owner$/,
    key: 'chat.system_messages.owner_transferred',
    groups: ['name'],
  },
  {
    pattern: /^(?<name>.+) changed the group avatar$/,
    key: 'chat.system_messages.group_avatar_changed_by',
    groups: ['name'],
  },
];

export function formatSystemMessage(content: string): string {
  const trimmedContent = content.trim();

  for (const item of SYSTEM_MESSAGE_PATTERNS) {
    const match = trimmedContent.match(item.pattern);
    if (!match?.groups) {
      continue;
    }

    const values = Object.fromEntries(
      item.groups.map((groupName) => [groupName, match.groups?.[groupName] ?? ''])
    );
    return i18n.t(item.key, values);
  }

  return content;
}
