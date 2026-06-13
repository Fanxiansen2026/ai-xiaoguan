// ============================================================
//  AI销冠驾驶舱 - Cloudflare Workers 后端服务
//  功能：激活码验证 + API代理 + 用户限流 + 防盗用
// ============================================================

// ===== 配置区（部署后在这里修改） =====

// 你的阿里云 DashScope API Key（存在这里，前端看不到）
const DASHSCOPE_API_KEY = 'sk-c0a3c435fbf4446c9ef9201fa319094d';

// 每用户每天最大调用次数
const DAILY_CALL_LIMIT = 200;

// 激活码列表（只存在后端，前端完全不可见）
const ACTIVATION_CODES = {
  'TRY1-DEMO-2024': { type: 'trial', days: 1 },
  'TRY7-XN0A-Q41T': { type: 'trial', days: 7 },   'TRY7-944R-YC4Z': { type: 'trial', days: 7 },
  'TRY7-4Z0C-80F1': { type: 'trial', days: 7 },    'TRY7-X06P-GHZX': { type: 'trial', days: 7 },
  'TRY7-2OU0-ZJ5I': { type: 'trial', days: 7 },     'TRY7-CZY8-H62N': { type: 'trial', days: 7 },
  'TRY7-5RP5-TSJ3': { type: 'trial', days: 7 },     'TRY7-A913-7DXN': { type: 'trial', days: 7 },
  'TRY7-9VLU-0YRE': { type: 'trial', days: 7 },     'TRY7-5ZEJ-N46I': { type: 'trial', days: 7 },
  'VIP30-M6ZS-RSDQ': { type: 'vip', days: 30 },      'VIP30-14QD-V2TG': { type: 'vip', days: 30 },
  'VIP30-RBKY-063G': { type: 'vip', days: 30 },      'VIP30-43IQ-8Z19': { type: 'vip', days: 30 },
  'VIP30-UVMR-6WH5': { type: 'vip', days: 30 },      'VIP30-ZK09-9GXZ': { type: 'vip', days: 30 },
  'VIP30-ZCEM-FPAP': { type: 'vip', days: 30 },       'VIP30-NHGP-4EVP': { type: 'vip', days: 30 },
  'VIP30-F33Y-GXZI': { type: 'vip', days: 30 },       'VIP30-GPR1-YLJ9': { type: 'vip', days: 30 },
  'VIP30-I1IV-MOFW': { type: 'vip', days: 30 },        'VIP30-MAJQ-NYYN': { type: 'vip', days: 30 },
  'VIP30-T9PG-LIIO': { type: 'vip', days: 30 },        'VIP30-0TG7-BML9': { type: 'vip', days: 30 },
  'VIP30-Q6X3-A0LJ': { type: 'vip', days: 30 },        'VIP30-CQI0-OFSE': { type: 'vip', days: 30 },
  'VIP30-WTO4-TBGN': { type: 'vip', days: 30 },        'VIP30-NZLR-Z1MR': { type: 'vip', days: 30 },
  'VIP30-KOOB-LMMD': { type: 'vip', days: 30 },        'VIP30-Y5BU-G3OQ': { type: 'vip', days: 30 },
  'VIP365-I69Y-4XIU': { type: 'vip', days: 365 },     'VIP365-SDG3-VX74': { type: 'vip', days: 365 },
  'VIP365-PLNN-P0X6': { type: 'vip', days: 365 },     'VIP365-8OED-TPA4': { type: 'vip', days: 365 },
  'VIP365-KAOA-I8O7': { type: 'vip', days: 365 },     'VIP365-BJG0-5FXL': { type: 'vip', days: 365 },
  'VIP365-OABM-B5AU': { type: 'vip', days: 365 },     'VIP365-6ENZ-SJUC': { type: 'vip', days: 365 },
  'VIP365-5TAU-JH5F': { type: 'vip', days: 365 },     'VIP365-J1ZS-16F1': { type: 'vip', days: 365 },
  'VIP365-EX5P-C4WM': { type: 'vip', days: 365 },     'VIP365-2MCH-35KJ': { type: 'vip', days: 365 },
  'VIP365-IU6K-IPBL': { type: 'vip', days: 365 },     'VIP365-HPMK-TRW9': { type: 'vip', days: 365 },
  'VIP365-A8QR-S5DZ': { type: 'vip', days: 365 },     'VIP365-F6Z5-AOWF': { type: 'vip', days: 365 },
  'VIP365-8RO0-CFQ9': { type: 'vip', days: 365 },     'VIP365-81JR-8586': { type: 'vip', days: 365 },
  'VIP365-NGL1-XAQO': { type: 'vip', days: 365 },     'VIP365-065H-E7A8': { type: 'vip', days: 365 },
  'VIP365-N9A5-XHWN': { type: 'vip', days: 365 },     'VIP365-9RW4-503B': { type: 'vip', days: 365 },
  'VIP365-O0JY-HKK9': { type: 'vip', days: 365 },     'VIP365-MMTP-3T3S': { type: 'vip', days: 365 },
  'VIP365-JKC2-3AVB': { type: 'vip', days: 365 },     'VIP365-K1CJ-BAML': { type: 'vip', days: 365 },
  'VIP365-F1Z3-U8K1': { type: 'vip', days: 365 },     'VIP365-ZZ6Z-4DMZ': { type: 'vip', days: 365 },
  'VIP365-0UH1-JCXP': { type: 'vip', days: 365 },     'VIP365-L17B-DLRH': { type: 'vip', days: 365 },
};

