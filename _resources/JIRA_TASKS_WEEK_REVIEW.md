# CHATLY - JIRA TASKS: Các chức năng còn thiếu / chưa hoàn thiện

> **Review toàn bộ codebase ngày hiện tại**
> Mục tiêu: Hoàn thiện hệ thống chat realtime trong tuần này
> Phân công: 4 thành viên (TV1 - TV4), nhóm theo feature

---

## 📊 TỔNG QUAN GAP ANALYSIS

### Trạng thái hiện tại

| Feature | Backend | Frontend | Mobile | Mức độ thiếu |
|---------|---------|----------|--------|--------------|
| Forward Message | ❌ Chưa có API | ❌ Chưa có UI | ❌ Chưa có UI | **100% thiếu** |
| Pin Message | ❌ Chưa có model/API | ❌ TODO placeholder | ❌ Chưa có UI | **100% thiếu** |
| Pin Conversation | ❌ Chưa có field/API | ❌ TODO placeholder | ❌ Chưa có UI | **100% thiếu** |
| Emoji Reactions | ❌ Chưa có model/API | ❌ Chưa có UI | ❌ Chưa có UI | **100% thiếu** |
| Emoji Picker | — | ❌ Chưa có | ❌ Chưa có | **100% thiếu** |
| Mute Conversation | ❌ Chưa có field/API | ❌ TODO placeholder | ❌ Chưa có UI | **100% thiếu** |
| Categorize Conversation | ❌ Chưa có field/API | ❌ TODO placeholder | ❌ Chưa có UI | **100% thiếu** |
| Message Search | ❌ Chưa có API riêng | ❌ Chưa có UI | ❌ Chưa có UI | **100% thiếu** |
| Voice/Video Call | ❌ Chưa có signaling | ❌ TODO placeholder | ❌ TODO placeholder | **100% thiếu** |
| S3 Storage | ⚠️ Stub (throws exception) | — | — | **Backend 100%** |
| Group Mgmt (Mobile) | ✅ API đủ | — | ❌ Chưa có UI | **Mobile 100%** |
| Notification Display (Mobile) | ✅ API đủ | ⚠️ Cơ bản | ❌ Chưa hiển thị | **Mobile 90%** |
| Create Conversation (Mobile) | ✅ API đủ | ✅ Có | ❌ Button chưa hoạt động | **Mobile 100%** |
| Settings Persistence | ❌ Chưa có API | ⚠️ UI có, chưa lưu | ❌ Stub | **80% thiếu** |
| Cloud/Media Gallery | — | ❌ Mock data | — | **Frontend 100%** |

---

## 🎯 PHÂN CÔNG THEO THÀNH VIÊN

| Thành viên | Nhóm Feature | Số Task |
|------------|-------------|---------|
| **TV1** | Forward Message + Pin Message + Pin Conversation | 3 tasks |
| **TV2** | Emoji System (Reactions + Picker) + Message Search | 3 tasks |
| **TV3** | Mobile Completion (Group Mgmt + Create Conversation + Notifications + Contacts) | 3 tasks |
| **TV4** | Mute/Categorize Conversation + Settings Persistence + Voice/Video Call | 3 tasks |

---

## 📋 CHI TIẾT TỪNG TASK

---

### TASK 1: Forward Message (Chuyển tiếp tin nhắn)
- **Assignee**: TV1
- **Priority**: High
- **Story Points**: 5
- **Labels**: `chat`, `message`, `realtime`

**Mô tả**: Xây dựng chức năng chuyển tiếp tin nhắn đến 1 hoặc nhiều cuộc trò chuyện khác.

**Acceptance Criteria**:
- [ ] User có thể chuyển tiếp 1 tin nhắn đến 1 hoặc nhiều conversation
- [ ] Tin nhắn chuyển tiếp hiển thị nguồn gốc (forwarded from...)
- [ ] Hỗ trợ forward tin nhắn TEXT, IMAGE, FILE
- [ ] Realtime: người nhận thấy tin nhắn ngay lập tức qua WebSocket

**Backend**:
- [ ] Thêm field `forwardedFromId` (String) và `forwardedFromConversationId` (String) vào `Message` model
- [ ] Tạo endpoint `POST /api/messages/forward` nhận `{ messageId, targetConversationIds[] }`
- [ ] Service tạo bản copy message mới cho mỗi target conversation, giữ nguyên content/attachments
- [ ] Broadcast ChatEvent (action=SEND) qua WebSocket cho mỗi target conversation
- [ ] Validate: user phải là participant của cả source và target conversations

