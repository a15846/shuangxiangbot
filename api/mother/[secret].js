// Mother webhook: accept child token in DM and return clickable setWebhook link
const BASE_URL = process.env.BASE_URL;       // e.g. https://your-project.vercel.app
const MOTHER_TOKEN = process.env.MOTHER_TOKEN;
const MOTHER_SECRET = process.env.MOTHER_SECRET;

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(200).send('ok');

    const got = req.headers['x-telegram-bot-api-secret-token'];
    if (MOTHER_SECRET && got !== MOTHER_SECRET) return res.status(401).send('unauthorized');

    const update = req.body;
    const msg = update && update.message;
    if (!msg) return res.status(200).send('ok');

    const chatId = msg.chat.id;
    const text = (msg.text || '').trim();
    const tokenMatch = text.match(/(\d{6,}:[A-Za-z0-9_-]{35,})/);

    if (!tokenMatch) {
      await send(chatId, `请直接粘贴由 @BotFather 生成的子 Bot Token（形如 123456789:AAAAA-BBBBB...）。
收到后我会生成一条“官方 setWebhook 链接”，你点一下即可把子 Bot 绑定到本转发服务。

也可以手动绑定（把尖括号替换为实际值）：
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https%3A%2F%2Fyour-project.vercel.app%2Fapi%2Fnfd2%2F<TOKEN>%2F<OWNER_ID>%2F<SECRET>&secret_token=<SECRET>&drop_pending_updates=true
`);
      return res.status(200).send('ok');
    }

    const childToken = tokenMatch[1];
    const owner = msg.from.id;
    const secret = makeSecret(24);

    if (!BASE_URL) {
      await send(chatId, '管理员尚未在 Vercel 环境变量里配置 BASE_URL，请联系管理员。');
      return res.status(200).send('ok');
    }

    const webhookUrl = `${BASE_URL}/api/nfd2/${encodeURIComponent(childToken)}/${owner}/${secret}`;
    const setWebhook = `https://api.telegram.org/bot${childToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}&secret_token=${secret}&drop_pending_updates=true`;
    const delWebhook = `https://api.telegram.org/bot${childToken}/deleteWebhook`;
    const infoWebhook = `https://api.telegram.org/bot${childToken}/getWebhookInfo`;

    await send(chatId, `✅ 生成完成

1) 点击链接绑定子 Bot：
${setWebhook}

2) 绑定后请先与子 Bot /start，然后让别人给子 Bot 发消息测试。

3) 查询 webhook 状态：
${infoWebhook}

取消绑定：
${delWebhook}
`);
    return res.status(200).send('ok');
  } catch (e) {
    return res.status(200).send('ok');
  }
};

async function send(chatId, text) {
  await fetch(`https://api.telegram.org/bot${MOTHER_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  });
}

function makeSecret(n) {
  const s = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  let out = '';
  for (let i = 0; i < n; i++) out += s[Math.floor(Math.random() * s.length)];
  return out;
}