// API 密钥（用于前后端通信认证，防止非本站调用）
const WORKER_SECRET = 'ai-xiaoguan-secret-' + Date.now().toString(36);

// ===== 工具函数 =====

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

// 简单的请求签名验证（防止直接刷接口）
function verifyRequest(request) {
  const origin = request.headers.get('Origin') || request.headers.get('Referer') || '';
  // 允许 GitHub Pages 和你的域名访问
  const allowedOrigins = [
    'https://fanxiansen2026.github.io',
    'http://127.0.0.1',
    'http://localhost'
  ];
  return allowedOrigins.some(o => origin.startsWith(o));
}

// 获取当天日期键
function getTodayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// ===== KV 存储操作 =====

// 使用 Cloudflare KV 存储限流数据
// 如果没有绑定 KV，使用内存存储（Worker 重启会丢失，但免费）

let rateLimitCache = {}; // fallback 内存缓存

async function getCallCount(env, userId) {
  if (env.RATE_LIMIT_KV) {
    const data = await env.RATE_LIMIT_KV.get(`calls:${userId}:${getTodayKey()}`);
    return data ? parseInt(data, 10) : 0;
  }
  const key = `calls:${userId}:${getTodayKey()}`;
  return rateLimitCache[key] || 0;
}

async function incrementCallCount(env, userId) {
  if (env.RATE_LIMIT_KV) {
    const key = `calls:${userId}:${getTodayKey()}`;
    const current = await env.RATE_LIMIT_KV.get(key);
    const count = (current ? parseInt(current, 10) : 0) + 1;
    await env.RATE_LIMIT_KV.put(key, String(count), { expirationTtl: 86400 }); // 24小时过期
    return count;
  }
  const key = `calls:${userId}:${getTodayKey()}`;
  rateLimitCache[key] = (rateLimitCache[key] || 0) + 1;
  return rateLimitCache[key];
}

// 存储激活信息
async function saveActivation(env, userId, codeInfo) {
  if (env.RATE_LIMIT_KV) {
    const key = `activation:${userId}`;
    // 设置过期时间：激活码天数 + 24小时缓冲
    const ttl = codeInfo.days * 86400 + 3600;
    await env.RATE_LIMIT_KV.put(key, JSON.stringify({
      code: codeInfo.code,
      type: codeInfo.type,
      days: codeInfo.days,
      activatedAt: Date.now(),
      expiresAt: Date.now() + codeInfo.days * 86400 * 1000
    }), { expirationTtl: ttl });
    return true;
  }
  return false; // 无KV时无法持久化，但可以临时工作
}

async function getActivation(env, userId) {
  if (env.RATE_LIMIT_KV) {
    const data = await env.RATE_LIMIT_KV.get(`activation:${userId}`);
    return data ? JSON.parse(data) : null;
  }
  return null;
}

