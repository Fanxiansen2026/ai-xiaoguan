// ============================================================
//  AI销冠大脑 - Cloudflare Workers 后端服务 v2.1
//  功能：激活码验证 + API代理 + 用户限流 + 行为追踪 + 码管理 + 配置管理
// ============================================================

// ===== 配置区 =====
const DASHSCOPE_API_KEY = 'sk-c0a3c435fbf4446c9ef9201fa319094d';
const DAILY_CALL_LIMIT = 200;
const ADMIN_PASSWORD = 'xiaoguan2024';

// 激活码列表（150个）
const ACTIVATION_CODES = {
  // === 管理员测试码 ===
  '88888888': { type: 'admin', days: 36500, label: '管理员测试码' },

  // === 7日试用卡 (50个) ===
  'TRY7-E47F-A8A6': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-7L36-T7DD': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-OC9Y-NRPE': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-UQ36-FS9N': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-SGNU-V3IS': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-PUP4-84SY': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-HO9V-W01I': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-SHTU-3G6H': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-ZNMT-OZQY': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-POG6-XFTZ': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-FOSM-TPSG': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-47M1-30GL': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-IN48-CBMA': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-F8OZ-VFZL': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-4DXT-28TK': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-2KUY-4OX5': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-HV8Z-R38D': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-UCGS-UHKQ': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-AFNY-WK3R': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-GWT4-3H4Y': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-22BW-BEIK': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-G0QN-RDV0': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-ECOS-1LQI': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-K6X9-S0Y8': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-4QSF-582V': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-I3XX-IELD': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-OSY5-021U': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-O3P0-HY5T': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-XQFN-BVMA': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-WXK6-6WTF': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-ENB7-H217': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-KZL5-2GX5': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-Z0AV-U86E': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-OV9F-EISA': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-RQX2-8LQJ': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-XCY5-VBZN': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-KUN2-PO98': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-92E7-0S00': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-V92C-9BIA': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-IL8M-KGV6': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-X8G4-FLQO': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-PPZB-VPZ0': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-NEL1-NGT1': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-BQ4K-QQHA': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-T8EN-EHM4': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-ALEO-HLTK': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-F8NO-8WT2': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-CQVF-ERQ7': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-EG8I-B4T3': { type: 'trial7', days: 7, label: '7日体验卡' },
  'TRY7-JGSC-ZLRJ': { type: 'trial7', days: 7, label: '7日体验卡' },

  // === 月卡 VIP30 (50个) ===
  'VIP30-SNAK-33WW': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-8PC1-54RO': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-GJHU-YHDA': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-HME1-RVRZ': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-N0EN-6EAV': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-QMSJ-DIWR': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-XQTY-3VA5': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-77UC-JOAA': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-VCGU-PHDE': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-9C2I-2712': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-4I93-Z6O3': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-9EHJ-V4CR': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-RX9X-2OVP': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-H3MY-J358': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-BN5R-A2YR': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-PQBJ-BOUU': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-FBHD-RZA7': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-81KI-SU8W': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-5LFU-ZAD4': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-UT3R-NDJW': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-E4ZW-I96M': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-ZBZP-WA2A': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-Q1QP-7M3B': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-8J4H-LGLV': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-7YH8-6VM3': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-KAVJ-76HC': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-IKJV-KVQJ': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-0GE1-BBPE': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-0XZ0-WTCH': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-IZ7L-IRE8': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-KPW0-ILNT': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-OBOM-V121': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-2VD1-6N0B': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-YE1D-RDTA': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-D8NW-FMD7': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-N396-2RKW': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-L6K5-6NSD': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-4AMV-B0AK': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-UBLB-8XEL': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-3922-AN1A': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-5I44-FSWW': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-UMFE-8YTC': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-2KUS-GUBH': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-KWBY-B2CR': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-6FVK-BAJ3': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-HOXZ-4SFL': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-L1M6-VZ1L': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-E8I7-U9AG': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-NL0Z-CZEE': { type: 'vip30', days: 30, label: '月卡VIP' },
  'VIP30-0AYL-OISK': { type: 'vip30', days: 30, label: '月卡VIP' },

  // === 日卡 TRY1 (50个) ===
  'TRY1-19I6-9VI5': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-O42F-VUGQ': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-BXK1-1XVY': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-SYXO-MECT': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-X80Y-XSPS': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-YLZP-HGX8': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-N3G3-OUR9': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-56K8-SY2W': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-HHVB-6DDZ': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-5ANT-P7LC': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-MXZ7-ONNN': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-YHYV-BEPT': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-LX49-OA4J': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-HVI1-YCM6': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-H8OH-804G': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-N3C5-GXE5': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-HYJT-HJGD': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-J0TM-32P0': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-AFAB-BK0L': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-Y4QA-JGRD': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-3CGW-JDYW': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-N9W0-7D9X': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-9OLD-5V41': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-3BOP-H8UD': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-1V88-97DC': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-1FTE-BOKH': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-533M-X07X': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-OHFU-EKIM': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-RFWG-HIY8': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-4QR3-LHEJ': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-SJSK-SI8H': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-RNK2-4YU7': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-HOMG-QAM8': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-DLLY-4ECE': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-GE87-SKKV': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-LP6L-5A8P': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-IP78-C388': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-PJTB-V15B': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-0RCP-OOU7': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-O1WO-H3E3': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-S1NF-8G10': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-GQ61-QGNT': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-80IQ-LQ5H': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-KQT4-9YEY': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-KQXS-TPQL': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-PDBM-BSON': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-OPQ2-9A22': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-3IRF-1WPZ': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-QYUU-HG2A': { type: 'trial1', days: 1, label: '日卡体验' },
  'TRY1-61NC-0CG8': { type: 'trial1', days: 1, label: '日卡体验' },
};

