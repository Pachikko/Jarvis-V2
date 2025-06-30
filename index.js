const options = {
  accounts: ['10k 💰', '25k 💼', '50k 💳', '100k 🏦', '200k 🚀'],
  risks: ['0.3% 🧠', '0.5% 🧩', '1% 📈', '2% 🔥'],
  pairs: ['EURUSD', 'GBPUSD', 'XAUUSD', 'XAGUSD', 'GER40.cash', 'US100.cash', 'US500.cash', 'US30.cash', 'EU50.cash']
}

const sessions = {}

async function sendMessage(API, chatId, text, keyboard) {
  const body = {
    chat_id: chatId,
    text,
    reply_markup: keyboard ? {
      keyboard: [keyboard.map(opt => ({ text: opt }))],
      resize_keyboard: true,
      one_time_keyboard: true
    } : undefined
  }

  const response = await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  return await response.json()
}

function calculateLot({ account, risk, entry, sl, pair, eurusd }) {
  const pipSettings = {
    EURUSD: { pipSize: 0.0001, pipValue: 10 },
    GBPUSD: { pipSize: 0.0001, pipValue: 10 },
    XAUUSD: { pipSize: 0.01, pipValue: 1 },
    XAGUSD: { pipSize: 0.01, pipValue: 50 },
    XPTUSD: { pipSize: 0.01, pipValue: 1 },
    XPDUSD: { pipSize: 0.01, pipValue: 1 },
    GER40: { pipSize: 1, pipValue: 1, currency: 'EUR' },
    EU50: { pipSize: 1, pipValue: 1, currency: 'EUR' },
    US100: { pipSize: 1, pipValue: 1 },
    US500: { pipSize: 1, pipValue: 1 },
    US30: { pipSize: 1, pipValue: 1 }
  }

  const shortPair = pair.replace('.cash','')
  const settings = pipSettings[shortPair]
  if (!settings) return null

  const slPips = Math.abs(entry - sl) / settings.pipSize
  if (slPips === 0) return null

  let pipValue = settings.pipValue
  if (settings.currency === 'EUR' && eurusd) {
    pipValue *= eurusd
  }

  const riskAmount = account * risk
  const lot = riskAmount / (slPips * pipValue)

  return parseFloat(lot.toFixed(2))
}

export default {
  async fetch(request, env) {
    const TOKEN = env.TELEGRAM_TOKEN || ''
    if (!TOKEN) {
      console.error('TELEGRAM_TOKEN не настроен')
    }

    const API = `https://api.telegram.org/bot${TOKEN}`

    if (request.method === 'GET') {
      return new Response('Jarvis v3 online', {
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 })
    }

    try {
      const update = await request.json()
      const message = update.message || update.callback_query?.message

      if (!message || !message.chat) {
        return new Response('Invalid message format', { status: 400 })
      }

      const chatId = message.chat.id
      const text = message.text?.trim() || ''

      if (!sessions[chatId]) sessions[chatId] = {}
      const session = sessions[chatId]

      if (text === '/start' || text === 'Новый расчет 🔄') {
        sessions[chatId] = {}
        await sendMessage(API, chatId, 'Привет, я Jarvis 🤖\nВыбери сумму аккаунта:', options.accounts)
        return new Response('OK')
      }

      if (!session.account && options.accounts.includes(text)) {
        session.account = parseFloat(text) * 1000
        await sendMessage(API, chatId, 'Теперь выбери риск:', options.risks)
        return new Response('OK')
      }

      if (!session.risk && options.risks.includes(text)) {
        session.risk = parseFloat(text) / 100
        await sendMessage(API, chatId, 'Выбери инструмент:', options.pairs)
        return new Response('OK')
      }

      if (!session.pair && options.pairs.includes(text)) {
        session.pair = text
        if (['GER40.cash', 'EU50.cash'].includes(text)) {
          await sendMessage(API, chatId, 'Введите курс EURUSD:')
        } else {
          await sendMessage(API, chatId, `Введи цену входа для ${text}:`)
        }
        return new Response('OK')
      }

      if ((session.pair === 'GER40.cash' || session.pair === 'EU50.cash') && !session.eurusd && !isNaN(parseFloat(text))) {
        session.eurusd = parseFloat(text)
        await sendMessage(API, chatId, `Введи цену входа для ${session.pair}:`)
        return new Response('OK')
      }

      if (!session.entry && !isNaN(parseFloat(text))) {
        session.entry = parseFloat(text)
        await sendMessage(API, chatId, 'Введи цену стоп-лосса:')
        return new Response('OK')
      }

      if (!session.sl && !isNaN(parseFloat(text))) {
        session.sl = parseFloat(text)
        await sendMessage(API, chatId, 'Введи цену тейк-профита:')
        return new Response('OK')
      }

      if (!session.tp && !isNaN(parseFloat(text))) {
        session.tp = parseFloat(text)
        const lot = calculateLot(session)

        let responseText
        if (lot) {
          const rr = Math.abs((session.tp - session.entry) / (session.entry - session.sl)).toFixed(2)
          responseText = [
            '📊 Результат расчета:',
            `📌 Инструмент: ${session.pair}`,
            `💰 Лот: ${lot}`,
            `🔴 SL: ${session.sl}`,
            `🟢 TP: ${session.tp}`,
            `⚖️ RR: ${rr}`,
            '',
            'Для нового расчета нажмите кнопку ниже'
          ].join('\n')
        } else {
          responseText = '❌ Ошибка в расчетах. Проверьте введенные данные.'
        }

        sessions[chatId] = {}
        await sendMessage(API, chatId, responseText, ['Новый расчет 🔄'])
        return new Response('OK')
      }

      await sendMessage(API, chatId, 'Я не понял команду. Нажмите /start')
      return new Response('OK')

    } catch (error) {
      console.error('Error:', error)
      return new Response('Internal Server Error', { status: 500 })
    }
  }
}
