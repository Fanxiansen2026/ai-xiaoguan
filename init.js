function init(){
    renderNav();
    renderLanding();
    bindGlobalEvents();
    updateUserUI();
    initSpeechRecognition();
    startClock();
    initPWA();

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
}

document.addEventListener('DOMContentLoaded',init);
