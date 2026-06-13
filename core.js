// ===== 核心运行时：工具函数、状态管理、路由、导航、通用UI =====
let recognition = null;
let fillerTimer = null;
let clockTimer = null;

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

function getVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function getChecked(id) { const el = document.getElementById(id); return el ? el.value === 'true' : false; }

function getRank(exp){let r=appState.ranks[0];for(let x of appState.ranks)if(exp>=x.minExp)r=x;return r;}
function getNextRank(exp){for(let r of appState.ranks)if(exp<r.minExp)return r;return null;}
function getSyncProgress(){
    const fields=['name','industry','product','years','personality','painPoint','target','price','cycle','competitor','advantage'];
    let filled=0; fields.forEach(f=>{if(appState.user[f]&&appState.user[f].trim().length>=2 && !/^\d+$/.test(appState.user[f].trim()))filled++;});
    let base = Math.min(90, Math.floor((filled/fields.length)*95));
    if(appState.user.chatCount > 20 && filled === fields.length) base = 95;
    return base;
}
function addExp(amount, isPreset){
    let gain = Math.floor(amount * (appState.globalConfig.expMultiplier || 1.0));
    if(isPreset) gain = Math.floor(gain / 3);
    const oldRank = getRank(appState.user.exp);
    appState.user.exp += gain;
    appState.user.chatCount++;
    const newRank = getRank(appState.user.exp);
    updateUserUI();
    if(newRank.name !== oldRank.name) showLevelUp(newRank);
}
function showLevelUp(rank){
    $('#levelUpTitle').textContent = `${rank.icon} 晋升 ${rank.name} 销售！`;
    $('#levelUpDesc').textContent = rank.perk;
    $('#levelUp').classList.add('show');
    setTimeout(()=>$('#levelUp').classList.remove('show'), 3000);
}

function safeCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
}
function showToast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500);}
function startClock(){const u=()=>{$('#topClock').textContent=new Date().toLocaleTimeString('zh-CN',{hour12:false})};u();if(clockTimer)clearInterval(clockTimer);clockTimer=setInterval(u,1000);}
function updateUserUI(){
    $('#sidebarName').textContent=appState.user.name||'销售精英';
    $('#sidebarAvatar').src=appState.user.avatar||'https://bailian-bmp-pre.oss-cn-hangzhou.aliyuncs.com/public/system_agent/PlaceHolder.png';
    const rank=getRank(appState.user.exp);
    $('#sidebarRank').textContent=rank.icon+' '+rank.name;
    const progress=getSyncProgress();
    $('#sidebarProgress').style.width=progress+'%';
    $('#sidebarProgressText').textContent=progress+'%';
    $('#syncName').textContent=appState.globalConfig.syncName;
}

/* ========== 激活码系统 ========== */
function isActivated(){return appState.activation.isValid && getRemainingDays() > 0;}
function isPaywallFeature(featureId){return PAYWALL_FEATURES.includes(featureId);}
function showActivationModal(){
    appState.previousPage = appState.currentPage || 'home';
    document.getElementById('activationModal').classList.add('show');
}
function closeActivationModal(){
    document.getElementById('activationModal').classList.remove('show');
    document.getElementById('activationError').textContent = '';
    document.getElementById('activationInput').value = '';
    // 关闭弹窗后回到之前的页面
    const prev = appState.previousPage || 'home';
    if(prev !== 'workspace') switchPage(prev);
}
function checkActivation(){
    try{
        const saved = localStorage.getItem('ai_sales_activation_v1');
        if(!saved) return false;
        const data = JSON.parse(saved);
        if(!data.code || !data.activatedAt || !data.days) return false;
        const now = Date.now();
        const expire = data.activatedAt + data.days * 24 * 60 * 60 * 1000;
        if(now > expire) {localStorage.removeItem('ai_sales_activation_v1'); return false;}
        appState.activation = { ...data, isValid: true };
        return true;
    }catch(e){ return false; }
}
function verifyActivationCode(){
    const input = document.getElementById('activationInput');
    const error = document.getElementById('activationError');
    const code = input.value.trim().toUpperCase();
    if(!code){ error.textContent = '请输入激活码'; return; }
    
    // 1. 先查硬编码激活码
    let config = ACTIVATION_CODES[code];
    
    // 2. 再查管理后台生成的激活码
    if(!config){
        const record = appState.activationRecords.find(r => r.code === code && !r.used);
        if(record){
            config = { days: record.days };
        }
    }
    
    if(!config){ error.textContent = '激活码无效，请检查或联系商务'; return; }
    
    const deviceId = localStorage.getItem('ai_sales_device_id') || 'unknown';
    const usedCodes = JSON.parse(localStorage.getItem('ai_sales_used_codes') || '{}');
    if(usedCodes[code] && usedCodes[code] !== deviceId) { console.log('激活码可能在多设备使用'); }
    
    const activation = { code: code, activatedAt: Date.now(), days: config.days, isValid: true, deviceId: deviceId };
    localStorage.setItem('ai_sales_activation_v1', JSON.stringify(activation));
    usedCodes[code] = deviceId;
    localStorage.setItem('ai_sales_used_codes', JSON.stringify(usedCodes));
    appState.activation = activation;
    
    // 标记管理后台记录为已使用
    const record = appState.activationRecords.find(r => r.code === code);
    if(record) record.used = true;
    
    closeActivationModal();
    updateActivationStatus();
    showToast(`✅ 激活成功！有效期 ${config.days} 天`);
    trackEvent('activation_success',{code,days:config.days});
    if(appState.currentFeatureId && isPaywallFeature(appState.currentFeatureId)) { initWorkspace(appState.currentFeatureId); }
}
function updateActivationStatus(){
    const el = document.getElementById('activationStatus');
    if(!isActivated()) { el.style.display='none'; return; }
    const days = getRemainingDays();
    el.style.display = 'block';
    el.textContent = `🔐 ${days}天`;
    el.classList.toggle('expired', days <= 3);
}
function getRemainingDays(){
    if(!appState.activation.isValid) return 0;
    const expire = appState.activation.activatedAt + appState.activation.days * 24 * 60 * 60 * 1000;
    const remain = Math.ceil((expire - Date.now()) / (24 * 60 * 60 * 1000));
    return Math.max(0, remain);
}
function clearActivation(){
    localStorage.removeItem('ai_sales_activation_v1');
    appState.activation = { code:'', activatedAt:0, days:0, isValid:false, deviceId:'' };
}

