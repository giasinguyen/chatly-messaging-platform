# Skill: Reminder Detector

## When to use
- After reading messages that contain schedules, deadlines, or appointments.
- The user asks about upcoming deadlines or meetings.
- You detect time-related phrases (specific hour, weekday, deadline, meeting).

## Standard workflow
1. Call readRecentMessages() or readMessagesByTimeRange() to gather recent context.
2. Detect candidate deadlines and time points from message content.
3. Call listGroupReminders() to avoid creating duplicates.
4. Present a confirmation prompt before creating reminders.
5. After user confirmation, call createGroupReminder().

## Time handling
- Convert to ISO-8601 when calling APIs.
- If only a day is provided without time, ask for a specific time.
- Default timezone: Asia/Ho_Chi_Minh (UTC+7).

## Human-readable output rules
- In user-facing responses, avoid raw numeric timestamps and raw ISO strings.
- Explain times in clear natural language first (for example: "Friday at 3:00 PM").
- Only show ISO values when the user explicitly asks for technical details.