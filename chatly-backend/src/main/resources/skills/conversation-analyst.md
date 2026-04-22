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
4. For each unread conversation, call readRecentMessages() or readMessagesByTimeRange() and collect enough messages to infer topic, intent, and action items (not just the latest message).
5. Map senderId to human names before writing the answer.
6. Group the unread content into short thematic summaries per conversation.
7. Produce a concise and actionable answer in natural language.

## Output style (critical)
- Write like a human catch-up, not a machine report.
- Use short natural paragraphs first; only use bullet points when they improve clarity.
- Do not output rigid templates such as "Unread Messages: X" and "Last Message: ..." unless the user explicitly asks for that format.
- Mention what people are discussing, deciding, or asking for in each conversation.
- Keep each conversation summary to 1-3 sentences that capture the main thread.

## Recommended response shape
- Start with a 1-2 sentence overall catch-up across all unread conversations.
- Then summarize each unread conversation by:
	- Main topic
	- Current status (decision made, waiting, blocked, or active discussion)
	- Any direct ask or follow-up owner if present
- End with an optional offer to drill into one conversation.

## Human-readable output rules (critical)
- Never show raw IDs in normal replies.
- Never dump raw Unix timestamps or raw ISO strings.
- Use readable time expressions, such as relative or localized time.
- Prefer conversation names and member display names.
- For non-text events, explain naturally (for example: "2 call events") instead of technical field dumps.
- Mirror the user's language for the final answer.

## Reliability rules
- Do not fabricate missing facts.
- If context is insufficient, state that clearly and ask to fetch more messages for better summarization.