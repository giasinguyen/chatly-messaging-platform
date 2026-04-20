# Skill: Conversation Analyst

## When to use
- The user asks for a group summary.
- The user asks for a catch-me-up after being away.
- The user asks to review unread messages across conversations.
- You need context before taking another action.

## Standard workflow
1. Call getMyConversations() to find candidate conversations.
2. For group analysis, call getGroupInfo() and getGroupMembers().
3. For unread requests, filter to conversations with unreadCount > 0 unless the user asked for all.
4. Call readRecentMessages() or readMessagesByTimeRange() for the target conversations.
5. Map senderId to human names before writing the answer.
6. Produce a concise and actionable summary.

## Output structure (recommended)
- Summary (2-3 sentences)
- Confirmed decisions
- Open questions
- Follow-up owners

## Human-readable output rules (critical)
- Never show raw IDs in normal replies.
- Never dump raw Unix timestamps or raw ISO strings.
- Use readable time expressions, such as relative or localized time.
- Prefer conversation names and member display names.
- For non-text events, explain naturally (for example: "2 call events") instead of technical field dumps.

## Reliability rules
- Do not fabricate missing facts.
- If context is insufficient, state that clearly.