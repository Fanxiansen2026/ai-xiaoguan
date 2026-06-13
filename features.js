// ===== 功能模块渲染：工作区、个人主页、图表、话术库 =====
function updateMomentsPresets(isGen, type) {
    const mainInput = $('#mainInput');
    const presetContainer = mainInput?.closest('.form-group')?.querySelector('.preset-questions');
    if(!mainInput || !presetContainer) return;
    if(!isGen && type === 'interact') {
        mainInput.placeholder = '描述你要评论的朋友圈内容，或者你和客户的关系阶段。';
        presetContainer.innerHTML = `
            <span class="preset-tag" data-target="mainInput">客户发了一条去三亚旅游的朋友圈，我想评论一下拉近关系，目前处于陌生期。</span>
            <span class="preset-tag" data-target="mainInput">客户发了公司获得行业大奖的朋友圈，我想评论祝贺并顺便提一下我们的合作，目前处于熟悉期。</span>
        `;
    } else {
        mainInput.placeholder = '想发点啥？用语音告诉我。素材越全面输出越准。';
        const f = appState.features.find(x => x.id === 'moments');
        presetContainer.innerHTML = f.presets.slice(0, 3).map(p => `<span class="preset-tag" data-target="mainInput">${p}</span>`).join('');
    }
}

