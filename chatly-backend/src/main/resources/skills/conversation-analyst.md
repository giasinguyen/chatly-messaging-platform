# Skill: Conversation Analyst

## Purpose
This skill governs every task that requires reading, summarising, or catching up on
conversation history — whether the user asks directly ("tóm tắt nhóm này") or whether
the agent needs background context before taking another action.

---

## When to activate this skill
- User asks for a group or conversation summary.
- User asks to catch up after being away ("tôi vắng mấy ngày, có gì mới không?").
- User asks about unread messages across one or more conversations.
- Agent needs to understand what has been discussed before creating a reminder, poll,
  or taking any write action.
- User asks who said what, what was decided, or what is still pending.

---

## Mandatory workflow — follow in this exact order

### 1. Identify the scope
- If the user named a specific group or conversation, find its ID via `getMyConversations()`.
  Match on display name (partial match is acceptable); never assume an ID.
- If the user said "tất cả" or "all", process every conversation with `unreadCount > 0`.
- If the user said "nhóm X" and there are multiple matches, ask which one before proceeding.

### 2. Load group metadata (groups only)
- Call `getGroupInfo(conversationId)` to get the group name, member count, and settings.
- Call `getGroupMembers(conversationId)` to build a senderId → displayName map.
- Build this map BEFORE reading any messages. You will need it to replace every
  raw sender ID with a human name in your output.

### 3. Read messages
Choose the right tool based on the user's request:

| Situation | Tool to use |
|---|---|
| User wants a general catch-up | `readRecentMessages(limit=30)` |
| User was away for a specific period | `readMessagesByTimeRange(from, to)` |
| User asks about a specific topic | `searchMessages(keyword)` then `readRecentMessages` for context |
| Unread count is high (>50) | `readMessagesByTimeRange` from last-read timestamp, capped at 100 |

Always read **enough messages to understand the thread**, not just the latest one.
Minimum: 20 messages. For active groups with 50+ unreads, read the full time range.

### 4. Analyse the messages
Before writing the summary, identify:
- **Main topic(s)**: what are people talking about?
- **Status**: active discussion / decision made / waiting on someone / blocked / no action needed
- **Action items**: are there tasks, deadlines, or questions directed at the user?
- **Key actors**: who is driving the conversation? (use display names)
- **Non-text events**: calls, file shares, reactions — note these naturally

### 5. Write the summary
See "Output format" below.

---

## Output format

### For a single conversation
Open with one sentence stating the main topic and current status.
Then 1–2 sentences on key details: what was decided, who is waiting on what.
If there is a direct ask for the user, surface it clearly.
Optional: offer to show specific messages or drill deeper.

**Good example (Vietnamese):**
> Nhóm đang thảo luận về lịch ra mắt sản phẩm vào tuần tới. Anh Minh đề xuất dời sang
> thứ Sáu để team QA có thêm thời gian, nhưng chưa có quyết định cuối. Chị Lan đang
> hỏi bạn về ngân sách marketing — bạn có muốn mình soạn sẵn câu trả lời không?

**Bad example (do not produce this):**
> Unread messages: 12. Last message from user ID 9d4b5573: "sắp tới rồi". Timestamp: 1748012400.

### For multiple conversations (catch-up across all unread)
1. Lead with a 1–2 sentence overview: "Bạn có tin nhắn chưa đọc ở 3 nhóm."
2. For each conversation with unread activity:
   - **Conversation name** (never the ID)
   - Main topic — 1 sentence
   - Status — 1 phrase: "đang chờ quyết định", "đã xong", "cần bạn phản hồi"
   - Direct ask for the user (if any)
3. End with: "Bạn muốn mình xem chi tiết nhóm nào không?"

### For a topic search
State what you found, who said it, and when (in readable time).
If nothing was found, say so and suggest broadening the search.

---

## Human-readable output rules (critical)
These rules apply to EVERY output from this skill:

- **Names**: always use displayName. Never output a raw UUID or numeric user ID.
- **Time**: use natural relative time or localized time:
  - Preferred: "hôm qua lúc 21:30", "3 ngày trước", "thứ Sáu 23/5 lúc 15:00"
  - Acceptable: "khoảng 2 tiếng trước"
  - Never: `1748012400`, `2026-05-23T14:00:00Z`, `1716480000000`
- **Non-text events**: describe naturally:
  - "Anh Hùng đã gọi video lúc 10:30" (not `type: CALL_EVENT`)
  - "Chị Mai chia sẻ 1 file" (not `attachment: {type: FILE, ...}`)
- **Empty conversations**: "Không có tin nhắn mới trong nhóm này" (not `unreadCount: 0`)
- **No field dumps**: never output raw JSON, raw tool response objects, or field-value pairs.

---

## Edge cases and how to handle them

| Situation | Correct behaviour |
|---|---|
| Group has no messages yet | "Nhóm chưa có tin nhắn nào." |
| readRecentMessages returns empty | Call readMessagesByTimeRange with a wider window; if still empty, report honestly |
| senderId not in member list | Show as "một thành viên" or call getUserInfo() for the specific ID |
| Message content is a system event (member joined, poll created) | Describe it naturally: "Chị Lan vừa tham gia nhóm hôm qua" |
| Multiple topics in one conversation | Briefly name each topic; don't merge them into one vague summary |
| User asks about a conversation they are not a member of | Do not attempt to read it; explain the limitation |
| Too many conversations to process (>10 unread groups) | Prioritise by unreadCount descending; surface top 5 and note there are more |

---

## Reliability rules
- Do not fabricate decisions, names, or messages that are not in the fetched history.
- If the fetched messages are insufficient to give a confident summary, say so and offer
  to read more: "Mình chỉ đọc được 20 tin nhắn gần nhất — bạn muốn mình đọc thêm không?"
- Never guess at action items. Only surface ones that are explicitly stated in messages.