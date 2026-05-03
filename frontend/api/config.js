export default function handler(req, res) {
  // Trả về các biến môi trường từ hệ thống Vercel
  res.status(200).json({
    N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL,
    N8N_TRACK_EVENT_URL: process.env.N8N_TRACK_EVENT_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  });
}