function initWorkspace(featureId){
    appState.currentFeatureId=featureId;
    appState.uploadedFiles=[];
    appState.roleplayHistory=[];
    lastUserPrompt = ''; // 切换功能时清空上次输入，防止刷新污染
    const f=appState.features.find(x=>x.id===featureId);
    const layout=$('#wsLayout');
    
    let guideText = `<strong>💡 ${f.name} 核心价值：</strong> ${f.desc}<br>`;
    if(f.isLibrary) {
        guideText += `<strong>📋 使用指南：</strong> 点击任意话术卡片或右侧按钮即可一键复制。建议结合客户实际情况微调后使用，收藏到微信浮窗随时取用。`;
    } else if(f.id === 'resume') {
        guideText += `<strong>📝 军师建议：</strong> 建议直接<b>复制粘贴</b>您现有的简历内容，或者使用左侧麦克风<b>语音口述</b>您的工作经历，军师帮您生成有“卖相”的专业简历！`;
    } else if(f.allowVoice) {
        guideText += `<strong>🎙️ 军师建议：</strong> 强烈建议点击左侧麦克风<strong>使用语音输入</strong>！打字容易偷懒，语音描述越有画面感、越详细，军师给的策略越精准、越能帮你搞钱！`;
    } else {
        guideText += `<strong>💡 军师建议：</strong> 本功能建议直接<b>打字或复制粘贴</b>详细内容，信息越全面，军师的分析越透彻！`;
    }
    const guideHTML = `<div class="feature-guide">${guideText}</div>`;

    if(f.isLibrary){layout.innerHTML=`<div class="ws-panel" style="grid-column:1/-1;"><div class="ws-header"><span>📚 ${f.name}</span></div><div class="ws-body" id="scriptsList">${guideHTML}</div></div>`;renderScriptsLibrary();return;}
    if(f.isRoleplay){
        layout.innerHTML=`
        <div class="ws-panel">
            <div class="ws-header"><span>🎭 设定对练角色</span></div>
            <div class="ws-body">
                ${guideHTML}
                ${renderInput('mainInput',f.label,f.placeholder,f.presets,f.maxLen,f.presetCount,f.presetRandom)}
                <div class="btn-group"><button class="btn btn-gold" id="btnGenerate">🚀 ${f.btnGen}</button></div>
            </div>
            <div class="chart-wrap">
                <div class="chart-title">📊 对练能力雷达</div>
                <div id="roleplayChart"></div>
            </div>
        </div>
        <div class="ws-panel" style="display:flex;flex-direction:column;">
            <div class="ws-header"><span>💬 实战对练室</span><div class="ws-header-actions"><button id="btnClearChat">清空记录</button></div></div>
            <div class="chat-container" id="roleplayChat">
                <div class="chat-messages" id="chatMessages"></div>
                <div class="quick-replies">
                    <div class="quick-reply">王总，您看这个方案还有什么顾虑吗？</div>
                    <div class="quick-reply">价格方面我再去跟公司申请一下</div>
                    <div class="quick-reply">那我们下周安排个技术演示？</div>
                </div>
                <div class="wx-input-bar">
                    <button class="wx-voice-btn" id="wxVoiceBtn" data-target="roleplayInput" onclick="toggleVoiceRecording(this)">🎙️</button>
                    <textarea class="wx-input" id="roleplayInput" placeholder="输入你的话术..." rows="1"></textarea>
                    <button class="wx-send-btn" id="btnRoleplaySend">发送</button>
                </div>
            </div>
        </div>`;
        renderRoleplayChart();
        restoreChatCache();
        return;
    }
    let extraHTML='';
    if(f.id==='analysis'){
        extraHTML=`
        ${renderInput('inputProfile','客户画像(必填)','请详细描述：年龄/职业/性格/消费习惯',['35岁私企老板，性格谨慎多疑，极度看重投资回报率，对新技术有防备心，决策周期长。','28岁宝妈，时间碎片化，对价格极其敏感，喜欢比价，容易被情绪化文案打动，注重售后保障。','45岁国企采购，流程繁琐，不求有功但求无过，看重资质和合规性，不喜欢太激进的推销。'],f.maxLen)}
        ${renderInput('inputProduct','主推产品(必填)','请描述：产品名/核心卖点/价格/优势',['29800元企业版SaaS，主打自动化流程，能帮客户省下2个文员的人力成本，支持免费试用7天。','1980元年度私教卡，承诺无效退款，教练拥有国家级认证，主打定制化减脂塑形，送3节体验课。','99元引流体验装，低门槛获客产品，主打大牌平替成分，转化率高达30%，用于后续升单铺垫。'],f.maxLen)}
        <div class="form-group"><label class="form-label">客户当前阶段</label><div class="tags"><div class="tag active" data-val="初次接触">初次接触</div><div class="tag" data-val="需求挖掘">需求挖掘</div><div class="tag" data-val="方案报价">方案报价</div><div class="tag" data-val="异议处理">异议处理</div><div class="tag" data-val="逼单转化">逼单转化</div></div></div>`;
    } else if(f.id==='moments'){
        extraHTML=`
        <div class="form-group"><label class="form-label">功能选择</label><div class="tags" id="momentsTypeTags"><div class="tag active" data-val="generate">生成文案</div><div class="tag" data-val="interact">互动评论</div></div></div>
        <div class="form-group" id="momentsStageGroup"><label class="form-label">发圈阶段</label><div class="tags" id="momentsStageTags"><div class="tag active" data-val="信任期">信任期</div><div class="tag" data-val="发售期">发售期</div><div class="tag" data-val="日常篇">日常篇</div></div></div>
        <div class="form-group" id="momentsCircleGroup"><label class="form-label">发圈类型</label><div class="tags" id="momentsCircleTags"><div class="tag active" data-val="工作圈">工作圈</div><div class="tag" data-val="生活圈">生活圈</div></div></div>
        <div class="form-group" id="momentsLenGroup"><label class="form-label">篇幅长度</label><div class="tags" id="momentsLenTags"><div class="tag active" data-val="短篇">短篇</div><div class="tag" data-val="中篇">中篇</div><div class="tag" data-val="长篇">长篇</div></div></div>
        <div class="form-group" id="momentsStyleGroup"><label class="form-label">风格选择</label><div class="tags" id="momentsStyleTags"><div class="tag active" data-val="专业干货">专业干货</div><div class="tag" data-val="幽默风趣">幽默风趣</div><div class="tag" data-val="走心共鸣">走心共鸣</div><div class="tag" data-val="凡尔赛晒单">凡尔赛晒单</div></div></div>
        <div class="form-group" id="momentsInteractGroup" style="display:none"><label class="form-label">互动阶段</label><div class="tags" id="momentsInteractTags"><div class="tag active" data-val="陌生期">陌生期</div><div class="tag" data-val="熟悉期">熟悉期</div></div></div>`;
    } else if(f.id==='resume'){
        extraHTML=`<div class="resume-wizard" id="resumeWizard"><div id="resumeWizardBubbles" style="display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end;margin-bottom:12px;min-height:28px;align-items:center"></div><div class="resume-wizard-progress" id="resumeWizardProgress"><div class="resume-wizard-progress-dot active"></div><div class="resume-wizard-progress-line"></div><div class="resume-wizard-progress-dot"></div><div class="resume-wizard-progress-line"></div><div class="resume-wizard-progress-dot"></div><div class="resume-wizard-progress-line"></div><div class="resume-wizard-progress-dot"></div><div class="resume-wizard-progress-line"></div><div class="resume-wizard-progress-dot"></div><div class="resume-wizard-progress-line"></div><div class="resume-wizard-progress-dot"></div><div class="resume-wizard-progress-line"></div><div class="resume-wizard-progress-dot"></div></div><div class="resume-wizard-step active" data-step="1" data-key="identity"><div class="resume-wizard-header"><div class="resume-wizard-title">1/7 选择你的身份</div><div class="resume-wizard-sub">选择最符合你当前的状态</div></div><div class="resume-options"><div class="resume-option" data-key="identity" data-val="在校生"><div class="resume-option-icon">🎓</div><div class="resume-option-name">在校生</div><div class="resume-option-desc">尚未毕业，正在求学阶段</div></div><div class="resume-option" data-key="identity" data-val="应届生"><div class="resume-option-icon">📄</div><div class="resume-option-name">应届生</div><div class="resume-option-desc">即将毕业或毕业1年内</div></div><div class="resume-option" data-key="identity" data-val="职场人"><div class="resume-option-icon">💼</div><div class="resume-option-name">职场人</div><div class="resume-option-desc">已有工作经验</div></div></div></div><div class="resume-wizard-step" data-step="2" data-key="years"><div class="resume-wizard-header"><div class="resume-wizard-title">2/7 请选择你的工作年限</div><div class="resume-wizard-sub">选择与你工作经验匹配的级别</div></div><div class="resume-options"><div class="resume-option" data-key="years" data-val="初级[1-3年]"><div class="resume-option-icon">🌱</div><div class="resume-option-name">初级</div><div class="resume-option-desc">1-3年</div></div><div class="resume-option" data-key="years" data-val="中级[3-5年]"><div class="resume-option-icon">🌿</div><div class="resume-option-name">中级</div><div class="resume-option-desc">3-5年</div></div><div class="resume-option" data-key="years" data-val="高级[5-10年]"><div class="resume-option-icon">🌳</div><div class="resume-option-name">高级</div><div class="resume-option-desc">5-10年</div></div><div class="resume-option" data-key="years" data-val="资深[10年+]"><div class="resume-option-icon">🏆</div><div class="resume-option-name">资深</div><div class="resume-option-desc">10年+</div></div></div></div><div class="resume-wizard-step" data-step="3" data-key="job"><div class="resume-wizard-header"><div class="resume-wizard-title">3/7 请选择你的意向岗位</div><div class="resume-wizard-sub">搜索或点击下方标签</div></div><div class="form-group"><input class="form-control" id="resumeJobInput" placeholder="如：大客户销售经理"></div><div class="resume-skill-tags" id="resumeJobTags"><div class="resume-skill-tag" data-key="job" data-val="行政助理">行政助理</div><div class="resume-skill-tag" data-key="job" data-val="护士">护士</div><div class="resume-skill-tag" data-key="job" data-val="幼儿教师">幼儿教师</div><div class="resume-skill-tag" data-key="job" data-val="销售代表">销售代表</div><div class="resume-skill-tag" data-key="job" data-val="会计">会计</div><div class="resume-skill-tag" data-key="job" data-val="新媒体运营">新媒体运营</div><div class="resume-skill-tag" data-key="job" data-val="客服">客服</div><div class="resume-skill-tag" data-key="job" data-val="更多岗位">更多岗位</div></div></div><div class="resume-wizard-step" data-step="4" data-key="major"><div class="resume-wizard-header"><div class="resume-wizard-title">4/7 选择你所学的专业</div><div class="resume-wizard-sub">搜索或点击下方标签</div></div><div class="form-group"><input class="form-control" id="resumeMajorInput" placeholder="如：工商管理"></div><div class="resume-skill-tags" id="resumeMajorTags"><div class="resume-skill-tag" data-key="major" data-val="工商管理">工商管理</div><div class="resume-skill-tag" data-key="major" data-val="护理学">护理学</div><div class="resume-skill-tag" data-key="major" data-val="学前教育">学前教育</div><div class="resume-skill-tag" data-key="major" data-val="电子商务">电子商务</div><div class="resume-skill-tag" data-key="major" data-val="会计学">会计学</div><div class="resume-skill-tag" data-key="major" data-val="市场营销">市场营销</div><div class="resume-skill-tag" data-key="major" data-val="财务管理">财务管理</div><div class="resume-skill-tag" data-key="major" data-val="临床医学">临床医学</div></div></div><div class="resume-wizard-step" data-step="5" data-key="softSkills"><div class="resume-wizard-header"><div class="resume-wizard-title">5/7 请选择下方符合你的软技能</div><div class="resume-wizard-sub">可多选</div></div><div class="resume-skill-tags" id="resumeSoftTags"><div class="resume-skill-tag" data-key="softSkills" data-val="团队协作">团队协作<span class="check">✓</span></div><div class="resume-skill-tag" data-key="softSkills" data-val="行业洞察">行业洞察<span class="check">✓</span></div><div class="resume-skill-tag" data-key="softSkills" data-val="创新思维">创新思维<span class="check">✓</span></div><div class="resume-skill-tag" data-key="softSkills" data-val="决策分析">决策分析<span class="check">✓</span></div><div class="resume-skill-tag" data-key="softSkills" data-val="项目管理">项目管理<span class="check">✓</span></div><div class="resume-skill-tag" data-key="softSkills" data-val="变革管理">变革管理<span class="check">✓</span></div><div class="resume-skill-tag" data-key="softSkills" data-val="批判思维">批判思维<span class="check">✓</span></div><div class="resume-skill-tag" data-key="softSkills" data-val="战略思维">战略思维<span class="check">✓</span></div></div><div class="form-group" style="margin-top:12px"><input class="form-control" id="resumeCustomSoft" placeholder="+ 添加技能"></div></div><div class="resume-wizard-step" data-step="6" data-key="certificates"><div class="resume-wizard-header"><div class="resume-wizard-title">6/7 请填写你获得过的资格证书</div><div class="resume-wizard-sub">可多选</div></div><div class="resume-skill-tags" id="resumeCertTags"><div class="resume-skill-tag" data-key="certificates" data-val="大学英语四级">大学英语四级<span class="check">✓</span></div><div class="resume-skill-tag" data-key="certificates" data-val="大学英语六级">大学英语六级<span class="check">✓</span></div><div class="resume-skill-tag" data-key="certificates" data-val="初级会计证">初级会计证<span class="check">✓</span></div><div class="resume-skill-tag" data-key="certificates" data-val="教师资格证">教师资格证<span class="check">✓</span></div><div class="resume-skill-tag" data-key="certificates" data-val="普通话水平测试">普通话水平测试<span class="check">✓</span></div><div class="resume-skill-tag" data-key="certificates" data-val="计算机二级">计算机二级<span class="check">✓</span></div><div class="resume-skill-tag" data-key="certificates" data-val="医师资格证">医师资格证<span class="check">✓</span></div></div><div class="form-group" style="margin-top:12px"><input class="form-control" id="resumeCustomCert" placeholder="+ 添加其他证书"></div></div><div class="resume-wizard-step" data-step="7" data-key="extra"><div class="resume-wizard-header"><div class="resume-wizard-title">7/7 还有经历想补充吗？</div><div class="resume-wizard-sub">详细说说~</div></div><div class="form-group"><textarea class="form-control" id="resumeExtra" rows="5" placeholder="可以补充其他工作经历、项目细节、个人优势..."></textarea></div><div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><span class="preset-tag" data-append="具有丰富的跨部门协作经验">推荐词：跨部门协作</span><span class="preset-tag" data-append="擅长数据驱动决策">推荐词：数据驱动</span><span class="preset-tag" data-append="具备从0到1搭建团队经验">推荐词：从0到1</span></div></div><div class="resume-wizard-nav"><button class="resume-wizard-btn resume-wizard-btn-prev" id="resumePrevBtn" style="visibility:hidden">上一步</button><button class="resume-wizard-btn resume-wizard-btn-next" id="resumeNextBtn">下一步</button><button class="resume-wizard-btn resume-wizard-btn-generate" id="resumeGenBtn" style="display:none">生成简历</button></div></div>`;
    } else if(f.id==='intro'){
        extraHTML=`
        <div class="form-group"><label class="form-label">使用场景</label><div class="tags" id="introSceneTags">
            <div class="tag active" data-val="interview">面试求职</div>
            <div class="tag" data-val="social">社交破冰</div>
            <div class="tag" data-val="pitch">路演展示</div>
            <div class="tag" data-val="wechat">微信加人</div>
            <div class="tag" data-val="team">团队介绍</div>
            <div class="tag" data-val="short">电梯演讲</div>
        </div></div>`;
    }
    
    let exampleHTML = '';
    if(f.id === 'selling') {
        exampleHTML = `<div class="example-box"><h4>💡 案例对比：普通销售 vs AI提炼</h4><p><b>普通销售：</b>我们的系统有自动化做账功能，速度很快，而且价格便宜。</p><p><b>AI提炼(FABE)：</b>【优势】系统内置RPA自动化做账引擎；【利益】能帮您每月省下2个会计的人力成本（约1.5万元）；【证据】目前已有300+同行企业使用，平均提效80%。</p></div>`;
    } else if(f.id === 'check') {
        exampleHTML = `<div class="example-box"><h4>💡 案例对比：踩雷话术 vs 安全话术</h4><p><b>踩雷话术：</b>王总，这已经是底价了，再便宜我们就亏本了，您要是觉得贵那我也没办法了。（引发反感、推卸责任）</p><p><b>安全话术：</b>王总，我特别理解您的预算考量。这个价格确实触及了我们的成本线，但我可以去跟总监申请多送您半年的维保服务，您看这样是不是更划算？（共情、提供替代价值）</p></div>`;
    } else if(f.id === 'rewrite') {
        exampleHTML = `<div class="example-box"><h4>💡 仿写核心逻辑</h4><p>AI不会照抄原文，而是提取爆款文案的<b>“情绪钩子”</b>、<b>“痛点场景”</b>和<b>“反转结构”</b>，然后完美套用到你的产品上，做到神似而形不同。</p></div>`;
    }

    let showUpload=f.allowImage||f.allowVideo||f.allowFile;
    if(showUpload && !isActivated()) showUpload = false;

    layout.innerHTML=`
    <div class="ws-panel">
        <div class="ws-header"><span>${f.label||'输入信息'}</span></div>
        <div class="ws-body">
            ${guideHTML}
            ${renderInput('mainInput',f.label,f.placeholder,f.presets,f.maxLen,f.presetCount,f.presetRandom)}
            ${extraHTML}
            <div class="btn-group" ${f.id==='resume' && appState.resumeVersion==='professional'?'style="display:none"':''}>
                <button class="btn btn-gold" id="btnGenerate">✨ ${f.btnGen}</button>
                <button class="btn btn-refresh" id="btnRefresh" title="重新生成">🔄</button>
            </div>
            ${exampleHTML}
        </div>
        ${f.id==='analysis'?'<div class="chart-wrap"><div class="chart-title">📊 SWOT分析</div><div id="analysisChart"></div></div>':''}
    </div>
    <div class="ws-panel" style="display:flex;flex-direction:column;">
        <div class="ws-header"><span>💡 军师回复</span><div class="ws-header-actions"><button id="btnClearChat">清空记录</button></div></div>
        <div class="chat-container">
            <div class="chat-messages" id="chatMessages"></div>
            ${showUpload?`<div class="file-list" id="fileList"></div><div class="wx-extra-panel" id="wxExtraPanel">
                <div class="upload-tip" id="uploadTip">${f.id==='analysis'?'📸 上传聊天记录截图（支持5张内，每张≤3MB）':f.id==='selling'?'📸 上传产品介绍/海报图片（支持5张内，每张≤3MB）':f.id==='resume'?'📸 上传现有简历截图（支持5张内，每张≤3MB）':'📸 上传相关图片（支持5张内，每张≤3MB）'}</div>
                ${f.allowImage?'<div class="wx-extra-item" data-type="image"><div class="wx-extra-icon">🖼️</div>图片</div>':''}
                ${f.allowVideo?'<div class="wx-extra-item" data-type="video"><div class="wx-extra-icon">🎥</div>视频</div>':''}
                ${f.allowFile?'<div class="wx-extra-item" data-type="file"><div class="wx-extra-icon">📄</div>文件</div>':''}
            </div>`:''}
            <div class="wx-input-bar">
                ${f.allowVoice?'<button class="wx-voice-btn" id="wxVoiceBtn" data-target="wxInputDisplay" onclick="toggleVoiceRecording(this)">🎙️</button>':''}
                <textarea class="wx-input" id="wxInputDisplay" placeholder="请输入或长按左侧语音..."></textarea>
                ${showUpload?'<button class="wx-plus-btn" id="wxPlusBtn" onclick="document.getElementById('fileInput')?.click()">➕</button>':''}
                <button class="wx-send-btn" id="btnGenerate2">发送</button>
            </div>
            ${showUpload?'<input type="file" id="fileInput" multiple style="display:none">':''}
        </div>
        ${f.id==='heal'?`<div class="hp-bar-wrap"><div class="hp-bar"><div class="hp-fill" id="hpFill" style="width:${appState.healHp}%"></div><div class="hp-text" id="hpText">血量 ${appState.healHp}%</div></div><div class="chart-wrap" style="border-top:none;padding-top:0"><div class="chart-title">🧠 心理能量雷达</div><div id="healChart"></div></div></div>`:''}
    </div>`;
    restoreChatCache();
    if(f.id==='resume') initResumeWizard();
    if(f.id==='analysis') renderAnalysisChart();
    if(f.id==='heal') renderHealChart();
    const btnGen2 = document.getElementById('btnGenerate2');
    if(btnGen2) {
        const newBtn = btnGen2.cloneNode(true);
        btnGen2.parentNode.replaceChild(newBtn, btnGen2);
        newBtn.addEventListener('click', () => handleGenerate(false));
    }
}