**Frontend**:
- [ ] Thêm action "Chuyển tiếp" vào MessageContextMenu (sau Reply)
- [ ] Tạo `ForwardMessageDialog` component: hiển thị danh sách conversations để chọn (multi-select)
- [ ] Tìm kiếm conversation trong dialog
- [ ] Hiển thị badge "Tin nhắn chuyển tiếp" trên MessageBubble khi `forwardedFromId` tồn tại
- [ ] Thêm method `forward(messageId, conversationIds[])` vào `message.service.ts`

**Mobile**:
- [ ] Thêm action "Chuyển tiếp" vào `MessageActions` bottom sheet
- [ ] Tạo `ForwardScreen` hoặc modal: danh sách conversations + multi-select
- [ ] Hiển thị indicator "Chuyển tiếp" trên `MessageBubble` khi `forwardedFromId` tồn tại
- [ ] Thêm method `forward()` vào `message.service.ts`

---

### TASK 2: Pin Message (Ghim tin nhắn trong cuộc trò chuyện)
- **Assignee**: TV1
- **Priority**: High
- **Story Points**: 5
- **Labels**: `chat`, `message`, `realtime`

**Mô tả**: Cho phép ghim tin nhắn quan trọng lên đầu cuộc trò chuyện. Mỗi conversation có thể có nhiều tin nhắn được ghim.

**Acceptance Criteria**:
- [ ] User có thể ghim/bỏ ghim tin nhắn
- [ ] Danh sách tin nhắn ghim hiển thị ở banner trên đầu chat
- [ ] Click vào pin banner → cuộn đến tin nhắn gốc
- [ ] Realtime: thay đổi pin đồng bộ qua WebSocket cho tất cả participants

**Backend**:
- [ ] Thêm field `pinnedMessages` (List\<PinnedMessage\>) vào `Conversation` model
  - `PinnedMessage`: `{ messageId, pinnedBy, pinnedAt }`
- [ ] Tạo endpoint `PUT /api/conversations/{id}/pin-message` nhận `{ messageId }`
- [ ] Tạo endpoint `PUT /api/conversations/{id}/unpin-message` nhận `{ messageId }`
- [ ] Tạo endpoint `GET /api/conversations/{id}/pinned-messages` → trả về danh sách pinned messages
- [ ] Broadcast event qua WebSocket topic `/topic/conversation.{id}` khi pin/unpin
- [ ] Validate: chỉ participant mới được pin, giới hạn tối đa 50 pinned messages

**Frontend**:
- [ ] Thêm action "Ghim tin nhắn" vào MessageContextMenu (hiện đang có TODO placeholder)
- [ ] Tạo `PinnedMessageBanner` component hiển thị ở đầu ChatWindow
- [ ] Click banner → scroll đến message đó hoặc mở panel danh sách pinned
- [ ] Tạo `PinnedMessagesPanel` hiển thị tất cả pinned messages
- [ ] Action "Bỏ ghim" trong panel
- [ ] Thêm methods `pinMessage()`, `unpinMessage()`, `getPinnedMessages()` vào `conversation.service.ts`

**Mobile**:
- [ ] Thêm action "Ghim" vào `MessageActions` bottom sheet
- [ ] Tạo `PinnedMessageBanner` component ở đầu chat screen
- [ ] Tạo `PinnedMessagesSheet` bottom sheet hiển thị danh sách
- [ ] Thêm API methods vào `conversation.service.ts`

---

### TASK 3: Pin Conversation (Ghim cuộc trò chuyện lên đầu danh sách)
- **Assignee**: TV1
- **Priority**: Medium
- **Story Points**: 3
- **Labels**: `chat`, `conversation`

**Mô tả**: Cho phép user ghim cuộc trò chuyện quan trọng lên đầu danh sách chat. Hiện tại Frontend đã có button nhưng chỉ hiện toast "Development in progress...".

**Acceptance Criteria**:
- [ ] User có thể ghim/bỏ ghim conversation
- [ ] Conversations được ghim hiển thị trên đầu danh sách với indicator
- [ ] Tối đa 5 conversations được ghim cùng lúc

**Backend**:
- [ ] Thêm field `pinnedBy` (List\<PinnedByUser\>) vào `Conversation` model
  - `PinnedByUser`: `{ userId, pinnedAt }`
