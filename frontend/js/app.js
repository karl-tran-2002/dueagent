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
        if (envConfig.N8N_NEW_USER_URL) CONFIG.N8N_NEW_USER_URL = envConfig.N8N_NEW_USER_URL;
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
    try {
      await Stats.init();
    } catch (err) {
      console.warn('[DUE Agent] Stats init failed:', err);
    }

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

    // Hiện form thu thập thông tin nếu chưa có
    if (!Storage.getUserInfo()) {
      this._showUserInfoModal();
    }

    console.log('[DUE Agent] Ready!');
  },

  /**
   * Hiện modal thu thập thông tin người dùng
   */
  _showUserInfoModal() {
    const overlay = document.getElementById('user-info-modal-overlay');
    if (!overlay) return;

    overlay.classList.add('active');

    // Auto-format ngày sinh DD/MM/YYYY
    const dobInput = document.getElementById('user-info-dob');
    if (dobInput) {
      // Xử lý khi người dùng gõ dấu / thủ công:
      // chỉ cho phép ở đúng vị trí 2 và 5 (sau DD và MM)
      dobInput.addEventListener('keydown', (e) => {
        if (e.key === '/') {
          e.preventDefault();
          const val = e.target.value;
          const pos = e.target.selectionStart;
          if (val[pos] === '/') {
            // Con trỏ đang trước dấu / có sẵn → nhảy qua
            e.target.setSelectionRange(pos + 1, pos + 1);
          } else if (pos === 2 || pos === 5) {
            // Vị trí hợp lệ → chèn dấu /
            const newVal = val.slice(0, pos) + '/' + val.slice(pos);
            e.target.value = newVal.substring(0, 10);
            e.target.setSelectionRange(pos + 1, pos + 1);
          }
          // Các vị trí khác → chặn, không làm gì
        }
      });

      // Tự động thêm dấu / khi người dùng chỉ gõ số
      dobInput.addEventListener('input', (e) => {
        const input = e.target;
        const raw = input.value;
        const cursorPos = input.selectionStart;

        const digits = raw.replace(/\D/g, '').substring(0, 8);

        let formatted = digits;
        if (digits.length > 4) {
          formatted = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
        } else if (digits.length > 2) {
          formatted = digits.slice(0, 2) + '/' + digits.slice(2);
        }

        if (input.value !== formatted) {
          const diff = formatted.length - raw.length;
          input.value = formatted;
          const newCursor = Math.min(formatted.length, Math.max(0, cursorPos + diff));
          input.setSelectionRange(newCursor, newCursor);
        }
      });
    }

    const form = document.getElementById('user-info-form');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const fullName = document.getElementById('user-info-name').value.trim();
      const dob = document.getElementById('user-info-dob').value.trim();

      // --- Validation ---
      const errors = [];

      if (fullName.length < 2) errors.push('Họ và tên phải có ít nhất 2 ký tự.');

      // Format ngày sinh: DD/MM/YYYY
      const dobPattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      const dobMatch = dob.match(dobPattern);
      if (!dobMatch) {
        errors.push('Ngày sinh phải theo định dạng DD/MM/YYYY.');
      } else {
        const [, dd, mm, yyyy] = dobMatch.map(Number);
        const date = new Date(yyyy, mm - 1, dd);
        const currentYear = new Date().getFullYear();
        if (
          date.getFullYear() !== yyyy || date.getMonth() !== mm - 1 || date.getDate() !== dd ||
          yyyy < 1950 || yyyy > currentYear
        ) {
          errors.push('Ngày sinh không hợp lệ.');
        }
      }

      if (errors.length > 0) {
        this._showModalError(errors[0]);
        return;
      }

      const submitBtn = form.querySelector('.user-info-submit-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Đang lưu...';

      // Tạo userId từ thông tin người dùng (hash xác định)
      const userId = await Storage.generateUserIdFromInfo(fullName, dob);

      // Gọi webhook /new-user — bắt buộc thành công mới cho tiếp tục
      try {
        const res = await fetch(CONFIG.N8N_NEW_USER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, fullName, dob }),
        });

        if (!res.ok) {
          throw new Error(`Server trả về lỗi ${res.status}`);
        }
      } catch (err) {
        console.error('[App] /new-user webhook failed:', err);
        this._showModalError('Không thể kết nối máy chủ. Vui lòng thử lại.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Bắt đầu';
        return;
      }

      // Lưu vào localStorage sau khi webhook thành công
      Storage.setUserInfo({ fullName, dob, userId });
      localStorage.setItem(CONFIG.STORAGE_KEYS.USER_ID, userId);

      overlay.classList.remove('active');
      console.log('[DUE Agent] User info saved, userId:', userId);
    });
  },

  /**
   * Hiển thị lỗi validation trong modal
   */
  _showModalError(message) {
    let el = document.getElementById('user-info-error');
    if (!el) {
      el = document.createElement('p');
      el.id = 'user-info-error';
      el.style.cssText = 'color:#e74c3c;font-size:0.82rem;margin:-8px 0 12px;text-align:center;';
      const btn = document.querySelector('.user-info-submit-btn');
      btn?.parentNode.insertBefore(el, btn);
    }
    el.textContent = message;
  },
};

// Start app khi DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
