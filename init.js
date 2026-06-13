function init(){
    renderNav();
    renderLanding();
    bindGlobalEvents();
    updateUserUI();
    initSpeechRecognition();
    startClock();
    initPWA();
    trackEvent('app_open');
}

document.addEventListener('DOMContentLoaded',init);