// ===== 工具函数 =====
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

// ===== KV 存储操作 =====
let rateLimitCache = {};

async function getKV(env, key) {
  if (!env.RATE_LIMIT_KV) return null;
  const data = await env.RATE_LIMIT_KV.get(key);
  return data ? JSON.parse(data) : null;
}

async function setKV(env, key, value, ttl = null) {
  if (!env.RATE_LIMIT_KV) return;
  const opts = ttl ? { expirationTtl: ttl } : {};
  await env.RATE_LIMIT_KV.put(key, JSON.stringify(value), opts);
}

async function getCallCount(env, userId) {
  if (env.RATE_LIMIT_KV) {
    const data = await env.RATE_LIMIT_KV.get(`calls:${userId}:${getTodayKey()}`);
    return data ? parseInt(data, 10) : 0;
  }
  return rateLimitCache[`calls:${userId}:${getTodayKey()}`] || 0;
}

async function incrementCallCount(env, userId) {
  if (env.RATE_LIMIT_KV) {
    const key = `calls:${userId}:${getTodayKey()}`;
    const current = await env.RATE_LIMIT_KV.get(key);
    const count = (current ? parseInt(current, 10) : 0) + 1;
    await env.RATE_LIMIT_KV.put(key, String(count), { expirationTtl: 86400 });
    return count;
  }
  const key = `calls:${userId}:${getTodayKey()}`;
  rateLimitCache[key] = (rateLimitCache[key] || 0) + 1;
  return rateLimitCache[key];
}

// 获取或创建激活码的绑定信息
async function getCodeBinding(env, code) {
  return await getKV(env, `code:${code}`);
}

