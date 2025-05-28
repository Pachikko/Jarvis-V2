export default {
  async fetch(request) {
    if (request.method === 'GET') {
      return new Response('✅ Jarvis online');
    }

    if (request.method === 'POST') {
      try {
        const data = await request.json();
        console.log("📦 POST from Telegram:", JSON.stringify(data, null, 2));
      } catch (e) {
        console.error("❌ Failed to parse POST body:", e);
      }
      return new Response('OK');
    }

    return new Response('Method Not Allowed', { status: 405 });
  }
}