/* ========== API Key 配置 ========== */
function checkApiKey(){
    if(appState.apiKey && appState.apiKey.startsWith('sk-') && appState.apiKey.length > 20){ return; }
}
function ensureApiKey(){
    if(BACKEND_URL && BACKEND_URL.startsWith('http') && !BACKEND_URL.includes('YOUR_CLOUDFUNCTION_URL_HERE')){ return true; }
    if(appState.apiKey && appState.apiKey.startsWith('sk-') && appState.apiKey.length > 20){ return true; }
    showApiKeyModal();
    return false;
}
function showApiKeyModal(){document.getElementById('apiKeyModal').classList.add('show');}
function closeApiKeyModal(){
    document.getElementById('apiKeyModal').classList.remove('show');
    document.getElementById('apiKeyError').textContent = '';
}
function saveApiKeyFromModal(){
    const input = document.getElementById('apiKeyInput');
    const error = document.getElementById('apiKeyError');
    const key = input.value.trim();
    if(!key){ error.textContent = '请输入 API Key'; return; }
    if(!key.startsWith('sk-')){ error.textContent = 'API Key 必须以 sk- 开头'; return; }
    if(key.length < 20){ error.textContent = 'API Key 格式不正确，长度太短'; return; }
    localStorage.setItem('ai_sales_api_key', key);
    appState.apiKey = key;
    closeApiKeyModal();
    showToast('✅ API Key 已保存，现在可以直接使用了！');
}

/* ========== 导航与页面切换 ========== */
function renderNav(){
    const nav=$('#mainNav');
    nav.innerHTML=`<div class="nav-item active" data-page="landing"><span>🏠</span> 首页</div><div class="nav-item" data-page="home"><span>📊</span> 控制台</div><div class="nav-item" data-page="profile"><span>👤</span> 个人主页</div><div class="nav-item" data-page="admin"><span>⚙️</span> 后台管理</div>`;
    appState.navGroups.forEach(group=>{
        let itemsHTML='';
        group.features.forEach(fid=>{const f=appState.features.find(x=>x.id===fid);if(f&&f.visible)itemsHTML+=`<div class="nav-item" data-page="workspace" data-id="${f.id}"><span>${f.icon}</span> ${f.name}</div>`;});
        nav.innerHTML+=`<div class="nav-group" data-group="${group.id}"><div class="nav-group-title">${group.name} <span class="arrow">▼</span></div><div class="nav-items">${itemsHTML}</div></div>`;
    });
}
function toggleSidebar(){$('#sidebar').classList.toggle('open');$('#sidebarOverlay').classList.toggle('show');}
function closeSidebar(){$('#sidebar').classList.remove('open');$('#sidebarOverlay').classList.remove('show');}
function switchPage(page,featureId=null){
    appState.currentPage = page; // 记录当前页面，用于激活码弹窗关闭后返回
    $$('.page').forEach(p=>p.classList.remove('active'));
    $(`#page-${page}`).classList.add('active');
    $$('.nav-item').forEach(n=>n.classList.remove('active'));
    let selector=`.nav-item[data-page="${page}"]`;
    if(featureId)selector=`.nav-item[data-id="${featureId}"]`;
    const activeNav=$(selector);if(activeNav)activeNav.classList.add('active');
    $('#btnBack').style.display=(page!=='landing'&&page!=='home')?'block':'none';
    let title='首页';
    if(page==='home')title='控制台';
    else if(page==='admin')title='后台管理';
    else if(page==='profile')title='个人主页';
    else if(featureId)title=appState.features.find(x=>x.id===featureId)?.name;
    $('#pageTitle').textContent=title;
    if(page==='home')renderHome();
    if(page==='workspace'&&featureId){
        if(isPaywallFeature(featureId) && !isActivated()){
            showActivationModal();
            return;
        }
        initWorkspace(featureId);
    }
    if(page==='profile')initProfile();
    if(page==='admin')initAdmin();
    closeSidebar();
}

