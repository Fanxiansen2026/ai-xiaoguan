// ===== API通信与AI调用模块 =====
const API_BASE = "https://api.54xiaoguan.cn";
let lastUserPrompt = '';

// ===== 语音输入模块 =====
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];

// 切换录音状态（toggle）
async function toggleVoiceRecording(btnEl) {
    console.log('[语音] toggleVoiceRecording 被调用, isRecording=', isRecording);
    if (isRecording) {
        // 停止录音
        console.log('[语音] 停止录音, mediaRecorder.state=', mediaRecorder?.state);
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
        return;
    }
    // 开始录音
    try {
        console.log('[语音] 开始请求麦克风权限...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('[语音] 麦克风权限获取成功');
        // 优先用 webm， fallback 到默认
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
        mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        console.log('[语音] MediaRecorder 创建成功, mimeType=', mediaRecorder.mimeType);
        audioChunks = [];
        mediaRecorder.ondataavailable = (e) => { 
            if (e.data.size > 0) { audioChunks.push(e.data); console.log('[语音] 收到音频数据, size=', e.data.size); }
        };
        mediaRecorder.onstop = async () => {
            console.log('[语音] onstop 触发, audioChunks.length=', audioChunks.length);
            stream.getTracks().forEach(t => t.stop());
            const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
            console.log('[语音] 音频Blob创建成功, size=', blob.size, ', type=', blob.type);
            await processAudio(blob);
        };
        mediaRecorder.start();
        console.log('[语音] 录音已开始');
        isRecording = true;
        btnEl.classList.add('recording');
        showToast('🔴 正在录音... 说完了再点一下停止');
        let tip = document.getElementById('recordingTip');
        if (!tip) {
            tip = document.createElement('div');
            tip.id = 'recordingTip';
            tip.className = 'recording-tip';
            tip.textContent = '🔴 正在录音...点击话筒停止';
            document.body.appendChild(tip);
        }
        tip.classList.add('show');
    } catch (e) {
        console.error('[语音] 录音启动失败:', e);
        showToast('❌ 无法访问麦克风，请检查权限');
    }
}

// 上传音频到 Whisper，转文字后直接发 AI
async function processAudio(audioBlob) {
    const tip = document.getElementById('recordingTip');
    if (tip) tip.classList.remove('show');
    const btn = document.getElementById('wxVoiceBtn');
    if (btn) btn.classList.remove('recording');
    isRecording = false;
    showToast('🎤 语音识别中...');
    try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.webm');
        const resp = await fetch(API_BASE + '/whisper', { method: 'POST', body: formData });
        const result = await resp.json();
        if (!resp.ok || result.error) {
            showToast('❌ 语音识别失败：' + (result.error || '未知错误'));
            return;
        }
        const text = result.text;
        if (!text) {
            showToast('❌ 未识别到语音，请重试');
            return;
        }
        showToast('✅ 识别成功！AI 正在理解你的口语化表达...');
        await sendVoiceToAI(text);
    } catch (e) {
        showToast('❌ 语音上传失败：' + e.message);
    }
}

