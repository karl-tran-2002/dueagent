/**
 * DUE Agent - Chat Module
 * Xử lý gửi/nhận tin nhắn, real streaming từ n8n
 */
const Chat = {
  _isStreaming: false,
  _abortController: null,

  /**
   * Gửi tin nhắn đến n8n webhook
   */
  async sendMessage(userMessage) {
    if (!userMessage.trim() || this._isStreaming) return;

    const chatId = Storage.getActiveChat();
    if (!chatId) return;

    // Lưu tin nhắn user
    Storage.addMessage(chatId, 'user', userMessage);
    UI.appendMessage('user', userMessage);
    UI.clearInput();
    UI.scrollToBottom(true); // Force cuộn khi gửi tin nhắn

    // Tạo tin nhắn agent với thinking text ngay lập tức
    Storage.addMessage(chatId, 'assistant', '');
    const messageEl = UI.appendMessage('assistant', '');
    const thinkingMsg = CONFIG.THINKING_MESSAGES[Math.floor(Math.random() * CONFIG.THINKING_MESSAGES.length)];
    const contentEl = messageEl.querySelector('.message-content');
    if (contentEl) {
      contentEl.innerHTML = `<span class="thinking-text">${thinkingMsg}</span>`;
    }
    UI.scrollToBottom(true); // Force cuộn khi hiện thinking text

    this._isStreaming = true;
    UI.setInputEnabled(false);

    try {
      const response = await this._callWebhook(chatId, userMessage);

      if (response) {
        // Stream response — sẽ ghi đè thinking text
        await this._handleResponse(chatId, response, messageEl);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('[Chat] Request cancelled');
        UI.updateMessageContent(messageEl, 'Đã hủy yêu cầu.', false);
        Storage.updateLastMessage(chatId, 'Đã hủy yêu cầu.');
      } else if (err.isRateLimit) {
        // Rate limit: xóa bubble AI placeholder rỗng khỏi DOM và storage
        console.warn('[Chat] Rate limit hit:', err.message);
        messageEl?.remove();
        Storage.removeLastMessage(chatId); // Xóa assistant message rỗng vừa thêm
        UI.showRateLimitToast(err.message);
      } else {
        console.error('[Chat] Error:', err);
        const errorMsg = 'Xin lỗi, mình đang gặp sự cố. Bạn vui lòng thử lại sau nhé.';
        
        Storage.updateLastMessage(chatId, errorMsg);
        
        if (Storage.getActiveChat() === chatId) {
          const currentMessages = document.querySelectorAll('.message-assistant');
          const activeEl = currentMessages.length > 0 ? currentMessages[currentMessages.length - 1] : messageEl;
          UI.updateMessageContent(activeEl, errorMsg, false);
        }
      }
    } finally {
      this._isStreaming = false;
      UI.setInputEnabled(true);
      UI.scrollToBottom(true);
      Sidebar.refreshChatList();
    }
  },

  /**
   * Gọi N8N Webhook
   */
  async _callWebhook(chatId, message) {
    this._abortController = new AbortController();

    // Lấy userId (async — tính fingerprint lần đầu, cache lần sau)
    const userId = await Storage.getOrCreateUserId();

    const response = await fetch(CONFIG.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sendMessage',
        chatInput: message,
        sessionId: chatId,
        messageId: Storage.generateMessageId(message),
        userId, // fp_{fingerprint}_{uuid} — N8N dùng làm Redis key rate limit
      }),
      signal: this._abortController.signal,
    });

    if (!response.ok) {
      throw new Error(`Webhook error: ${response.status}`);
    }

    return response;
  },

  /**
   * Xử lý response — detect format và stream
   */
  async _handleResponse(chatId, response, messageEl) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let rawBuffer = '';
    let fullContent = '';
    let isN8nStream = false;
    let chunkCount = 0;
    let rAF_id = null; // Biến lưu ID của requestAnimationFrame
    let lastStorageTime = 0; // Thêm biến throttle cho Storage

    // Giữ thinking text cho đến khi có dữ liệu thực

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        rawBuffer += chunk;
        chunkCount++;

        // Detect format từ chunk đầu tiên
        if (chunkCount === 1) {
          isN8nStream = rawBuffer.trim().startsWith('{"type":"');
        }

        if (isN8nStream) {
          fullContent = this._parseN8nStreamChunks(rawBuffer);
        } else {
          fullContent = this._parseFullResponse(rawBuffer);
        }

        // Đồng bộ UI với tần số quét của màn hình (rAF) thay vì Throttle thời gian
        if (fullContent.trim() && !rAF_id) {
          rAF_id = requestAnimationFrame(() => {
            // 0. Bỏ qua render nếu content là JSON error (rate limit / lỗi từ n8n)
            //    Tránh flash JSON thô lên màn hình trước khi stream kết thúc
            try {
              const maybeErr = JSON.parse(fullContent.trim());
              const isErrorJson = maybeErr.__rateLimit === true || (
                typeof maybeErr.message === 'string' &&
                !maybeErr.output && !maybeErr.text && !maybeErr.content
              );
              if (isErrorJson) { rAF_id = null; return; }
            } catch { /* SyntaxError = content text/markdown bình thường, tiếp tục */ }

            // 1. Chỉ cập nhật giao diện nếu người dùng đang mở đúng cuộc trò chuyện này
            if (Storage.getActiveChat() === chatId) {
              // Tìm element tin nhắn mới nhất vì DOM có thể đã bị làm mới khi người dùng chuyển qua lại
              const currentMessages = document.querySelectorAll('.message-assistant');
              const activeEl = currentMessages.length > 0 ? currentMessages[currentMessages.length - 1] : messageEl;
              
              UI.updateMessageContent(activeEl, fullContent, true);
              UI.scrollToBottom(false); // Không force cuộn để chống scroll-jacking
            }

            // 2. Liên tục lưu tạm vào Storage (mỗi 500ms để tránh giật lag do ghi ổ đĩa)
            const now = Date.now();
            if (now - lastStorageTime > 500) {
              Storage.updateLastMessage(chatId, fullContent);
              lastStorageTime = now;
            }

            rAF_id = null;
          });
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (rAF_id) cancelAnimationFrame(rAF_id);

    // Parse lần cuối
    if (isN8nStream) {
      fullContent = this._parseN8nStreamChunks(rawBuffer);
    } else {
      fullContent = this._parseFullResponse(rawBuffer);
    }

    console.log(`[Chat] ${isN8nStream ? 'Streamed' : 'Non-streaming'} - ${chunkCount} chunks`);

    // Kiểm tra rate limit / error response từ n8n:
    // ChatTrigger streaming luôn trả HTTP 200, nên phải detect qua nội dung.
    // Hỗ trợ 2 format:
    //   Format mới (khuyến nghị): {"__rateLimit": true, "message": "..."}
    //   Format hiện tại n8n:      {"message": "..."} — JSON thuần, không có field AI
    try {
      const trimmed = fullContent.trim();
      const parsed = JSON.parse(trimmed);

      const isExplicitRateLimit = parsed.__rateLimit === true;

      // Heuristic: JSON chỉ có "message" (không có output/text/content/response)
      // và không có dấu hiệu markdown trong message → đây là error response, không phải AI reply
      const AI_FIELDS = ['output', 'text', 'content', 'response', 'answer'];
      const hasNoAiFields = AI_FIELDS.every(f => !(f in parsed));
      const isShortErrorJson = (
        typeof parsed.message === 'string' &&
        hasNoAiFields &&
        trimmed.length < 500 // error message ngắn, AI reply có markdown thường dài hơn
      );

      if (isExplicitRateLimit || isShortErrorJson) {
        const err = new Error(parsed.message || '⚠️ Bạn gửi tin nhắn quá nhanh! Vui lòng chờ 1 phút.');
        err.isRateLimit = true;
        throw err;
      }
    } catch (e) {
      if (e.isRateLimit) throw e; // Ném tiếp lên sendMessage để xử lý
      // SyntaxError → content là text/markdown bình thường → bỏ qua
    }

    // Tắt streaming cursor, render final
    Storage.updateLastMessage(chatId, fullContent);
    
    // Chỉ cập nhật DOM lần cuối nếu vẫn đang mở chat này
    if (Storage.getActiveChat() === chatId) {
      const currentMessages = document.querySelectorAll('.message-assistant');
      const activeEl = currentMessages.length > 0 ? currentMessages[currentMessages.length - 1] : messageEl;
      
      UI.updateMessageContent(activeEl, fullContent, false);
      UI.scrollToBottom(true); // Force cuộn lần cuối khi hoàn tất
    }
  },

  /**
   * Parse N8N streaming format
   * Mỗi dòng là 1 JSON: {"type":"item","content":"text",...}
   * Ghép tất cả content từ type="item"
   */
  _parseN8nStreamChunks(rawText) {
    let result = '';

    // Tách từng JSON object (có thể xuống dòng hoặc nối liền)
    // Pattern: mỗi {...} là 1 object
    const jsonPattern = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
    const matches = rawText.match(jsonPattern);

    if (!matches) return rawText;

    for (const jsonStr of matches) {
      try {
        const obj = JSON.parse(jsonStr);
        if (obj.type === 'item' && obj.content !== undefined) {
          result += obj.content;
        }
      } catch {
        // JSON không hợp lệ (chunk bị cắt giữa chừng), bỏ qua
      }
    }

    return result;
  },

  /**
   * Parse response đầy đủ (non-streaming)
   */
  _parseFullResponse(rawText) {
    const trimmed = rawText.trim();
    try {
      const json = JSON.parse(trimmed);
      
      // Bắt lỗi trả về từ N8N dạng JSON
      if (json.message && typeof json.message === 'string' && json.message.toLowerCase().includes('error')) {
        throw new Error(json.message);
      }
      
      if (json.output) return json.output;
      if (json.text) return json.text;
      if (json.response) return json.response;
      if (Array.isArray(json) && json.length > 0) {
        return json[0].output || json[0].text || trimmed;
      }
    } catch (err) {
      // Nếu không phải là JSON (Text thuần)
      if (err instanceof SyntaxError) {
        const errorPatterns = ['error code:', 'no available server', 'bad gateway', 'gateway time-out', 'internal server error', '<html'];
        const lowerText = trimmed.toLowerCase();
        
        // Nếu text ngắn và chứa từ khóa lỗi -> Chắc chắn là lỗi từ Proxy/Vercel
        if (trimmed.length < 250 && errorPatterns.some(pattern => lowerText.includes(pattern))) {
          throw new Error(`Raw Proxy Error: ${trimmed}`);
        }
      } else {
        throw err; // Ném lại lỗi nếu đó là lỗi do JSON.parse ném ra từ json.message
      }
    }
    return trimmed;
  },

  /**
   * Kiểm tra document search
   */
  _containsDocSearch(text) {
    const indicators = ['Nguồn:', 'Tài liệu:', 'Theo tài liệu', 'vector_store'];
    return indicators.some(keyword => text.includes(keyword));
  },

  cancelStream() {
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }
    this._isStreaming = false;
    UI.hideTypingIndicator();
    UI.setInputEnabled(true);
  },

  isStreaming() {
    return this._isStreaming;
  },
};
