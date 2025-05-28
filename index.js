// Проверка наличия токена
if (typeof TELEGRAM_TOKEN === 'undefined') {
  throw new Error('TELEGRAM_TOKEN не найден! Добавьте его в Settings -> Variables');
}

const TOKEN = TELEGRAM_TOKEN;
const API = `https://api.telegram.org/bot${TOKEN}`;

const options = {
  accounts: ['10k 💰', '25k 💼', '50k 💳', '100k 🏦', '200k 🚀'],
  risks: ['0.3% 🧠', '0.5% 🧩', '1% 📈', '2% 🔥'],
  pairs: ['EURUSD', 'GBPUSD', 'EURGBP', 'XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD']
};

const sessions = {};

async function sendMessage(chatId, text, keyboard) {
  const body = {
    chat_id: chatId,
    text,
    reply_markup: keyboard ? {
      keyboard: [keyboard.map(opt => ({ text: opt }))],
      resize_keyboard: true,
      one_time_keyboard: true
    } : undefined
  };

  const response = await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  return await response.json();
}

function calculateLot({ account, risk, entry, sl, pair }) {
  const slDistance = Math.abs(entry - sl);
  const riskAmount = account * risk;

  const pairSettings = {
    EURUSD: { pipValue: 10, multiplier: 10 },
    GBPUSD: { pipValue: 10, multiplier: 10 },
    EURGBP: { pipValue: 10, multiplier: 10 },
    XAUUSD: { pipValue: 1, multiplier: 100 },
    XAGUSD: { pipValue: 50, multiplier: 50 },
    XPTUSD: { pipValue: 10, multiplier: 10 },
    XPDUSD: { pipValue: 10, multiplier: 10 }
  };

  const settings = pairSettings[pair];
  if (!settings || slDistance === 0) return null;

  const lot = riskAmount / (slDistance * settings.pipValue * settings.multiplier);
  return parseFloat(lot.toFixed(2));
}

export default {
  async fetch(request) {
    // Health check
    if (request.method === 'GET') {
      return new Response('Jarvis v3 online', { 
        headers: { 'Content-Type': 'text/plain' } 
      });
    }

    // Только POST-запросы от Telegram
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    try {
      const update = await request.json();
      const message = update.message || update.callback_query?.message;
      
      if (!message || !message.chat) {
        return new Response('Invalid message format', { status: 400 });
      }

      const chatId = message.chat.id;
      const text = message.text?.trim() || '';

      if (!sessions[chatId]) sessions[chatId] = {};
      const session = sessions[chatId];

      // Обработка команд
      if (text === '/start' || text === 'Новый расчет 🔄') {
        sessions[chatId] = {};
        await sendMessage(chatId, 'Привет, я Jarvis 🤖\nВыбери сумму аккаунта:', options.accounts);
        return new Response('OK');
      }

      // Обработка выбора аккаунта
      if (!session.account && options.accounts.includes(text)) {
        session.account = parseFloat(text) * 1000;
        await sendMessage(chatId, 'Теперь выбери риск:', options.risks);
        return new Response('OK');
      }

      // Обработка выбора риска
      if (!session.risk && options.risks.includes(text)) {
        session.risk = parseFloat(text) / 100;
        await sendMessage(chatId, 'Выбери торговую пару:', options.pairs);
        return new Response('OK');
      }

      // Обработка выбора пары
      if (!session.pair && options.pairs.includes(text)) {
        session.pair = text;
        await sendMessage(chatId, `Введи цену входа для ${text}:`);
        return new Response('OK');
      }

      // Ввод цены входа
      if (!session.entry && !isNaN(parseFloat(text))) {
        session.entry = parseFloat(text);
        await sendMessage(chatId, 'Введи цену стоп-лосса:');
        return new Response('OK');
      }

      // Ввод стоп-лосса
      if (!session.sl && !isNaN(parseFloat(text))) {
        session.sl = parseFloat(text);
        await sendMessage(chatId, 'Введи цену тейк-профита:');
        return new Response('OK');
      }

      // Ввод тейк-профита и расчет
      if (!session.tp && !isNaN(parseFloat(text))) {
        session.tp = parseFloat(text);
        const lot = calculateLot(session);
        
        let responseText;
        if (lot) {
          responseText = [
            '📊 Результат расчета:',
            `📌 Пара: ${session.pair}`,
            `💰 Лот: ${lot}`,
            `🔴 SL: ${session.sl}`,
            `🟢 TP: ${session.tp}`,
            '',
            'Для нового расчета нажмите кнопку ниже'
          ].join('\n');
        } else {
          responseText = '❌ Ошибка в расчетах. Проверьте введенные данные.';
        }

        sessions[chatId] = {};
        await sendMessage(chatId, responseText, ['Новый расчет 🔄']);
        return new Response('OK');
      }

      // Неизвестная команда
      await sendMessage(chatId, 'Я не понял команду. Нажмите /start');
      return new Response('OK');

    } catch (error) {
      console.error('Error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
};
