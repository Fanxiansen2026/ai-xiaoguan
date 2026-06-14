// 解析 user-agent 获取设备型号
function parseDeviceInfo(userAgent) {
    let deviceModel = '未知设备';
    let os = '未知系统';
    
    if (!userAgent) return { deviceModel, os };
    
    // 解析操作系统
    if (userAgent.includes('iPhone')) {
        os = 'iOS';
        // 提取 iPhone 型号（简化版）
        const match = userAgent.match(/iPhone\s*OS\s*(\d+)/i);
        if (match) os = `iOS ${match[1]}`;
    } else if (userAgent.includes('Android')) {
        os = 'Android';
        // 提取 Android 版本
        const match = userAgent.match(/Android\s*([\d.]+)/i);
        if (match) os = `Android ${match[1]}`;
    } else if (userAgent.includes('Windows')) {
        os = 'Windows';
    } else if (userAgent.includes('Mac')) {
        os = 'macOS';
    } else if (userAgent.includes('Linux')) {
        os = 'Linux';
    }
    
    // 解析设备型号（简化版）
    if (userAgent.includes('iPhone')) {
        deviceModel = 'iPhone';
    } else if (userAgent.includes('iPad')) {
        deviceModel = 'iPad';
    } else if (userAgent.includes('Android')) {
        // 尝试提取 Android 设备型号
        const match = userAgent.match(/;\s*([^;)]+)\s*Build/i);
        if (match) {
            deviceModel = match[1].trim();
        } else {
            deviceModel = 'Android设备';
        }
    } else if (userAgent.includes('Windows')) {
        deviceModel = 'Windows PC';
    } else if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS')) {
        deviceModel = 'Mac';
    } else {
        deviceModel = '其他设备';
    }
    
    return { deviceModel, os, userAgentShort: userAgent.slice(0, 100) };
}