- [ ] Tạo endpoint `PUT /api/conversations/{id}/pin`
- [ ] Tạo endpoint `PUT /api/conversations/{id}/unpin`
- [ ] Cập nhật `GET /api/conversations` → sort pinned conversations lên đầu
- [ ] Validate: mỗi user tối đa 5 pinned conversations

**Frontend**:
- [ ] Wire action "Ghim hội thoại" trong ChatList context menu (thay thế toast placeholder hiện tại)
- [ ] Hiển thị icon pin 📌 bên cạnh conversation item đã ghim
- [ ] Conversations ghim luôn ở trên cùng, sorted by pinnedAt
- [ ] Thêm methods `pinConversation()`, `unpinConversation()` vào `conversation.service.ts`

**Mobile**:
- [ ] Thêm long-press action "Ghim" vào `ConversationItem` (hiện chỉ có Delete)
- [ ] Hiển thị indicator ghim trên conversation item
- [ ] Sort pinned lên đầu danh sách

---

### TASK 4: Emoji Reactions (Bày tỏ cảm xúc trên tin nhắn)
- **Assignee**: TV2
- **Priority**: High
- **Story Points**: 5
- **Labels**: `chat`, `message`, `realtime`

**Mô tả**: Cho phép user react emoji lên tin nhắn (như 👍❤️😂😮😢😡). Mỗi user chỉ được 1 reaction per message.

**Acceptance Criteria**:
- [ ] User có thể react emoji lên bất kỳ tin nhắn nào
- [ ] Hiển thị reactions dưới message bubble với count
- [ ] Click vào reaction đã có → toggle (thêm/xóa)
- [ ] Realtime: reactions đồng bộ qua WebSocket

**Backend**:
- [ ] Thêm field `reactions` (List\<Reaction\>) vào `Message` model
  - `Reaction`: `{ userId, emoji, createdAt }`
- [ ] Tạo endpoint `PUT /api/messages/{id}/react` nhận `{ emoji }` (toggle: add nếu chưa có, remove nếu đã có)
- [ ] Tạo `ChatEvent` action mới: `REACT`
- [ ] Broadcast reaction event qua WebSocket `/topic/conversation.{conversationId}`
- [ ] Validate: emoji phải nằm trong whitelist (👍❤️😂😮😢😡🔥👏)

**Frontend**:
- [ ] Thêm emoji reaction bar khi hover/click lên message (quick reactions: 👍❤️😂😮😢😡)
- [ ] Hiển thị reaction badges dưới `MessageBubble` (emoji + count)
- [ ] Click emoji badge → toggle reaction của current user
- [ ] Click "+" trên reaction bar → mở emoji picker đầy đủ
- [ ] Thêm method `react(messageId, emoji)` vào `message.service.ts`

**Mobile**:
- [ ] Thêm action "React" vào `MessageActions` bottom sheet hoặc double-tap gesture
- [ ] Hiển thị reaction row dưới `MessageBubble`
- [ ] Quick reaction selector (horizontal emoji list)
- [ ] Thêm method `react()` vào `message.service.ts`

---

### TASK 5: Emoji Picker cho Chat Input
- **Assignee**: TV2
- **Priority**: Medium
- **Story Points**: 3
- **Labels**: `chat`, `ui`

**Mô tả**: Thêm emoji picker vào ô nhập tin nhắn để user dễ dàng chèn emoji. Hiện tại cả Frontend và Mobile đều chưa có.

**Acceptance Criteria**:
- [ ] Button emoji bên cạnh ô nhập tin nhắn
- [ ] Click → mở picker với categories (Smileys, People, Animals, Food, Activities, Travel, Objects, Symbols)
- [ ] Chèn emoji vào vị trí cursor trong input

**Frontend**:
- [ ] Tích hợp thư viện `emoji-mart` hoặc `@emoji-mart/react`
- [ ] Thêm button 😊 vào `ChatInput` component (bên trái send button)
- [ ] Popover picker mở lên phía trên input
- [ ] Insert emoji tại cursor position
- [ ] Recent emojis tab
- [ ] Search emoji by name

**Mobile**:
- [ ] Tích hợp thư viện `rn-emoji-keyboard` hoặc `emoji-picker-react-native`
- [ ] Thêm button 😊 vào `ChatInput` component
- [ ] Keyboard-style picker thay thế soft keyboard khi click
- [ ] Insert emoji tại cursor
- [ ] Recent emojis section

