/**
 * DUE Agent - Markdown Module
 * Professional Markdown parser tương tự ChatGPT/Claude
 * Hỗ trợ: headers, bold, italic, lists (nested), links, code, blockquote
 */
const Markdown = {
  render(text) {
    if (!text) return '';

    const lines = text.split('\n');
    const html = this._parseBlocks(lines, 0, lines.length);
    return html;
  },

  /**
   * Parse một phạm vi dòng thành HTML blocks
   */
  _parseBlocks(lines, start, end) {
    const blocks = [];
    let i = start;

    while (i < end) {
      const line = lines[i];
      const trimmed = line.trim();

      // Dòng trống
      if (trimmed === '') { i++; continue; }

      // Code block: ```
      if (trimmed.startsWith('```')) {
        const lang = trimmed.slice(3).trim();
        const codeLines = [];
        i++;
        while (i < end && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        if (i < end) i++; // skip closing ```
        blocks.push(`<pre class="code-block"><code>${this._escapeHtml(codeLines.join('\n'))}</code></pre>`);
        continue;
      }

      // Headers: # ## ### ####
      const headerMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (headerMatch) {
        const level = headerMatch[1].length + 1; // h2, h3, h4, h5
        const tag = `h${Math.min(level, 5)}`;
        blocks.push(`<${tag}>${this._inline(headerMatch[2])}</${tag}>`);
        i++; continue;
      }

      // Horizontal rule
      if (/^[-*_]{3,}\s*$/.test(trimmed)) {
        blocks.push('<hr>');
        i++; continue;
      }

      // Blockquote
      if (trimmed.startsWith('> ') || trimmed === '>') {
        const quoteLines = [];
        while (i < end && (lines[i].trim().startsWith('> ') || lines[i].trim() === '>')) {
          const ql = lines[i].trim();
          quoteLines.push(ql === '>' ? '' : ql.slice(2));
          i++;
        }
        blocks.push(`<blockquote>${this._parseBlocks(quoteLines, 0, quoteLines.length)}</blockquote>`);
        continue;
      }

      // Table
      if (trimmed.startsWith('|')) {
        const tableLines = [];
        while (i < end && lines[i].trim().startsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }
        if (tableLines.length >= 2 && tableLines[1].indexOf('-') !== -1) {
          blocks.push(this._parseTable(tableLines));
        } else {
          blocks.push(`<p>${tableLines.map(l => this._inline(l)).join('<br>')}</p>`);
        }
        continue;
      }

      // List (unordered: - * +, ordered: 1.)
      if (this._isListItem(trimmed)) {
        const result = this._parseList(lines, i, end);
        blocks.push(result.html);
        i = result.nextIndex;
        continue;
      }

      // Paragraph: nhóm các dòng text liên tiếp
      const paraLines = [];
      while (i < end) {
        const pl = lines[i].trim();
        if (pl === '' || pl.startsWith('```') || pl.match(/^#{1,4}\s/) ||
            this._isListItem(pl) || pl.startsWith('> ') || /^[-*_]{3,}\s*$/.test(pl) || pl.startsWith('|')) {
          break;
        }
        paraLines.push(pl);
        i++;
      }
      if (paraLines.length > 0) {
        blocks.push(`<p>${paraLines.map(l => this._inline(l)).join(' ')}</p>`);
      }
    }

    return blocks.join('\n');
  },

  /**
   * Parse Markdown Table
   */
  _parseTable(tableLines) {
    if (tableLines.length < 2) return '';
    
    const parseRow = (rowStr) => {
      const cells = rowStr.split('|');
      if (cells.length > 0 && cells[0].trim() === '') cells.shift();
      if (cells.length > 0 && cells[cells.length - 1].trim() === '') cells.pop();
      return cells.map(c => c.trim());
    };

    const headers = parseRow(tableLines[0]);
    
    let html = '<div class="table-container"><table class="markdown-table"><thead><tr>';
    headers.forEach(h => {
      html += `<th>${this._inline(h)}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    for (let i = 2; i < tableLines.length; i++) {
      const cells = parseRow(tableLines[i]);
      html += '<tr>';
      for (let j = 0; j < headers.length; j++) {
        const cellContent = cells[j] ? this._inline(cells[j]) : '';
        html += `<td>${cellContent}</td>`;
      }
      html += '</tr>';
    }
    
    html += '</tbody></table></div>';
    return html;
  },

  /**
   * Kiểm tra list item (-, *, +, 1.)
   */
  _isListItem(line) {
    return /^[-*+]\s/.test(line) || /^\d+[.)]\s/.test(line);
  },

  /**
   * Parse list với nested support
   */
  _parseList(lines, startIndex, endIndex) {
    let i = startIndex;
    const firstTrimmed = lines[i].trim();
    const isOrdered = /^\d+[.)]\s/.test(firstTrimmed);
    const tag = isOrdered ? 'ol' : 'ul';
    const baseIndent = this._getIndent(lines[i]);
    const items = [];

    while (i < endIndex) {
      const rawLine = lines[i];
      const trimmed = rawLine.trim();

      // Dòng trống
      if (trimmed === '') { i++; continue; }

      const currentIndent = this._getIndent(rawLine);

      // Nếu indent nhỏ hơn base → thoát list
      if (currentIndent < baseIndent) break;

      // Nếu cùng level và là list item → item mới
      if (currentIndent === baseIndent && this._isListItem(trimmed)) {
        const content = isOrdered
          ? trimmed.replace(/^\d+[.)]\s*/, '')
          : trimmed.replace(/^[-*+]\s*/, '');
        items.push({ content: this._inline(content), children: '' });
        i++;
        continue;
      }

      // Indent lớn hơn base → nested content
      if (currentIndent > baseIndent) {
        // Tìm tất cả nested lines
        const nestedLines = [];
        while (i < endIndex) {
          const nl = lines[i];
          const nt = nl.trim();
          if (nt === '') { nestedLines.push(nl); i++; continue; }
          if (this._getIndent(nl) <= baseIndent) break;
          nestedLines.push(nl);
          i++;
        }
        if (items.length > 0 && nestedLines.length > 0) {
          // Kiểm tra nested có phải list không
          const firstNested = nestedLines.find(l => l.trim() !== '');
          if (firstNested && this._isListItem(firstNested.trim())) {
            const nested = this._parseList(nestedLines, 0, nestedLines.length);
            items[items.length - 1].children += nested.html;
          } else {
            // Continuation text
            const contText = nestedLines.map(l => l.trim()).filter(l => l).join(' ');
            items[items.length - 1].content += ' ' + this._inline(contText);
          }
        }
        continue;
      }

      // Cùng level nhưng không phải list item → thoát
      break;
    }

    const listItems = items.map(item => {
      return `<li>${item.content}${item.children}</li>`;
    }).join('\n');

    return {
      html: `<${tag}>${listItems}</${tag}>`,
      nextIndex: i,
    };
  },

  /**
   * Tính indent level
   */
  _getIndent(line) {
    const match = line.match(/^(\s*)/);
    if (!match) return 0;
    // Tab = 4 spaces
    return match[1].replace(/\t/g, '    ').length;
  },

  /**
   * Parse inline markdown
   */
  _inline(text) {
    let html = this._escapeHtml(text);

    // Bold + Italic: ***text***
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');

    // Bold: **text** or __text__
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic: *text* or _text_ (not inside words)
    html = html.replace(/(?<!\w)\*(?!\s)(.+?)(?<!\s)\*(?!\w)/g, '<em>$1</em>');
    html = html.replace(/(?<!\w)_(?!\s)(.+?)(?<!\s)_(?!\w)/g, '<em>$1</em>');

    // Inline code: `code`
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    // Links: [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Auto-link URLs
    html = html.replace(/(^|[^"=])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');

    return html;
  },

  _escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  },
};
