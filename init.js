// ===== 全局错误捕获（手机端调试用）=====
window.addEventListener('error', function(e) {
    var msg = '文件: ' + (e.filename || '') + '\n行号: ' + (e.lineno || '') + '\n信息: ' + (e.message || '');
    var errDiv = document.getElementById('mobileError');
    var errMsg = document.getElementById('mobileErrorMsg');
    if (errDiv && errMsg) {
        errDiv.style.display = 'block';
        // 用textContent赋值，不依赖任何外部函数
        errMsg.innerHTML = '';
        var pre = document.createElement('pre');
        pre.style.cssText = 'white-space:pre-wrap;word-break:break-all;color:inherit;margin:0;';
        pre.textContent = msg + '\n\n完整错误: ' + ((e.error && e.error.stack) || e.error || '');
        errMsg.appendChild(pre);
    }
    console.error('[全局错误]', e);
});

window.addEventListener('unhandledrejection', function(e) {
    var msg = 'Promise未捕获错误:\n' + (e.reason ? ((e.reason.stack) || String(e.reason)) : '');
    var errDiv = document.getElementById('mobileError');
    var errMsg = document.getElementById('mobileErrorMsg');
    if (errDiv && errMsg && errDiv.style.display === 'none') {
        errDiv.style.display = 'block';
        errMsg.innerHTML = '';
        var pre = document.createElement('pre');
        pre.style.cssText = 'white-space:pre-wrap;word-break:break-all;color:inherit;margin:0;';
        pre.textContent = msg;
        errMsg.appendChild(pre);
    }
    console.error('[Promise错误]', e.reason);
});

function init(){
    console.log('[INIT] 开始初始化...');
    
    // 超时保护：5秒后强制隐藏加载动画（防止一直转圈）
    var loadingTimeout = setTimeout(function() {
        console.warn('[INIT] 超时保护触发，强制隐藏加载动画');
        hideLoading();
    }, 5000);
    
    try {
        console.log('[INIT] 1. renderNav');
        renderNav();
        console.log('[INIT] 2. renderLanding');
        renderLanding();
        console.log('[INIT] 3. bindGlobalEvents');
        bindGlobalEvents();
        console.log('[INIT] 4. updateUserUI');
        updateUserUI();
        console.log('[INIT] 5. initSpeechRecognition');
        initSpeechRecognition();
        console.log('[INIT] 6. startClock');
        startClock();
        console.log('[INIT] 7. initPWA');
        initPWA();
        console.log('[INIT] 所有步骤完成！');

        // 初始化完成，隐藏加载动画
        clearTimeout(loadingTimeout);
        hideLoading();

        // 追踪：会话开始
        if (window.AiApiProxy && window.AiApiProxy.trackEvent) {
            window.AiApiProxy.trackEvent('session_start', {
                timestamp: Date.now(),
                referrer: document.referrer || 'direct'
            });
        }

        // 追踪：会话结束（用户离开时）
        window.addEventListener('beforeunload', () => {
            if (window.AiApiProxy && window.AiApiProxy.trackEvent) {
                const startTime = sessionStorage.getItem('session_start_time') || Date.now();
                const duration = Date.now() - parseInt(startTime);
                window.AiApiProxy.trackEvent('session_end', {
                    duration: Math.floor(duration / 1000), // 秒
                    timestamp: Date.now()
                });
            }
        });

        // 记录会话开始时间
        sessionStorage.setItem('session_start_time', Date.now());

        trackEvent('app_open');
        console.log('[INIT] 初始化完成！');
    } catch(e) {
        console.error('[INIT] 初始化失败:', e);
        clearTimeout(loadingTimeout);
        hideLoading(); // 出错也要隐藏加载动画
        var errDiv = document.getElementById('mobileError');
        var errMsg = document.getElementById('mobileErrorMsg');
        if (errDiv && errMsg) {
            errDiv.style.display = 'block';
            errMsg.innerHTML = '';
            var pre = document.createElement('pre');
            pre.style.cssText = 'white-space:pre-wrap;word-break:break-all;color:inherit;margin:0;';
            pre.textContent = '初始化失败:\n' + (e.stack || e.message || e);
            errMsg.appendChild(pre);
        }
    }
}

document.addEventListener('DOMContentLoaded',init);
