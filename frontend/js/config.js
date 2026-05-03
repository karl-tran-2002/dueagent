/**
 * DUE Agent - Configuration
 * Cấu hình chung cho ứng dụng
 */
const CONFIG = {
  // N8N Chat Trigger - qua proxy server để tránh CORS
  N8N_WEBHOOK_URL: '', // Sẽ được inject từ Vercel Serverless Function
  
  // N8N Track Event Webhook - Webhook duy nhất để đếm số liệu
  N8N_TRACK_EVENT_URL: '', // Sẽ được inject từ Vercel Serverless Function

  // Airtable config - thay đổi khi setup
  AIRTABLE: {
    API_KEY: '', // Personal Access Token
    BASE_ID: '', // Base ID
    TABLE_NAME: 'Stats',
  },

  // Cấu hình Supabase
  SUPABASE: {
    URL: '', // Sẽ được inject từ server.js
    ANON_KEY: '' // Sẽ được inject từ server.js
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
