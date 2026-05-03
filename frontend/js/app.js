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
