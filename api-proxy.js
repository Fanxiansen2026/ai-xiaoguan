// ===== API 代理客户端 =====
// 所有 AI 调用都通过 Cloudflare Worker 后端转发
// 真实 API Key 永远不暴露在前端

// Worker 后端地址（部署后替换为真实地址）
const WORKER_URL = 'https://api.54xiaoguan.cn';

// 用户唯一标识（基于设备指纹）
function getDeviceId() {
  let did = localStorage.getItem('ai_xg_device_id');
  if (!did) {
    did = 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
    localStorage.setItem('ai_xg_device_id', did);
  }
  return did;
}

// ===== 激活码验证（调用后端）=====
async function verifyActivationCode(code) {
  try {
    const res = await fetch(`${WORKER_URL}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim(), deviceId: getDeviceId() })
    });
    return await res.json();
  } catch(e) {
    console.error('[激活验证失败]', e);
    return { valid: false, message: '网络错误，请检查连接' };
  }
}

// ===== 检查激活状态 =====
async function checkActivationStatus() {
  try {
    const res = await fetch(`${WORKER_URL}/check-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: getDeviceId() })
    });
    return await res.json();
  } catch(e) {
    return { isValid: false };
  }
}

// ===== AI 对话代理（替代直接调阿里云）=====
async function proxyChat(messages, model) {
  try {
    const res = await fetch(`${WORKER_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        model,
        userId: getDeviceId()
      })
    });

    const data = await res.json();

    if (!res.ok) {
      // 特殊错误码处理
      if (data.error === 'ACTIVATION_EXPIRED') throw new Error('⚠️ 您的激活码已过期，请重新激活！');
      if (data.error === 'RATE_LIMITED') throw new Error(`⚠️ ${data.message}`);
      throw new Error(data.message || data.error || 'AI服务异常');
    }

    return data;
  } catch(e) {
    // 如果是业务错误，重新抛出
    if (e.message && e.message.startsWith('⚠️')) throw e;
    throw new Error('网络请求失败，请检查网络或联系客服');
  }
}

// ===== 查询剩余配额 =====
async function queryQuota() {
  try {
    const res = await fetch(`${WORKER_URL}/quota`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: getDeviceId() })
    });
    return await res.json();
  } catch(e) {
    return { used: '?', limit: 200, remaining: '?' };
  }
}

// ===== 用户行为追踪 =====
async function trackEvent(eventType, eventData = {}) {
  try {
    const activation = JSON.parse(localStorage.getItem('ai_sales_activation') || '{}');
    const activationCode = activation.code || 'unknown';

    // 只在已激活时追踪
    if (!activation.isValid) return;

    await fetch(`${WORKER_URL}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activationCode,
        eventType,
        eventData,
        timestamp: Date.now()
      })
    });
  } catch(e) {
    console.error('[追踪失败]', e.message);
  }
}

// 导出给其他模块使用
window.AiApiProxy = {
  WORKER_URL,           // 方便外部修改地址
  getDeviceId,
  verifyActivationCode,
  checkActivationStatus,
  proxyChat,
  queryQuota,
  trackEvent
};