/* ========== 页面渲染 ========== */
function renderLanding(){
    if(fillerTimer)clearInterval(fillerTimer);
    const gc=appState.globalConfig;
    const reviews = gc.reviews.map((text) => {
        const parts = text.split('|');
        const user = parts[0] || '匿名用户';
        const content = parts[1] || parts[0];
        return `<div class="review-card"><div class="user">👤 ${user}</div><div class="text">${content}</div></div>`;
    }).join('');
    const audiences = ['SaaS软件','医药器械','保险理财','房产汽车','教育培训','医美健康','招商加盟','金融服务','快消零售','企业服务'].map((a,i)=>`<div class="audience-item"><div class="icon">${['💻','💊','🛡️','🏠','📚','💄','🤝','💰','🛒','🏢'][i]}</div>${a}</div>`).join('');
    
    $('#mainContent').innerHTML = `
        <div class="page active" id="page-landing">
            <div class="landing">
                <div class="hero">
                    <h1>${gc.heroTitle}</h1>
                    <p>${gc.heroDesc}</p>
                    <div class="hero-stats">
                        <div class="hero-stat"><div class="val">${gc.stat1Val}</div><div class="lbl">${gc.stat1Lbl}</div></div>
                        <div class="hero-stat"><div class="val">${gc.stat2Val}</div><div class="lbl">${gc.stat2Lbl}</div></div>
                        <div class="hero-stat"><div class="val">${gc.stat3Val}</div><div class="lbl">${gc.stat3Lbl}</div></div>
                    </div>
                    <button class="btn-start" id="btnStart">🚀 开启销冠之路</button>
                </div>
                <div><div class="section-title">🎯 适合人群</div><div class="audience-grid">${audiences}</div></div>
                <div>
                    <div class="section-title">💡 高阶使用技巧</div>
                    <div class="tips-grid">
                        <div class="tip-card"><h4>🎙️ 语音输入是灵魂</h4><p>打字天然会偷懒！强烈建议使用语音输入，描述越有画面感、细节越丰富，军师给出的策略就越精准、越能帮你搞钱。</p></div>
                        <div class="tip-card"><h4>🧠 完善档案提默契</h4><p>左下角个人主页，把行业、客单价、痛点填满。AI默契指数越高，军师越懂你的业务背景，拒绝泛泛而谈。</p></div>
                        <div class="tip-card"><h4>🎭 对练要真刀真枪</h4><p>模拟对练时，请保持最真实的交流习惯，平时怎么跟客户说话就怎么打字或语音，军师会根据你的真实表达进行纠偏。</p></div>
                        <div class="tip-card"><h4>📋 善用预设与排雷</h4><p>不知道怎么写Prompt？点预设标签。发微信前心里没底？先用"话术排雷"扫一遍，避免踩坑得罪客户。</p></div>
                    </div>
                </div>
                <div><div class="section-title">🌟 用户真实好评</div><div class="marquee-wrap"><div class="marquee">${reviews}${reviews}</div></div></div>
            </div>
        </div>
        <div class="page" id="page-home"></div>
        <div class="page" id="page-workspace"><div class="workspace-layout" id="wsLayout"></div></div>
        <div class="page" id="page-profile"><div class="profile-layout" id="profileLayout"></div></div>
        <div class="page" id="page-admin"><div class="admin-layout"><div class="admin-tabs" id="adminTabs"></div><div class="admin-panel" id="adminPanel"></div></div></div>
    `;
}
function renderHome(){
    if(fillerTimer)clearInterval(fillerTimer);
    const now=new Date();const dateStr=now.toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric',weekday:'long'});const gc=appState.globalConfig;
    let featuresHTML='';
    appState.features.filter(f=>f.visible).forEach(f=>{const iconHTML=f.customIcon?`<img src="${f.customIcon}">`:f.icon;const isVip=PAYWALL_FEATURES.includes(f.id);const tagHtml=isVip?`<span class="feature-tag vip">VIP</span>`:`<span class="feature-tag free">免费</span>`;featuresHTML+=`<div class="feature-card" data-id="${f.id}">${tagHtml}<div class="feature-icon">${iconHTML}</div><div class="feature-info"><h3>${f.name}</h3><p>${f.desc}</p></div></div>`;});
    $('#page-home').innerHTML=`
        <div class="welcome-banner">
            ${gc.dateVisible?`<div class="welcome-date">${dateStr}</div>`:''}
            <h2>${gc.title}</h2><p>${gc.desc}</p>
            ${gc.fillers.length>0?`<div class="welcome-filler" id="fillerText">${gc.fillers[0]}</div>`:''}
            <div class="welcome-footer">商务合作：${gc.devName} | 电话：${gc.devPhone} | 微信：${gc.devWechat} <button class="copy-contact" id="btnCopyContact">一键复制联系方式</button></div>
        </div>
        <div class="features-grid">${featuresHTML}</div>
    `;
    if(gc.fillers.length>1&&gc.fillerInterval>0){let idx=0;fillerTimer=setInterval(()=>{idx=(idx+1)%gc.fillers.length;const el=$('#fillerText');if(el){el.style.opacity=0;setTimeout(()=>{el.textContent=gc.fillers[idx];el.style.opacity=1;},500);}},gc.fillerInterval*1000);}
}

/* ========== 通用输入渲染 ========== */
function renderInput(id,label,placeholder,presets,maxLen,showCount,isRandom){
    let displayPresets=presets;
    if(isRandom&&presets.length>showCount)displayPresets=[...presets].sort(()=>0.5-Math.random()).slice(0,showCount);
    else displayPresets=presets.slice(0,showCount);
    const presetsHTML=displayPresets.map(p=>`<span class="preset-tag" data-target="${id}">${p}</span>`).join('');
    return `<div class="form-group"><div class="input-header"><label class="form-label">${label}</label><div class="input-actions"><span class="char-count" id="count_${id}">0/${maxLen}</span><button class="mini-btn btn-clear" data-target="${id}">清空</button><button class="mini-btn btn-copy-input" data-target="${id}">复制</button></div></div><textarea class="form-control" id="${id}" maxlength="${maxLen}" placeholder="${placeholder}"></textarea><div class="preset-questions">${presetsHTML}</div></div>`;
}
function updateCount(el){
    const count=$(`#count_${el.id}`);
    if(count){const max=el.maxLength;count.textContent=`${el.value.length}/${max}`;count.classList.toggle('warn',el.value.length>max*0.9);}
}
function renderFileList(){
    const list = $('#fileList');
    if(!list) return;
    list.innerHTML = appState.uploadedFiles.map((f,i)=>`<div class="file-item">${f.name} <span class="del del-file" data-idx="${i}">✕</span></div>`).join('');
}
function saveChatCache(){
    const msgs = $$('#chatMessages .msg-row');
    const cache = [];
    msgs.forEach(m=>{
        cache.push({type: m.classList.contains('user')?'user':'ai', html: m.innerHTML});
    });
    appState.chatCache[appState.currentFeatureId] = cache;
}
function restoreChatCache(){
    const cache = appState.chatCache[appState.currentFeatureId] || [];
    const chatMsgs = $('#chatMessages');
    if(cache.length > 0){
        chatMsgs.innerHTML = cache.map(c=>`<div class="msg-row ${c.type}">${c.html}</div>`).join('');
        chatMsgs.scrollTop = chatMsgs.scrollHeight;
    }
}