---

### TASK 6: Message Search (Tìm kiếm tin nhắn)
- **Assignee**: TV2
- **Priority**: Medium
- **Story Points**: 5
- **Labels**: `chat`, `search`

**Mô tả**: Cho phép tìm kiếm tin nhắn trong cuộc trò chuyện hoặc toàn bộ conversations.

**Acceptance Criteria**:
- [ ] Tìm kiếm tin nhắn trong 1 conversation cụ thể
- [ ] Kết quả highlight keyword và hiển thị context
- [ ] Click vào kết quả → cuộn đến tin nhắn đó

**Backend**:
- [ ] Tạo endpoint `GET /api/messages/search?q={keyword}&conversationId={id}&page={page}&size={size}`
- [ ] MongoDB text search trên field `content` (tạo text index)
- [ ] Trả về paginated results với conversationId, senderId, content highlight
- [ ] Filter: chỉ search trong conversations mà user là participant

**Frontend**:
- [ ] Thêm icon search 🔍 vào `ChatHeader`
- [ ] Click → mở search bar overlay trong ChatWindow
- [ ] Kết quả hiển thị dạng list với message preview + sender + time
- [ ] Click result → scroll đến message đó với highlight
- [ ] Navigation arrows (▲▼) để di chuyển giữa kết quả
- [ ] Thêm method `searchMessages()` vào `message.service.ts`

**Mobile**:
- [ ] Thêm icon search vào `ChatHeader`
- [ ] Search bar mở ra ở trên cùng chat screen
- [ ] Kết quả hiển thị inline hoặc bottom sheet
- [ ] Navigation giữa kết quả
- [ ] Thêm method `searchMessages()` vào `message.service.ts`

---

### TASK 7: Mobile - Group Management (Quản lý nhóm trên Mobile)
- **Assignee**: TV3
- **Priority**: High
- **Story Points**: 5
- **Labels**: `mobile`, `group`

**Mô tả**: Mobile hiện chỉ có thể tạo và hiển thị group, nhưng KHÔNG có UI quản lý nhóm (thêm/xóa thành viên, phân quyền, đổi tên/avatar). Backend API đã đầy đủ.

**Acceptance Criteria**:
- [ ] Xem danh sách thành viên nhóm với role (OWNER/ADMIN/MEMBER)
- [ ] Thêm thành viên từ contacts
- [ ] Xóa thành viên (OWNER/ADMIN)
- [ ] Thay đổi role thành viên (OWNER only)
- [ ] Đổi tên nhóm
- [ ] Đổi avatar nhóm
- [ ] Rời nhóm

**Backend**: ✅ Đã có đầy đủ API
- `POST /api/groups/{id}/members` (addMember)
- `DELETE /api/groups/{id}/members/{memberId}` (removeMember)
- `PUT /api/groups/{id}/members/{memberId}/role` (updateRole)
- `PUT /api/groups/{id}` (updateGroup - name, avatar)
- `GET /api/groups/{id}/members` (getMembers)

**Mobile**:
- [ ] Tạo `GroupInfoScreen` hoặc bottom sheet mở từ ChatHeader (click vào group name/avatar)
- [ ] Hiển thị: group avatar, name, member count
- [ ] Section "Thành viên": FlatList hiển thị members với role badge
- [ ] Button "Thêm thành viên" → modal chọn từ contacts (filter đã là member)
- [ ] Swipe-to-delete hoặc long-press → "Xóa khỏi nhóm" (nếu có quyền)
- [ ] Button "Đổi tên nhóm" → inline edit
- [ ] Button "Đổi avatar nhóm" → image picker
- [ ] Button "Rời nhóm" ở cuối (xác nhận trước khi thực hiện)
- [ ] Tạo `group.service.ts` với: `getMembers()`, `addMember()`, `removeMember()`, `updateRole()`, `updateGroup()`

---

### TASK 8: Mobile - Create Conversation + Contact Improvements
- **Assignee**: TV3
- **Priority**: High
- **Story Points**: 3
- **Labels**: `mobile`, `conversation`, `contact`

**Mô tả**: Mobile có button "Tạo cuộc trò chuyện mới" nhưng chưa hoạt động (TODO). Ngoài ra cần bổ sung: reject friend request, unblock contact.

**Acceptance Criteria**:
- [ ] User có thể tạo conversation mới (PRIVATE hoặc GROUP)
- [ ] User có thể từ chối lời mời kết bạn
- [ ] User có thể bỏ chặn contact

