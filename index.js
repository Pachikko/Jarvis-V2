export default {
  async fetch(request, env, ctx) {
    try {
      const method = request.method;
      const url = new URL(request.url);

      console.log("📥 Request received:", method, url.pathname);

      if (method === 'GET') {
        return new Response('✅ Jarvis Debug online');
      }

      if (method === 'POST') {
        const data = await request.json();
        console.log("📦 POST body:", JSON.stringify(data, null, 2));
        return new Response('✅ POST received');
      }

      return new Response('Method Not Allowed', { status: 405 });
    } catch (err) {
      console.error('❌ Error in debug handler:', err);
      return new Response('OK');
    }
  }
};
