export default function handler(req, res) {
  // Trả về các biến môi trường từ hệ thống Vercel
  res.status(200).json({
    N8N_WEBHOOK_URL: '/api/chat',
    N8N_TRACK_EVENT_URL: '/api/track',
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  });
}
