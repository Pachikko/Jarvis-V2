const TOKEN = '7901685630:AAFeWgzr7kvx-T7iYcYI-GDE1VICd9kV6CI';
const API = `https://api.telegram.org/bot${TOKEN}`;

async function reply(chatId, text) {
  const payload = {
    chat_id: chatId,
    text
  };

  console.log('📤 Sending message:', JSON.stringify(payload));

  const res = await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const body = await res.text();
  console.log('📨 Telegram response:', body);

  return body;
}

export default {
  async fetch(request) {
    if (request.method === 'GET') {
      return new Response('Jarvis v3 online');
    }

    if (request.method === 'POST') {
      const update = await request.json();
      const chatId = update?.message?.chat?.id;
      const text = update?.message?.text;

      console.log('📩 Update received:', JSON.stringify(update));

      if (text === '/start' && chatId) {
        const result = await reply(chatId, '✅ Бот отвечает! Jarvis online 🤖');
        return new Response(result);
      }

      return new Response('No action');
    }

    return new Response('Method Not Allowed', { status: 405 });
  }
};
