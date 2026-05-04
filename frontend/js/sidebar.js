/**
 * DUE Agent - Sidebar Module
 * Quản lý sidebar chat history
 * Sử dụng Event Delegation để đảm bảo dynamic elements luôn hoạt động
 */
const Sidebar = {
  _isOpen: false,

  /**
   * Khởi tạo sidebar
   */
  init() {
    this._isOpen = window.innerWidth > 768;
    this.refreshChatList();
    this._bindEvents();
  },

  /**
   * Bind sự kiện — Event Delegation
   */
  _bindEvents() {
    // Toggle sidebar (mobile)
    document.getElementById('sidebar-toggle')?.addEventListener('click', () => this.toggle());
    document.getElementById('sidebar-close')?.addEventListener('click', () => this.close());

    // Collapse/expand sidebar (desktop)
    document.getElementById('sidebar-collapse-btn')?.addEventListener('click', () => this.toggleCollapse());

    // New chat
    document.getElementById('new-chat-btn')?.addEventListener('click', () => this.newChat());

    // EVENT DELEGATION: chat-list clicks (navigate, delete)
    const chatList = document.getElementById('chat-list');
    if (chatList) {
      chatList.addEventListener('click', (e) => this._handleChatListClick(e));
    }
  },

  /**
   * Handle click trong chat-list (delegation)
   */
  _handleChatListClick(e) {
    const target = e.target;

    // Delete button click
    const deleteBtn = target.closest('.chat-item-delete');
    if (deleteBtn) {
      e.stopPropagation();
      const chatItem = deleteBtn.closest('.chat-item');
      if (chatItem) {
        const chatId = chatItem.dataset.chatId;
        this.deleteSingle(chatId);
      }
      return;
    }

    // Chat item content click (navigate)
    const contentEl = target.closest('.chat-item-content');
    if (contentEl) {
      const chatItem = contentEl.closest('.chat-item');
      if (chatItem) {
        const chatId = chatItem.dataset.chatId;
        this.selectChat(chatId);
      }
      return;
    }
  },

  /**
   * Toggle mở/đóng sidebar
   */
  toggle() {
    this._isOpen = !this._isOpen;
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (this._isOpen) {
      sidebar?.classList.add('open');
      overlay?.classList.add('visible');
    } else {
      sidebar?.classList.remove('open');
      overlay?.classList.remove('visible');
    }
  },

  /**
   * Đóng sidebar
   */
  close() {
    this._isOpen = false;
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('visible');
  },

  /**
   * Toggle collapse/expand sidebar (desktop)
   */
  toggleCollapse() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.classList.toggle('collapsed');
    }
  },

  /**
   * Tạo cuộc trò chuyện mới
   */
  newChat() {
    const chat = Storage.createChat();
    this.refreshChatList();
    UI.loadChat(chat.id);
    // Đóng sidebar trên mobile
    if (window.innerWidth <= 768) this.close();
  },

  /**
   * Refresh danh sách chat trong sidebar
   */
  refreshChatList() {
    const listEl = document.getElementById('chat-list');
    if (!listEl) return;

    const chats = Storage.getChatList();
    const activeId = Storage.getActiveChat();

    if (chats.length === 0) {
      listEl.innerHTML = `
        <div class="chat-list-empty">
          <span class="empty-icon">💬</span>
          <p>Chưa có cuộc trò chuyện nào</p>
        </div>`;
      this._updateDeleteButtons();
      return;
    }

    listEl.innerHTML = chats.map(chat => `
      <div class="chat-item ${chat.id === activeId ? 'active' : ''}" 
           data-chat-id="${chat.id}">
        <div class="chat-item-content">
          <div class="chat-item-title">${this._escapeHtml(chat.title)}</div>
          <div class="chat-item-date">${this._formatDate(chat.updatedAt)}</div>
        </div>
        <button class="chat-item-delete" title="Xóa cuộc trò chuyện">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14"/>
          </svg>
        </button>
      </div>
    `).join('');

    this._updateDeleteButtons();
  },

  /**
   * Chọn một cuộc trò chuyện
   */
  selectChat(chatId) {
    Storage.setActiveChat(chatId);
    UI.loadChat(chatId);
    this.refreshChatList();
    if (window.innerWidth <= 768) this.close();
  },

  /**
   * Xóa một chat (sử dụng custom confirm modal)
   */
  deleteSingle(chatId) {
    this._showConfirm('Bạn có chắc muốn xóa cuộc trò chuyện này?', () => {
      const wasActive = Storage.getActiveChat() === chatId;
      Storage.deleteChat(chatId);
      this.refreshChatList();

      if (wasActive) {
        const chats = Storage.getChatList();
        if (chats.length > 0) {
          Storage.setActiveChat(chats[0].id);
          UI.loadChat(chats[0].id);
          this.refreshChatList();
        } else {
          this.newChat();
        }
      }
    });
  },

  /**
   * Xóa tất cả (sử dụng custom confirm modal)
   */
  deleteAll() {
    const chatCount = Storage.getChatList().length;
    if (chatCount === 0) return;

    this._showConfirm(`Bạn có chắc muốn xóa tất cả ${chatCount} cuộc trò chuyện?`, () => {
      Storage.deleteAllChats();
      this.newChat();
    });
  },

  /**
   * Hiển thị custom confirm modal (thay thế confirm() native)
   */
  _showConfirm(message, onConfirm) {
    const overlay = document.getElementById('confirm-modal-overlay');
    const msgEl = document.getElementById('confirm-modal-message');
    const confirmBtn = document.getElementById('confirm-modal-confirm');
    const cancelBtn = document.getElementById('confirm-modal-cancel');
    
    if (!overlay || !msgEl || !confirmBtn || !cancelBtn) {
      // Fallback to native confirm if modal elements not found
      if (confirm(message)) onConfirm();
      return;
    }

    msgEl.textContent = message;
    overlay.classList.add('visible');

    // Clean up previous listeners by cloning buttons
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    const closeModal = () => {
      overlay.classList.remove('visible');
    };

    newConfirmBtn.addEventListener('click', () => {
      closeModal();
      onConfirm();
    });

    newCancelBtn.addEventListener('click', () => {
      closeModal();
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    }, { once: true });
  },

  /**
   * Cập nhật hiển thị nút delete
   */
  _updateDeleteButtons() {
    const chatCount = Storage.getChatList().length;
    const deleteAllBtn = document.getElementById('delete-all-btn');

    if (deleteAllBtn) deleteAllBtn.style.display = chatCount > 0 ? '' : 'none';
  },

  /**
   * Format date
   */
  _formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Vừa xong';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} ngày trước`;

    return date.toLocaleDateString('vi-VN');
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
