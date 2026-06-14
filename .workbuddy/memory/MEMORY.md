# AI销冠大脑 项目笔记

## 部署信息
- **前端**: **GitHub Pages** (自动部署，改代码push即更新)
- **永久链接**: https://fanxiansen2026.github.io/ai-xiaoguan/
- **GitHub**: https://github.com/Fanxiansen2026/ai-xiaoguan
- **Cloudflare账号**: 787786275@qq.com / Fanxiansen2026
- **后端**: Cloudflare Workers 已部署，自定义域名 https://api.54xiaoguan.cn（国内可访问）
- **KV存储**: RATE_LIMIT_KV (id: bdc1e6e85624431e9043a34e1486ac8a)，用于持久化激活状态+限流
- **更新方式**: 改代码 → git push → Pages 自动部署（约1分钟）

## 技术架构 v2.0
- 前端: GitHub Pages 托管静态文件（支持混淆打包）
- 后端: Cloudflare Workers 代理 API 调用 + 服务端激活码验证 + 限流
- 限流策略: 每用户每天 200 次 API 调用
- 安全机制: API Key 存 Worker 后端、激活码存后端、代码支持 javascript-obfuscator 混淆
- 用户零门槛: 不再需要输入 API Key，只需输入激活码即可使用

## 文件结构
- `worker/index.js` - Cloudflare Workers 后端代码
- `api-proxy.js` - 前端代理客户端（新增）
- `build.js` - 生产构建/混淆脚本（新增）
- `config.js` - 配置（已移除硬编码激活码）
- `core.js` - 核心逻辑（激活验证改为调后端）
- `api.js` - AI 调用（改为走代理）
- `index.html`, `style.css`, `features.js`, `admin.js`, `init.js`

## 注意事项
- Vercel 在国内被墙，不可用
- CloudStudio 沙箱链接国内仅 2 小时有效
- Cloudflare Workers 不适合托管纯静态 HTML 网站（用 Pages 才行）
- 微信内打开需要 HTTPS（GitHub Pages 自带 HTTPS）
- 已修复手机端响应式布局问题（100dvh、flex-wrap、480px断点）
- **developers.cloudflare.com 在国内打不开**，但 dash.cloudflare.com 和 wrangler CLI 可以用
- Wrangler OAuth 回调页会跳到 developers.cloudflare.com（打不开），但实际上授权已成功
- Worker 已部署：https://ai-xiaoguan-api.787786275.workers.dev（国内被墙，不可用）
- **自定义域名**：https://api.54xiaoguan.cn（国内可正常访问，路由绑定在 Worker 上）
- **54xiaoguan.cn** 域名 DNS 已切到 Cloudflare（brit.ns.cloudflare.com / coby.ns.cloudflare.com）
- KV 持久化存储已绑定，否则 Worker 无状态导致激活验证通过但对话报过期
- `.workers.dev` 域名在国内被墙/极慢，必须绑定自定义域名
- 域名备案中但 Cloudflare 是海外服务不需要备案
- **代码混淆**：已用 javascript-obfuscator 实现，`build.js --prod` 生成混淆版到 `dist/`，复制回根目录后部署
- **话术库展开修复**：`features.js` 和 `core.js` 重复绑定点击事件，移除 `core.js` 第444行后修复
- **Worker v2.1**：已添加 `/admin/config` 端点、`/admin/stats` 返回 `totalTokens`、修复 `/whisper` 端点
- **Git 推送**：若被 GitHub secret scanning 拦截，需 `git reset --hard origin/main` 重置后重新提交（不能只删文件）
