// Advanced child webhook with basic errors & guidance
module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(200).send('ok');

    const { token, owner, secret } = req.query;
    if (req.headers['x-telegram-bot-api-secret-token'] !== secret)
      return res.status(401).send('unauthorized');

    const update = req.body;
    const msg = update && update.message;
    if (!msg) return res.status(200).send('ok');

    const OWNER = String(owner);

    async function tg(method, body) {
      const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await r.json().catch(() => ({}));
      return data;
    }

    function displayName(u) {
      return [u?.first_name, u?.last_name].filter(Boolean).join(' ').trim();
    }
    function extractTagText(m) {
      return (m?.text || m?.caption || '') || '';
    }
    function getTargetIdFromReply(m) {
      const t = extractTagText(m?.reply_to_message);
      const match = /\[u:(\d+)\]/.exec(t);
      return match ? Number(match[1]) : null;
    }

    // 用户 -> OWNER（私聊）
    if (msg.chat?.type === 'private' && String(msg.from?.id) !== OWNER) {
      const tag = `[u:${msg.from.id}]`;
      const header = `${tag} ${displayName(msg.from)}${msg.from.username ? ' @' + msg.from.username : ''}`.trim();

      if (msg.text) {
        await tg('sendMessage', { chat_id: Number(OWNER), text: `${header}\n\n${msg.text}` });
      } else {
        const payload = { chat_id: Number(OWNER), from_chat_id: msg.chat.id, message_id: msg.message_id };
        // 尝试带 caption 复制；某些类型可能忽略 caption，但问题不大
        await tg('copyMessage', { ...payload, caption: tag });
      }
      return res.status(200).send('ok');
    }

    // OWNER 使用命令（/id, /help）
    if (String(msg.from?.id) === OWNER && /^\/id\b/.test(msg.text || '')) {
      await tg('sendMessage', { chat_id: Number(OWNER), text: `你的 OWNER_ID = ${OWNER}` });
      return res.status(200).send('ok');
    }
    if (String(msg.from?.id) === OWNER && /^\/help\b/.test(msg.text || '')) {
      await tg('sendMessage', { chat_id: Number(OWNER), text: '回复带 [u:xxx] 标签的那条消息即可回信；/id 查看你的 OWNER_ID。' });
      return res.status(200).send('ok');
    }

    // OWNER 回复 -> 用户（必须“回复”带标签的那条）
    if (String(msg.from?.id) === OWNER) {
      const target = getTargetIdFromReply(msg);
      if (!target) {
        await tg('sendMessage', { chat_id: Number(OWNER), text: '请“回复”带 [u:xxx] 标签的那条消息。发送 /help 获取帮助。' });
        return res.status(200).send('ok');
      }

      let sent;
      if (msg.text) {
        sent = await tg('sendMessage', { chat_id: target, text: msg.text });
      } else {
        sent = await tg('copyMessage', { chat_id: target, from_chat_id: Number(OWNER), message_id: msg.message_id });
      }

      if (!sent?.ok) {
        // 常见：403 (bot was blocked by the user / user hasn’t started the bot)
        await tg('sendMessage', {
          chat_id: Number(OWNER),
          text: `转发失败（可能对方未与子 Bot /start 或已拉黑）。错误：${JSON.stringify(sent)}`.slice(0, 3500)
        });
      }
      return res.status(200).send('ok');
    }

    // 其他情况直接忽略
    return res.status(200).send('ok');
  } catch (e) {
    // 保守处理，不把异常抛给 Telegram
    return res.status(200).send('ok');
  }
};
