// ===== 埋点系统 v2.0 - 完整行为漏斗 =====
// 产品经理视角：曝光→点击→进入→交互→转化→成功→价值→流失

const TRACKER = {
    config: {
        storageKey: 'ai_sales_tracker_v2',
        maxEvents: 1000,
        abandonThreshold: 15,      // 15秒内无操作视为流失
        minInputLength: 5,         // 至少输入5个字符才算"使用"
        backendUrl: typeof BACKEND_URL !== 'undefined' ? BACKEND_URL : null
    },
    
    // 会话状态
    session: {
        id: 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        startTime: Date.now(),
        deviceId: localStorage.getItem('ai_sales_device_id') || 'unknown',
        currentFeature: null,      // 当前功能ID
        featureEnterTime: 0,       // 进入功能的时间
        featureHasInput: false,    // 是否输入过内容
        featureHasGenerate: false, // 是否点击过生成
        featureHasCopy: false,     // 是否复制过结果
        featureInputLength: 0,     // 输入内容长度
        exposedFeatures: new Set() // 已曝光的功能（去重）
    },
    
    init() {
        this.track('page_open', {
            page: location.href,
            referrer: document.referrer || 'direct',
            screen: `${window.innerWidth}x${window.innerHeight}`,
            userAgent: navigator.userAgent.substring(0, 100)
        });
        
        this.bindClickTracking();
        this.bindInputTracking();
        this.bindExposureTracking();
        this.bindPageLifecycle();
        this.bindCopyTracking();
        
        // 定期上报
        if (this.config.backendUrl) {
            setInterval(() => this.report(), 30000);
        }
        
        console.log('[Tracker v2] 漏斗埋点已启动，Session:', this.session.id);
    },
    
    // ========== 核心追踪方法 ==========
    
    track(eventName, data = {}) {
        const event = {
            id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            sessionId: this.session.id,
            deviceId: this.session.deviceId,
            event: eventName,
            data: data,
            timestamp: Date.now(),
            date: new Date().toISOString().split('T')[0],
            hour: new Date().getHours(),
            minute: new Date().getMinutes()
        };
        
        let events = this.getEvents();
        if (events.length >= this.config.maxEvents) {
            events = events.slice(events.length - this.config.maxEvents + 1);
        }
        events.push(event);
        localStorage.setItem(this.config.storageKey, JSON.stringify(events));
        window.__trackerEvents = events;
        
        // 同步到核心埋点系统（确保数据看板能读取）
        if (typeof trackEvent === 'function') {
            trackEvent(eventName, data);
        }
        
        return event;
    },
    
    getEvents() {
        try { return JSON.parse(localStorage.getItem(this.config.storageKey) || '[]'); }
        catch (e) { return []; }
    },
    
    // ========== 功能生命周期追踪 ==========
    
    // 功能曝光（用户看到了功能卡片）
    trackFeatureExpose(featureId, featureName) {
        if (this.session.exposedFeatures.has(featureId)) return;
        this.session.exposedFeatures.add(featureId);
        this.track('feature_expose', { featureId, featureName });
    },
    
    // 功能点击
    trackFeatureClick(featureId, featureName) {
        this.track('feature_click', { featureId, featureName });
    },
    
    // 功能进入（开始计时）
    trackFeatureEnter(featureId, featureName) {
        // 如果之前有功能没退出，先退出
        if (this.session.currentFeature && this.session.currentFeature !== featureId) {
            this.trackFeatureExit();
        }
        
        this.session.currentFeature = featureId;
        this.session.featureEnterTime = Date.now();
        this.session.featureHasInput = false;
        this.session.featureHasGenerate = false;
        this.session.featureHasCopy = false;
        this.session.featureInputLength = 0;
        
        this.track('feature_enter', { featureId, featureName });
    },
    
    // 功能输入
    trackFeatureInput(featureId, inputLength) {
        if (!this.session.currentFeature) return;
        this.session.featureHasInput = true;
        this.session.featureInputLength = inputLength;
        // 不每条输入都记录，只记录首次和长度变化>50时
        if (inputLength > 0 && (inputLength <= 10 || inputLength % 50 === 0)) {
            this.track('feature_input', { featureId, inputLength });
        }
    },
    
    // 功能生成（点击生成按钮）
    trackFeatureGenerate(featureId, hasInput, hasFiles) {
        if (!this.session.currentFeature) return;
        this.session.featureHasGenerate = true;
        this.track('feature_generate', { featureId, hasInput, hasFiles });
    },
    
    // 功能成功（AI返回结果）
    trackFeatureSuccess(featureId, responseLength, duration) {
        if (!this.session.currentFeature) return;
        this.track('feature_success', { featureId, responseLength, duration });
    },
    
    // 功能失败（AI调用失败）
    trackFeatureError(featureId, errorType, errorMessage) {
        if (!this.session.currentFeature) return;
        this.track('feature_error', { featureId, errorType, errorMessage: errorMessage?.substring(0, 200) });
    },
    
    // 功能复制（用户复制了结果）
    trackFeatureCopy(featureId, contentType) {
        if (!this.session.currentFeature) return;
        this.session.featureHasCopy = true;
        this.track('feature_copy', { featureId, contentType });
    },
    
    // 功能退出（计算停留时长）
    trackFeatureExit() {
        const fid = this.session.currentFeature;
        if (!fid) return;
        
        const duration = Math.round((Date.now() - this.session.featureEnterTime) / 1000);
        const isAbandon = duration < this.config.abandonThreshold && !this.session.featureHasGenerate;
        
        this.track('feature_exit', {
            featureId: fid,
            duration,
            hasInput: this.session.featureHasInput,
            hasGenerate: this.session.featureHasGenerate,
            hasCopy: this.session.featureHasCopy,
            inputLength: this.session.featureInputLength,
            isAbandon          // 是否流失
        });
        
        // 如果流失，额外记录一条
        if (isAbandon) {
            this.track('feature_abandon', {
                featureId: fid,
                duration,
                reason: duration < 5 ? '秒退' : '未操作'
            });
        }
        
        this.session.currentFeature = null;
        this.session.featureEnterTime = 0;
    },
    
    // ========== 事件绑定 ==========
    
    bindClickTracking() {
        document.addEventListener('click', (e) => {
            const t = e.target;
            
            // 功能卡片点击
            if (t.closest('.feature-card')) {
                const id = t.closest('.feature-card').dataset.id;
                const name = this.getFeatureName(id);
                this.trackFeatureClick(id, name);
                this.trackFeatureEnter(id, name);
            }
            
            // 导航点击（进入功能）
            if (t.closest('.nav-item[data-page="workspace"]')) {
                const id = t.closest('.nav-item').dataset.id;
                const name = this.getFeatureName(id);
                this.trackFeatureEnter(id, name);
            }
            
            // 生成按钮
            if (t.id === 'btnGenerate' || t.closest('#btnGenerate')) {
                const fid = appState.currentFeatureId;
                const input = document.getElementById('mainInput');
                const hasInput = input && input.value.trim().length > 0;
                const hasFiles = appState.uploadedFiles && appState.uploadedFiles.length > 0;
                this.trackFeatureGenerate(fid, hasInput, hasFiles);
            }
            
            // 激活码相关
            if (t.id === 'btnActivate' || t.closest('#btnActivate')) {
                this.track('activation_attempt', {});
            }
            if (t.id === 'btnCloseActivation' || t.closest('#btnCloseActivation')) {
                this.track('activation_close', { featureId: appState.currentFeatureId });
            }
            
            // API Key相关
            if (t.id === 'apiKeyModal' || t.closest('#apiKeyModal')) {
                if (t.classList.contains('activation-modal') || t.id === 'apiKeyModal') {
                    this.track('apikey_modal_open', {});
                }
            }
            
            // 话术复制
            if (t.classList.contains('btn-copy-script') || t.closest('.script-item')) {
                this.trackFeatureCopy('scripts', 'script');
            }
            
            // 消息复制
            if (t.classList.contains('btn-copy-msg')) {
                this.trackFeatureCopy(appState.currentFeatureId, 'message');
            }
            
            // 清空聊天记录
            if (t.id === 'btnClearChat') {
                this.track('chat_clear', { featureId: appState.currentFeatureId });
            }
            
            // 返回首页/控制台 = 退出当前功能
            if (t.id === 'btnBack' || t.closest('[data-page="home"]') || t.id === 'btnStart') {
                this.trackFeatureExit();
            }
        });
    },
    
    bindInputTracking() {
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('form-control') || e.target.id === 'mainInput' || e.target.id === 'roleplayInput') {
                const fid = appState.currentFeatureId;
                if (fid) {
                    this.trackFeatureInput(fid, e.target.value.length);
                }
            }
        });
    },
    
    bindExposureTracking() {
        // 用 IntersectionObserver 追踪功能卡片是否进入视口
        if (typeof IntersectionObserver !== 'undefined') {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const card = entry.target;
                        const id = card.dataset.id;
                        const name = this.getFeatureName(id);
                        this.trackFeatureExpose(id, name);
                    }
                });
            }, { threshold: 0.5 });
            
            // 观察所有功能卡片
            setTimeout(() => {
                document.querySelectorAll('.feature-card').forEach(card => observer.observe(card));
            }, 1000);
        }
    },
    
    bindPageLifecycle() {
        // 页面关闭时记录
        window.addEventListener('beforeunload', () => {
            this.trackFeatureExit();
            this.track('page_close', {
                totalDuration: Math.round((Date.now() - this.session.startTime) / 1000)
            });
        });
        
        // 页面可见性变化（切换标签页）
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.trackFeatureExit();
            }
        });
    },
    
    bindCopyTracking() {
        // 监听复制事件（Ctrl+C 或右键复制）
        document.addEventListener('copy', (e) => {
            const selection = window.getSelection()?.toString();
            if (selection && selection.length > 10 && this.session.currentFeature) {
                this.trackFeatureCopy(this.session.currentFeature, 'selection');
            }
        });
    },
    
    // ========== 辅助方法 ==========
    
    getFeatureName(id) {
        const f = appState.features.find(x => x.id === id);
        return f ? f.name : id;
    },
    
    // 供外部调用：标记API调用成功
    markApiSuccess(featureId, responseLength, duration) {
        this.trackFeatureSuccess(featureId, responseLength, duration);
    },
    
    // 供外部调用：标记API调用失败
    markApiError(featureId, errorType, errorMessage) {
        this.trackFeatureError(featureId, errorType, errorMessage);
    },
    
    // 供外部调用：标记API Key保存
    markApiKeySave() {
        this.track('apikey_save', {});
    },
    
    // 供外部调用：标记激活成功
    markActivationSuccess(code, days) {
        this.track('activation_success', { code: code?.substring(0, 4) + '****', days });
    },
    
    // 供外部调用：标记激活失败
    markActivationFail(code, reason) {
        this.track('activation_fail', { code: code?.substring(0, 4) + '****', reason });
    },
    
    // ========== 数据导出与上报 ==========
    
    getEvents() {
        try { return JSON.parse(localStorage.getItem(this.config.storageKey) || '[]'); }
        catch (e) { return []; }
    },
    
    getSummary() {
        const events = this.getEvents();
        const today = new Date().toISOString().split('T')[0];
        
        // 基础统计
        const totalEvents = events.length;
        const todayEvents = events.filter(e => e.date === today).length;
        const sessions = [...new Set(events.map(e => e.sessionId))].length;
        
        // 功能漏斗
        const expose = events.filter(e => e.event === 'feature_expose');
        const click = events.filter(e => e.event === 'feature_click');
        const enter = events.filter(e => e.event === 'feature_enter');
        const generate = events.filter(e => e.event === 'feature_generate');
        const success = events.filter(e => e.event === 'feature_success');
        const copy = events.filter(e => e.event === 'feature_copy');
        const abandon = events.filter(e => e.event === 'feature_abandon');
        
        // 各功能转化率
        const featureStats = {};
        enter.forEach(e => {
            const id = e.data.featureId;
            if (!featureStats[id]) {
                featureStats[id] = { name: e.data.featureName || id, enter: 0, generate: 0, success: 0, copy: 0, abandon: 0, totalDuration: 0, avgDuration: 0 };
            }
            featureStats[id].enter++;
        });
        generate.forEach(e => {
            const id = e.data.featureId;
            if (featureStats[id]) featureStats[id].generate++;
        });
        success.forEach(e => {
            const id = e.data.featureId;
            if (featureStats[id]) featureStats[id].success++;
        });
        copy.forEach(e => {
            const id = e.data.featureId;
            if (featureStats[id]) featureStats[id].copy++;
        });
        abandon.forEach(e => {
            const id = e.data.featureId;
            if (featureStats[id]) featureStats[id].abandon++;
        });
        
        // 计算平均停留时长
        events.filter(e => e.event === 'feature_exit' && e.data.duration).forEach(e => {
            const id = e.data.featureId;
            if (featureStats[id]) {
                featureStats[id].totalDuration += e.data.duration;
                featureStats[id].avgDuration = Math.round(featureStats[id].totalDuration / featureStats[id].enter);
            }
        });
        
        // 转化率排序
        const featureList = Object.entries(featureStats).map(([id, s]) => ({
            id, ...s,
            generateRate: s.enter > 0 ? Math.round(s.generate / s.enter * 100) : 0,
            copyRate: s.enter > 0 ? Math.round(s.copy / s.enter * 100) : 0,
            abandonRate: s.enter > 0 ? Math.round(s.abandon / s.enter * 100) : 0
        })).sort((a, b) => b.enter - a.enter);
        
        // 激活相关
        const activationAttempts = events.filter(e => e.event === 'activation_attempt').length;
        const activationSuccess = events.filter(e => e.event === 'activation_success').length;
        const activationFail = events.filter(e => e.event === 'activation_fail').length;
        
        // API相关
        const apiErrors = events.filter(e => e.event === 'feature_error').length;
        const apiErrorTypes = {};
        events.filter(e => e.event === 'feature_error').forEach(e => {
            const type = e.data.errorType || 'unknown';
            apiErrorTypes[type] = (apiErrorTypes[type] || 0) + 1;
        });
        
        // 时段分布
        const hourDist = {};
        for (let i = 0; i < 24; i++) hourDist[i] = 0;
        events.forEach(e => { hourDist[e.hour || 0] = (hourDist[e.hour || 0] || 0) + 1; });
        
        // 行为路径
        const lastSession = events[events.length - 1]?.sessionId;
        const lastPath = events
            .filter(e => e.sessionId === lastSession)
            .map(e => {
                if (e.event === 'feature_click') return '👆' + (e.data.featureName || e.data.featureId);
                if (e.event === 'feature_enter') return '🚪' + (e.data.featureName || e.data.featureId);
                if (e.event === 'feature_generate') return '⚡生成';
                if (e.event === 'feature_success') return '✅成功';
                if (e.event === 'feature_error') return '❌失败';
                if (e.event === 'feature_copy') return '📋复制';
                if (e.event === 'feature_abandon') return '🚶流失';
                return e.event;
            })
            .slice(-20);
        
        return {
            totalEvents, todayEvents, sessions,
            funnel: {
                expose: expose.length,
                click: click.length,
                enter: enter.length,
                generate: generate.length,
                success: success.length,
                copy: copy.length,
                abandon: abandon.length
            },
            featureList,
            activation: { attempts: activationAttempts, success: activationSuccess, fail: activationFail, rate: activationAttempts > 0 ? Math.round(activationSuccess / activationAttempts * 100) : 0 },
            api: { errors: apiErrors, errorTypes: apiErrorTypes },
            hourDist,
            lastPath,
            dateRange: events.length > 0 ? {
                first: new Date(events[0].timestamp).toLocaleDateString('zh-CN'),
                last: new Date(events[events.length - 1].timestamp).toLocaleDateString('zh-CN')
            } : null
        };
    },
    
    export() {
        return {
            events: this.getEvents(),
            summary: this.getSummary(),
            exportTime: new Date().toLocaleString('zh-CN')
        };
    },
    
    clear() {
        localStorage.removeItem(this.config.storageKey);
        window.__trackerEvents = [];
        console.log('[Tracker] 埋点数据已清空');
    },
    
    async report() {
        if (!this.config.backendUrl) return;
        const events = this.getEvents().filter(e => !e.reported);
        if (events.length === 0) return;
        try {
            const res = await fetch(this.config.backendUrl + '/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ events, deviceId: this.session.deviceId })
            });
            if (res.ok) {
                const all = this.getEvents();
                all.forEach(e => { if (!e.reported) e.reported = true; });
                localStorage.setItem(this.config.storageKey, JSON.stringify(all));
            }
        } catch (e) {}
    }
};

// 自动初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(() => TRACKER.init(), 500));
} else {
    setTimeout(() => TRACKER.init(), 500);
}

window.TRACKER = TRACKER;