// 保存/更新激活码绑定信息（支持多设备）
async function saveCodeBinding(env, code, deviceId, info) {
  let binding = await getCodeBinding(env, code);
  const now = Date.now();
  const codeInfo = ACTIVATION_CODES[code];

  if (!binding) {
    // 首次绑定
    binding = {
      code,
      type: codeInfo?.type || 'unknown',
      label: codeInfo?.label || '未知',
      days: codeInfo?.days || 0,
      createdAt: now,
      devices: {},
      totalActivations: 0
    };
  }

  // 记录当前设备
  const existingDeviceIds = Object.keys(binding.devices);

        if (!binding.devices[deviceId]) {
          // 新设备首次绑定此码
          binding.devices[deviceId] = {
            firstActivatedAt: now,
            lastActiveAt: now,
            userAgent: info.userAgent || '',
            ip: info.ip || '',
            sessions: 1,
            chats: 0,
            featureUsage: {},
            pageViews: {},
            totalDuration: 0,
            totalTokens: 0  // ★ 新增：Token 消耗统计
          };
    binding.totalActivations++;
  } else {
    // 已知设备重新激活/使用
    binding.devices[deviceId].lastActiveAt = now;
    binding.devices[deviceId].sessions++;
  }

  binding.lastActivityAt = now;

  // 保存到KV（有效期=码的有效期+30天缓冲）
  const ttl = (codeInfo?.days || 30) * 86400 + 2592000; // 有效期+30天
  await setKV(env, `code:${code}`, binding, ttl);

  return { binding, isNewDevice: !existingDeviceIds.includes(deviceId), deviceCount: Object.keys(binding.devices).length };
}

// 更新设备的使用统计数据
async function updateDeviceStats(env, code, deviceId, eventType, eventData) {
  const binding = await getCodeBinding(env, code);
  if (!binding || !binding.devices[deviceId]) return;

  const device = binding.devices[deviceId];
  device.lastActiveAt = Date.now();

  if (eventType === 'chat_start') device.chats++;
  if (eventType === 'session_start') device.sessions++;
  if (eventType === 'feature_use' && eventData.featureId) {
    device.featureUsage[eventData.featureId] = (device.featureUsage[eventData.featureId] || 0) + 1;
  }
  if (eventType === 'page_view' && eventData.page) {
    device.pageViews[eventData.page] = (device.pageViews[eventData.page] || 0) + 1;
  }
  if (eventType === 'session_end' && eventData.duration) {
    device.totalDuration += eventData.duration;
  }
  // ★ 记录 token 消耗
  if (eventType === 'token_usage' && eventData.totalTokens) {
    device.totalTokens = (device.totalTokens || 0) + eventData.totalTokens;
  }

  binding.lastActivityAt = Date.now();
  await setKV(env, `code:${code}`, binding);
}

