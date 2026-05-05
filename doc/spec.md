# 📋 DUE Agent - Đặc Tả Ứng Dụng Web Chatbot

> **Phiên bản**: 1.2  
> **Ngày tạo**: 02/05/2026  
> **Cập nhật**: 02/05/2026  
> **Trạng thái**: Đang phát triển

---

## 1. Tổng Quan

### 1.1 Mô tả
DUE Agent là ứng dụng web chatbot hỗ trợ học sinh, phụ huynh và người quan tâm đến ngành Quản trị nguồn nhân lực (QTNL) tại Trường Đại học Kinh tế - Đại học Đà Nẵng (DUE). Chatbot tên **Tommy**, tư vấn tuyển sinh và các vấn đề học vụ.

### 1.2 Kiến trúc
- **Frontend**: Static web app (HTML/CSS/JS thuần)
- **Backend**: N8N workflow (self-hosted) qua Webhook endpoint
- **Storage**:
  - Chat history → `localStorage` (phía client)
  - Thống kê (stats) → Airtable API
- **AI Model**: DeepSeek v3.2 qua OpenRouter
- **Embedding**: Google Gemini Embedding 001
- **Vector Store**: N8N In-Memory Vector Store
- **Web Search**: Perplexity API

### 1.3 Triển khai
- **Phase 1**: Frontend chạy local
- **Phase 2**: Frontend deploy lên free hosting (Vercel/Netlify/Cloudflare Pages)
- **N8N**: Self-hosted trên máy cá nhân hoặc VPS

---

## 2. Yêu Cầu Chức Năng

### 2.1 Chat Interface
| ID | Yêu cầu | Ưu tiên |
|----|----------|---------|
| F-01 | Hiển thị khung chat với tin nhắn user (phải) và agent (trái) | Bắt buộc |
| F-02 | Ô nhập tin nhắn (text only, không upload file/ảnh) | Bắt buộc |
| F-03 | Gửi tin nhắn bằng nút Gửi hoặc phím Enter | Bắt buộc |
| F-04 | Hiển thị streaming response từ agent | Bắt buộc |
| F-05 | Render markdown trong tin nhắn agent | Bắt buộc |
| F-06 | Auto-scroll xuống tin nhắn mới nhất | Bắt buộc |
| F-07 | Hiển thị thinking message ngẫu nhiên khi agent đang xử lý | Bắt buộc |
| F-08 | Welcome message khi mở app/cuộc trò chuyện mới | Bắt buộc |

### 2.2 Sidebar - Quản lý cuộc trò chuyện
| ID | Yêu cầu | Ưu tiên |
|----|----------|---------|
| F-09 | Sidebar "Recent chats" hiển thị danh sách chat | Bắt buộc |
| F-10 | Nút "Cuộc trò chuyện mới" | Bắt buộc |
| F-11 | Click vào chat cũ để xem lại nội dung | Bắt buộc |
| F-12 | Xóa từng cuộc trò chuyện (với custom confirm modal) | Bắt buộc |
| F-13 | Nút "Xóa tất cả" cuộc trò chuyện (với custom confirm modal) | Bắt buộc |
| F-14 | Toggle đóng/mở sidebar (responsive) | Bắt buộc |
| F-15 | Sidebar hiển thị tiêu đề tự động từ tin nhắn đầu tiên | Nên có |

### 2.3 Thống kê (Stats Panel)
| ID | Yêu cầu | Ưu tiên |
|----|----------|---------|
| F-17 | Đếm tổng lượt khách truy cập | Bắt buộc |
| F-18 | Đếm tổng câu hỏi đã hỏi | Bắt buộc |
| F-19 | Đếm tổng lượt truy xuất dữ liệu (document search) | Bắt buộc |
| F-20 | Hiển thị stats ở góc dưới phải | Bắt buộc |
| F-21 | Lưu stats vào Airtable | Bắt buộc |

### 2.4 Khác
| ID | Yêu cầu | Ưu tiên |
|----|----------|---------|
| F-22 | Không yêu cầu đăng nhập | Bắt buộc |
| F-23 | Responsive trên mobile | Nên có |

---

## 3. Yêu Cầu Phi Chức Năng

### 3.1 Giao diện & Trải nghiệm
- **Theme**: Mô phỏng giao diện due.udn.vn
- **Bảng màu chính**:
  - Primary: `#1a5276` (xanh DUE đậm)
  - Accent: `#2471a3` (xanh DUE vừa)
  - Light accent: `#3498db` (xanh nhạt)
  - Background: `#f5f7fa` (xám nhạt)
  - Text: `#2c3e50` (đen xám)
  - Sidebar BG: `#0e2a3f` (xanh đậm)
- **Font**: Roboto (Google Fonts) - hỗ trợ tiếng Việt tốt
- **Layout**: Headerless design giống ChatGPT — branding đặt trong sidebar (layout dọc: logo trên, text dưới), không có top bar
- **Chat layout**:
  - Tin nhắn agent: căn trái, avatar robot.png
  - Tin nhắn user: căn phải, không có avatar