function renderScriptsLibrary(){
    const list=$('#scriptsList');
    const guide = list.querySelector('.feature-guide')?.outerHTML || '';
    
    // 收藏夹筛选
    let html = guide;
    html += `<div class="script-toolbar">
        <div class="script-tabs">
            <button class="script-tab active" data-filter="all">全部话术</button>
            <button class="script-tab" data-filter="fav">我的收藏 (${appState.favorites.length})</button>
        </div>
        <button class="script-share-btn" id="btnShareLibrary">分享话术库</button>
    </div>`;
    
    const grouped = {};
    appState.scripts.forEach(s=>{if(!grouped[s.cat])grouped[s.cat]=[];grouped[s.cat].push(s);});
    
    Object.keys(grouped).forEach(cat=>{
        html += `<div class="script-cat collapsed"><div class="script-cat-title">${cat} <span class="script-cat-count">${grouped[cat].length}</span> <span class="script-cat-arrow">▼</span></div><div class="script-cat-items">`;
        grouped[cat].forEach(s=>{
            const isFav = appState.favorites.find(f=>f.scriptId===s.id);
            html += `<div class="script-card" data-id="${s.id}">
                <div class="script-card-header">
                    <span class="script-card-title">${s.title}</span>
                    <div class="script-card-actions">
                        <button class="script-btn-fav ${isFav?'active':''}" data-id="${s.id}" title="${isFav?'已收藏':'点击收藏'}">
                            <span class="fav-icon">${isFav?'★':'☆'}</span>
                            <span class="fav-text">${isFav?'已收藏':'收藏'}</span>
                        </button>

                    </div>
                </div>
                <div class="script-card-body">${s.content}</div>
                <div class="script-card-footer">
                    <button class="script-btn-copy" data-text="${s.content}">一键复制</button>
                </div>
            </div>`;
        });
        html += `</div></div>`;
    });
    list.innerHTML = html;
    
    // 绑定折叠展开
    list.querySelectorAll('.script-cat-title').forEach(title=>{
        title.addEventListener('click', ()=>{
            title.closest('.script-cat').classList.toggle('collapsed');
        });
    });
    
    // 绑定收藏
    list.querySelectorAll('.script-btn-fav').forEach(btn=>{
        btn.addEventListener('click', e=>{
            e.stopPropagation();
            const id = parseInt(btn.closest('.script-card').dataset.id);
            const idx = appState.favorites.findIndex(f=>f.scriptId===id);
            if(idx>=0){
                appState.favorites.splice(idx,1);
                btn.classList.remove('active');
                btn.querySelector('.fav-icon').textContent = '☆';
                btn.querySelector('.fav-text').textContent = '收藏';
                showToast('已取消收藏');
            } else {
                appState.favorites.push({scriptId:id, folderId:'default', addedAt:Date.now()});
                btn.classList.add('active');
                btn.querySelector('.fav-icon').textContent = '★';
                btn.querySelector('.fav-text').textContent = '已收藏';
                showToast('已收藏');
            }
            // 持久化到localStorage
            localStorage.setItem('ai_sales_favorites', JSON.stringify(appState.favorites));
            trackEvent('script_favorite',{action:idx>=0?'remove':'add',scriptId:id});
        });
    });
    
    // 绑定复制
    list.querySelectorAll('.script-btn-copy').forEach(btn=>{
        btn.addEventListener('click', e=>{
            e.stopPropagation();
            safeCopy(btn.dataset.text);
            showToast('话术已复制');
        });
    });
    
    // 绑定tab切换
    bindTabSwitch();
    
    // 绑定分享整个话术库
    const shareBtn = $('#btnShareLibrary');
    if(shareBtn){
        shareBtn.addEventListener('click', ()=>{
            generateSharePoster(appState.user.name || '销售精英', '销冠话术库', url=>{
                showImagePreview(url, '话术库分享海报');
            });
            trackEvent('library_share');
        });
    }
}

