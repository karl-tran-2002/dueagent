/**
 * DUE Agent - Storage Module
 * Quản lý localStorage cho chat history
 */
const Storage = {
  /**
   * Tạo userId xác định từ thông tin người dùng (fullName + dob)
   * Cùng người → cùng ID, kể cả xóa localStorage
   * Format: "user_{16hex}"
   * @returns {Promise<string>}
   */
  async generateUserIdFromInfo(fullName, dob) {
    const raw = [fullName.trim().toLowerCase(), dob.trim()].join('|');
    const encoded = new TextEncoder().encode(raw);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return 'user_' + hashHex.substring(0, 16);
  },

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
   * Tạo messageId dựa trên nội dung tin nhắn + thời gian + random
   * Format: msg_<timestamp>_<hash>_<random>
   * Random suffix đảm bảo không bao giờ trùng, kể cả cùng nội dung + cùng mili-giây
   */
  generateMessageId(messageContent) {
    const timestamp = Date.now();
    const raw = messageContent + timestamp.toString();

    // Hash đơn giản (djb2) để tạo chuỗi ngắn gọn từ nội dung
    let hash = 5381;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) + hash) + raw.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    const hashHex = Math.abs(hash).toString(16);

    // Random 4 ký tự hex để chống trùng hoàn toàn
    const rand = Math.random().toString(16).substring(2, 6);

    return `msg_${timestamp}_${hashHex}_${rand}`;
  },

  /**
   * Tạo browser fingerprint từ các thuộc tính máy/trình duyệt
   * Không dùng thư viện ngoài — dùng SubtleCrypto SHA-256
   * @returns {Promise<string|null>} "fp_{12hex}" hoặc null nếu browser block
   */
  async _generateFingerprint() {
    try {
      const parts = [];

      // 1. User Agent
      parts.push(navigator.userAgent);

      // 2. Ngôn ngữ
      parts.push(navigator.language || navigator.languages?.join(',') || '');

      // 3. Màn hình
      parts.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);

      // 4. Timezone (ổn định hơn getTimezoneOffset)
      parts.push(Intl.DateTimeFormat().resolvedOptions().timeZone || '');

      // 5. Số CPU cores
      parts.push(String(navigator.hardwareConcurrency || 'unknown'));

      // 6. RAM (GB, chỉ có trên Chrome)
      parts.push(String(navigator.deviceMemory || 'unknown'));

      // 7. Platform
      parts.push(navigator.platform || 'unknown');

      // 8. Canvas fingerprint (mỗi GPU/font render hơi khác nhau)
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 220;
        canvas.height = 50;
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial, sans-serif';
        ctx.fillStyle = '#1a5276';
        ctx.fillText('DUE Agent \uD83C\uDF93 fp', 2, 4);
        ctx.fillStyle = 'rgba(52, 152, 219, 0.8)';
        ctx.font = '11px Georgia, serif';
        ctx.fillText('Qu\u1ea3n tr\u1ecb Nh\u00e2n l\u1ef1c 2026', 4, 22);
        // Lấy 80 ký tự cuối của dataURL (phần pixel data)
        parts.push(canvas.toDataURL().slice(-80));
      } catch {
        parts.push('canvas_blocked');
      }

      // 9. WebGL renderer (GPU info — rất ổn định)
      try {
        const gl = document.createElement('canvas').getContext('webgl');
        if (gl) {
          const ext = gl.getExtension('WEBGL_debug_renderer_info');
          if (ext) {
            parts.push(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
            parts.push(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL));
          }
        }
      } catch {
        parts.push('webgl_blocked');
      }

      // Hash toàn bộ bằng SHA-256
      const raw = parts.join('|||');
      const encoded = new TextEncoder().encode(raw);
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
      const hashHex = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      return 'fp_' + hashHex.substring(0, 12);
    } catch {
      return null; // Browser quá hạn chế → fallback sang UUID thuần
    }
  },

  /**
   * Lấy hoặc tạo userId (fingerprint + UUID ngắn)
   * - Lần đầu: tính fingerprint + tạo UUID → ghép lại → lưu localStorage
   * - Lần sau: đọc thẳng từ localStorage (không tính lại fingerprint)
   * - Format: "fp_{12hex}_{8hex}" hoặc "uid_{8hex}" (fallback)
   *
   * N8N dùng phần "fp_..." làm Redis key để rate limit:
   *   → Xóa localStorage tạo UUID mới nhưng fingerprint vẫn giống → vẫn bị block
   * @returns {Promise<string>}
   */
  async getOrCreateUserId() {
    const cached = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_ID);
    if (cached) return cached;

    const fingerprint = await this._generateFingerprint();
    const shortUUID = this.generateUUID().replace(/-/g, '').substring(0, 8);

    const userId = fingerprint
      ? `${fingerprint}_${shortUUID}`  // fp_a3f8c1d2b5e7_9f2e3a1b
      : `uid_${shortUUID}`;            // uid_9f2e3a1b (khi browser block fingerprint)

    localStorage.setItem(CONFIG.STORAGE_KEYS.USER_ID, userId);
    return userId;
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
   * Xóa tin nhắn cuối cùng trong cuộc trò chuyện
   * Dùng khi rate limit: xóa assistant placeholder rỗng đã tạo trước đó
   */
  removeLastMessage(chatId) {
    const chats = this.getAllChats();
    if (!chats[chatId]) return;

    const messages = chats[chatId].messages;
    if (messages.length > 0) {
      messages.pop();
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

  /**
   * Lấy thông tin người dùng đã lưu
   * @returns {{ fullName: string, birthYear: string, phone: string } | null}
   */
  getUserInfo() {
    const data = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_INFO);
    return data ? JSON.parse(data) : null;
  },

  /**
   * Lưu thông tin người dùng
   */
  setUserInfo(info) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.USER_INFO, JSON.stringify(info));
  },
};
