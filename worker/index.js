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
// 激活码列表（只存在后端，前端完全不可见）
const ACTIVATION_CODES = {
  'TRY7-E47F-A8A6': { type: 'trial', days: 7 },
  'TRY7-7L36-T7DD': { type: 'trial', days: 7 },
  'TRY7-OC9Y-NRPE': { type: 'trial', days: 7 },
  'TRY7-UQ36-FS9N': { type: 'trial', days: 7 },
  'TRY7-SGNU-V3IS': { type: 'trial', days: 7 },
  'TRY7-PUP4-84SY': { type: 'trial', days: 7 },
  'TRY7-HO9V-W01I': { type: 'trial', days: 7 },
  'TRY7-SHTU-3G6H': { type: 'trial', days: 7 },
  'TRY7-ZNMT-OZQY': { type: 'trial', days: 7 },
  'TRY7-POG6-XFTZ': { type: 'trial', days: 7 },
  'TRY7-FOSM-TPSG': { type: 'trial', days: 7 },
  'TRY7-47M1-30GL': { type: 'trial', days: 7 },
  'TRY7-IN48-CBMA': { type: 'trial', days: 7 },
  'TRY7-F8OZ-VFZL': { type: 'trial', days: 7 },
  'TRY7-4DXT-28TK': { type: 'trial', days: 7 },
  'TRY7-2KUY-4OX5': { type: 'trial', days: 7 },
  'TRY7-HV8Z-R38D': { type: 'trial', days: 7 },
  'TRY7-UCGS-UHKQ': { type: 'trial', days: 7 },
  'TRY7-AFNY-WK3R': { type: 'trial', days: 7 },
  'TRY7-GWT4-3H4Y': { type: 'trial', days: 7 },
  'TRY7-22BW-BEIK': { type: 'trial', days: 7 },
  'TRY7-G0QN-RDV0': { type: 'trial', days: 7 },
  'TRY7-ECOS-1LQI': { type: 'trial', days: 7 },
  'TRY7-K6X9-S0Y8': { type: 'trial', days: 7 },
  'TRY7-4QSF-582V': { type: 'trial', days: 7 },
  'TRY7-I3XX-IELD': { type: 'trial', days: 7 },
  'TRY7-OSY5-021U': { type: 'trial', days: 7 },
  'TRY7-O3P0-HY5T': { type: 'trial', days: 7 },
  'TRY7-XQFN-BVMA': { type: 'trial', days: 7 },
  'TRY7-WXK6-6WTF': { type: 'trial', days: 7 },
  'TRY7-ENB7-H217': { type: 'trial', days: 7 },
  'TRY7-KZL5-2GX5': { type: 'trial', days: 7 },
  'TRY7-Z0AV-U86E': { type: 'trial', days: 7 },
  'TRY7-OV9F-EISA': { type: 'trial', days: 7 },
  'TRY7-RQX2-8LQJ': { type: 'trial', days: 7 },
  'TRY7-XCY5-VBZN': { type: 'trial', days: 7 },
  'TRY7-KUN2-PO98': { type: 'trial', days: 7 },
  'TRY7-92E7-0S00': { type: 'trial', days: 7 },
  'TRY7-V92C-9BIA': { type: 'trial', days: 7 },
  'TRY7-IL8M-KGV6': { type: 'trial', days: 7 },
  'TRY7-X8G4-FLQO': { type: 'trial', days: 7 },
  'TRY7-PPZB-VPZ0': { type: 'trial', days: 7 },
  'TRY7-NEL1-NGT1': { type: 'trial', days: 7 },
  'TRY7-BQ4K-QQHA': { type: 'trial', days: 7 },
  'TRY7-T8EN-EHM4': { type: 'trial', days: 7 },
  'TRY7-ALEO-HLTK': { type: 'trial', days: 7 },
  'TRY7-F8NO-8WT2': { type: 'trial', days: 7 },
  'TRY7-CQVF-ERQ7': { type: 'trial', days: 7 },
  'TRY7-EG8I-B4T3': { type: 'trial', days: 7 },
  'TRY7-JGSC-ZLRJ': { type: 'trial', days: 7 },
  'VIP30-SNAK-33WW': { type: 'vip', days: 30 },
  'VIP30-8PC1-54RO': { type: 'vip', days: 30 },
  'VIP30-GJHU-YHDA': { type: 'vip', days: 30 },
  'VIP30-HME1-RVRZ': { type: 'vip', days: 30 },
  'VIP30-N0EN-6EAV': { type: 'vip', days: 30 },
  'VIP30-QMSJ-DIWR': { type: 'vip', days: 30 },
  'VIP30-XQTY-3VA5': { type: 'vip', days: 30 },
  'VIP30-77UC-JOAA': { type: 'vip', days: 30 },
  'VIP30-VCGU-PHDE': { type: 'vip', days: 30 },
  'VIP30-9C2I-2712': { type: 'vip', days: 30 },
  'VIP30-4I93-Z6O3': { type: 'vip', days: 30 },
  'VIP30-9EHJ-V4CR': { type: 'vip', days: 30 },
  'VIP30-RX9X-2OVP': { type: 'vip', days: 30 },
  'VIP30-H3MY-J358': { type: 'vip', days: 30 },
  'VIP30-BN5R-A2YR': { type: 'vip', days: 30 },
  'VIP30-PQBJ-BOUU': { type: 'vip', days: 30 },
  'VIP30-FBHD-RZA7': { type: 'vip', days: 30 },
  'VIP30-81KI-SU8W': { type: 'vip', days: 30 },
  'VIP30-5LFU-ZAD4': { type: 'vip', days: 30 },
  'VIP30-UT3R-NDJW': { type: 'vip', days: 30 },
  'VIP30-E4ZW-I96M': { type: 'vip', days: 30 },
  'VIP30-ZBZP-WA2A': { type: 'vip', days: 30 },
  'VIP30-Q1QP-7M3B': { type: 'vip', days: 30 },
  'VIP30-8J4H-LGLV': { type: 'vip', days: 30 },
  'VIP30-7YH8-6VM3': { type: 'vip', days: 30 },
  'VIP30-KAVJ-76HC': { type: 'vip', days: 30 },
  'VIP30-IKJV-KVQJ': { type: 'vip', days: 30 },
  'VIP30-0GE1-BBPE': { type: 'vip', days: 30 },
  'VIP30-0XZ0-WTCH': { type: 'vip', days: 30 },
  'VIP30-IZ7L-IRE8': { type: 'vip', days: 30 },
  'VIP30-KPW0-ILNT': { type: 'vip', days: 30 },
  'VIP30-OBOM-V121': { type: 'vip', days: 30 },
  'VIP30-2VD1-6N0B': { type: 'vip', days: 30 },
  'VIP30-YE1D-RDTA': { type: 'vip', days: 30 },
  'VIP30-D8NW-FMD7': { type: 'vip', days: 30 },
  'VIP30-N396-2RKW': { type: 'vip', days: 30 },
  'VIP30-L6K5-6NSD': { type: 'vip', days: 30 },
  'VIP30-4AMV-B0AK': { type: 'vip', days: 30 },
  'VIP30-UBLB-8XEL': { type: 'vip', days: 30 },
  'VIP30-3922-AN1A': { type: 'vip', days: 30 },
  'VIP30-5I44-FSWW': { type: 'vip', days: 30 },
  'VIP30-UMFE-8YTC': { type: 'vip', days: 30 },
  'VIP30-2KUS-GUBH': { type: 'vip', days: 30 },
  'VIP30-KWBY-B2CR': { type: 'vip', days: 30 },
  'VIP30-6FVK-BAJ3': { type: 'vip', days: 30 },
  'VIP30-HOXZ-4SFL': { type: 'vip', days: 30 },
  'VIP30-L1M6-VZ1L': { type: 'vip', days: 30 },
  'VIP30-E8I7-U9AG': { type: 'vip', days: 30 },
  'VIP30-NL0Z-CZEE': { type: 'vip', days: 30 },
  'VIP30-0AYL-OISK': { type: 'vip', days: 30 },// 1天卡（日卡）激活码
  'TRY1-19I6-9VI5': { type: 'trial', days: 1 },
  'TRY1-O42F-VUGQ': { type: 'trial', days: 1 },
  'TRY1-BXK1-1XVY': { type: 'trial', days: 1 },
  'TRY1-SYXO-MECT': { type: 'trial', days: 1 },
  'TRY1-X80Y-XSPS': { type: 'trial', days: 1 },
  'TRY1-YLZP-HGX8': { type: 'trial', days: 1 },
  'TRY1-N3G3-OUR9': { type: 'trial', days: 1 },
  'TRY1-56K8-SY2W': { type: 'trial', days: 1 },
  'TRY1-HHVB-6DDZ': { type: 'trial', days: 1 },
  'TRY1-5ANT-P7LC': { type: 'trial', days: 1 },
  'TRY1-MXZ7-ONNN': { type: 'trial', days: 1 },
  'TRY1-YHYV-BEPT': { type: 'trial', days: 1 },
  'TRY1-LX49-OA4J': { type: 'trial', days: 1 },
  'TRY1-HVI1-YCM6': { type: 'trial', days: 1 },
  'TRY1-H8OH-804G': { type: 'trial', days: 1 },
  'TRY1-N3C5-GXE5': { type: 'trial', days: 1 },
  'TRY1-HYJT-HJGD': { type: 'trial', days: 1 },
  'TRY1-J0TM-32P0': { type: 'trial', days: 1 },
  'TRY1-AFAB-BK0L': { type: 'trial', days: 1 },
  'TRY1-Y4QA-JGRD': { type: 'trial', days: 1 },
  'TRY1-3CGW-JDYW': { type: 'trial', days: 1 },
  'TRY1-N9W0-7D9X': { type: 'trial', days: 1 },
  'TRY1-9OLD-5V41': { type: 'trial', days: 1 },
  'TRY1-3BOP-H8UD': { type: 'trial', days: 1 },
  'TRY1-1V88-97DC': { type: 'trial', days: 1 },
  'TRY1-1FTE-BOKH': { type: 'trial', days: 1 },
  'TRY1-533M-X07X': { type: 'trial', days: 1 },
  'TRY1-OHFU-EKIM': { type: 'trial', days: 1 },
  'TRY1-RFWG-HIY8': { type: 'trial', days: 1 },
  'TRY1-4QR3-LHEJ': { type: 'trial', days: 1 },
  'TRY1-SJSK-SI8H': { type: 'trial', days: 1 },
  'TRY1-RNK2-4YU7': { type: 'trial', days: 1 },
  'TRY1-HOMG-QAM8': { type: 'trial', days: 1 },
  'TRY1-DLLY-4ECE': { type: 'trial', days: 1 },
  'TRY1-GE87-SKKV': { type: 'trial', days: 1 },
  'TRY1-LP6L-5A8P': { type: 'trial', days: 1 },
  'TRY1-IP78-C388': { type: 'trial', days: 1 },
  'TRY1-PJTB-V15B': { type: 'trial', days: 1 },
  'TRY1-0RCP-OOU7': { type: 'trial', days: 1 },
  'TRY1-O1WO-H3E3': { type: 'trial', days: 1 },
  'TRY1-S1NF-8G10': { type: 'trial', days: 1 },
  'TRY1-GQ61-QGNT': { type: 'trial', days: 1 },
  'TRY1-80IQ-LQ5H': { type: 'trial', days: 1 },
  'TRY1-KQT4-9YEY': { type: 'trial', days: 1 },
  'TRY1-KQXS-TPQL': { type: 'trial', days: 1 },
  'TRY1-PDBM-BSON': { type: 'trial', days: 1 },
  'TRY1-OPQ2-9A22': { type: 'trial', days: 1 },
  'TRY1-3IRF-1WPZ': { type: 'trial', days: 1 },
  'TRY1-QYUU-HG2A': { type: 'trial', days: 1 },
  'TRY1-61NC-0CG8': { type: 'trial', days: 1 },

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
let activationCache = {}; // 激活信息内存缓存（无KV时的备用）

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
  const data = JSON.stringify({
    code: codeInfo.code,
    type: codeInfo.type,
    days: codeInfo.days,
    activatedAt: Date.now(),
    expiresAt: Date.now() + codeInfo.days * 86400 * 1000
  });
  if (env.RATE_LIMIT_KV) {
    const key = `activation:${userId}`;
    const ttl = codeInfo.days * 86400 + 3600;
    await env.RATE_LIMIT_KV.put(key, data, { expirationTtl: ttl });
    return true;
  }
  // 无KV时：存入内存缓存（Worker实例生命周期内有效）
  activationCache[`activation:${userId}`] = data;
  return true;
}