function renderFavorites(){
    const list=$('#scriptsList');
    const guide = list.querySelector('.feature-guide')?.outerHTML || '';
    let html = guide;
    html += `<div class="script-toolbar">
        <div class="script-tabs">
            <button class="script-tab" data-filter="all">全部话术</button>
            <button class="script-tab active" data-filter="fav">我的收藏 (${appState.favorites.length})</button>
        </div>
    </div>`;
    
    if(appState.favorites.length === 0){
        html += '<div style="text-align:center;padding:40px;color:var(--sub, #9CA3AF)">暂无收藏，点击生成内容中的"收藏"按钮或话术库中的收藏按钮添加</div>';
        list.innerHTML = html;
        bindTabSwitch();
        return;
    }
    
    const scriptFavs = appState.favorites.filter(f=>f.scriptId);
    const textFavs = appState.favorites.filter(f=>f.text);
    
    if(scriptFavs.length > 0){
        html += '<div class="script-cat collapsed"><div class="script-cat-title">话术库收藏 <span class="script-cat-count">' + scriptFavs.length + '</span> <span class="script-cat-arrow">▼</span></div><div class="script-cat-items">';
        scriptFavs.forEach(fav=>{
            const s = appState.scripts.find(x=>x.id === fav.scriptId);
            if(!s) return;
            html += `<div class="script-card" data-id="${s.id}">
                <div class="script-card-header">
                    <span class="script-card-title">${s.title}</span>
                    <div class="script-card-actions">
                        <button class="script-btn-fav active" data-id="${s.id}" title="已收藏">
                            <span class="fav-icon">★</span>
                            <span class="fav-text">已收藏</span>
                        </button>
                    </div>
                </div>
                <div class="script-card-body">${s.content}</div>
                <div class="script-card-footer">
                    <button class="script-btn-copy" data-text="${s.content}">一键复制</button>
                </div>
            </div>`;
        });
        html += '</div></div>';
    }
    
    if(textFavs.length > 0){
        html += '<div class="script-cat collapsed"><div class="script-cat-title">生成内容收藏 <span class="script-cat-count">' + textFavs.length + '</span> <span class="script-cat-arrow">▼</span></div><div class="script-cat-items">';
        textFavs.forEach((fav, idx)=>{
            html += `<div class="script-card" data-fav-idx="${idx}">
                <div class="script-card-header">
                    <span class="script-card-title">收藏内容 ${idx+1}</span>
                    <div class="script-card-actions">
                        <button class="script-btn-fav active" data-fav-idx="${idx}" title="已收藏">
                            <span class="fav-icon">★</span>
                            <span class="fav-text">已收藏</span>
                        </button>
                    </div>
                </div>
                <div class="script-card-body">${fav.text}</div>
                <div class="script-card-footer">
                    <button class="script-btn-copy" data-text="${fav.text.replace(/"/g,'&quot;')}">一键复制</button>
                </div>
            </div>`;
        });
        html += '</div></div>';
    }
    
    list.innerHTML = html;
    
    list.querySelectorAll('.script-cat-title').forEach(title=>{
        title.addEventListener('click', ()=>{
            title.closest('.script-cat').classList.toggle('collapsed');
        });
    });
    
    list.querySelectorAll('.script-btn-fav').forEach(btn=>{
        btn.addEventListener('click', e=>{
            e.stopPropagation();
            const id = parseInt(btn.closest('.script-card').dataset.id);
            const favIdx = parseInt(btn.closest('.script-card').dataset.favIdx);
            if(id){
                const idx = appState.favorites.findIndex(f=>f.scriptId===id);
                if(idx>=0) appState.favorites.splice(idx,1);
            } else if(!isNaN(favIdx)){
                appState.favorites.splice(favIdx,1);
            }
            localStorage.setItem('ai_sales_favorites', JSON.stringify(appState.favorites));
            showToast('已取消收藏');
            renderFavorites();
        });
    });
    
    list.querySelectorAll('.script-btn-copy').forEach(btn=>{
        btn.addEventListener('click', e=>{
            e.stopPropagation();
            safeCopy(btn.dataset.text);
            showToast('话术已复制');
        });
    });
    
    bindTabSwitch();
}