- **Thinking messages**: Hiển thị dòng chữ ngẫu nhiên trong bubble agent khi chờ response (cấu hình trong `config.js`)

### 3.2 Hiệu năng
- First Contentful Paint < 1.5s
- Chat response bắt đầu streaming trong < 3s

### 3.3 Tương thích
- Chrome, Firefox, Edge, Safari (phiên bản mới nhất)
- Mobile responsive (viewport >= 320px)

---

## 4. Kiến Trúc Kỹ Thuật

### 4.1 Sơ đồ luồng dữ liệu

```
User Input → Frontend JS
  → HTTP POST → N8N Webhook
    → AI Agent (DeepSeek v3.2)
      → Vector Store Search (nếu cần)
      → Web Search Perplexity (nếu cần)
      → Google Sheets (nếu cần thu thập info)
    → Streaming Response
  → Frontend hiển thị streaming
  → Lưu chat vào localStorage
  → Gửi stats đến Airtable API
```

### 4.2 Cấu trúc thư mục Frontend

```
dueagent/
├── frontend/
│   ├── index.html          # Trang chính
│   ├── css/
│   │   └── style.css       # Stylesheet chính
│   ├── js/
│   │   ├── app.js          # Main application logic
│   │   ├── chat.js         # Chat logic (gửi/nhận tin nhắn, streaming)
│   │   ├── sidebar.js      # Sidebar management
│   │   ├── storage.js      # localStorage management
│   │   ├── stats.js        # Stats tracking + Airtable API
│   │   ├── markdown.js     # Markdown rendering
│   │   └── config.js       # Configuration (webhook URL, Airtable key)
│   └── assets/
│       ├── DUE.png           # Logo DUE (sidebar + favicon)
│       ├── robot.png         # Avatar Tommy (chat messages)
│       ├── chatbot_logo.png  # Logo chatbot (welcome screen)
│       └── people.png        # (không sử dụng)
├── doc/
│   ├── spec.md             # Tài liệu đặc tả (file này)
│   ├── n8n-setup.md        # Hướng dẫn cấu hình n8n
│   └── deployment.md       # Hướng dẫn triển khai
├── DueAgent.json           # N8N workflow export
└── README.md
```

### 4.3 localStorage Schema

```json
{
  "due_agent_chats": {
    "chat_<uuid>": {
      "id": "chat_<uuid>",
      "title": "Tự động từ tin nhắn đầu",
      "createdAt": "2026-05-02T...",
      "updatedAt": "2026-05-02T...",
      "messages": [
        {
          "role": "user",
          "content": "...",
          "timestamp": "2026-05-02T..."
        },
        {
          "role": "assistant", 
          "content": "...",
          "timestamp": "2026-05-02T..."
        }
      ]
    }
  },
  "due_agent_active_chat": "chat_<uuid>",
  "due_agent_visitor_id": "<uuid>"  
}
```

### 4.4 Airtable Schema (Bảng: Stats)

| Field | Type | Mô tả |
|-------|------|--------|
| `id` | Auto | ID tự tăng |
| `event_type` | Single Select | `visit`, `question`, `doc_search` |
| `visitor_id` | Text | UUID visitor (từ localStorage) |
| `session_id` | Text | Chat session ID |
| `timestamp` | DateTime | Thời gian sự kiện |
| `metadata` | Long Text | JSON data bổ sung |

### 4.5 N8N Webhook API

#### Gửi tin nhắn
```
POST {N8N_WEBHOOK_URL}
Content-Type: application/json

{
  "action": "sendMessage",
  "chatInput": "Câu hỏi của user",
  "sessionId": "chat_<uuid>",
  "messageId": "msg_<timestamp>_<hash>_<random>"
}

Response: Streaming text (chunked transfer encoding)
```

---

## 5. Cấu Hình N8N

### 5.1 Thay đổi cần thiết trên workflow
1. **Chat Trigger** → Giữ nguyên hoặc chuyển sang **Webhook node** để custom frontend gọi được
2. Bật CORS cho phép frontend domain gọi API
3. Cấu hình streaming response

### 5.2 Biến môi trường N8N cần thiết
- `WEBHOOK_URL`: URL webhook endpoint
- Credentials: OpenRouter, Google Gemini, Perplexity, Google Sheets (đã có)

---

## 6. Phân Chia Giai Đoạn

### Phase 1: MVP Frontend (Sprint 1) ✅ Đang thực hiện
- Giao diện chat hoàn chỉnh
- Sidebar quản lý chat
- localStorage cho chat history
- Responsive design
- Mock data để test (chưa kết nối n8n)

### Phase 2: Kết Nối N8N (Sprint 2)
- Cấu hình webhook trên n8n
- Kết nối frontend → n8n
- Streaming response
- Session management (gửi sessionId để n8n nhớ context)

### Phase 3: Airtable Stats (Sprint 3)
- Tạo Airtable base + bảng
- API integration cho tracking stats
- Hiển thị stats realtime

### Phase 4: Deploy & Polish (Sprint 4)
- Deploy frontend lên free hosting
- N8N chạy ổn định trên VPS
- Performance optimization
- Error handling hoàn thiện
