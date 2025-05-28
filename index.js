const TOKEN = globalThis.TELEGRAM_TOKEN;
const API = `https://api.telegram.org/bot${TOKEN}`;

async function reply(chatId, text) {
  await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text
    })
  });
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

      if (text === '/start' && chatId) {
        await reply(chatId, '✅ Бот отвечает! Jarvis online 🤖');
        return new Response('OK');
      }

      return new Response('NO ACTION');
    }

    return new Response('Method Not Allowed', { status: 405 });
  }
};