**Mobile - Create Conversation**:
- [ ] Tạo `CreateConversationModal` component
- [ ] Chọn loại: "Chat 1-1" hoặc "Nhóm" (tabs hoặc buttons)
- [ ] Chat 1-1: Hiển thị danh sách contacts → chọn 1 → tạo PRIVATE conversation → navigate to chat
- [ ] Nhóm: Multi-select contacts + nhập tên nhóm → tạo GROUP conversation → navigate to chat
- [ ] Search/filter contacts trong modal
- [ ] Wire vào FAB/button "+" ở chats tab (thay thế TODO hiện tại)

**Mobile - Contact Improvements**:
- [ ] Thêm button "Từ chối" bên cạnh "Chấp nhận" trong pending requests (sử dụng `contact.delete()`)
- [ ] Tạo tab "Đã chặn" trong contacts screen
- [ ] Hiển thị danh sách blocked contacts (getByStatus('BLOCKED'))
- [ ] Button "Bỏ chặn" trên mỗi blocked contact (sử dụng `contact.delete()` rồi `sendRequest()` lại, hoặc tạo API unblock riêng)

---

### TASK 9: Mobile - Notification Display + Push Notification
- **Assignee**: TV3
- **Priority**: Medium
- **Story Points**: 3
- **Labels**: `mobile`, `notification`

**Mô tả**: Mobile đã subscribe WebSocket notifications nhưng KHÔNG hiển thị gì. Cần hiển thị visual feedback và push notification khi app ở background.

**Acceptance Criteria**:
- [ ] In-app notification banner khi nhận tin nhắn mới (khi không ở conversation đó)
- [ ] Badge count trên tab Chats
- [ ] Push notification khi app ở background

**Mobile**:
- [ ] Tạo `NotificationBanner` component (in-app toast notification ở top)
  - Hiển thị: avatar sender + "Tin nhắn mới từ {name}" + preview content
  - Auto-dismiss sau 3 giây
  - Tap → navigate đến conversation
- [ ] Thêm unread count badge vào Chats tab icon (từ conversation.store hoặc notification data)
- [ ] Tạo `notification.store.ts` Zustand store lưu notifications + unreadCount
- [ ] Wire `useNotificationSocket` hook vào store (hiện subscribe nhưng không process)
- [ ] Tích hợp `expo-notifications` cho push notification:
  - Request permission
  - Register device token
  - Handle background notification
  - Deep link vào conversation khi tap notification
- [ ] (Optional) Tạo Notification History screen nếu có thời gian

**Backend** (nếu cần cho push):
- [ ] Tạo endpoint `POST /api/users/device-token` để lưu FCM/Expo push token
- [ ] Integrate Firebase Cloud Messaging (FCM) hoặc Expo Push Service để gửi push khi user offline

---

### TASK 10: Mute Conversation + Categorize (Tắt thông báo + Phân loại hội thoại)
- **Assignee**: TV4
- **Priority**: Medium
- **Story Points**: 5
- **Labels**: `chat`, `conversation`

**Mô tả**: Cho phép user tắt thông báo cho conversation cụ thể và phân loại hội thoại (Khách hàng, Gia đình, Công việc). Frontend đã có UI buttons nhưng chỉ hiện toast placeholder.

**Acceptance Criteria**:
- [ ] User có thể mute/unmute conversation
- [ ] Muted conversation không trigger notification
- [ ] User có thể gán category/tag cho conversation
- [ ] Filter conversations theo category

**Backend - Mute**:
- [ ] Thêm field `mutedBy` (List\<MutedByUser\>) vào `Conversation` model
  - `MutedByUser`: `{ userId, mutedAt, muteUntil }` (muteUntil: null = vĩnh viễn)
- [ ] Tạo endpoint `PUT /api/conversations/{id}/mute` nhận `{ muteUntil? }`
- [ ] Tạo endpoint `PUT /api/conversations/{id}/unmute`
- [ ] Cập nhật notification logic: KHÔNG gửi notification nếu user đã mute conversation đó

**Backend - Categorize**:
- [ ] Thêm field `categories` (Map\<String, String\>) vào `Conversation` model (key=userId, value=category)
- [ ] Tạo endpoint `PUT /api/conversations/{id}/category` nhận `{ category }` (enum: FAMILY, WORK, CUSTOMER, OTHER)
- [ ] Cập nhật `GET /api/conversations?category={category}` để filter