function bindTabSwitch(){
    const list = $('#scriptsList');
    if(!list) return;
    list.querySelectorAll('.script-tab').forEach(tab=>{
        tab.addEventListener('click', ()=>{
            list.querySelectorAll('.script-tab').forEach(t=>t.classList.remove('active'));
            tab.classList.add('active');
            const filter = tab.dataset.filter;
            if(filter === 'fav'){
                renderFavorites();
            } else {
                renderScriptsLibrary();
            }
        });
    });
}

function showImagePreview(url, title){
    const modal = document.createElement('div');
    modal.className = 'image-preview-modal';
    modal.innerHTML = `
        <div class="image-preview-box">
            <div class="image-preview-header">${title}<button class="image-preview-close">✕</button></div>
            <img src="${url}" class="image-preview-img">
            <div class="image-preview-actions">
                <a href="${url}" download="poster.png" class="btn btn-gold">下载图片</a>
                <button class="btn btn-outline" onclick="this.closest('.image-preview-modal').remove()">关闭</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.querySelector('.image-preview-close').addEventListener('click', ()=>modal.remove());
    modal.addEventListener('click', e=>{if(e.target===modal)modal.remove();});
}

function renderRoleplayChart(){
    const wrap = $('#roleplayChart');
    if(!wrap) return;
    const stats = appState.roleplayStats;
    const colors = ['#F59E0B','#22C55E','#EF4444','#3B82F6'];
    let html = '<div class="pie-legend">';
    Object.keys(stats).forEach((k,i)=>{
        html += `<span><i style="background:${colors[i]}"></i>${k}: ${stats[k]}%</span>`;
    });
    html += '</div>';
    wrap.innerHTML = html;
}

function renderAnalysisChart(){
    const wrap = $('#analysisChart');
    if(!wrap) return;
    const stats = appState.analysisStats;
    const total = Object.values(stats).reduce((a,b)=>a+b,0);
    const colors = ['#10B981','#EF4444','#F59E0B','#6B7280'];
    let gradient = '', acc = 0;
    const keys = Object.keys(stats);
    keys.forEach((k,i)=>{
        const pct = (stats[k]/total)*100;
        gradient += `${colors[i]} ${acc}% ${acc+pct}%`;
        if(i < keys.length-1) gradient += ',';
        acc += pct;
    });
    const desc = `
<b style="color:#10B981">🟢 优势 (Strengths)：</b> 您在客情维护和倾听需求上表现出色，这是建立信任的基石。
<b style="color:#EF4444">🔴 劣势 (Weaknesses)：</b> 逼单环节略显犹豫，价值塑造不够量化，容易陷入价格战。
<b style="color:#F59E0B">🟡 机会 (Opportunities)：</b> 客户对竞品有微词且预算充足，是切入的绝佳窗口期。
<b style="color:#6B7280">⚪ 威胁 (Threats)：</b> 决策链条较长，需警惕竞品中途截胡或内部预算冻结。
`;
    wrap.innerHTML = `<div class="pie-chart" style="background:conic-gradient(${gradient})"></div><div class="pie-legend">${keys.map((k,i)=>`<span><i style="background:${colors[i]}"></i>${k}: ${stats[k]}</span>`).join('')}</div><div class="chart-desc">${desc}</div>`;
}

function renderHealChart(){
    const wrap = $('#healChart');
    if(!wrap) return;
    const stats = appState.healStats;
    const colors = ['#10B981','#3B82F6','#F59E0B','#EF4444'];
    let html = '<div class="pie-legend">';
    Object.keys(stats).forEach((k,i)=>{
        html += `<span><i style="background:${colors[i]}"></i>${k}: ${stats[k]}%</span>`;
    });
    html += '</div>';
    wrap.innerHTML = html;
}

function initProfile(){
    const u=appState.user;const rank=getRank(u.exp);const nextRank=getNextRank(u.exp);const progress=getSyncProgress();const gc=appState.globalConfig;
    const expProgress=nextRank?((u.exp-rank.minExp)/(nextRank.minExp-rank.minExp))*100:100;
    $('#profileLayout').innerHTML=`
    <div class="profile-card">
        <img src="${u.avatar||'https://bailian-bmp-pre.oss-cn-hangzhou.aliyuncs.com/public/system_agent/PlaceHolder.png'}" class="profile-avatar">
        <div class="profile-name">${u.name}</div>
        <div class="profile-rank-badge">${rank.icon} ${rank.name}销售</div>
        <div class="rank-perk">🎁 当前特权：${rank.perk}</div>
        <div class="exp-bar"><div class="exp-fill" style="width:${expProgress}%"></div></div>
        <div class="exp-text">经验值 ${u.exp} ${nextRank?`/ ${nextRank.minExp} (距离 ${nextRank.name} 还需 ${nextRank.minExp-u.exp} 经验)`:' (已达最高段位)'}</div>
        <div style="margin-bottom:20px;">
            <div style="font-size:12px;color:var(--sub, #9CA3AF);margin-bottom:6px;">${gc.syncName}：${progress}%</div>
            <div class="progress-bar" style="height:6px;margin:0 20px;"><div class="progress-fill" style="width:${progress}%"></div></div>
            <div style="font-size:11px;color:var(--gold-l, #FCD34D);margin-top:8px;font-style:italic;">${gc.syncHint}</div>
        </div>
        <div class="profile-stats">
            <div class="stat-item"><div class="stat-val">${u.chatCount}</div><div class="stat-label">对话次数</div></div>
            <div class="stat-item"><div class="stat-val">${u.exp}</div><div class="stat-label">当前经验</div></div>
            <div class="stat-item"><div class="stat-val">${nextRank?nextRank.name:'MAX'}</div><div class="stat-label">下一段位</div></div>
        </div>
    </div>
    <div class="profile-form">
        <h3>📝 完善个人资料 (提升${gc.syncName})</h3>
        <div class="feature-guide" style="margin-bottom:20px;">
            <strong>🧠 为什么必须完善资料？</strong><br>
            AI军师的策略精准度，完全取决于您对自身业务的描述。您填写的行业、客单价、痛点越详细，军师就越能“懂你”，给出的话术和复盘就越能直接帮您搞钱。磨刀不误砍柴工，花3分钟填好，受益整个职业生涯！
        </div>
        <div class="form-group"><label class="form-label">头像</label><input type="file" id="p_avatar" accept="image/*" class="form-control" style="padding:6px"></div>
        <div class="admin-grid">
            <div class="form-group"><label class="form-label">你的姓名/昵称</label><input class="form-control" id="p_name" value="${u.name}"></div>
            <div class="form-group"><label class="form-label">所在行业</label><input class="form-control" id="p_industry" value="${u.industry}" placeholder="如：SaaS软件、医美、保险"></div>
            <div class="form-group"><label class="form-label">主推产品</label><input class="form-control" id="p_product" value="${u.product}" placeholder="如：2999元年度VIP"></div>
            <div class="form-group"><label class="form-label">销售年限</label><input class="form-control" id="p_years" value="${u.years}" placeholder="如：3年"></div>
            <div class="form-group"><label class="form-label">目标客户画像</label><input class="form-control" id="p_target" value="${u.target}" placeholder="如：30-40岁企业老板"></div>
            <div class="form-group"><label class="form-label">平均客单价</label><input class="form-control" id="p_price" value="${u.price}" placeholder="如：5万元"></div>
            <div class="form-group"><label class="form-label">平均成单周期</label><input class="form-control" id="p_cycle" value="${u.cycle}" placeholder="如：1个月"></div>
            <div class="form-group"><label class="form-label">最大竞争对手</label><input class="form-control" id="p_competitor" value="${u.competitor}" placeholder="如：某某同行"></div>
        </div>
        <div class="form-group"><label class="form-label">你的性格特点/销售风格</label><textarea class="form-control" id="p_personality" style="min-height:60px" placeholder="如：性格外向，擅长破冰，但逼单比较弱...">${u.personality}</textarea></div>
        <div class="form-group"><label class="form-label">目前最大的销售痛点</label><textarea class="form-control" id="p_painPoint" style="min-height:60px" placeholder="如：总是找不到关键决策人，或者客户总说太贵了...">${u.painPoint}</textarea></div>
        <div class="form-group"><label class="form-label">你的核心优势/资源</label><textarea class="form-control" id="p_advantage" style="min-height:60px" placeholder="如：有极强的亲和力，或者手里有很多行业人脉...">${u.advantage||''}</textarea></div>
        <button class="btn btn-gold" id="btnSaveProfile">保存资料</button>
    </div>`;
    showPWAInProfile();
}

function saveProfile(){
    const fields = ['name','industry','product','years','target','price','cycle','competitor','personality','painPoint','advantage'];
    for(let f of fields) {
        const val = getVal('p_' + f);
        if(val && (val.trim().length < 2 || /^\d+$/.test(val.trim()))) {
            showToast('⚠️ 请认真填写资料，勿填纯数字或敷衍！AI了解你，建议才准确，这关乎你的业绩！');
            return;
        }
    }
    appState.user.name = getVal('p_name') || '销售精英';
    appState.user.industry = getVal('p_industry');
    appState.user.product = getVal('p_product');
    appState.user.years = getVal('p_years');
    appState.user.personality = getVal('p_personality');
    appState.user.painPoint = getVal('p_painPoint');
    appState.user.target = getVal('p_target');
    appState.user.price = getVal('p_price');
    appState.user.cycle = getVal('p_cycle');
    appState.user.competitor = getVal('p_competitor');
    appState.user.advantage = getVal('p_advantage');
    
    const file=$('#p_avatar').files[0];
    if(file){const r=new FileReader();r.onload=e=>{appState.user.avatar=e.target.result;updateUserUI();initProfile();showToast('✅ 资料已保存');};r.readAsDataURL(file);}
    else{updateUserUI();initProfile();showToast('✅ 资料已保存');}
}

function initResumeWizard(){
    appState.resumeWizardData = appState.resumeWizardData || {identity:'',years:'',job:'',major:'',softSkills:[],certificates:[],extra:''};
    const wizard = $('#resumeWizard');
    if(!wizard) return;
    wizard.addEventListener('click', function(e){
        const opt = e.target.closest('.resume-option');
        if(opt){
            const key = opt.dataset.key;
            opt.parentElement.querySelectorAll('.resume-option').forEach(o=>o.classList.remove('active'));
            opt.classList.add('active');
            appState.resumeWizardData[key] = opt.dataset.val;
            updateResumeWizardBubbles();
            return;
        }
        const tag = e.target.closest('.resume-skill-tag');
        if(tag){
            const key = tag.dataset.key;
            const step = tag.closest('.resume-wizard-step');
            const isMulti = step && (step.dataset.key==='softSkills' || step.dataset.key==='certificates');
            if(isMulti){
                const val = tag.dataset.val;
                const arr = appState.resumeWizardData[key] || [];
                if(tag.classList.contains('active')){
                    tag.classList.remove('active');
                    appState.resumeWizardData[key] = arr.filter(x=>x!==val);
                } else {
                    tag.classList.add('active');
                    if(!arr.includes(val)) arr.push(val);
                    appState.resumeWizardData[key] = arr;
                }
            } else {
                tag.parentElement.querySelectorAll('.resume-skill-tag').forEach(t=>t.classList.remove('active'));
                tag.classList.add('active');
                appState.resumeWizardData[key] = tag.dataset.val;
                const inputId = key==='job'?'resumeJobInput':'resumeMajorInput';
                const input = $(inputId);
                if(input) input.value = tag.dataset.val;
            }
            updateResumeWizardBubbles();
            return;
        }
        const preset = e.target.closest('.preset-tag');
        if(preset){
            const append = preset.dataset.append;
            const ta = $('#resumeExtra');
            if(ta && append){
                ta.value = (ta.value ? ta.value + '\n' : '') + append;
                appState.resumeWizardData.extra = ta.value;
                updateResumeWizardBubbles();
            }
            return;
        }
    });
    const prevBtn = $('#resumePrevBtn');
    const nextBtn = $('#resumeNextBtn');
    const genBtn = $('#resumeGenBtn');
    if(prevBtn) prevBtn.addEventListener('click', resumeWizardPrev);
    if(nextBtn) nextBtn.addEventListener('click', resumeWizardNext);
    if(genBtn) genBtn.addEventListener('click', ()=>handleGenerate(false));
    const jobInput = $('#resumeJobInput');
    if(jobInput) jobInput.addEventListener('input', function(){ appState.resumeWizardData.job = this.value; updateResumeWizardBubbles(); });
    const majorInput = $('#resumeMajorInput');
    if(majorInput) majorInput.addEventListener('input', function(){ appState.resumeWizardData.major = this.value; updateResumeWizardBubbles(); });
    const extraInput = $('#resumeExtra');
    if(extraInput) extraInput.addEventListener('input', function(){ appState.resumeWizardData.extra = this.value; updateResumeWizardBubbles(); });
    const customSoft = $('#resumeCustomSoft');
    if(customSoft) customSoft.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); addResumeCustomTag('softSkills',this); } });
    const customCert = $('#resumeCustomCert');
    if(customCert) customCert.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); addResumeCustomTag('certificates',this); } });
    updateResumeWizardProgress(1);
    updateResumeWizardNav(1);
    updateResumeWizardBubbles();
}

function resumeWizardStep(){ return parseInt($('.resume-wizard-step.active')?.dataset.step || '1'); }

function resumeWizardNext(){
    const step = resumeWizardStep();
    if(step >= 7) return;
    $('.resume-wizard-step.active').classList.remove('active');
    $(`.resume-wizard-step[data-step="${step+1}"]`).classList.add('active');
    updateResumeWizardProgress(step+1);
    updateResumeWizardNav(step+1);
    updateResumeWizardBubbles();
}

function resumeWizardPrev(){
    const step = resumeWizardStep();
    if(step <= 1) return;
    $('.resume-wizard-step.active').classList.remove('active');
    $(`.resume-wizard-step[data-step="${step-1}"]`).classList.add('active');
    updateResumeWizardProgress(step-1);
    updateResumeWizardNav(step-1);
    updateResumeWizardBubbles();
}

function updateResumeWizardProgress(step){
    const dots = document.querySelectorAll('.resume-wizard-progress-dot');
    const lines = document.querySelectorAll('.resume-wizard-progress-line');
    dots.forEach((d,i)=>{ d.classList.toggle('active', i < step); });
    lines.forEach((l,i)=>{ l.classList.toggle('active', i < step-1); });
}

function updateResumeWizardNav(step){
    const prev = $('#resumePrevBtn');
    const next = $('#resumeNextBtn');
    const gen = $('#resumeGenBtn');
    if(prev) prev.style.visibility = step === 1 ? 'hidden' : 'visible';
    if(next) next.style.display = step === 7 ? 'none' : 'inline-block';
    if(gen) gen.style.display = step === 7 ? 'inline-block' : 'none';
}

function addResumeCustomTag(key, inputEl){
    const val = inputEl.value.trim();
    if(!val) return;
    const arr = appState.resumeWizardData[key] || [];
    if(!arr.includes(val)){
        arr.push(val);
        appState.resumeWizardData[key] = arr;
        const container = inputEl.closest('.resume-wizard-step')?.querySelector('.resume-skill-tags');
        if(container){
            const tag = document.createElement('div');
            tag.className = 'resume-skill-tag active';
            tag.dataset.key = key;
            tag.dataset.val = val;
            tag.innerHTML = val + '<span class="check">✓</span>';
            container.appendChild(tag);
        }
    }
    inputEl.value = '';
    updateResumeWizardBubbles();
}

function updateResumeWizardBubbles(){
    const d = appState.resumeWizardData || {};
    const bubbles = [];
    if(d.identity) bubbles.push({k:'身份',v:d.identity});
    if(d.years) bubbles.push({k:'年限',v:d.years});
    if(d.job) bubbles.push({k:'岗位',v:d.job});
    if(d.major) bubbles.push({k:'专业',v:d.major});
    if(d.softSkills && d.softSkills.length) bubbles.push({k:'软技能',v:d.softSkills.join('、')});
    if(d.certificates && d.certificates.length) bubbles.push({k:'证书',v:d.certificates.join('、')});
    if(d.extra) bubbles.push({k:'补充',v:d.extra.substring(0,20)+(d.extra.length>20?'...':'')});
    const wrap = $('#resumeWizardBubbles');
    if(wrap){
        wrap.innerHTML = bubbles.map(b=>`<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:12px;background:#7c3aed;color:#fff;font-size:11px;font-weight:500">${b.k}：${b.v}</span>`).join('');
    }
}