/* ========== 全局事件绑定（委托模式） ========== */
function bindGlobalEvents(){
    document.addEventListener('click',e=>{
        const t=e.target;
        if(t.closest('.nav-group-title')){t.closest('.nav-group').classList.toggle('collapsed');return;}
        if(t.closest('.nav-item')){const item=t.closest('.nav-item');switchPage(item.dataset.page,item.dataset.id);closeSidebar();return;}
        if(t.id==='btnBack'){switchPage('home');return;}
        if(t.id==='menuBtn'){toggleSidebar();return;}
        if(t.id==='sidebarOverlay'){closeSidebar();return;}
        if(t.closest('.feature-card')){switchPage('workspace',t.closest('.feature-card').dataset.id);return;}
        if(t.id==='userProfileBtn'){switchPage('profile');return;}
        if(t.id==='btnStart'){switchPage('home');return;}
        if(t.id==='btnCopyContact'){const gc=appState.globalConfig;safeCopy(`${gc.devName} 电话：${gc.devPhone} 微信：${gc.devWechat}`);showToast('📋 联系方式已复制');return;}
        if(t.classList.contains('btn-clear')){const el=$(`#${t.dataset.target}`);if(el){el.value='';updateCount(el);}return;}
        if(t.classList.contains('btn-copy-input')){const el=$(`#${t.dataset.target}`);if(el){safeCopy(el.value);showToast('📋 已复制');}return;}
        if(t.classList.contains('preset-tag')){
            const el=$(`#${t.dataset.target}`);
            if(el){el.value=t.textContent.trim();updateCount(el);el.style.height='auto';el.style.height=el.scrollHeight+'px';}
            return;
        }
        if(t.id==='btnGenerate'||t.closest('#btnGenerate')){handleGenerate(false);return;}
        if(t.id==='btnRefresh'||t.closest('#btnRefresh')){handleGenerate(true);return;}
        if(t.classList.contains('tag')){
            const group=t.parentElement;
            if(group.dataset.multi==='true')t.classList.toggle('active');
            else{group.querySelectorAll('.tag').forEach(x=>x.classList.remove('active'));t.classList.add('active');}
            if(group.id==='momentsTypeTags'){
                const isGen=t.dataset.val==='generate';
                $('#momentsStageGroup').style.display=isGen?'block':'none';
                $('#momentsCircleGroup').style.display=isGen?'block':'none';
                $('#momentsLenGroup').style.display=isGen?'block':'none';
                $('#momentsStyleGroup').style.display=isGen?'block':'none';
                $('#momentsInteractGroup').style.display=isGen?'none':'block';
                updateMomentsPresets(isGen, t.dataset.val);
            } else if(group.id==='resumeVersionTags'){
                const isPro = t.dataset.val === 'professional';
                $('#resumeSimpleFields').style.display = isPro ? 'none' : 'block';
                $('#resumeProFields').style.display = isPro ? 'block' : 'none';
                appState.resumeVersion = t.dataset.val;
            } else if(group.id==='introSceneTags'){
                appState.introScene = t.dataset.val;
            }
            return;
        }
        if(t.id==='wxPlusBtn'||t.closest('#wxPlusBtn')){$('#wxExtraPanel').classList.toggle('show');return;}
        if(t.closest('.wx-extra-item')){
            const type=t.closest('.wx-extra-item').dataset.type;
            if(type==='image'){$('#fileInput').accept='image/*';$('#fileInput').click();}
            if(type==='video'){$('#fileInput').accept='video/*';$('#fileInput').click();}
            if(type==='file'){$('#fileInput').accept='*/*';$('#fileInput').click();}
            $('#wxExtraPanel').classList.remove('show');
            return;
        }
        if(t.id==='fileUploadArea'||t.closest('#fileUploadArea')){$('#fileInput').click();return;}
        if(t.classList.contains('del-file')){
            const idx = parseInt(t.dataset.idx);
            appState.uploadedFiles.splice(idx, 1);
            renderFileList();
            return;
        }
        if(t.id==='btnRoleplaySend'||t.closest('#btnRoleplaySend')){handleRoleplaySend();return;}
        if(t.closest('.admin-tab')&&!t.closest('.sort-btns')){renderAdminPanel(t.closest('.admin-tab').dataset.admin);return;}
        if(t.classList.contains('sort-up')||t.classList.contains('sort-down')){handleFeatureSort(t);return;}
        if(t.id==='btnSaveGlobal'){saveGlobalConfig();return;}
        if(t.id==='btnExport'){$('#exportArea').value=JSON.stringify(appState,null,2);showToast('✅ 已生成，请复制保存');return;}
        if(t.id==='btnImport'){try{const data=JSON.parse($('#importArea').value);if(data.user)Object.assign(appState.user,data.user);if(data.globalConfig)Object.assign(appState.globalConfig,data.globalConfig);if(data.navGroups)appState.navGroups=data.navGroups;if(data.ranks)appState.ranks=data.ranks;if(data.features)appState.features=data.features;if(data.scripts)appState.scripts=data.scripts;if(data.apiKey)appState.apiKey=data.apiKey;renderNav();renderHome();initAdmin();updateUserUI();showToast('✅ 导入成功');}catch(e){showToast('❌ 格式错误');}return;}
        if(t.id==='btnSaveConf'){saveFeatureConfig();return;}
        if(t.id==='btnAddScript'){addScript();return;}
        if(t.classList.contains('btn-del-script')){appState.scripts=appState.scripts.filter(s=>s.id!=t.dataset.id);renderAdminPanel('scripts');return;}
        if(t.id==='btnSaveProfile'){saveProfile();return;}
        if(t.id==='btnClearChat'){appState.chatCache[appState.currentFeatureId]=[];$('#chatMessages').innerHTML='';showToast('🗑️ 记录已清空');return;}
        if(t.classList.contains('btn-copy-msg')){safeCopy(t.dataset.text);showToast('📋 已复制');return;}
        if(t.classList.contains('btn-fav-msg')){
            const text = t.dataset.text;
            appState.favorites.push({id:Date.now(),text:text,source:appState.currentFeatureId,addedAt:Date.now()});
            localStorage.setItem('ai_sales_favorites', JSON.stringify(appState.favorites));
            t.classList.add('active');
            t.textContent = '已收藏';
            showToast('⭐ 已收藏到话术库');
            trackEvent('message_favorite',{featureId:appState.currentFeatureId});
            return;
        }
        if(t.classList.contains('btn-share-msg')){
            const text = t.dataset.text;
            const question = t.dataset.question || '';
            showToast('正在生成海报...');
            generatePoster('share', text, question, url=>{
                showImagePreview(url, '话术分享海报');
            });
            trackEvent('message_share',{featureId:appState.currentFeatureId});
            return;
        }
        if(t.classList.contains('btn-del-msg')){t.closest('.msg-row').remove();saveChatCache();return;}
        if(t.closest('.script-cat-title')){t.closest('.script-cat').classList.toggle('collapsed');return;}
        if(t.classList.contains('btn-copy-script') || t.closest('.script-item')){
            const text = t.classList.contains('btn-copy-script') ? t.dataset.text : t.closest('.script-item').querySelector('p').textContent.replace(/^.*?\n/, '');
            safeCopy(text);
            showToast('📋 话术已复制');
            return;
        }
        if(t.classList.contains('quick-reply')){
            $('#roleplayInput').value = t.textContent;
            $('#roleplayInput').focus();
            return;
        }
    });
    document.addEventListener('input',e=>{if(e.target.classList.contains('form-control')&&e.target.id)updateCount(e.target);});
    document.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&e.target.id==='roleplayInput'){e.preventDefault();handleRoleplaySend();}});
    document.addEventListener('mousedown',handleVoiceStart);
    document.addEventListener('touchstart',handleVoiceStart,{passive:false});
    document.addEventListener('mouseup',handleVoiceEnd);
    document.addEventListener('touchend',handleVoiceEnd);
    document.addEventListener('touchcancel',handleVoiceEnd);
    document.addEventListener('change',e=>{if(e.target.id==='fileInput')handleFileChange(e);});
}

