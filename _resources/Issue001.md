# ISSUE-001 — ChatbotAgent MemorySaver double-history bug

**Status:** Open  
**Priority:** Medium  
**Scope:** Out of scope cho Streaming + HITL plan  
**Fix sau khi:** Plan Streaming & HITL hoàn thành

---

## Mô tả

`chatbot_graph.py` compile graph với `MemorySaver()` và `ChatbotAgent` config dùng `thread_id = session_id`. Đồng thời `ChatbotAgent.ainvoke()` và `astream_events()` inject toàn bộ history từ MongoDB vào mỗi lần gọi thông qua `_build_messages()`.

Kết quả: sau N turns, MemorySaver tích lũy N lần history trong checkpoint, trong khi history đã được inject rõ ràng từ ngoài → messages bị nhân đôi gửi lên LLM.

## Reproduce

```
Turn 1: inject [H1, A1] → MemorySaver lưu [H1, A1]
Turn 2: inject [H1, A1, H2, A2] → MemorySaver lưu [H1, A1] + [H1, A1, H2, A2]
Turn 3: LLM nhận: [H1,A1] + [H1,A1,H2,A2] + [H1,A1,H2,A2,H3] → duplicate
```

## Tác động

- Token cost tăng theo số turns (gửi duplicate messages)
- LLM có thể bị confused bởi repeated context
- Ảnh hưởng chất lượng response sau nhiều turns

## Hướng fix (chọn 1)

**Option A — MemorySaver stateless (đề xuất):**  
Bỏ `thread_id` khỏi ChatbotAgent config → MemorySaver không accumulate state giữa các lần gọi → history hoàn toàn do service inject. Đơn giản, nhất quán với flow hiện tại.

```python
# chatbot_agent.py
config = {}   # không có thread_id
```

**Option B — MemorySaver làm source of truth:**  
Bỏ explicit history inject trong `ChatbotAgent`. Để MemorySaver quản lý toàn bộ history. Service chỉ inject message mới nhất. Cần migration cho sessions cũ.

## Notes

- Bug này tồn tại trước plan Streaming & HITL
- Các thay đổi trong plan không làm nặng thêm bug này
- `UnifiedAgent` dùng `AsyncMongoDBSaver` với `thread_id` nhưng không bị bug này vì được rebuild fresh mỗi request (không accumulate)