**Frontend**:
- [ ] Wire "Tắt thông báo" button trong ChatList (thay thế toast hiện tại)
  - Toggle mute/unmute
  - Icon 🔇 trên conversation đã mute
- [ ] Wire "Phân loại" button (thay thế toast hiện tại)
  - Dropdown/Dialog chọn: Khách hàng, Gia đình, Công việc, Khác
  - Category badge/color trên conversation item
- [ ] Filter tabs/buttons trong ChatList theo category
- [ ] Thêm methods `mute()`, `unmute()`, `setCategory()` vào `conversation.service.ts`

**Mobile**:
- [ ] Thêm "Tắt thông báo" vào long-press menu (ConversationItem)
- [ ] Hiển thị mute icon trên conversation item
- [ ] (Optional) Category filter nếu có thời gian

---

### TASK 11: Settings Persistence (Lưu cài đặt người dùng)
- **Assignee**: TV4
- **Priority**: Medium
- **Story Points**: 3
- **Labels**: `settings`, `backend`

**Mô tả**: Frontend có đầy đủ UI Settings (Privacy, Notifications, Messages) nhưng KHÔNG lưu xuống backend. Mobile settings hoàn toàn là stub.

**Acceptance Criteria**:
- [ ] Settings được lưu trên server (sync giữa các thiết bị)
- [ ] User mở settings → load từ server → hiển thị giá trị hiện tại
- [ ] User thay đổi → save lên server ngay

**Backend**:
- [ ] Tạo model `UserSettings` (MongoDB):
  ```
  {
    userId: String,
    privacy: {
      showOnlineStatus: Boolean,
      showLastSeen: Boolean,
      showReadReceipts: Boolean,
      allowFriendRequests: String (EVERYONE/FRIENDS_OF_FRIENDS/NOBODY)
    },
    notifications: {
      messageSound: Boolean,
      groupSound: Boolean,
      callSound: Boolean,
      showPreview: Boolean
    },
    messages: {
      enterToSend: Boolean,
      autoDownloadMedia: Boolean,
      fontSize: String (SMALL/MEDIUM/LARGE)
    }
  }
  ```
- [ ] Tạo `UserSettingsController`:
  - `GET /api/users/me/settings` → trả về settings hiện tại (tạo default nếu chưa có)
  - `PUT /api/users/me/settings` → cập nhật toàn bộ
  - `PATCH /api/users/me/settings/{section}` → cập nhật từng section

**Frontend**:
- [ ] Tạo `settings.service.ts` với `getSettings()`, `updateSettings()`
- [ ] Tạo `useSettingsStore` Zustand store
- [ ] Wire tất cả toggle/switch trong Settings pages vào store + API
- [ ] Load settings on mount, save on change (debounced)

**Mobile**:
- [ ] Tạo screens cho mỗi settings section (thay thế Alert stub hiện tại):
  - Notifications Settings screen
  - Privacy Settings screen
  - Appearance Settings screen (dark mode toggle)
- [ ] Tạo `settings.service.ts` + store tương ứng
- [ ] Wire toggles vào API

---

### TASK 12: Voice/Video Call (Gọi thoại/Video)
- **Assignee**: TV4
- **Priority**: Low (nghiên cứu + prototype tuần này, full implementation sau)
- **Story Points**: 8
- **Labels**: `call`, `realtime`, `spike`

**Mô tả**: Xây dựng chức năng gọi thoại và video call 1-1. Hiện tại cả Frontend và Mobile đều có button placeholder nhưng show toast "Development in progress...". Đây là feature phức tạp, tuần này tập trung nghiên cứu + prototype.

**Acceptance Criteria (MVP tuần này)**:
- [ ] Nghiên cứu và chọn giải pháp: WebRTC peer-to-peer hoặc SFU (Janus/mediasoup)
- [ ] Backend: signaling server qua WebSocket (offer/answer/ICE candidates)
- [ ] Frontend: prototype gọi thoại 1-1 hoạt động

**Backend**:
- [ ] Nghiên cứu WebRTC signaling flow
- [ ] Tạo WebSocket message mappings cho call signaling:
  - `/app/call.initiate` → gửi đến callee qua `/user/{userId}/queue/calls`
  - `/app/call.answer` → accept/reject call
  - `/app/call.ice-candidate` → trao đổi ICE candidates
  - `/app/call.end` → kết thúc cuộc gọi