// ===== 主路由 =====
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const userAgent = request.headers.get('User-Agent') || '';

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
        return json({ status: 'ok', time: Date.now(), version: '2.1', totalCodes: Object.keys(ACTIVATION_CODES).length });
      }

      // ========== 接口1: 激活码验证（核心改造） ==========
      if (path === '/verify') {
        if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

        let body;
        try { body = await request.json(); } catch(e) {
          return json({ valid: false, message: '无效请求数据' });
        }

        const code = (body.code || '').trim().toUpperCase();
        const deviceId = (body.deviceId || '').trim() || `anon-${Date.now()}`;

        if (!code) return json({ valid: false, message: '请输入激活码' });

        // 查找激活码
        const codeInfo = ACTIVATION_CODES[code];
        if (!codeInfo) {
          return json({ valid: false, message: '激活码不存在或已失效' });
        }

        // ★★★ 核心改动：记录激活并检查多设备绑定 ★★★
        const now = Date.now();
        
        // 管理员测试码：跳过设备绑定，直接返回成功
        if (code === '88888888') {
          const userActivation = {
            code, type: 'admin', days: 36500, label: '管理员测试码',
            activatedAt: now, expiresAt: now + 36500 * 86400 * 1000,
            deviceId
          };
          await setKV(env, `activation:${deviceId}`, userActivation, 36500 * 86400);
          console.log(`[激活] 管理员测试码激活，设备=${deviceId}`);
          return json({
            valid: true, type: 'admin', days: 36500, label: '管理员测试码',
            expiresAt: now + 36500 * 86400 * 1000,
            message: '管理员测试码激活成功！有效期 100年',
            deviceCount: 1
          });
        }
        
        const { binding, isNewDevice, deviceCount } = await saveCodeBinding(env, code, deviceId, { ip: clientIP, userAgent });

        // 同时保存用户的激活状态（供 check-status 使用）
        const userActivation = {
          code, type: codeInfo.type, days: codeInfo.days, label: codeInfo.label,
          activatedAt: now, expiresAt: now + codeInfo.days * 86400 * 1000,
          deviceId
        };
        await setKV(env, `activation:${deviceId}`, userActivation, codeInfo.days * 86400 + 3600);

        // 构造返回结果
        const result = {
          valid: true,
          type: codeInfo.type,
          days: codeInfo.days,
          label: codeInfo.label,
          expiresAt: now + codeInfo.days * 86400 * 1000,
          message: `${codeInfo.label}激活成功！有效期 ${codeInfo.days} 天`,
          deviceCount: deviceCount
        };

        // 如果同一码被多个设备使用，发出警告
        if (deviceCount > 1 && !isNewDevice) {
          result.warning = `⚠️ 此激活码已被 ${deviceCount} 个设备使用。如非本人操作，请联系客服。`;
        } else if (isNewDevice && deviceCount > 1) {
          result.warning = `⚠️ 此激活码已被其他设备绑定过，这是第 ${deviceCount} 个设备。`;
        }

        console.log(`[激活] 码=${code}, 设备=${deviceId}, 设备数=${deviceCount}, 类型=${codeInfo.type}`);

        return json(result);
      }

      // ========== 接口2: 检查激活状态 ==========
      if (path === '/check-status') {
        if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

        let body;
        try { body = await request.json(); } catch(e) { return json({ isValid: false }); }

        const deviceId = (body.deviceId || '').trim();
        if (!deviceId) return json({ isValid: false });

        const activation = await getKV(env, `activation:${deviceId}`);
        if (!activation) return json({ isValid: false });

        if (Date.now() > activation.expiresAt) {
          return json({ isValid: false, reason: 'expired', message: '激活已过期' });
        }

        return json({
          isValid: true,
          type: activation.type,
          days: activation.days,
          label: activation.label,
          code: activation.code,
          remainingDays: Math.ceil((activation.expiresAt - Date.now()) / 86400000)
        });
      }

      // ========== 接口3: AI 对话代理 ==========
      if (path === '/chat') {
        if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

        let body;
        try { body = await request.json(); } catch(e) { return json({ error: 'Invalid request body' }, 400); }

        const { messages, model, userId } = body;
        if (!messages || !Array.isArray(messages)) return json({ error: 'Missing messages parameter' }, 400);

        if (userId) {
          const callCount = await getCallCount(env, userId);
          if (callCount >= DAILY_CALL_LIMIT) {
            return json({ error: 'RATE_LIMITED', message: `今日调用次数已达上限(${DAILY_CALL_LIMIT}次)，明天继续使用` }, 429);
          }
          await incrementCallCount(env, userId);

          // 自动记录对话追踪
          const userActivation = await getKV(env, `activation:${userId}`);
          if (userActivation && userActivation.code) {
            await updateDeviceStats(env, userActivation.code, userId, 'chat_start', {});
          }
        }

        console.log(`[API代理] 用户=${userId || 'unknown'}, 模型=${model || 'qwen-plus'}`);

        const startTime = Date.now();
        const dashscopeRes = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DASHSCOPE_API_KEY}`
          },
          body: JSON.stringify({
            model: model || 'qwen-plus',
            messages: messages.map(m => ({ role: m.role, content: m.content }))
          })
        });

        if (!dashscopeRes.ok) {
          const errText = await dashscopeRes.text();
          console.error(`[阿里云错误] ${dashscopeRes.status}: ${errText.slice(0, 200)}`);
          return json({ error: `API Error ${dashscopeRes.status}`, message: errText.slice(0, 500) }, 502);
        }

        const result = await dashscopeRes.json();
        
        // ★ 记录 token 消耗
        if (userId && result.usage?.total_tokens) {
          try {
            const userActivation = await getKV(env, `activation:${userId}`);
            if (userActivation && userActivation.code) {
              await updateDeviceStats(env, userActivation.code, userId, 'token_usage', {
                totalTokens: result.usage.total_tokens
              });
            }
          } catch(e) {
            console.error('[Token追踪错误]', e.message);
          }
        }
        
        return json(result);
      }

      // ========== 接口4: 查询剩余次数 ==========
      if (path === '/quota') {
        if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

        let body;
        try { body = await request.json(); } catch(e) { return json({ used: 0, limit: DAILY_CALL_LIMIT }); }

        const userId = (body.userId || '').trim();
        if (!userId) return json({ used: 0, limit: DAILY_CALL_LIMIT, remaining: DAILY_CALL_LIMIT });

        const used = await getCallCount(env, userId);
        return json({ used, limit: DAILY_CALL_LIMIT, remaining: Math.max(0, DAILY_CALL_LIMIT - used) });
      }

      // ========== 接口5: 用户行为追踪（增强版）==========
      if (path === '/track') {
        if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

        let body;
        try { body = await request.json(); } catch(e) { return json({ error: 'Invalid request body' }, 400); }

        const { activationCode, eventType, eventData, timestamp } = body;
        const deviceId = (body.deviceId || '').trim() || 'unknown';

        if (!eventType) return json({ error: 'Missing eventType' }, 400);

        try {
          // 写入原始事件日志
          const trackKey = `track:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
          await setKV(env, trackKey, {
            activationCode: activationCode || 'none',
            eventType, eventData: eventData || {},
            timestamp: timestamp || Date.now(),
            deviceId, userAgent, ip: clientIP
          }, 2592000); // 30天

          // 如果有激活码，更新设备统计
          if (activationCode && ACTIVATION_CODES[activationCode]) {
            await updateDeviceStats(env, activationCode, deviceId, eventType, eventData || {});
          }

          return json({ success: true });
        } catch(e) {
          console.error('[追踪错误]', e.message);
          return json({ error: 'Failed to save tracking data' }, 500);
        }
      }

      // ===== Whisper 语音识别代理（阿里云 Paraformer 兼容模式）=====
      if (path === '/whisper') {
        if (request.method !== 'POST') {
          return json({ error: 'Method Not Allowed' }, 405);
        }
        try {
          const formData = await request.formData();
          const audioFile = formData.get('audio');
          if (!audioFile) {
            return json({ error: 'No audio file' }, 400);
          }

          // 调用阿里云 Dashscope Paraformer API（兼容 OpenAI Whisper 格式）
          const whisperForm = new FormData();
          whisperForm.append('file', audioFile, 'audio.webm');
          whisperForm.append('model', 'whisper-1');
          whisperForm.append('language', 'zh');
          
          const resp = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${DASHSCOPE_API_KEY}` },
            body: whisperForm
          });
          
          const result = await resp.json();
          if (!resp.ok) {
            console.error(`[Whisper 失败] ${resp.status}: ${JSON.stringify(result).slice(0, 200)}`);
            return json({ error: result.error?.message || '语音识别失败', whisperError: true }, resp.status);
          }
          return json({ text: result.text });
        } catch(e) {
          console.error('[Whisper 异常]', e.message);
          return json({ error: e.message, whisperError: true }, 500);
        }
      }

      // ========== 接口6: 管理员 - 配置管理（Whisper Key 等）==========
      if (path === '/admin/config') {
        if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
        let body;
        try { body = await request.json(); } catch(e) { return json({ error: 'Invalid body' }, 400); }
        
        if (body.adminPassword !== ADMIN_PASSWORD) return json({ error: 'Unauthorized' }, 401);
        
        if (body.action === 'get') {
          const whisperKey = await getKV(env, 'config:whisper_key') || '';
          return json({ success: true, whisperKey });
        } else if (body.action === 'save') {
          if (body.whisperKey) {
            await setKV(env, 'config:whisper_key', body.whisperKey.trim());
          }
          return json({ success: true, message: '配置已保存' });
        }
      }

      // ========== 接口7: 管理员 - 激活码全量列表（新）==========
      if (path === '/admin/codes') {
        if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
        let body;
        try { body = await request.json(); } catch(e) { return json({ error: 'Invalid body' }, 400); }

        if (body.adminPassword !== ADMIN_PASSWORD) return json({ error: 'Unauthorized' }, 401);

        try {
          const allCodes = [];
          const now = Date.now();

          for (const [code, info] of Object.entries(ACTIVATION_CODES)) {
            const binding = await getCodeBinding(env, code);
            const deviceList = binding ? Object.entries(binding.devices) : [];

            // 判断状态
            let status = 'unused'; // unused | active | expired
            if (deviceList.length > 0) {
              const lastAct = binding.lastActivityAt || 0;
              const expiresAt = binding.createdAt + info.days * 86400 * 1000;
              if (now > expiresAt) status = 'expired';
              else status = 'active';
            }

            allCodes.push({
              code,
              type: info.type,
              label: info.label,
              days: info.days,
              status,
              totalActivations: binding?.totalActivations || 0,
              deviceCount: deviceList.length,
              createdAt: binding?.createdAt || null,
              lastActivityAt: binding?.lastActivityAt || null,
              devices: deviceList.map(([devId, dev]) => ({
                deviceId: devId,
                firstActivatedAt: dev.firstActivatedAt,
                lastActiveAt: dev.lastActiveAt,
                sessions: dev.sessions,
                chats: dev.chats,
                featureUsage: dev.featureUsage,
                totalDuration: Math.round((dev.totalDuration || 0) / 60), // 分钟
                ip: dev.ip,
                userAgentShort: dev.userAgent ? dev.userAgent.slice(0, 60) : ''
              }))
            });
          }

          // 统计概览
          const stats = {
            total: allCodes.length,
            unused: allCodes.filter(c => c.status === 'unused').length,
            active: allCodes.filter(c => c.status === 'active').length,
            expired: allCodes.filter(c => c.status === 'expired').length,
            totalDevices: allCodes.reduce((s, c) => s + c.deviceCount, 0),
            byType: {}
          };
          for (const c of allCodes) {
            stats.byType[c.type] = (stats.byType[c.type] || 0) + 1;
          }

          return json({ success: true, stats, codes: allCodes });

        } catch(e) {
          console.error('[码列表错误]', e.message);
          return json({ error: 'Failed to retrieve codes' }, 500);
        }
      }

      // ========== 接口7: 管理员 - 数据看板统计 ==========
      if (path === '/admin/stats') {
        if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
        let body;
        try { body = await request.json(); } catch(e) { return json({ error: 'Invalid body' }, 400); }

        if (body.adminPassword !== ADMIN_PASSWORD) return json({ error: 'Unauthorized' }, 401);

        try {
          const now = Date.now();

          // 遍历所有码的绑定数据来聚合统计
          const allBindings = [];
          for (const code of Object.keys(ACTIVATION_CODES)) {
            const b = await getCodeBinding(env, code);
            if (b) allBindings.push(b);
          }

          // 核心指标
          let totalSessions = 0, totalChats = 0, totalDuration = 0, totalTokensAll = 0;
          const featureUsageAll = {};
          const pageViewsAll = {};
          const dailyActive = {};
          const uniqueDevices = new Set();

          for (const binding of allBindings) {
            for (const [devId, dev] of Object.entries(binding.devices)) {
              uniqueDevices.add(devId);
              const sessions = dev.sessions || 0;
              const chats = dev.chats || 0;
              const duration = dev.totalDuration || 0;
              const tokens = dev.totalTokens || 0;

              totalSessions += sessions;
              totalChats += chats;
              totalDuration += duration;
              totalTokensAll += tokens;

              // 功能使用汇总
              if (dev.featureUsage) {
                for (const [fid, cnt] of Object.entries(dev.featureUsage)) {
                  featureUsageAll[fid] = (featureUsageAll[fid] || 0) + cnt;
                }
              }

              // 页面访问汇总
              if (dev.pageViews) {
                for (const [page, cnt] of Object.entries(dev.pageViews)) {
                  pageViewsAll[page] = (pageViewsAll[page] || 0) + cnt;
                }
              }

              // 每日活跃（按最后活跃时间）
              if (dev.lastActiveAt) {
                const dayKey = new Date(dev.lastActiveAt).toISOString().slice(0, 10);
                dailyActive[dayKey] = (dailyActive[dayKey] || 0) + 1;
              }
            }
          }

          // 最近7天趋势
          const last7Days = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date(now - i * 86400000).toISOString().slice(0, 10);
            last7Days.push({ date: d, activeUsers: dailyActive[d] || 0 });
          }

          // 功能排行
          const featureRanking = Object.entries(featureUsageAll)
            .sort((a, b) => b[1] - a[1])
            .map(([id, count]) => ({ id, count }));

          // 各码详情（用于表格展示）
          const codeDetails = [];
          for (const code of Object.keys(ACTIVATION_CODES)) {
            const binding = await getCodeBinding(env, code);
            if (!binding) continue;

            const deviceList = Object.entries(binding.devices);
            const codeTotalTokens = deviceList.reduce((s, [, d]) => s + (d.totalTokens || 0), 0);
            
            codeDetails.push({
              code,
              type: binding.type,
              label: binding.label,
              deviceCount: deviceList.length,
              totalSessions: deviceList.reduce((s, [, d]) => s + (d.sessions || 0), 0),
              totalChats: deviceList.reduce((s, [, d]) => s + (d.chats || 0), 0),
              totalDurationMin: Math.round(deviceList.reduce((s, [, d]) => s + (d.totalDuration || 0), 0) / 60),
              totalTokens: codeTotalTokens,
              firstUsed: binding.createdAt,
              lastUsed: binding.lastActivityAt,
              isExpired: now > binding.createdAt + (ACTIVATION_CODES[code]?.days || 30) * 86400 * 1000,
              devices: deviceList.map(([devId, dev]) => ({
                deviceId: devId,
                sessions: dev.sessions || 0,
                chats: dev.chats || 0,
                totalDurationMin: Math.round((dev.totalDuration || 0) / 60),
                totalTokens: dev.totalTokens || 0,
                lastActiveAt: dev.lastActiveAt
              }))
            });
          }

          return json({
            success: true,
            overview: {
              totalVisitors: uniqueDevices.size,
              todayNewVisitors: 0,
              totalActivations: allBindings.length,
              totalMessages: totalChats,
              totalTokens: totalTokensAll,
              totalSessions,
              totalDurationMin: Math.round(totalDuration / 60)
            },
            featureRanking,
            pageViews: pageViewsAll,
            dailyTrend: last7Days,
            codeDetails: codeDetails.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
          });

        } catch(e) {
          console.error('[统计错误]', e.message);
          return json({ error: 'Failed to retrieve stats' }, 500);
        }
      }

      // 未匹配路由
      return json({
        error: 'Not Found',
        availableEndpoints: ['/health', '/verify', '/check-status', '/chat', '/quota', '/track', '/whisper', '/admin/config', '/admin/codes', '/admin/stats']
      }, 404);

    } catch (error) {
      console.error('[Worker 错误]', error.stack || error.message);
      return json({ error: 'Internal Server Error' }, 500);
    }
  }
};
