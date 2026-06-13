// ===== API 代理客户端 v2.0 =====
// 所有 AI 调用都通过 Cloudflare Worker 后端转发

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

// ===== 激活码验证 =====
async function verifyActivationCode(code) {
  try {
    const res = await fetch(`${WORKER_URL}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim(), deviceId: getDeviceId() })
    });
    const data = await res.json();

    // ★★★ 激活成功后立即触发追踪事件 ★★★
    if (data.valid) {
      // 延迟发送追踪，确保不阻塞激活流程
      setTimeout(() => {
        trackEvent('activation_success', {
          code: code.trim().toUpperCase(),
          type: data.type,
          days: data.days,
          deviceCount: data.deviceCount || 1,
          hasWarning: !!data.warning
        });
      }, 100);
    }

    return data;
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

// ===== AI 对话代理 =====
async function proxyChat(messages, model) {
  try {
    const res = await fetch(`${WORKER_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, model, userId: getDeviceId() })
    });

    const data = await res.json();

    if (!res.ok) {
      if (data.error === 'ACTIVATION_EXPIRED') throw new Error('⚠️ 您的激活码已过期，请重新激活！');
      if (data.error === 'RATE_LIMITED') throw new Error(`⚠️ ${data.message}`);
      throw new Error(data.message || data.error || 'AI服务异常');
    }

    return data;
  } catch(e) {
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

// ===== 用户行为追踪（增强版）=====
async function trackEvent(eventType, eventData = {}) {
  try {
    const activation = JSON.parse(localStorage.getItem('ai_sales_activation') || '{}');
    const activationCode = activation.code || '';

    // 放宽条件：未激活时也可以发部分基础事件
    const publicEvents = ['session_start', 'session_end', 'app_open', 'page_view'];
    if (!activation.isValid && !publicEvents.includes(eventType)) return;

    await fetch(`${WORKER_URL}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activationCode: activationCode || undefined,
        eventType,
        eventData,
        deviceId: getDeviceId(),
        timestamp: Date.now()
      })
    });
  } catch(e) {
    // 静默失败，不影响用户体验
    console.debug('[追踪]', e.message);
  }
}

// 导出给其他模块使用
window.AiApiProxy = {
  WORKER_URL,
  getDeviceId,
  verifyActivationCode,
  checkActivationStatus,
  proxyChat,
  queryQuota,
  trackEvent
};
