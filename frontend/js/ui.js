/**
 * DUE Agent - UI Module
 * Quản lý giao diện người dùng
 */
const UI = {
  /**
   * Khởi tạo UI
   */
  init() {
    this._bindEvents();
    this._setupAutoResize();
  },

  /**
   * Bind sự kiện UI
   */
  _bindEvents() {
    // Send message
    const sendBtn = document.getElementById('send-btn');
    const input = document.getElementById('chat-input');

    sendBtn?.addEventListener('click', () => this._handleSend());

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._handleSend();
      }
    });

    // Stop streaming button
    document.getElementById('stop-btn')?.addEventListener('click', () => {
      Chat.cancelStream();
    });

    // Sidebar overlay (close on click)
    document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
      Sidebar.close();
    });
  },

  /**
   * Auto resize textarea
   */
  _setupAutoResize() {
    const input = document.getElementById('chat-input');
    if (!input) return;

    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 150) + 'px';
    });
  },

  /**
   * Handle gửi tin nhắn
   */
  _handleSend() {
    const input = document.getElementById('chat-input');
    if (!input) return;

    const message = input.value.trim();
    if (!message || Chat.isStreaming()) return;

    // Check length
    if (message.length > CONFIG.MAX_MESSAGE_LENGTH) {
      alert(`Tin nhắn tối đa ${CONFIG.MAX_MESSAGE_LENGTH} ký tự.`);
      return;
    }

    Chat.sendMessage(message);
  },

  /**
   * Load một cuộc trò chuyện lên UI
   */
  loadChat(chatId) {
    const chat = Storage.getChat(chatId);
    const messagesEl = document.getElementById('chat-messages');
    if (!messagesEl) return;

    // Clear messages
    messagesEl.innerHTML = '';

    if (!chat || chat.messages.length === 0) {
      // Show welcome message
      this._showWelcome();
      return;
    }

    // Render all messages
    chat.messages.forEach(msg => {
      this.appendMessage(msg.role, msg.content);
    });

    this.scrollToBottom(true);
  },

  /**
   * Hiển thị welcome message
   */
  _showWelcome() {
    const messagesEl = document.getElementById('chat-messages');
    if (!messagesEl) return;

    messagesEl.innerHTML = `
      <div class="welcome-container">
        <div class="welcome-avatar"><img src="assets/chatbot_logo.png" alt="AI Chatbot K17 DUE" style="width:50px;height:50px;object-fit:contain;"></div>
        <h2 class="welcome-title">Xin chào! Mình là AI Chatbot K17 </h2>
        <!-- <p class="welcome-subtitle">Trợ lý tư vấn ngành Quản trị nguồn nhân lực - Trường ĐH Kinh tế, ĐHĐN</p> -->
        <div class="welcome-message">${Markdown.render(CONFIG.WELCOME_MESSAGE)}</div>
        <div class="welcome-suggestions">
          <button class="suggestion-chip" onclick="UI.useSuggestion(this)">DUE năm 2026 có bao nhiêu phương thức xét tuyển?</button>
          <button class="suggestion-chip" onclick="UI.useSuggestion(this)">Sinh viên tốt nghiệp ngành QTNL có thể làm những vị trí gì?</button>
          <button class="suggestion-chip" onclick="UI.useSuggestion(this)">DUE có những loại học bổng nào dành cho sinh viên chính quy?</button>
          <button class="suggestion-chip" onclick="UI.useSuggestion(this)">Mục tiêu đào tạo của chương trình Quản trị nguồn nhân lực là gì?</button>
          <button class="suggestion-chip" onclick="UI.useSuggestion(this)">So sánh chương trình Bán phần tiếng Anh và chương trình Tiêu chuẩn của ngành QTNL?</button>
        </div>
      </div>
    `;
  },

  /**
   * Sử dụng suggestion chip
   */
  useSuggestion(el) {
    const input = document.getElementById('chat-input');
    if (input) {
      input.value = el.textContent;
      this._handleSend();
    }
  },

  /**
   * Thêm tin nhắn vào chat area
   */
  appendMessage(role, content) {
    const messagesEl = document.getElementById('chat-messages');
    if (!messagesEl) return null;

    // Remove welcome if present
    const welcome = messagesEl.querySelector('.welcome-container');
    if (welcome) welcome.remove();

    const messageEl = document.createElement('div');
    messageEl.className = `message message-${role}`;

    const avatar = role === 'user' ? `<img src="assets/people.png" alt="Bạn" style="width:100%;height:100%;object-fit:contain;">` : `<img src="assets/robot2.png" alt="AI Chatbot K17 DUE" style="width:100%;height:100%;object-fit:contain;">`;
    const name = role === 'user' ? 'Bạn' : CONFIG.AGENT_NAME;

    messageEl.innerHTML = `
      <div class="message-avatar">${avatar}</div>
      <div class="message-body">
        <div class="message-name">${name}</div>
        <div class="message-content">${role === 'user' ? this._escapeHtml(content) : Markdown.render(content)}</div>
      </div>
    `;

    messagesEl.appendChild(messageEl);
    return messageEl;
  },

  /**
   * Cập nhật nội dung tin nhắn (dùng cho streaming)
   * @param {boolean} isStreaming - hiện streaming cursor
   */
  updateMessageContent(messageEl, content, isStreaming = false) {
    if (!messageEl) return;
    const contentEl = messageEl.querySelector('.message-content');
    if (contentEl) {
      contentEl.innerHTML = Markdown.render(content);
      if (isStreaming) {
        contentEl.classList.add('streaming');
      } else {
        contentEl.classList.remove('streaming');
      }
    }
  },

  /**
   * Hiển thị typing indicator
   */
  showTypingIndicator() {
    const messagesEl = document.getElementById('chat-messages');
    if (!messagesEl) return;

    // Remove existing
    this.hideTypingIndicator();

    const thinkingMsg = CONFIG.THINKING_MESSAGES[Math.floor(Math.random() * CONFIG.THINKING_MESSAGES.length)];

    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.id = 'typing-indicator';
    indicator.innerHTML = `
      <div class="message-avatar"><img src="assets/robot2.png" alt="AI Chatbot K17 DUE" style="width:100%;height:100%;object-fit:contain;"></div>
      <div class="typing-content">
        <div class="thinking-text">${thinkingMsg}</div>
        <div class="typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    messagesEl.appendChild(indicator);
    this.scrollToBottom(true);
  },

  /**
   * Ẩn typing indicator
   */
  hideTypingIndicator() {
    document.getElementById('typing-indicator')?.remove();
  },

  /**
   * Clear input
   */
  clearInput() {
    const input = document.getElementById('chat-input');
    if (input) {
      input.value = '';
      input.style.height = 'auto';
    }
  },

  /**
   * Enable/disable input
   */
  setInputEnabled(enabled) {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const stopBtn = document.getElementById('stop-btn');

    if (input) input.disabled = !enabled;
    if (sendBtn) sendBtn.style.display = enabled ? '' : 'none';
    if (stopBtn) stopBtn.style.display = enabled ? 'none' : '';
  },

  /**
   * Scroll xuống cuối (Có chống Scroll-Jacking và Smooth Scrolling)
   */
  scrollToBottom(force = false) {
    const messagesEl = document.getElementById('chat-messages');
    if (messagesEl) {
      requestAnimationFrame(() => {
        // Kiểm tra xem người dùng có đang ở gần đáy màn hình không (cách đáy dưới 150px)
        const isNearBottom = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 150;
        
        // Chỉ cuộn nếu bị force (như gửi tin nhắn mới) hoặc đang ở gần đáy
        if (force || isNearBottom) {
          messagesEl.scrollTo({
            top: messagesEl.scrollHeight,
            behavior: force ? 'smooth' : 'auto' // Stream thì auto để mượt rAF, force thì trượt smooth
          });
        }
      });
    }
  },

  /**
   * Escape HTML
   */
  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },


};
