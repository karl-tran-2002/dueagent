/**
 * DUE Agent - Storage Module
 * Quản lý localStorage cho chat history
 */
const Storage = {
  /**
   * Tạo UUID có fallback cho trình duyệt không hỗ trợ crypto.randomUUID
   */
  generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  /**
   * Lấy hoặc tạo visitor ID
   */
  getVisitorId() {
    let id = localStorage.getItem(CONFIG.STORAGE_KEYS.VISITOR_ID);
    if (!id) {
      id = 'visitor_' + this.generateUUID();
      localStorage.setItem(CONFIG.STORAGE_KEYS.VISITOR_ID, id);
    }
    return id;
  },

  /**
   * Lấy tất cả cuộc trò chuyện
   */
  getAllChats() {
    const data = localStorage.getItem(CONFIG.STORAGE_KEYS.CHATS);
    return data ? JSON.parse(data) : {};
  },

  /**
   * Lấy danh sách chat đã sắp xếp theo thời gian (mới nhất trước)
   */
  getChatList() {
    const chats = this.getAllChats();
    return Object.values(chats)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  },

  /**
   * Lấy một cuộc trò chuyện theo ID
   */
  getChat(chatId) {
    const chats = this.getAllChats();
    return chats[chatId] || null;
  },

  /**
   * Tạo cuộc trò chuyện mới
   */
  createChat() {
    const chatId = 'chat_' + this.generateUUID();
    const chat = {
      id: chatId,
      title: 'Cuộc trò chuyện mới',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };

    const chats = this.getAllChats();
    chats[chatId] = chat;
    localStorage.setItem(CONFIG.STORAGE_KEYS.CHATS, JSON.stringify(chats));
    this.setActiveChat(chatId);

    return chat;
  },

  /**
   * Thêm tin nhắn vào cuộc trò chuyện
   */
  addMessage(chatId, role, content) {
    const chats = this.getAllChats();
    if (!chats[chatId]) return null;

    const message = {
      role,
      content,
      timestamp: new Date().toISOString(),
    };

    chats[chatId].messages.push(message);
    chats[chatId].updatedAt = new Date().toISOString();

    // Auto-generate title from first user message
    if (role === 'user' && chats[chatId].messages.filter(m => m.role === 'user').length === 1) {
      const title = content.substring(0, CONFIG.MAX_CHAT_TITLE_LENGTH);
      chats[chatId].title = title + (content.length > CONFIG.MAX_CHAT_TITLE_LENGTH ? '...' : '');
    }

    localStorage.setItem(CONFIG.STORAGE_KEYS.CHATS, JSON.stringify(chats));
    return message;
  },

  /**
   * Cập nhật nội dung tin nhắn cuối cùng (dùng cho streaming)
   */
  updateLastMessage(chatId, content) {
    const chats = this.getAllChats();
    if (!chats[chatId]) return;

    const messages = chats[chatId].messages;
    if (messages.length > 0) {
      messages[messages.length - 1].content = content;
      chats[chatId].updatedAt = new Date().toISOString();
      localStorage.setItem(CONFIG.STORAGE_KEYS.CHATS, JSON.stringify(chats));
    }
  },

  /**
   * Xóa một cuộc trò chuyện
   */
  deleteChat(chatId) {
    const chats = this.getAllChats();
    delete chats[chatId];
    localStorage.setItem(CONFIG.STORAGE_KEYS.CHATS, JSON.stringify(chats));

    // Reset active chat nếu đang xóa chat hiện tại
    if (this.getActiveChat() === chatId) {
      localStorage.removeItem(CONFIG.STORAGE_KEYS.ACTIVE_CHAT);
    }
  },

  /**
   * Xóa nhiều cuộc trò chuyện
   */
  deleteChats(chatIds) {
    const chats = this.getAllChats();
    chatIds.forEach(id => delete chats[id]);
    localStorage.setItem(CONFIG.STORAGE_KEYS.CHATS, JSON.stringify(chats));

    if (chatIds.includes(this.getActiveChat())) {
      localStorage.removeItem(CONFIG.STORAGE_KEYS.ACTIVE_CHAT);
    }
  },

  /**
   * Xóa tất cả cuộc trò chuyện
   */
  deleteAllChats() {
    localStorage.setItem(CONFIG.STORAGE_KEYS.CHATS, JSON.stringify({}));
    localStorage.removeItem(CONFIG.STORAGE_KEYS.ACTIVE_CHAT);
  },

  /**
   * Lấy ID cuộc trò chuyện đang active
   */
  getActiveChat() {
    return localStorage.getItem(CONFIG.STORAGE_KEYS.ACTIVE_CHAT);
  },

  /**
   * Set cuộc trò chuyện đang active
   */
  setActiveChat(chatId) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.ACTIVE_CHAT, chatId);
  },
};
