export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    });
  }

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const type = url.searchParams.get('type');
    const n8nUrl = process.env.N8N_TRACK_EVENT_URL;

    if (n8nUrl && type) {
      // Fire and forget tới n8n
      fetch(`${n8nUrl}?type=${type}`, { method: 'GET' }).catch(err => console.error('Tracking error:', err));
    }

    return new Response('OK', {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  return new Response('Method not allowed', { status: 405 });
}
