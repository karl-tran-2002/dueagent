/**
 * DUE Agent - Stats Module
 * Real-time stats sử dụng Supabase Realtime (WebSockets)
 */

// Stats Module
let supabaseClient = null;

const Stats = {
  /**
   * Khởi tạo stats
   */
  async init() {
    // 1. Khởi tạo kết nối Supabase từ config
    if (window.supabase && CONFIG.SUPABASE) {
      supabaseClient = window.supabase.createClient(CONFIG.SUPABASE.URL, CONFIG.SUPABASE.ANON_KEY);
    } else {
      console.error('Supabase library or config not loaded!');
    }

    // 2. Lấy dữ liệu ban đầu từ Supabase
    this._fetchInitialData();

    // 3. Đăng ký nhận thông báo Realtime từ Supabase cho các thay đổi sau này
    this._subscribeToRealtime();
  },

  /**
   * Track sự kiện chung (gọi webhook track-event của n8n)
   * @param {string} eventType - Tên sự kiện (visit, message, search)
   */
  async trackEvent(eventType) {
    try {
      await fetch(`${CONFIG.N8N_TRACK_EVENT_URL}?type=${eventType}`, {
        method: 'GET',
        mode: 'no-cors'
      });
    } catch (error) {
      console.error(`Lỗi khi gọi webhook track-event (${eventType}):`, error);
    }
  },

  /**
   * Lấy dữ liệu lần đầu tiên từ Supabase
   */
  async _fetchInitialData() {
    if (!supabaseClient) return;
    try {
      // Dùng thẳng SDK của Supabase thay vì gọi qua n8n webhook/get-stats
      const { data, error } = await supabaseClient
        .from('due_global_stats')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (error) throw error;
      if (data) this._updateUI(data);
    } catch (err) {
      console.error('Lỗi khi lấy data Supabase ban đầu:', err);
    }
  },

  /**
   * Lắng nghe Realtime (WebSockets)
   */
  _subscribeToRealtime() {
    if (!supabaseClient) return;

    supabaseClient
      .channel('public:due_global_stats')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'due_global_stats' },
        (payload) => {
          console.log('Supabase Realtime đẩy số mới về:', payload.new);
          this._updateUI(payload.new);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Đã kết nối Supabase Realtime thành công!');
        }
      });
  },

  /**
   * Map dữ liệu lên UI
   */
  _updateUI(data) {
    const visitEl = document.getElementById('stat-visits');
    const questionEl = document.getElementById('stat-questions');
    const docSearchEl = document.getElementById('stat-doc-searches');

    if (data.visitor_count !== undefined) {
      if (visitEl) this._animateValue(visitEl, data.visitor_count);
    }
    if (data.message_count !== undefined) {
      if (questionEl) this._animateValue(questionEl, data.message_count);
    }
    if (data.search_count !== undefined) {
      if (docSearchEl) this._animateValue(docSearchEl, data.search_count);
    }
  },

  /**
   * Animate giá trị stat (nhấp nháy khi thay đổi)
   */
  _animateValue(el, newValue) {
    const formatted = this._formatNumber(newValue);
    if (el.textContent !== formatted) {
      el.textContent = formatted;
      el.classList.add('stat-updated');
      setTimeout(() => el.classList.remove('stat-updated'), 600);
    }
  },

  /**
   * Format số (1234 → 1.234)
   */
  _formatNumber(num) {
    return num.toLocaleString('vi-VN');
  },
};
