/**
 * DUE Agent - Local Dev Server with Streaming N8N Proxy
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const N8N_WEBHOOK = 'http://localhost:5678/webhook/a76ccf13-18d4-4077-ab49-ad35107c0ebb/chat';

const MIME_TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Proxy: POST /api/chat → n8n (STREAMING)
  if (req.url === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const proxyReq = http.request(N8N_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, (proxyRes) => {
        // Forward headers, enable chunked streaming
        res.writeHead(proxyRes.statusCode, {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
          'Access-Control-Allow-Origin': '*',
        });
        res.flushHeaders(); // Gửi headers ngay lập tức

        // PIPE: stream each chunk immediately to client
        proxyRes.on('data', chunk => {
          res.write(chunk);
          // Force flush - gửi data ngay cho browser
          if (typeof res.flush === 'function') res.flush();
        });
        proxyRes.on('end', () => res.end());
      });

      proxyReq.on('error', (err) => {
        console.error('[Proxy Error]', err.message);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'N8N không phản hồi.' }));
      });

      proxyReq.write(body);
      proxyReq.end();
    });
    return;
  }

  // Static files
  let filePath = path.join(__dirname, req.url === '/' ? '/index.html' : req.url);
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': (MIME_TYPES[ext] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n  🎓 DUE Agent Dev Server (Streaming)`);
  console.log(`  Frontend: http://localhost:${PORT}`);
  console.log(`  Proxy:    /api/chat → ${N8N_WEBHOOK}\n`);
});