// ===== 路由处理 =====

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // CORS 预检
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': '*',
          }
        });
      }

      // 健康检查
      if (path === '/health') {
        return json({ status: 'ok', time: Date.now(), version: '1.0' });
      }

      // ===== 接口1: 激活码验证 =====
      if (path === '/verify') {
        if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

        let body;
        try {
          body = await request.json();
        } catch(e) {
          return json({ valid: false, message: '无效请求数据' });
        }

        const code = (body.code || '').trim().toUpperCase();
        const deviceId = (body.deviceId || '').trim();
        const userId = deviceId || `anon-${Date.now()}`;

        if (!code) return json({ valid: false, message: '请输入激活码' });

        // 查找激活码
        const codeInfo = ACTIVATION_CODES[code];
        if (!codeInfo) {
          return json({ valid: false, message: '激活码不存在或已失效' });
        }

        // 记录激活信息到 KV
        const activationData = { ...codeInfo, code };
        await saveActivation(env, userId, activationData);

        console.log(`[激活成功] 用户=${userId}, 类型=${codeInfo.type}, 天数=${codeInfo.days}`);

        return json({
          valid: true,
          type: codeInfo.type,
          days: codeInfo.days,
          expiresAt: Date.now() + codeInfo.days * 86400 * 1000,
          message: `${codeInfo.type === 'trial' ? '试用' : 'VIP'}激活成功！有效期 ${codeInfo.days} 天`
        });
      }

      // ===== 接口2: 检查激活状态 =====
      if (path === '/check-status') {
        if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

        let body;
        try {
          body = await request.json();
        } catch(e) {
          return json({ isValid: false });
        }

        const userId = (body.deviceId || '').trim();
        if (!userId) return json({ isValid: false });

        const activation = await getActivation(env, userId);
        if (!activation) return json({ isValid: false });

        // 检查是否过期
        if (Date.now() > activation.expiresAt) {
          return json({ isValid: false, reason: 'expired', message: '激活已过期' });
        }

        return json({
          isValid: true,
          type: activation.type,
          days: activation.days,
          remainingDays: Math.ceil((activation.expiresAt - Date.now()) / 86400000)
        });
      }

      // ===== 接口3: AI 对话代理（核心安全功能）=====
      if (path === '/chat') {
        if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

        // 安全检查：验证来源
        if (!verifyRequest(request)) {
          console.log(`[安全警告] 来源不合法: ${request.headers.get('Origin') || request.headers.get('Referer')}`);
          return json({ error: 'Unauthorized source' }, 403);
        }

        let body;
        try {
          body = await request.json();
        } catch(e) {
          return json({ error: 'Invalid request body' }, 400);
        }

        const { messages, model, userId } = body;

        if (!messages || !Array.isArray(messages)) {
          return json({ error: 'Missing messages parameter' }, 400);
        }

        // 检查是否激活
        if (userId) {
          const activation = await getActivation(env, userId);
          if (!activation || Date.now() > activation.expiresAt) {
            return json({ error: 'ACTIVATION_EXPIRED', message: '激活码已过期，请重新激活' }, 403);
          }

          // 限流检查
          const callCount = await getCallCount(env, userId);
          if (callCount >= DAILY_CALL_LIMIT) {
            return json({ error: 'RATE_LIMITED', message: `今日调用次数已达上限(${DAILY_CALL_LIMIT}次)，明天继续使用` }, 429);
          }

          // 增加计数
          await incrementCallCount(env, userId);
        }

        // 构造转发给阿里云的请求
        const targetModel = model || 'qwen-plus';

        console.log(`[API代理] 用户=${userId || 'unknown'}, 模型=${targetModel}`);

        const dashscopeRes = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DASHSCOPE_API_KEY}`
          },
          body: JSON.stringify({
            model: targetModel,
            messages: messages.map(m => ({
              role: m.role,
              content: m.content
              // 不透传任何额外字段，防止信息泄露
            }))
          })
        });

        if (!dashscopeRes.ok) {
          const errText = await dashscopeRes.text();
          console.error(`[阿里云错误] ${dashscopeRes.status}: ${errText.slice(0, 200)}`);
          return json({
            error: `API Error ${dashscopeRes.status}`,
            message: errText.slice(0, 500)
          }, 502);
        }

        const aiResult = await dashscopeRes.json();

        // 返回结果给前端（不含任何敏感信息）
        return json(aiResult);
      }

      // ===== 接口4: 查询剩余次数 =====
      if (path === '/quota') {
        if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

        let body;
        try {
          body = await request.json();
        } catch(e) {
          return json({ used: 0, limit: DAILY_CALL_LIMIT });
        }

        const userId = (body.userId || '').trim();
        if (!userId) return json({ used: 0, limit: DAILY_CALL_LIMIT, remaining: DAILY_CALL_LIMIT });

        const used = await getCallCount(env, userId);
        return json({
          used,
          limit: DAILY_CALL_LIMIT,
          remaining: Math.max(0, DAILY_CALL_LIMIT - used)
        });
      }

      // 未匹配路由
      return json({ error: 'Not Found', availableEndpoints: ['/verify', '/check-status', '/chat', '/quota', '/health'] }, 404);

    } catch (error) {
      console.error('[Worker 错误]', error.stack || error.message);
      return json({ error: 'Internal Server Error' }, 500);
    }
  }
};