- [ ] Model `CallSession`: `{ callId, callerId, calleeId, type(VOICE/VIDEO), status(RINGING/ONGOING/ENDED), startedAt, endedAt }`
- [ ] Lưu call history vào MongoDB

**Frontend**:
- [ ] Tích hợp thư viện WebRTC (`simple-peer` hoặc native `RTCPeerConnection`)
- [ ] Tạo `CallScreen` component: hiển thị caller info, ringing animation, accept/reject buttons
- [ ] `ActiveCallOverlay`: hiển thị khi cuộc gọi đang diễn ra (timer, mute, speaker, end)
- [ ] Wire call buttons trong `ChatHeader` (thay thế toast placeholder)
- [ ] Tạo `useCallSocket` hook xử lý signaling events

**Mobile**:
- [ ] Tích hợp `react-native-webrtc` hoặc `expo-av` cho audio
- [ ] Tạo `CallScreen` với UI ringing + active call
- [ ] Wire call buttons trong `ChatHeader`
- [ ] Handle incoming call notification (lock screen nếu có)

---

## 📅 ĐỀ XUẤT THỨ TỰ ƯU TIÊN TRONG TUẦN

### Ngày 1-2: Core Chat Features
| Task | Assignee | Priority |
|------|----------|----------|
| Task 1: Forward Message | TV1 | 🔴 High |
| Task 4: Emoji Reactions | TV2 | 🔴 High |
| Task 7: Mobile Group Management | TV3 | 🔴 High |
| Task 10: Mute/Categorize Conversation | TV4 | 🟡 Medium |

### Ngày 3-4: Chat Enhancements
| Task | Assignee | Priority |
|------|----------|----------|
| Task 2: Pin Message | TV1 | 🔴 High |
| Task 5: Emoji Picker | TV2 | 🟡 Medium |
| Task 8: Mobile Create Conversation + Contacts | TV3 | 🔴 High |
| Task 11: Settings Persistence | TV4 | 🟡 Medium |

### Ngày 5: Polish & Secondary Features
| Task | Assignee | Priority |
|------|----------|----------|
| Task 3: Pin Conversation | TV1 | 🟡 Medium |
| Task 6: Message Search | TV2 | 🟡 Medium |
| Task 9: Mobile Notifications | TV3 | 🟡 Medium |
| Task 12: Voice/Video Call (Spike/Research) | TV4 | 🔵 Low |

---

## ⚠️ LƯU Ý KỸ THUẬT

### Message Sync & Race Conditions
- **Forward message**: Khi forward đến nhiều conversations cùng lúc, cần xử lý transaction hoặc at-least-once delivery
- **Reactions**: Nhiều user react cùng lúc → dùng MongoDB `$push`/`$pull` atomic operations thay vì read-modify-write
- **Pin message**: Concurrent pin/unpin → dùng optimistic locking hoặc atomic MongoDB update

### Offline/Reconnect
- **WebSocket reconnect**: Cả frontend và mobile đều cần auto-reconnect + re-subscribe khi mất kết nối
- **Message gap**: Sau reconnect, cần fetch messages mới hơn lastMessageId để đảm bảo không miss tin nhắn
- **Optimistic UI**: Gửi tin nhắn hiển thị ngay (optimistic), nếu fail thì show retry button

### Performance
- **MongoDB indexes**: Tạo index cho `messages.conversationId + createdAt` (compound), `messages.content` (text index cho search)
- **Pin messages**: Cache danh sách pinned messages, không query mỗi lần mở chat
- **Emoji reactions**: Embed reactions array trong Message document (không tạo collection riêng) để tránh N+1 queries
- **Pagination**: Đảm bảo tất cả list endpoints đều paginated (conversations, messages, search results, pinned messages)

### S3 Storage
- Backend hiện có `S3StorageProvider` nhưng throw `UnsupportedOperationException`
- Nếu muốn deploy production, cần implement S3 upload/download thật
- Hiện tại `LocalStorageProvider` hoạt động tốt cho development

---

## 📊 TỔNG KẾT

| Metric | Value |
|--------|-------|
| Tổng số tasks | **12** |
| Tasks High Priority | **5** (Task 1, 2, 4, 7, 8) |
| Tasks Medium Priority | **5** (Task 3, 5, 6, 9, 10, 11) |
| Tasks Low Priority | **1** (Task 12) |
| Tổng Story Points | **53** |
| Team velocity cần | ~13 SP/người/tuần |
