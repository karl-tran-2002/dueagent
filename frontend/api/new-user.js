export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method === 'POST') {
    const body = await req.text();
    const n8nUrl = process.env.N8N_NEW_USER_URL;

    if (!n8nUrl) {
      return new Response(JSON.stringify({ error: 'N8N_NEW_USER_URL is not set' }), { status: 500 });
    }

    try {
      const response = await fetch(n8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      const text = await response.text();
      return new Response(text, {
        status: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Failed to reach n8n' }), { status: 502 });
    }
  }

  return new Response('Method not allowed', { status: 405 });
}