async function getActivation(env, userId) {
  if (env.RATE_LIMIT_KV) {
    const data = await env.RATE_LIMIT_KV.get(`activation:${userId}`);
    return data ? JSON.parse(data) : null;
  }
  // 无KV时：从内存缓存读取
  const data = activationCache[`activation:${userId}`];
  return data ? JSON.parse(data) : null;
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

        // 限流检查（所有用户都限流，不验激活码）
        if (userId) {
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

      // ===== 接口5: 用户行为追踪 =====
      if (path === '/track') {
        if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

        let body;
        try {
          body = await request.json();
        } catch(e) {
          return json({ error: 'Invalid request body' }, 400);
        }

        const { activationCode, eventType, eventData, timestamp } = body;

        if (!activationCode || !eventType) {
          return json({ error: 'Missing required fields' }, 400);
        }

        // 存储追踪数据到 KV
        const trackKey = `track:${activationCode}:${Date.now()}`;
        const trackData = {
          activationCode,
          eventType, // page_view, feature_use, chat_start, session_start, session_end
          eventData: eventData || {},
          timestamp: timestamp || Date.now(),
          userAgent: request.headers.get('User-Agent'),
          ip: request.headers.get('CF-Connecting-IP') || 'unknown'
        };

        try {
          await env.RATE_LIMIT_KV.put(trackKey, JSON.stringify(trackData), { expirationTtl: 7776000 }); // 90天过期

          // 更新激活码使用统计
          const statsKey = `stats:${activationCode}`;
          let stats = await env.RATE_LIMIT_KV.get(statsKey, 'json') || {
            activationCode,
            firstUsed: null,
            lastUsed: null,
            totalSessions: 0,
            totalChats: 0,
            featureUsage: {},
            pageViews: {},
            totalDuration: 0
          };

          // 更新统计
          if (!stats.firstUsed) stats.firstUsed = timestamp || Date.now();
          stats.lastUsed = timestamp || Date.now();

          if (eventType === 'session_start') stats.totalSessions++;
          if (eventType === 'chat_start') stats.totalChats++;
          if (eventType === 'feature_use' && eventData.featureId) {
            stats.featureUsage[eventData.featureId] = (stats.featureUsage[eventData.featureId] || 0) + 1;
          }
          if (eventType === 'page_view' && eventData.page) {
            stats.pageViews[eventData.page] = (stats.pageViews[eventData.page] || 0) + 1;
          }
          if (eventType === 'session_end' && eventData.duration) {
            stats.totalDuration += eventData.duration;
          }

          await env.RATE_LIMIT_KV.put(statsKey, JSON.stringify(stats), { expirationTtl: 7776000 });

          return json({ success: true });
        } catch(e) {
          console.error('[追踪错误]', e.message);
          return json({ error: 'Failed to save tracking data' }, 500);
        }
      }

      // ===== 接口6: 管理员查询统计（简单密码保护）=====
      if (path === '/admin/stats') {
        if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

        let body;
        try {
          body = await request.json();
        } catch(e) {
          return json({ error: 'Invalid request body' }, 400);
        }

        // 简单密码保护（建议改为更安全的认证方式）
        if (body.adminPassword !== 'xiaoguan2024') {
          return json({ error: 'Unauthorized' }, 401);
        }

        try {
          // 获取所有激活码的统计
          const { keys } = await env.RATE_LIMIT_KV.list({ prefix: 'stats:' });
          const allStats = [];

          for (const key of keys) {
            const stats = await env.RATE_LIMIT_KV.get(key.name, 'json');
            if (stats) allStats.push(stats);
          }

          // 获取所有追踪事件（最近1000条）
          const { keys: trackKeys } = await env.RATE_LIMIT_KV.list({ prefix: 'track:', limit: 1000 });
          const recentTracks = [];
          for (const key of trackKeys.slice(0, 100)) {
            const track = await env.RATE_LIMIT_KV.get(key.name, 'json');
            if (track) recentTracks.push(track);
          }

          return json({
            success: true,
            totalUsers: allStats.length,
            allStats,
            recentTracks: recentTracks.slice(0, 100)
          });
        } catch(e) {
          console.error('[统计查询错误]', e.message);
          return json({ error: 'Failed to retrieve stats' }, 500);
        }
      }

      // 未匹配路由
      return json({ error: 'Not Found', availableEndpoints: ['/verify', '/check-status', '/chat', '/quota', '/track', '/admin/stats', '/health'] }, 404);

    } catch (error) {
      console.error('[Worker 错误]', error.stack || error.message);
      return json({ error: 'Internal Server Error' }, 500);
    }
  }
};
