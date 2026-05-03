/**
 * DUE Agent - Main Application
 * Điểm khởi tạo ứng dụng
 */
const App = {
  /**
   * Khởi tạo ứng dụng
   */
  async init() {
    console.log('[DUE Agent] Initializing...');

    // Tải cấu hình động từ Vercel Serverless Function
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const envConfig = await res.json();
        // Ghi đè cấu hình vào CONFIG
        if (envConfig.SUPABASE_URL) CONFIG.SUPABASE.URL = envConfig.SUPABASE_URL;
        if (envConfig.SUPABASE_ANON_KEY) CONFIG.SUPABASE.ANON_KEY = envConfig.SUPABASE_ANON_KEY;
        if (envConfig.N8N_WEBHOOK_URL) CONFIG.N8N_WEBHOOK_URL = envConfig.N8N_WEBHOOK_URL;
        if (envConfig.N8N_TRACK_EVENT_URL) CONFIG.N8N_TRACK_EVENT_URL = envConfig.N8N_TRACK_EVENT_URL;
        console.log('[DUE Agent] Dynamic config loaded successfully');
      }
    } catch (err) {
      console.warn('[DUE Agent] Could not load dynamic config from /api/config. Using defaults.');
    }

    // Initialize visitor ID
    Storage.getVisitorId();

    // Initialize UI
    UI.init();

    // Initialize Sidebar
    Sidebar.init();

    // Initialize Stats
    await Stats.init();

    // Load active chat hoặc tạo mới
    const activeChat = Storage.getActiveChat();
    if (activeChat && Storage.getChat(activeChat)) {
      UI.loadChat(activeChat);
    } else {
      // Tạo chat mới nếu chưa có
      const chats = Storage.getChatList();
      if (chats.length > 0) {
        Storage.setActiveChat(chats[0].id);
        UI.loadChat(chats[0].id);
      } else {
        Sidebar.newChat();
      }
    }

    console.log('[DUE Agent] Ready!');
  },
};

// Start app khi DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
