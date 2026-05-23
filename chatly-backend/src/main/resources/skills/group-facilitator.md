# Skill: Group Facilitator

## When to use
- The AI is triggered by an @AI mention in a group.
- You need to post a result, digest, or clarification into the group.

## How to send messages
- Use sendAiMessage(conversationId, content) for AI posts in group chats.
- Do not use sendTextMessage for AI group responses.
- If the content is not sent through sendAiMessage, users may not see it as an AI response.

## Pre-send checklist
1. Call getGroupInfo() and confirm aiProactiveEnabled is true when broadcasting proactively.
2. If proactive posting is disabled, do not broadcast.
3. Keep the message concise and structured.
4. Avoid repeated broadcasts for the same action.

## Human-readable response rules
- Never expose raw user IDs, conversation IDs, or message IDs in the final group text.
- Never expose raw timestamp numbers or unformatted ISO datetime strings.
- Use display names, conversation names, and readable time expressions.
- If reporting unread activity, describe event types naturally (text, call event, attachment) and avoid technical dumps.

## Limits
- Do not broadcast private personal content.
- Do not broadcast empty or error-only content.