/* ========== 埋点系统 ========== */
function trackEvent(eventName, params={}){
    const event = {
        event: eventName,
        params: params,
        timestamp: Date.now(),
        userId: appState.user.id,
        sessionId: appState.analytics.sessionStart
    };
    appState.analytics.events.push(event);
    appState.analytics.lastActive = Date.now();
    // 限制存储数量，避免占用过多空间
    if(appState.analytics.events.length > 2000){
        appState.analytics.events = appState.analytics.events.slice(-1500);
    }
}
function getAnalyticsSummary(){
    const coreEvents = appState.analytics.events;
    
    // 合并埋点v2数据（如果有）
    let trackerEvents = [];
    try {
        const stored = localStorage.getItem('ai_sales_tracker_v2');
        if(stored) {
            const parsed = JSON.parse(stored);
            trackerEvents = parsed.map(e => ({
                event: e.event,
                params: e.data || {},
                timestamp: e.timestamp,
                userId: e.deviceId || appState.user.id,
                sessionId: e.sessionId || appState.analytics.sessionStart
            }));
        }
    } catch(e) {}
    
    const events = [...coreEvents, ...trackerEvents];
    
    // 去重：防止埋点v2同步到coreEvents导致重复统计
    const seen = new Set();
    const uniqueEvents = events.filter(e => {
        const key = `${e.event}_${e.timestamp}_${e.userId || ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    
    const now = Date.now();
    const summary = {
        totalEvents: events.length,
        totalSessions: 0,
        uniqueUsers: {},
        avgSessionDuration: 0,
        featureUsage: {},
        dailyActive: {},
        funnel: {open:0, browse:0, use:0, complete:0},
        heatmap: Array(30).fill(0),
        retention: {day1:0, day7:0, day30:0},
        userTier: {new:0, active:0, silent:0, churn:0},
        hourHeatmap: Array(24).fill(0),
        sessionDurationBuckets: {short:0, medium:0, long:0, super:0},
        featureRetention: {},
        conversionFunnel: {visit:0, register:0, activate:0, paid:0, renew:0},
        coreMetrics: {
            totalGenerations: 0,
            totalFavorites: appState.favorites.length,
            totalCopies: 0,
            totalShares: 0,
            activeDays: 0,
            consecutiveDays: 0
        }
    };
    
    summary.totalEvents = uniqueEvents.length;
    
    let sessionCount = 0;
    let sessionDuration = 0;
    let currentSession = null;
    const userSessions = {};
    const dailyEvents = {};
    
    uniqueEvents.forEach((e, i)=>{
        // 功能使用（打开+点击）
        if(e.event==='feature_open' || e.event==='feature_click'){
            const fid = e.params?.featureId || e.params?.feature || e.params?.id || '';
            if(fid) {
                summary.featureUsage[fid] = (summary.featureUsage[fid]||0) + 1;
                summary.funnel.use++;
            }
        }
        // 功能留存（真正进入使用）
        if(e.event==='feature_enter'){
            const fid = e.params?.featureId || e.params?.feature || e.params?.id || '';
            if(fid) {
                summary.featureRetention[fid] = (summary.featureRetention[fid]||0) + 1;
            }
        }
        if(e.event==='app_open' || e.event==='page_open'){
            summary.funnel.open++;
            summary.uniqueUsers[e.userId || appState.user.id] = true;
            sessionCount++;
            if(currentSession){
                sessionDuration += (e.timestamp - currentSession.start);
            }
            currentSession = {start: e.timestamp, userId: e.userId || appState.user.id};
            if(!userSessions[e.userId || appState.user.id]) userSessions[e.userId || appState.user.id] = {lastActive:e.timestamp, sessions:[]};
            userSessions[e.userId || appState.user.id].sessions.push(e.timestamp);
            userSessions[e.userId || appState.user.id].lastActive = e.timestamp;
            
            const day = new Date(e.timestamp).toLocaleDateString('zh-CN');
            if(!dailyEvents[day]) dailyEvents[day] = {first: e.timestamp, last: e.timestamp, events: 0};
            dailyEvents[day].events++;
        }
        if(e.event==='page_switch'){
            summary.funnel.browse++;
        }
        if(e.event==='generate_complete' || e.event==='feature_success' || e.event==='feature_generate'){
            summary.funnel.complete++;
            summary.coreMetrics.totalGenerations++;
        }
        if(e.event==='script_favorite' || e.event==='feature_favorite'){
            summary.coreMetrics.totalFavorites++;
        }
        if(e.event==='script_copy' || e.event==='feature_copy'){
            summary.coreMetrics.totalCopies++;
        }
        if(e.event==='script_share' || e.event==='poster_generate'){
            summary.coreMetrics.totalShares++;
        }
        
        // 日活跃
        const day = new Date(e.timestamp).toLocaleDateString('zh-CN');
        summary.dailyActive[day] = (summary.dailyActive[day]||0) + 1;
        
        // 30天热力图
        const daysAgo = Math.floor((now - e.timestamp) / (24*60*60*1000));
        if(daysAgo >= 0 && daysAgo < 30){
            summary.heatmap[29 - daysAgo]++;
        }
        
        // 24小时热力图
        const hour = new Date(e.timestamp).getHours();
        summary.hourHeatmap[hour]++;
        
        // 付费转化漏斗
        if(e.event==='app_open' || e.event==='page_open') summary.conversionFunnel.visit++;
        if(e.event==='user_register') summary.conversionFunnel.register++;
        if(e.event==='activation_success' || e.event==='activation_attempt') summary.conversionFunnel.activate++;
        if(e.event==='purchase') summary.conversionFunnel.paid++;
        if(e.event==='renew') summary.conversionFunnel.renew++;
        
        // 功能留存（仅统计真正进入使用的）
        if(e.event==='feature_enter'){
            const fid = e.params?.featureId || e.params?.feature || e.params?.id || '';
            if(fid) summary.featureRetention[fid] = (summary.featureRetention[fid]||0)+1;
        }
    });
    
    // 活跃天数和连续活跃
    const sortedDays = Object.keys(dailyEvents).sort();
    summary.coreMetrics.activeDays = sortedDays.length;
    if(sortedDays.length > 0){
        let maxConsecutive = 1, current = 1;
        for(let i = 1; i < sortedDays.length; i++){
            const d1 = new Date(sortedDays[i-1]);
            const d2 = new Date(sortedDays[i]);
            const diff = Math.round((d2 - d1) / (24*60*60*1000));
            if(diff === 1) current++;
            else current = 1;
            maxConsecutive = Math.max(maxConsecutive, current);
        }
        summary.coreMetrics.consecutiveDays = maxConsecutive;
    }
    
    // 用户分层计算
    Object.keys(userSessions).forEach(uid=>{
        const user = userSessions[uid];
        const lastActive = user.lastActive;
        const daysSinceLastActive = Math.floor((now - lastActive) / (24*60*60*1000));
        const sessCount = user.sessions.length;
        
        if(daysSinceLastActive > 30) summary.userTier.churn++;
        else if(daysSinceLastActive > 7) summary.userTier.silent++;
        else if(sessCount >= 3) summary.userTier.active++;
        else summary.userTier.new++;
    });
    
    summary.totalSessions = sessionCount;
    summary.avgSessionDuration = sessionCount > 0 ? sessionDuration / sessionCount : 0;
    
    // 使用时长分层
    const avgMin = summary.avgSessionDuration / 60000;
    if(avgMin < 1) summary.sessionDurationBuckets.short = sessionCount;
    else if(avgMin < 5) summary.sessionDurationBuckets.medium = sessionCount;
    else if(avgMin < 15) summary.sessionDurationBuckets.long = sessionCount;
    else summary.sessionDurationBuckets.super = sessionCount;
    
    // 热力图分级
    const maxHeat = Math.max(...summary.heatmap, 1);
    summary.heatmap = summary.heatmap.map(v => Math.min(5, Math.ceil(v / maxHeat * 5)));
    
    return summary;
}

/* ========== PWA 快捷方式引导 ========== */
let pwaPrompt = null;
function initPWA(){
    window.addEventListener('beforeinstallprompt', e=>{
        e.preventDefault();
        pwaPrompt = e;
        if(!appState.pwaDismissed && appState.user.chatCount >= 2){
            setTimeout(()=>showPWABanner(), 2000);
        }
    });
    window.addEventListener('appinstalled', ()=>{
        pwaPrompt = null;
        appState.pwaDismissed = true;
        showToast('✅ 已添加到桌面！');
    });
    
    // 电脑端检测：如果不支持beforeinstallprompt，在profile页面显示手动安装指南
    if(!('beforeinstallprompt' in window) && !window.matchMedia('(display-mode: standalone)').matches){
        appState.pwaUnsupported = true;
    }
}
function showPWABanner(){
    if(document.getElementById('pwaBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'pwaBanner';
    banner.className = 'pwa-banner';
    banner.innerHTML = `<div class="pwa-content"><div class="pwa-icon">APP</div><div class="pwa-text"><div class="pwa-title">添加到桌面，像APP一样使用</div><div class="pwa-sub">一键访问，无需每次打开浏览器</div></div></div><div class="pwa-actions"><button class="pwa-btn pwa-install" id="btnInstallPWA">立即安装</button><button class="pwa-btn pwa-close" id="btnDismissPWA">暂不</button></div>`;
    document.body.appendChild(banner);
    setTimeout(()=>banner.classList.add('show'),100);
    document.getElementById('btnInstallPWA').addEventListener('click', async ()=>{
        if(pwaPrompt){pwaPrompt.prompt();const {outcome} = await pwaPrompt.userChoice;trackEvent('pwa_install',{outcome});pwaPrompt=null;}
        banner.classList.remove('show');setTimeout(()=>banner.remove(),300);
    });
    document.getElementById('btnDismissPWA').addEventListener('click', ()=>{
        appState.pwaDismissed = true;
        trackEvent('pwa_dismiss');
        banner.classList.remove('show');
        setTimeout(()=>banner.remove(),300);
    });
}
function showPWAInProfile(){
    const profileCard = document.querySelector('.profile-layout .profile-card');
    if(!profileCard) return;
    if(profileCard.querySelector('#pwaProfileCard')) return;
    const pwaSection = document.createElement('div');
    pwaSection.id = 'pwaProfileCard';
    pwaSection.style.cssText = 'margin-top:16px;padding:12px;border:1px solid var(--brd);border-radius:8px;background:var(--input)';
    
    const isUnsupported = appState.pwaUnsupported;
    pwaSection.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px">
            <div style="width:36px;height:36px;background:var(--grad);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#000">APP</div>
            <div style="flex:1">
                <div style="font-size:13px;font-weight:600;color:var(--txt);margin-bottom:2px">${isUnsupported ? '添加到桌面/收藏' : '添加到手机桌面'}</div>
                <div style="font-size:11px;color:var(--sub)">${isUnsupported ? '电脑端：按Ctrl+D收藏本页，或点击浏览器菜单→创建快捷方式' : '像原生APP一样快速访问，无需每次打开浏览器'}</div>
            </div>
            <button class="btn btn-gold" id="btnAddToHome" style="padding:6px 12px;font-size:12px">${isUnsupported ? '收藏页面' : '立即添加'}</button>
        </div>`;
    profileCard.appendChild(pwaSection);
    document.getElementById('btnAddToHome').addEventListener('click', ()=>{
        if(pwaPrompt){
            pwaPrompt.prompt();
        } else if(isUnsupported){
            showToast('💡 请按Ctrl+D收藏本页，或右键点击桌面创建快捷方式');
        } else {
            showToast('请使用浏览器"添加到主屏幕"功能');
        }
        trackEvent('pwa_click_from_profile');
    });
}

/* ========== 数据导出 ========== */
function exportData(type){
    let data = {}, filename = '';
    const now = new Date().toLocaleDateString('zh-CN').replace(/\//g,'-');
    if(type==='chat'){
        data = appState.chatCache;
        filename = `聊天记录_${now}.json`;
    } else if(type==='scripts'){
        data = appState.scripts;
        filename = `话术库_${now}.json`;
    } else if(type==='profile'){
        data = {user: appState.user, globalConfig: appState.globalConfig, activation: appState.activation};
        filename = `个人数据_${now}.json`;
    } else if(type==='full'){
        data = JSON.parse(JSON.stringify(appState));
        delete data.apiKey;
        filename = `AI销冠大脑_完整备份_${now}.json`;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✅ 导出成功');
    trackEvent('data_export',{type});
}

/* ========== 激活码生成（管理） ========== */
function generateActivationCode(type, days, count=1){
    const codes = [];
    const prefix = type==='day'?'DAY1':type==='week'?'WEEK7':type==='month'?'MONTH30':type==='year'?'YEAR365':'CUSTOM';
    for(let i=0;i<count;i++){
        const random = Math.random().toString(36).substring(2,6).toUpperCase() + Math.random().toString(36).substring(2,6).toUpperCase();
        const code = `${prefix}-${random}`;
        codes.push({code, days, type, createdAt: Date.now(), used: false});
    }
    return codes;
}

/* ========== 海报/图片生成工具 ========== */
function generatePoster(type, content, question, callback) {
    const cleanText = (text) => {
        if (!text) return '';
        return text
            .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
            .replace(/[\u{2600}-\u{26FF}]/gu, '')
            .replace(/[\u{2700}-\u{27BF}]/gu, '')
            .replace(/[*#_~`]/g, '')
            .replace(/\[.*?\]/g, '')
            .trim();
    };

    const cleanContent = cleanText(content);
    const cleanQuestion = question ? cleanText(question) : '';

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const w = 1080, h = 1920;
    canvas.width = w; canvas.height = h;

    // 背景：深色渐变
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#0B0F19');
    bgGrad.addColorStop(0.5, '#131926');
    bgGrad.addColorStop(1, '#0B0F19');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 顶部装饰线
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(60, 60);
    ctx.lineTo(200, 60);
    ctx.stroke();

    // 品牌区域（小，不突兀）
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 32px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('AI销冠大脑', 60, 110);

    ctx.fillStyle = 'rgba(245,158,11,0.6)';
    ctx.font = '18px "PingFang SC", sans-serif';
    ctx.fillText('你销售路上的军师', 60, 140);

    let y = 190;

    // 问题区域
    if (cleanQuestion) {
        // 金色标题条背景
        ctx.fillStyle = 'rgba(245,158,11,0.12)';
        ctx.fillRect(60, y, 200, 44);
        ctx.fillStyle = '#F59E0B';
        ctx.font = 'bold 24px "PingFang SC", sans-serif';
        ctx.fillText('客户问题', 76, y + 30);

        y += 56;

        // 问题内容背景卡片
        const cardPad = 24;
        const cardW = w - 120;
        const questionStartY = y;
        ctx.fillStyle = 'rgba(26,34,53,0.8)';
        ctx.fillRect(60, questionStartY, cardW, 200); // 先占位，后面重算高度
        ctx.strokeStyle = 'rgba(245,158,11,0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(60, questionStartY, cardW, 200);

        ctx.fillStyle = '#E2E8F0';
        ctx.font = '26px "PingFang SC", sans-serif';
        const questionEndY = wrapText(ctx, cleanQuestion, 60 + cardPad, questionStartY + 40, cardW - cardPad * 2, 42, true);

        // 重绘问题卡片正确高度
        const questionHeight = questionEndY - questionStartY + 20;
        ctx.fillStyle = 'rgba(26,34,53,0.8)';
        ctx.fillRect(60, questionStartY, cardW, questionHeight);
        ctx.strokeStyle = 'rgba(245,158,11,0.25)';
        ctx.strokeRect(60, questionStartY, cardW, questionHeight);

        // 重新绘制问题文字（因为被覆盖）
        ctx.fillStyle = '#E2E8F0';
        ctx.font = '26px "PingFang SC", sans-serif';
        y = wrapText(ctx, cleanQuestion, 60 + cardPad, questionStartY + 40, cardW - cardPad * 2, 42);
        y += 40;
    }

    // 回复区域标题
    ctx.fillStyle = 'rgba(245,158,11,0.12)';
    ctx.fillRect(60, y, 200, 44);
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 24px "PingFang SC", sans-serif';
    ctx.fillText('军师回复', 76, y + 30);
    y += 56;

    // 回复内容区域
    const contentPad = 28;
    const contentW = w - 120;
    const contentStartY = y;

    // 先计算内容高度
    ctx.fillStyle = '#F1F5F9';
    ctx.font = '28px "PingFang SC", sans-serif';
    const contentEndY = wrapText(ctx, cleanContent, 60 + contentPad, contentStartY + 40, contentW - contentPad * 2, 48, true);
    const contentHeight = contentEndY - contentStartY + 30;

    // 内容背景
    ctx.fillStyle = 'rgba(19,25,38,0.9)';
    ctx.fillRect(60, contentStartY, contentW, contentHeight);
    ctx.strokeStyle = 'rgba(42,52,65,0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(60, contentStartY, contentW, contentHeight);

    // 重新绘制内容文字
    ctx.fillStyle = '#F1F5F9';
    ctx.font = '28px "PingFang SC", sans-serif';
    y = wrapText(ctx, cleanContent, 60 + contentPad, contentStartY + 40, contentW - contentPad * 2, 48, false);
    y += 40;

    // 底部品牌区域（小，不突兀）
    const footerY = Math.min(y + 60, h - 160);
    ctx.fillStyle = 'rgba(245,158,11,0.06)';
    ctx.fillRect(60, footerY, w - 120, 100);
    ctx.strokeStyle = 'rgba(245,158,11,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(60, footerY, w - 120, 100);

    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 22px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AI销冠大脑 · 让每一次沟通都变成成交', w / 2, footerY + 36);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '18px "PingFang SC", sans-serif';
    ctx.fillText('商务合作：范先森  15871485234', w / 2, footerY + 66);

    ctx.fillStyle = 'rgba(148,163,184,0.6)';
    ctx.font = '16px "PingFang SC", sans-serif';
    ctx.fillText('AI生成内容仅供参考，请结合实际情况使用', w / 2, footerY + 92);

    canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        callback(url);
    });

    function wrapText(ctx, text, x, y, maxWidth, lineHeight, measureOnly = false) {
        const chars = text.split('');
        let line = '';
        for (let i = 0; i < chars.length; i++) {
            const testLine = line + chars[i];
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && line.length > 0) {
                if (!measureOnly) ctx.fillText(line, x, y);
                line = chars[i];
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        if (!measureOnly) ctx.fillText(line, x, y);
        return y + lineHeight;
    }
}

/* ========== 分享裂变海报 ========== */
function generateSharePoster(userName, featureName, callback) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const w = 1080, h = 1920;
    canvas.width = w; canvas.height = h;

    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#0F172A');
    bgGrad.addColorStop(0.5, '#1E293B');
    bgGrad.addColorStop(1, '#0F172A');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 100); ctx.lineTo(w - 60, 100);
    ctx.moveTo(60, h - 280); ctx.lineTo(w - 60, h - 280);
    ctx.stroke();

    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 72px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AI销冠大脑', w / 2, 180);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '32px "PingFang SC", sans-serif';
    ctx.fillText('智能销售赋能系统', w / 2, 240);

    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(60, 320, w - 120, 600);
    ctx.strokeStyle = 'rgba(245,158,11,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 320, w - 120, 600);

    ctx.fillStyle = '#F1F5F9';
    ctx.font = 'bold 40px "PingFang SC", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('「' + (userName || '销售精英') + '」推荐', 100, 380);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '28px "PingFang SC", sans-serif';
    ctx.fillText('我正在用AI销冠大脑提升销售业绩', 100, 440);
    ctx.fillText('10大AI销售功能，每天帮我多成交3单', 100, 490);

    const features = ['销冠军师', '聊天记录分析', '朋友圈神器', '卖点提炼', '话术排雷'];
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 32px "PingFang SC", sans-serif';
    ctx.fillText('核心功能：', 100, 560);
    let fy = 600;
    features.forEach((feat) => {
        ctx.fillStyle = 'rgba(245,158,11,0.15)';
        ctx.fillRect(100, fy, 300, 50);
        ctx.strokeStyle = 'rgba(245,158,11,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(100, fy, 300, 50);
        ctx.fillStyle = '#F1F5F9';
        ctx.font = '24px "PingFang SC", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(feat, 250, fy + 34);
        fy += 65;
    });

    const footerY = h - 280;
    ctx.fillStyle = 'rgba(245,158,11,0.05)';
    ctx.fillRect(60, footerY, w - 120, 200);
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 40px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('扫码免费体验，开启AI销售新时代', w / 2, footerY + 60);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '24px "PingFang SC", sans-serif';
    ctx.fillText('AI销冠大脑 | 让每一次沟通都变成成交', w / 2, footerY + 110);
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '20px "PingFang SC", sans-serif';
    ctx.fillText('商务合作：范先森 15871485234', w / 2, footerY + 150);

    canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        callback(url);
    });
}
