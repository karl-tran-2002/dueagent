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
  WELCOME_MESSAGE: `Mình có thể giúp bạn:
- Tư vấn thông tin tuyển sinh
- Giải đáp về chương trình Quản trị nguồn nhân lực
- Hỗ trợ các vấn đề về quy chế đào tạo
- Cung cấp thông tin về học bổng, rèn luyện và các quy định dành cho sinh viên`,

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
    'Chờ Tommy chút...',
    'Cho mình vài giây...',
    'Để mình xem nào...',
    'Mình đang phân tích...',
    'Tommy đang gửi tín hiệu lên sao Hỏa để hỏi ý kiến...',
    'Tommy đang lục tìm..',
    'Tommy đang xử lý...',
    'Tommy đang suy nghĩ...',
    'Đang tải trí thông minh... 99% rồi, 1% cuối hơi lâu...',
    'Não Tommy đang bốc khói, mau gọi xe cứu hỏa...',
    'Chờ xíu, Tommy đi pha thêm cốc cafe cho tỉnh táo để nghĩ tiếp...',
    'Đừng giục, Tommy mà cuống là rơi chữ đấy...',
    'Tommy đang vắt óc phân tích...',
    'Tommy đang vò đầu bứt tai, sắp ra rồi đây...',
  ],
};
