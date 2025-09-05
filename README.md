# NFD2 on Vercel (Hobby) — Advanced

双向私聊转发机器人（母子 Bot 架构），改进版，带基础报错提示与操作链接。

## 准备
- 母体 Bot（MOTHER_TOKEN）
- OWNER_ID（用 @userinfobot 获取）
- 随机 MOTHER_SECRET（建议 16~32 位）

## 部署
1) 把本仓库导入 Vercel → Deploy。
2) Project → Settings → Environment Variables：
   - BASE_URL = https://your-project.vercel.app
   - MOTHER_TOKEN = 你的母体 Bot token
   - MOTHER_SECRET = 任意随机串（用于校验母体 webhook 来源）
   保存后 Redeploy。
3) 绑定母体 webhook：
https://api.telegram.org/bot<MOTHER_TOKEN>/setWebhook?url=<URL-ENCODED:https://your-project.vercel.app/api/mother/<MOTHER_SECRET>>&secret_token=<MOTHER_SECRET>&drop_pending_updates=true

## 使用
- 给母体发一条消息，粘贴“子 Bot 的 token”。
- 母体会回一条可点击的 setWebhook 链接；点一下完成绑定。
- 先与子 Bot /start；再让别人给子 Bot 发消息，你会收到带 [u:xxx] 标签的转发。
- 回复那条消息即可回信；/help 获取提示、/id 查看 OWNER_ID。

## 故障排查
- getWebhookInfo：
  https://api.telegram.org/bot<TOKEN>/getWebhookInfo
- 403 错误：目标用户未与子 Bot /start 或已拉黑。
- 401：secret_token 不一致，请确认 setWebhook 的 secret 与路径末尾的一致。
- 503：Vercel 免费层出现节流，稍后再试或分片/升级。
