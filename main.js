const TOKEN = globalThis.TELEGRAM_TOKEN;
const API = `https://api.telegram.org/bot${TOKEN}`;

const options = {
  accounts: ['10k 💰', '25k 💼', '50k 💳', '100k 🏦', '200k 🚀'],
  risks: ['0.3% 🧠', '0.5% 🧩', '1% 📈', '2% 🔥'],
  pairs: ['EURUSD', 'GBPUSD', 'EURGBP', 'XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD']
};

const sessions = {};

function reply(chatId, text, keyboard) {
  return fetch(`${API}/sendMessage`, {
    method: 'POST',
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: keyboard ? {
        keyboard: [keyboard.map(v => ({ text: v }))],
        resize_keyboard: true,
        one_time_keyboard: true,
      } : undefined
    }),
    headers: { 'Content-Type': 'application/json' }
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
    XPDUSD: { pipValue: 10, multiplier: 10 },
  };

  const conf = settings[pair];
  if (!conf || slDistance === 0) return null;

  return +(riskAmount / (slDistance * conf.pipValue * conf.multiplier)).toFixed(2);
}

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      return new Response('Jarvis online');
    }

    const { message } = await request.json();
    if (!message || !message.chat || !message.text) return new Response('OK');

    const chatId = message.chat.id;
    const text = message.text.trim();

    if (!sessions[chatId]) sessions[chatId] = {};

    const state = sessions[chatId];

    if (text === '/start' || text === 'Новый расчет 🔄') {
      sessions[chatId] = {};
      return reply(chatId, 'Привет, я Jarvis V2 🤖\nВыбери сумму аккаунта:', options.accounts);
    }

    if (!state.account && options.accounts.includes(text)) {
      state.account = parseInt(text) * 1000;
      return reply(chatId, 'Теперь выбери риск:', options.risks);
    }

    if (!state.risk && options.risks.includes(text)) {
      state.risk = parseFloat(text) / 100;
      return reply(chatId, 'Выбери торговую пару:', options.pairs);
    }

    if (!state.pair && options.pairs.includes(text)) {
      state.pair = text;
      return reply(chatId, `Введи цену входа для ${text}:`);
    }

    if (!state.entry && !isNaN(+text)) {
      state.entry = +text;
      return reply(chatId, 'Введи цену стоп-лосса:');
    }

    if (!state.sl && !isNaN(+text)) {
      state.sl = +text;
      return reply(chatId, 'Введи цену тейк-профита:');
    }

    if (!state.tp && !isNaN(+text)) {
      state.tp = +text;
      const lot = calculateLot(state);

      if (!lot) {
        sessions[chatId] = {};
        return reply(chatId, 'Ошибка в расчёте. Попробуй заново /start');
      }

      const summary = `📌 Пара: ${state.pair}\n💰 Лот: ${lot}\n📉 SL: ${state.sl}\n📈 TP: ${state.tp}`;
      sessions[chatId] = {};
      return reply(chatId, summary, ['Новый расчет 🔄']);
    }

    return reply(chatId, 'Не понимаю. Напиши /start чтобы начать.');
  }
};
