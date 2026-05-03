# Hướng dẫn cấu hình N8N cho DUE Agent

## 1. Bật CORS (bắt buộc)

Container n8n hiện tại tên `n8n`, image `docker.n8n.io/n8nio/n8n`.

### Cách nhanh nhất: Stop → Xóa → Chạy lại với biến mới

```bash
# 1. Stop container cũ
docker stop n8n

# 2. Chạy lại với CORS enabled
docker run -d --restart unless-stopped --name n8n_new \
  -p 5678:5678 \
  -e N8N_CORS_ENABLED=true \
  -v n8n_data:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n

# 3. Nếu dùng volume tên khác, kiểm tra bằng:
docker inspect n8n --format '{{range .Mounts}}{{.Name}} -> {{.Destination}}{{println}}{{end}}'
```

### Hoặc nếu dùng docker-compose.yml:

```yaml
services:
  n8n:
    image: docker.n8n.io/n8nio/n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_CORS_ENABLED=true
    volumes:
      - n8n_data:/home/node/.n8n

volumes:
  n8n_data:
```

## 2. Webhook URL
```
http://localhost:5678/webhook/a76ccf13-18d4-4077-ab49-ad35107c0ebb/chat
```

## 3. Kiểm tra hoạt động
```bash
curl -X POST http://localhost:5678/webhook/a76ccf13-18d4-4077-ab49-ad35107c0ebb/chat \
  -H "Content-Type: application/json" \
  -d '{"action":"sendMessage","chatInput":"xin chào","sessionId":"test123"}'
```
