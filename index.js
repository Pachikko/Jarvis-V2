if (!TELEGRAM_TOKEN) {
  throw new Error("TELEGRAM_TOKEN is not defined in environment variables");
}
const TOKEN = TELEGRAM_TOKEN; // Cloudflare автоматически подставляет значение
const API = `https://api.telegram.org/bot${TOKEN}`;

const options = {
  accounts: ['10k 💰', '25k 💼', '50k 💳', '100k 🏦', '200k 🚀'],
  risks: ['0.3% 🧠', '0.5% 🧩', '1% 📈', '2% 🔥'],
  pairs: ['EURUSD', 'GBPUSD', 'EURGBP', 'XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD']
};

const sessions = {};

function reply(chatId, text, keyboard) {
  const body = {
    chat_id: chatId,
    text,
    reply_markup: keyboard ? {
      keyboard: [keyboard.map(opt => ({ text: opt }))],
      resize_keyboard: true,
      one_time_keyboard: true
    } : undefined
  };

  return fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

function calculateLot({ account, risk, entry, sl, pair }) {
  const slDistance = Math.abs(entry - sl);
  const riskAmount = account * risk;

  const settings = {
    EURUSD: { pipValue: 10, multiplier: 10 },
    GBPUSD: { pipValue: 10, multiplier: 10 },
    EURGBP: { pipValue: 10, multiplier: 10 },
    XAUUSD: { pipValue: 1, multiplier: 100 },
    XAGUSD: { pipValue: 50, multiplier: 50 },
    XPTUSD: { pipValue: 10, multiplier: 10 },
    XPDUSD: { pipValue: 10, multiplier: 10 }
  };

  const conf = settings[pair];
  if (!conf || slDistance === 0) return null;

  return +(riskAmount / (slDistance * conf.pipValue * conf.multiplier)).toFixed(2);
}

export default {
  async fetch(request) {
    // Проверка метода GET для health check
    if (request.method === 'GET') {
      return new Response('Jarvis v3 online');
    }

    // Проверка метода POST для Telegram webhook
    if (request.method !== 'POST') {
      return new Response('Only POST requests accepted', { status: 405 });
    }

    try {
      const update = await request.json();
      const message = update.message;
      
      if (!message || !message.chat || !message.text) {
        return new Response('No valid message');
      }

      const chatId = message.chat.id;
      const text = message.text.trim();

      if (!sessions[chatId]) sessions[chatId] = {};
      const state = sessions[chatId];

      if (text === '/start' || text === 'Новый расчет 🔄') {
        sessions[chatId] = {};
        await reply(chatId, 'Привет, я Jarvis 🤖\nВыбери сумму аккаунта:', options.accounts);
        return new Response('OK');
      }

      if (!state.account && options.accounts.includes(text)) {
        state.account = parseInt(text) * 1000;
        await reply(chatId, 'Теперь выбери риск:', options.risks);
        return new Response('OK');
      }

      if (!state.risk && options.risks.includes(text)) {
        state.risk = parseFloat(text) / 100;
        await reply(chatId, 'Выбери торговую пару:', options.pairs);
        return new Response('OK');
      }

      if (!state.pair && options.pairs.includes(text)) {
        state.pair = text;
        await reply(chatId, `Введи цену входа для ${text}:`);
        return new Response('OK');
      }

      if (!state.entry && !isNaN(+text)) {
        state.entry = +text;
        await reply(chatId, 'Введи цену стоп-лосса:');
        return new Response('OK');
      }

      if (!state.sl && !isNaN(+text)) {
        state.sl = +text;
        await reply(chatId, 'Введи цену тейк-профита:');
        return new Response('OK');
      }

      if (!state.tp && !isNaN(+text)) {
        state.tp = +text;
        const lot = calculateLot(state);
        const summary = lot
          ? `📌 Пара: ${state.pair}\n💰 Лот: ${lot}\n📉 SL: ${state.sl}\n📈 TP: ${state.tp}`
          : '❗ Ошибка в расчёте. Проверь SL и entry.';

        sessions[chatId] = {};
        await reply(chatId, summary, ['Новый расчет 🔄']);
        return new Response('OK');
      }

      await reply(chatId, '❓ Не понял. Напиши /start');
      return new Response('OK');
    } catch (error) {
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  }
};
