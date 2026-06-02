# Skill: Reminder Detector

## Purpose
This skill governs how the AI detects time-sensitive information in conversation history
and creates group reminders. It applies both when the user explicitly asks for a reminder
and when the AI proactively detects a deadline or appointment in messages.

---

## When to activate this skill
- User explicitly asks to set a reminder ("đặt nhắc nhở", "remind me", "nhắc tôi").
- User mentions a deadline, appointment, or scheduled event in their message.
- The AI is reading messages and encounters time-sensitive phrases:
  - Specific time: "lúc 3 giờ chiều", "at 2pm", "9:00 sáng"
  - Specific day: "thứ Sáu", "ngày mai", "Friday", "next Monday"
  - Deadline language: "deadline", "hạn chót", "trước ngày", "due by"
  - Meeting language: "họp", "meeting", "call", "standup", "sync"
  - Event language: "sự kiện", "ra mắt", "launch", "demo", "release"

---

## Mandatory workflow — follow in this exact order

### 1. Extract the time reference
Parse the message or user request to identify:
- **What**: the event, deadline, or task title
- **When**: the date and/or time — absolute ("23/5 lúc 15:00") or relative ("ngày mai lúc 9 giờ")
- **Who**: who the reminder is for (group, specific person, or the requesting user)
- **Description**: any additional context about the reminder (optional but useful)

### 2. Resolve ambiguous time references
Apply these rules in order:

| Input | Resolve as |
|---|---|
| Relative date ("ngày mai", "tomorrow") | Calculate against current date |
| Day of week only ("thứ Sáu") | Next occurrence of that weekday from today |
| "Tuần tới" / "next week" | Monday of next week, unless a specific day is also given |
| Time only, no date ("lúc 3 giờ") | Today if the time is in the future; tomorrow if already passed |
| No time given, only date | Ask for a specific time before creating the reminder |
| Vague ("sớm", "soon", "cuối tháng") | Ask for a specific date/time |

**Default timezone: Asia/Ho_Chi_Minh (UTC+7)**. All datetime calculations use this timezone.
Convert to ISO-8601 (UTC) only when calling the API.

**When a required field is missing**, ask before creating:
- "Bạn muốn nhắc vào lúc mấy giờ?" (missing time)
- "Bạn muốn nhắc vào ngày nào?" (missing date)
Do not guess or use a default time without telling the user.

### 3. Check for duplicates
Before creating any reminder, call `listGroupReminders(conversationId)`.
Compare the candidate reminder against existing ones:
- Same or very similar title AND similar time → surface the existing reminder:
  "Đã có nhắc nhở tương tự: **[title]** vào **[readable datetime]**. Bạn muốn tạo thêm không?"
- Different title or significantly different time → proceed to step 4.

### 4. Create immediately when the request is explicit
If the user's original message is an explicit, unambiguous reminder command with
all required fields, call `createGroupReminder` immediately after the duplicate
check. Examples:
- "Đặt nhắc hẹn đi ăn tối ngày mai lúc 8h."
- "Remind the group about sprint planning next Monday at 9am."

Only ask for confirmation when the time, date, title, or target is missing or
ambiguous. In that case, present the reminder details in plain language:

> Mình sẽ đặt nhắc nhở:
> **Họp sprint planning** — thứ Hai 26/5 lúc 9:00 sáng
> Mô tả: Chuẩn bị agenda và điểm tồn đọng từ sprint trước.
> Bạn xác nhận nhé?

### 5. Create the reminder
Call `createGroupReminder(conversationId, title, description, remindAt)`.

| Field | Value |
|---|---|
| `title` | Short, clear event name (max ~60 chars) |
| `description` | Context from the conversation (optional, 1–2 sentences) |
| `remindAt` | ISO-8601 UTC string, e.g. `2026-05-26T02:00:00Z` for 9:00 AM UTC+7 |

### 6. Confirm to the user
After successful creation, reply in plain language. Never say the reminder was
created if the tool was not called or failed.
> Đã đặt nhắc nhở **Họp sprint planning** vào **thứ Hai 26/5 lúc 9:00 sáng**. ✓

---

## Output rules

### Human-readable time (critical)
- **In user-facing responses**: always use natural readable time first.
  - Correct: "thứ Hai 26/5 lúc 9:00 sáng", "Friday 26 May at 9:00 AM"
  - Never: `2026-05-26T02:00:00Z`, `1748218800`, `Mon May 26 2026 09:00:00 GMT+0700`
- **ISO-8601 strings** are only for API calls — never show them to the user.
- **Relative time**: "ngày mai", "tuần tới" is fine in casual confirmation; always include
  the absolute date/time as well to avoid ambiguity:
  "ngày mai, thứ Hai 26/5, lúc 9 giờ sáng"

### Language
- Reply in the same language as the user's request.
- Reminder title and description: use the user's language (Vietnamese titles for
  Vietnamese users unless they specified otherwise).

### No technical leakage
- Never show raw `remindAt` ISO strings in the reply.
- Never show `conversationId`, `reminderId`, or any raw ID.
- Never mention tool or function names.

---

## Proactive reminder detection (during message analysis)
When analysing messages as part of a catch-up or summary task and a time-sensitive item
is detected:
1. Surface it at the end of the summary: "Mình thấy có nhắc đến deadline vào thứ Sáu —
   bạn có muốn mình đặt nhắc nhở không?"
2. Do NOT create the reminder automatically without user confirmation when triggered
   proactively (only create automatically when the user's explicit mention/command
   requests it with all required fields).

---

## Edge cases

| Situation | Correct behaviour |
|---|---|
| Duplicate reminder detected | Surface existing one; ask if they want to create another |
| No time given | Ask for specific time before creating |
| Past datetime given ("ngày hôm qua lúc 9 giờ") | Point out the time is in the past; ask for correct time |
| `createGroupReminder` fails | Report plainly: "Mình không tạo được nhắc nhở lúc này — bạn thử lại sau nhé." |
| Multiple reminders detected in one message | Handle one at a time; confirm each separately |
| User says "nhắc tôi mỗi ngày" (recurring) | Note that recurring reminders are not supported; offer to set one for the next occurrence |