// 把语音识别结果直接发给 AI（不显示在输入框）
async function sendVoiceToAI(text) {
    const f = appState.features.find(x => x.id === appState.currentFeatureId);
    if (!f) return;
    const chatMsgs = $("#chatMessages");
    // 显示用户消息（标注为语音）
    const userHtml = '<div class="msg-content"><div class="msg-bubble"><em>🎤 语音消息（原汁原味口语化表达）</em></div></div><div class="msg-avatar user">我</div>';
    if (!appState.chatCache[appState.currentFeatureId]) appState.chatCache[appState.currentFeatureId] = [];
    appState.chatCache[appState.currentFeatureId].push({ type: 'user', html: userHtml });
    if (chatMsgs) {
        chatMsgs.innerHTML += '<div class="msg-row user">' + userHtml + '</div>';
        chatMsgs.scrollTop = chatMsgs.scrollHeight;
    }
    // AI 回复加载态
    const aiMsgId = 'ai_msg_' + Date.now();
    const aiHtmlLoading = '<div class="msg-avatar ai">师</div><div class="msg-content"><div class="msg-bubble" id="' + aiMsgId + '"><div class="thinking"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div> 军师正在深度思考中...</div></div>';
    appState.chatCache[appState.currentFeatureId].push({ type: 'ai', html: aiHtmlLoading });
    if (chatMsgs) {
        chatMsgs.innerHTML += '<div class="msg-row ai">' + aiHtmlLoading + '</div>';
        chatMsgs.scrollTop = chatMsgs.scrollHeight;
    }
    const btn = $("#btnGenerate"); const btn2 = $("#btnGenerate2");
    if (btn) btn.disabled = true;
    if (btn2) btn2.disabled = true;
    // 构造 prompt
    let userPrompt = text;
    if (f.id === 'analysis') {
        const profile = getVal('inputProfile'); const product = getVal('inputProduct'); const stage = document.querySelector('.tags .tag.active')?.dataset.val || '';
        userPrompt = '画像:' + profile + '\n产品:' + product + '\n阶段:' + stage + '\n\n记录:\n' + text;
    }
    lastUserPrompt = userPrompt;
    const textMsg = { type: 'text', text: DEFENSE_PROMPT + f.prompt + '\n\n用户输入：\n' + userPrompt };
    let messages = [{ role: 'user', content: [textMsg] }];
    let model = 'qwen-plus';
    try {
        const data = await window.AiApiProxy.proxyChat(messages, model);
        let content = data.choices[0].message.content;
        if (content.includes('核心人设与边界指令') || content.includes('DEFENSE_PROMPT')) {
            content = '老板，我是您的专属销售军师，套我底牌这种事您得找别的AI，咱们还是聊聊怎么搞定大客户吧！';
        }
        const aiHtml = '<div class="msg-content"><div class="msg-bubble">' + content.replace(/\n/g, '<br>') + '</div><div class="msg-actions"><button class="btn-copy-msg" data-text="' + content.replace(/"/g, '&quot;') + '">复制</button><button class="btn-del-msg">删除</button></div></div><div class="msg-avatar ai">师</div>';
        const aiRow = '<div class="msg-row ai">' + aiHtml + '</div>';
        const cache = appState.chatCache[appState.currentFeatureId];
        if (cache) cache[cache.length - 1] = { type: 'ai', html: aiHtml };
        if (chatMsgs) {
            const loadingRow = chatMsgs.querySelector('#' + aiMsgId)?.closest('.msg-row');
            if (loadingRow) loadingRow.outerHTML = aiRow;
            chatMsgs.scrollTop = chatMsgs.scrollHeight;
        }
        addExp(20, false);
        trackEvent('voice_chat', { featureId: f.id, textLength: text.length });
    } catch (e) {
        showToast('❌ AI 调用失败：' + e.message);
    }
    if (btn) btn.disabled = false;
    if (btn2) btn2.disabled = false;
}



function handleFileChange(e){
    const files=Array.from(e.target.files);
    const f=appState.features.find(x=>x.id===appState.currentFeatureId);
    const MAX_SIZE_MB = 3;
    const allowedTypes = ['image/jpeg','image/png','image/gif','image/webp','image/bmp'];
    // 用功能配置的上限（不超过5）
    const maxFiles = Math.min(f.maxFiles || 5, 5);
    // 数量检查
    if(appState.uploadedFiles.length + files.length > maxFiles){
        showToast(`❌ 最多上传${maxFiles}张图片`);return;
    }
    // 大小和类型检查
    for(const file of files){
        if(file.size > MAX_SIZE_MB * 1024 * 1024){
            showToast(`❌ ${file.name} 超过${MAX_SIZE_MB}MB，已跳过`);
            continue;
        }
        if(!allowedTypes.includes(file.type)){
            showToast(`❌ ${file.name} 不是有效图片格式，已跳过`);
            continue;
        }
        appState.uploadedFiles.push(file);
    }
    renderFileList();
    e.target.value = '';
}

function fileToBase64(file){return new Promise(resolve=>{const r=new FileReader();r.onload=e=>resolve(e.target.result);r.readAsDataURL(file);});}

async function handleGenerate(isRefresh){
    const f=appState.features.find(x=>x.id===appState.currentFeatureId);
    let input = getVal('wxInputDisplay').trim() || getVal('mainInput').trim();
    if(isRefresh && !input && lastUserPrompt) input = lastUserPrompt;

    const resumeHasData = f.id==='resume' && appState.resumeWizardData && Object.values(appState.resumeWizardData).some(v => v && (Array.isArray(v)?v.length:true));
    if(!input&&appState.uploadedFiles.length===0&&!resumeHasData)return showToast('⚠️ 请输入内容');
    if(input&&input.length<10)return showToast('⚠️ 字数太少，别偷懒哦。描述清晰才有助于成交。');
    
    if(f.id === 'rewrite' && input.length < 50) {
        return showToast('⚠️ 语料太短！请粘贴完整的【对标文案】，否则无法提取爆款逻辑。');
    }

    const progress = getSyncProgress();
    if(progress < 30) showToast('⚠️ 军师不了解你的背景，回答可能跑偏，请尽快完善个人资料！');

    const chatMsgs=$('#chatMessages');
    const isPreset = f.presets.includes(input);

    // 追踪：对话开始
    if (window.trackChatStart) trackChatStart(f.id);

    if(f.isRoleplay){
        appState.roleplayHistory=[{role:'system',content:DEFENSE_PROMPT+f.prompt+'\n\n客户画像：'+input}];
        const userHtml = `<div class="msg-content"><div class="msg-bubble">[系统设定] 客户画像：${input}</div><div class="msg-actions"><button class="btn-copy-msg" data-text="[系统设定] 客户画像：${input}">复制</button><button class="btn-del-msg">删除</button></div></div><div class="msg-avatar user">我</div>`;
        const aiHtml = `<div class="msg-avatar ai">师</div><div class="msg-content"><div class="msg-bubble">客户已就位！我是您设定的客户，请开始您的表演。</div><div class="msg-actions"><button class="btn-copy-msg" data-text="客户已就位！">复制</button><button class="btn-del-msg">删除</button></div></div>`;
        
        appState.chatCache[appState.currentFeatureId] = [{type:'user', html: userHtml},{type:'ai', html: aiHtml}];
        if(chatMsgs) {
            chatMsgs.innerHTML = `<div class="msg-row user">${userHtml}</div><div class="msg-row ai">${aiHtml}</div>`;
            chatMsgs.scrollTop = chatMsgs.scrollHeight;
        }
        addExp(20, isPreset);
        const mainInputEl = $('#mainInput');
        if(mainInputEl) { mainInputEl.value = ''; updateCount(mainInputEl); }
        const wxInputEl = $('#wxInputDisplay');
        if(wxInputEl) wxInputEl.value = '';
        return;
    }

    let userText=input;
    if(appState.uploadedFiles.length>0)userText+=`\n\n[附带了 ${appState.uploadedFiles.length} 个附件]`;
    const userHtml = `<div class="msg-content"><div class="msg-bubble">${userText}</div><div class="msg-actions"><button class="btn-copy-msg" data-text="${userText}">复制</button><button class="btn-del-msg">删除</button></div></div><div class="msg-avatar user">我</div>`;
    
    if(!appState.chatCache[appState.currentFeatureId]) appState.chatCache[appState.currentFeatureId] = [];
    appState.chatCache[appState.currentFeatureId].push({type:'user', html: userHtml});
    if(chatMsgs) {
        chatMsgs.innerHTML += `<div class="msg-row user">${userHtml}</div>`;
        chatMsgs.scrollTop=chatMsgs.scrollHeight;
    }

    const aiMsgId='ai_msg_'+Date.now();
    const aiHtmlLoading = `<div class="msg-avatar ai">师</div><div class="msg-content"><div class="msg-bubble" id="${aiMsgId}"><div class="thinking"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div> 军师正在深度思考中...</div></div>`;
    
    appState.chatCache[appState.currentFeatureId].push({type:'ai', html: aiHtmlLoading});
    if(chatMsgs) {
        chatMsgs.innerHTML += `<div class="msg-row ai">${aiHtmlLoading}</div>`;
        chatMsgs.scrollTop=chatMsgs.scrollHeight;
    }

    const btn=$('#btnGenerate');const btn2=$('#btnGenerate2');if(btn)btn.disabled=true;if(btn2)btn2.disabled=true;

    let userPrompt=input||'';
    if(f.id==='analysis'){
        const profile=getVal('inputProfile');const product=getVal('inputProduct');const stage=document.querySelector('.tags .tag.active')?.dataset.val||'';
        userPrompt=`画像:${profile}\n产品:${product}\n阶段:${stage}\n\n记录:\n${input}`;
    } else if(f.id==='moments'){
        const type=document.querySelector('#momentsTypeTags .tag.active')?.dataset.val;
        if(type==='generate'){
            const stage=document.querySelector('#momentsStageTags .tag.active')?.dataset.val || '信任期';
            const circle=document.querySelector('#momentsCircleTags .tag.active')?.dataset.val || '工作圈';
            const len=document.querySelector('#momentsLenTags .tag.active')?.dataset.val || '短篇';
            const style=document.querySelector('#momentsStyleTags .tag.active')?.dataset.val || '专业干货';
            userPrompt=`生成【${stage}】【${circle}】【${len}】【${style}风格】文案。主题：${input}`;
        } else {
            const stage=document.querySelector('#momentsInteractTags .tag.active')?.dataset.val || '陌生期';
            userPrompt=`生成【${stage}】互动评论。场景：${input}`;
        }
    } else if(f.id==='resume'){
        const d = appState.resumeWizardData || {};
        const softSkills = (d.softSkills||[]).join('、') || '无';
        const certificates = (d.certificates||[]).join('、') || '无';
        userPrompt = `【专业版简历生成】\n\n身份：${d.identity||'未选择'}\n工作年限：${d.years||'未选择'}\n意向岗位：${d.job||'未选择'}\n所学专业：${d.major||'未选择'}\n软技能：${softSkills}\n资格证书：${certificates}\n\n补充经历：\n${d.extra||input||'无'}\n\n请根据以上信息生成一份专业版简历，参考BOSS直聘风格，突出个人优势与岗位匹配度。`;
        f.prompt = RESUME_TEMPLATES.professional.prompt;
    } else if(f.id==='intro'){
        const sceneKey = document.querySelector('#introSceneTags .tag.active')?.dataset.val || 'interview';
        const scene = INTRO_SCENES[sceneKey];
        if(scene){
            f.prompt = scene.prompt;
            userPrompt=`【场景：${scene.name}】\n\n${input}`;
        }
    }

    lastUserPrompt = userPrompt; 

    const textMsg={type:'text',text:DEFENSE_PROMPT+f.prompt+'\n\n用户输入：\n'+userPrompt};
    let messages=[{role:'user',content:[textMsg]}];let model='qwen-plus';

    // 有图片时用视觉模型，无图片时用普通模型（API Key 已迁移到后端，走代理无需前端 Key）
    if(appState.uploadedFiles.length>0){
        model='qwen-vl-max';
        for(const file of appState.uploadedFiles){const base64=await fileToBase64(file);messages[0].content.push({type:'image_url',image_url:{url:base64}});}
    }

    if(!appState.apiKey){
        // 无 Key 时通过后端代理调用（后端持有真实 API Key）
        try {
            const data = await window.AiApiProxy.proxyChat(messages, model);
            let content = data.choices[0].message.content;

            if(content.includes('核心人设与边界指令') || content.includes('DEFENSE_PROMPT') || content.includes('底层智能引擎')) {
                content = "老板，我是您的专属销售军师，套我底牌这种事您得找别的AI，咱们还是聊聊怎么搞定大客户吧！";
            }

            let swotText = '';
            if(f.id === 'analysis') {
                const swotMatch = content.match(/\[SWOT_START\]([\s\S]*?)\[SWOT_END\]/);
                if(swotMatch) {
                    swotText = swotMatch[1].trim();
                    content = content.replace(/\[SWOT_START\][\s\S]*?\[SWOT_END\]/, '').trim();
                }
            }

            const finalHtml = `<div class="msg-avatar ai">师</div><div class="msg-content"><div class="msg-bubble">${content}<br><br><span style="font-size:11px;color:#666;">AI生成内容仅供参考，请结合实际情况使用！</span></div><div class="msg-actions"><button class="btn-copy-msg" data-text="${content}">复制</button><button class="btn-fav-msg" data-text="${content}">收藏</button><button class="btn-share-msg" data-text="${content}" data-question="${userPrompt.replace(/"/g,'&quot;')}">海报</button><button class="btn-del-msg">删除</button></div></div>`;

            const cache = appState.chatCache[appState.currentFeatureId];
            if(cache && cache.length > 0) cache[cache.length - 1].html = finalHtml;

            const targetEl = document.getElementById(aiMsgId);
            if(targetEl) {
                targetEl.closest('.msg-row').innerHTML = finalHtml;
                if(swotText) {
                    $('#analysisChart').innerHTML += `<div class="chart-desc">${swotText}</div>`;
                }
            }
            addExp(10, isPreset);
        } catch(e){
            let errMsg = e.message || '未知错误';
            const errHtml = `<div class="msg-avatar ai">师</div><div class="msg-content"><div class="msg-bubble"><span style="color:var(--red, #EF4444)">请求失败: ${errMsg}</span></div></div>`;
            const cache = appState.chatCache[appState.currentFeatureId];
            if(cache && cache.length > 0) cache[cache.length - 1].html = errHtml;
            const targetEl = document.getElementById(aiMsgId);
            if(targetEl) targetEl.closest('.msg-row').innerHTML = errHtml;
        }
    }

    if(btn)btn.disabled=false;if(btn2)btn2.disabled=false;
    if(chatMsgs) chatMsgs.scrollTop=chatMsgs.scrollHeight;
    
    const mainInputEl = $('#mainInput');
    if(mainInputEl) { mainInputEl.value = ''; updateCount(mainInputEl); }
    const wxInputEl = $('#wxInputDisplay');
    if(wxInputEl) { wxInputEl.value = ''; wxInputEl.focus(); }
    
    appState.uploadedFiles=[];
    renderFileList();

    if(f.id==='heal'){
        const gain = Math.floor(Math.random()*8)+5;
        appState.healHp = Math.min(100, appState.healHp + gain);
        const hpFill = $('#hpFill');
        const hpText = $('#hpText');
        if(hpFill) hpFill.style.width = appState.healHp + '%';
        if(hpText) hpText.textContent = `血量 ${appState.healHp}% (+${gain}%)`;
        Object.keys(appState.healStats).forEach(k=>{appState.healStats[k]=Math.min(100,appState.healStats[k]+Math.floor(Math.random()*5));});
        renderHealChart();
        if(appState.healHp >= 100) showToast('🔥 你的能量超乎想象！此刻能量已爆棚，去拿下那个大单吧！');
        else if(appState.healHp >= 80) showToast('💪 状态回来了！保持这个势头，客户扛不住你的气场！');
        else if(appState.healHp >= 50) showToast('❤️ 血量恢复中，军师陪你一起扛，继续加油！');
        else showToast(`❤️ 血量恢复 +${gain}%！允许自己喘口气，咱们慢慢来。`);
    }
    if(f.id==='roleplay'){
        Object.keys(appState.roleplayStats).forEach(k=>{appState.roleplayStats[k]=Math.min(100,appState.roleplayStats[k]+Math.floor(Math.random()*5));});
        renderRoleplayChart();
    }
    if(f.id==='analysis'){
        Object.keys(appState.analysisStats).forEach(k=>{appState.analysisStats[k]+=Math.floor(Math.random()*5);});
        renderAnalysisChart();
    }
}

async function handleRoleplaySend(){
    const input=$('#roleplayInput');const text=input.value.trim();
    if(!text)return;if(text.length<4)return showToast('⚠️ 话术太短了，多说点！');
    const btn=$('#btnRoleplaySend');btn.disabled=true;btn.textContent='思考中...';input.value='';
    const chatMsgs=$('#chatMessages');
    
    const userHtml = `<div class="msg-content"><div class="msg-bubble">${text}</div><div class="msg-actions"><button class="btn-copy-msg" data-text="${text}">复制</button><button class="btn-del-msg">删除</button></div></div><div class="msg-avatar user">我</div>`;
    if(!appState.chatCache[appState.currentFeatureId]) appState.chatCache[appState.currentFeatureId] = [];
    appState.chatCache[appState.currentFeatureId].push({type:'user', html: userHtml});
    if(chatMsgs) {
        chatMsgs.innerHTML+=`<div class="msg-row user">${userHtml}</div>`;
        chatMsgs.scrollTop=chatMsgs.scrollHeight;
    }
    appState.roleplayHistory.push({role:'user',content:text});
    
    if(appState.roleplayHistory.length > 20) {
        appState.roleplayHistory = [appState.roleplayHistory[0], ...appState.roleplayHistory.slice(-19)];
    }

    const aiMsgId='rp_msg_'+Date.now();
    const aiHtmlLoading = `<div class="msg-avatar ai">师</div><div class="msg-content"><div class="msg-bubble" id="${aiMsgId}"><div class="thinking"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div> 客户正在思考...</div></div>`;
    appState.chatCache[appState.currentFeatureId].push({type:'ai', html: aiHtmlLoading});
    if(chatMsgs) {
        chatMsgs.innerHTML+=`<div class="msg-row ai">${aiHtmlLoading}</div>`;
        chatMsgs.scrollTop=chatMsgs.scrollHeight;
    }
    
    if(!appState.apiKey){
        // 无 Key 时通过后端代理调用
        try{
            const data = await window.AiApiProxy.proxyChat(appState.roleplayHistory, 'qwen-plus');
            let content=data.choices[0].message.content;
            appState.roleplayHistory.push({role:'assistant',content});
            let clientMsg=content;let coachTip='';
            if(content.includes('[COACH_TIP]')){const parts=content.split('[COACH_TIP]');clientMsg=parts[0].trim();coachTip=parts[1].trim();}

            let finalHtml = `<div class="msg-avatar ai">师</div><div class="msg-content"><div class="msg-bubble">${clientMsg}</div><div class="msg-actions"><button class="btn-copy-msg" data-text="${clientMsg}">复制</button><button class="btn-fav-msg" data-text="${clientMsg}">收藏</button><button class="btn-share-msg" data-text="${clientMsg}" data-question="${text.replace(/"/g,'&quot;')}">海报</button><button class="btn-del-msg">删除</button></div>`;
            if(coachTip) finalHtml += `<div class="msg-coach-tip">${coachTip}</div>`;
            finalHtml += `</div>`;

            const cache = appState.chatCache[appState.currentFeatureId];
            if(cache && cache.length > 0) cache[cache.length - 1].html = finalHtml;

            const targetEl = document.getElementById(aiMsgId);
            if(targetEl) targetEl.closest('.msg-row').innerHTML = finalHtml;

            addExp(15, false);
        }catch(e){
            let errMsg = e.message || '未知错误';
            const errHtml = `<div class="msg-avatar ai">师</div><div class="msg-content"><div class="msg-bubble"><span style="color:var(--red, #EF4444)">请求失败: ${errMsg}</span></div></div>`;
            const cache = appState.chatCache[appState.currentFeatureId];
            if(cache && cache.length > 0) cache[cache.length - 1].html = errHtml;
            const targetEl = document.getElementById(aiMsgId);
            if(targetEl) targetEl.closest('.msg-row').innerHTML = errHtml;
        }
    }
    btn.disabled=false;btn.textContent='发送';
    if(chatMsgs) chatMsgs.scrollTop=chatMsgs.scrollHeight;
    input.disabled = false; input.focus();
    Object.keys(appState.roleplayStats).forEach(k=>{appState.roleplayStats[k]=Math.min(100,appState.roleplayStats[k]+Math.floor(Math.random()*5));});
    renderRoleplayChart();
}

function fallback(f,userPrompt,aiMsgId){
    const text=DEFENSE_PROMPT+f.prompt+'\n\n用户输入：\n'+userPrompt;
    safeCopy(text);
    const html = `<div class="msg-avatar ai">师</div><div class="msg-content"><div class="msg-bubble"><strong>📋 Prompt 已复制！</strong><br>请打开通义千问APP粘贴发送。<br>${appState.uploadedFiles.length>0?'<span style="color:var(--red, #EF4444)">⚠️ 请在APP中手动上传图片！</span>':''}<br><br><span style="font-size:11px;color:#666;">AI生成内容仅供参考，请结合实际情况使用！</span></div><div class="msg-actions"><button class="btn-copy-msg" data-text="${text}">复制</button><button class="btn-del-msg">删除</button></div></div>`;
    
    const cache = appState.chatCache[appState.currentFeatureId];
    if(cache && cache.length > 0) cache[cache.length - 1].html = html;
    const targetEl = document.getElementById(aiMsgId);
    if(targetEl) targetEl.closest('.msg-row').innerHTML = html;
}

function handleVoiceStart(e){
    const btn=e.target.closest('.wx-voice-btn');
    if(!btn||!recognition)return;
    if(e.type==='touchstart')e.preventDefault();
    btn.classList.add('recording');recognition.start();showToast('🎙️ 聆听中...');
}
function handleVoiceEnd(e){
    const btn=e.target.closest('.wx-voice-btn');
    if(!btn||!recognition)return;
    if(btn.classList.contains('recording')){btn.classList.remove('recording');recognition.stop();}
}
function initSpeechRecognition(){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){
        // 方案B：不支持时隐藏语音按钮，提示用键盘语音
        document.querySelectorAll('.wx-voice-btn').forEach(btn=>{
            btn.style.display='none';
        });
        // 修改输入框 placeholder 提示
        const inputEl=document.getElementById('wxInputDisplay');
        if(inputEl && inputEl.placeholder && !inputEl.placeholder.includes('键盘')){
            inputEl.placeholder='请输入文字，或点击键盘语音输入';
        }
        return;
    }
    recognition=new SR();recognition.lang='zh-CN';recognition.continuous=false;
    recognition.onresult=e=>{const btn=document.querySelector('.wx-voice-btn.recording');if(btn){const target=$(`#${btn.dataset.target}`);if(target){target.value+=e.results[0][0].transcript;updateCount(target);}}};
    recognition.onerror=()=>{document.querySelectorAll('.wx-voice-btn').forEach(b=>b.classList.remove('recording'));};
}

// 导出给 core.js 调用
window.toggleVoiceRecording = toggleVoiceRecording;
window.processAudio = processAudio;
window.sendVoiceToAI = sendVoiceToAI;
