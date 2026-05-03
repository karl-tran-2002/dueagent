/**
 * DUE Agent - Configuration
 * Cấu hình chung cho ứng dụng
 */
const CONFIG = {
  // N8N Chat Trigger - qua proxy server để tránh CORS
  // Khi deploy production, thay bằng URL trực tiếp hoặc proxy server
  N8N_WEBHOOK_URL: '/api/chat',
  
  // N8N Track Event Webhook - Webhook duy nhất để đếm số liệu
  // Khi deploy, thay đổi URL này thành domain thật của n8n (VD: https://n8n.yourdomain.com/webhook/track-event)
  N8N_TRACK_EVENT_URL: 'http://localhost:5678/webhook/track-event',

  // Airtable config - thay đổi khi setup
  AIRTABLE: {
    API_KEY: '', // Personal Access Token
    BASE_ID: '', // Base ID
    TABLE_NAME: 'Stats',
  },

  // Cấu hình Supabase
  SUPABASE: {
    URL: 'https://lnszuuhnysvbdwgbqral.supabase.co',
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxuc3p1dWhueXN2YmR3Z2JxcmFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MjcxOTYsImV4cCI6MjA5MzMwMzE5Nn0.23cBU92cmySB6Q9ZyUiNlI6xIkIBhaRZjygmoifaVVc'
  },

  // App settings
  APP_NAME: 'DUE Agent',
  AGENT_NAME: 'Tommy',
  AGENT_AVATAR: '🎓',
  USER_AVATAR: '👤',

  // Welcome message
  WELCOME_MESSAGE: `Tommy có thể giúp bạn:
- Tư vấn thông tin **tuyển sinh** ngành Quản Trị Nhân Lực
- Giải đáp về **chương trình đào tạo**, tín chỉ
- Hỗ trợ các vấn đề **học vụ** cho sinh viên
- Cung cấp thông tin về **học bổng**, hoạt động

Hãy hỏi mình bất cứ điều gì bạn muốn biết!`,

  // localStorage keys
  STORAGE_KEYS: {
    CHATS: 'due_agent_chats',
    ACTIVE_CHAT: 'due_agent_active_chat',
    VISITOR_ID: 'due_agent_visitor_id',
  },

  // Limits
  MAX_CHAT_TITLE_LENGTH: 50,
  MAX_MESSAGE_LENGTH: 2000,

  // Thinking messages - random hiển thị khi chờ streaming
  THINKING_MESSAGES: [
    'Chờ mình chút...',
    'Cho Tommy vài giây...',
    'Chờ Tommy chút...',
    'Để mình xem nào...',
    'Tommy đang xử lý...',
    'Tommy đang suy nghĩ...',
    'Mình đang kiểm tra...',
  ],
};
