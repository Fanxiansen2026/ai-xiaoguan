// ===== 后台管理模块 v2.0 =====
// 功能：密码保护 + 激活码管理(卡片式) + 数据看板(v2) + 用户可查自己码

// 管理员密码
const ADMIN_PASSWORD = 'xiaoguan2024';

// 检查是否已通过管理员验证
function isAdminAuthed() {
  return sessionStorage.getItem('admin_auth') === '1';
}

// 全局变量：存储当前密码验证通过后的回调函数
let _adminPwdCallback = null;

// 验证管理员密码 —— 使用自定义弹窗（替代prompt，兼容手机端）
function promptAdminPassword(callback) {
  if (isAdminAuthed()) {
    try { callback(); } catch(e) { console.error('[管理员回调执行失败]', e); }
    return;
  }

  const modal = document.getElementById('adminPwdModal');
  const input = document.getElementById('adminPwdInput');
  const err = document.getElementById('adminPwdError');

  if (!modal || !input) {
    // 降级：如果找不到弹窗元素，用 prompt 兜底
    const pwd = prompt('🔒 请输入管理员密码：');
    if (pwd === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_auth', '1');
      try { callback(); } catch(e) { console.error('[管理员回调执行失败]', e); }
    } else if (pwd !== null) {
      alert('❌ 密码错误！');
    }
    return;
  }

  // 保存回调函数（供全局处理函数调用）
  _adminPwdCallback = callback;

  // 显示弹窗
  input.value = '';
  err.style.display = 'none';
  modal.style.display = 'flex';

  // 自动聚焦
  setTimeout(() => input.focus(), 100);
}

// 全局函数：确认管理员密码（供HTML中的onclick调用）
function confirmAdminPassword() {
  const input = document.getElementById('adminPwdInput');
  const err = document.getElementById('adminPwdError');
  const modal = document.getElementById('adminPwdModal');

  if (!input || !modal) return;

  const pwd = input.value;
  if (pwd === ADMIN_PASSWORD) {
    sessionStorage.setItem('admin_auth', '1');
    modal.style.display = 'none';
    const cb = _adminPwdCallback;
    _adminPwdCallback = null;
    if (cb) {
      try { cb(); } catch(e) { console.error('[管理员回调执行失败]', e); }
    }
  } else {
    err.textContent = '❌ 密码错误，请重试';
    err.style.display = 'block';
    input.value = '';
    input.focus();
  }
}

// 全局函数：取消管理员密码输入
function cancelAdminPassword() {
  const modal = document.getElementById('adminPwdModal');
  if (modal) modal.style.display = 'none';
  _adminPwdCallback = null;
}

// HTML转义工具函数
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function initAdmin(){
    const tabs=$('#adminTabs');
    tabs.innerHTML=`<div class="admin-tab active" data-admin="global">全局与概念</div><div class="admin-tab" data-admin="nav">导航分组管理</div><div class="admin-tab" data-admin="ranks">段位系统管理</div><div class="admin-tab" data-admin="scripts">话术库管理</div><div class="admin-tab" data-admin="activation">激活码管理</div><div class="admin-tab" data-admin="features">功能排序</div><div class="admin-tab" data-admin="analytics">数据看板</div><div class="admin-tab" data-admin="tokens">Token管理</div><div class="admin-tab" data-admin="config">配置管理</div><div class="admin-tab" data-admin="export">数据导出</div>`;
    
    // 默认显示全局设置（不需要密码）
    renderAdminPanel('global');
}

function handleFeatureSort(btn){
    const idx=parseInt(btn.dataset.idx);
    const isUp=btn.classList.contains('sort-up');
    const newIdx=isUp?idx-1:idx+1;
    if(newIdx<0||newIdx>=appState.features.length)return;
    
    const f1=appState.features[idx];
    const f2=appState.features[newIdx];
    [appState.features[idx],appState.features[newIdx]]=[appState.features[newIdx],appState.features[idx]];
    
    appState.navGroups.forEach(g => {
        const i1=g.features.indexOf(f1.id);
        const i2=g.features.indexOf(f2.id);
        if(i1>=0 && i2>=0) {
            [g.features[i1], g.features[i2]] = [g.features[i2], g.features[i1]];
        }
    });
    
    initAdmin(); renderNav(); renderHome(); showToast('✅ 排序已保存');
}

function renderAdminPanel(tab){
    const panel=$('#adminPanel');
    if (!panel) return; // 安全检查
    
    // 更新tab的active状态
    $$(`.admin-tab`).forEach(t=>{
        if(t.dataset && t.dataset.admin){
            t.classList.toggle('active', t.dataset.admin === tab);
        }
    });
    
    // ★★★ 敏感页面需要密码保护 ★★★
    const protectedTabs = ['activation', 'analytics', 'tokens', 'export'];
    if (protectedTabs.includes(tab) && !isAdminAuthed()) {
        // 显示占位提示
        panel.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--sub, #9CA3AF);">
            <div style="font-size:48px;margin-bottom:16px">🔒</div>
            <p style="font-size:18px;font-weight:600;color:var(--txt, #F3F4F6);margin-bottom:8px;">需要管理员权限</p>
            <p style="font-size:13px;">此页面需要管理员密码才能访问</p>
        </div>`;
        // 触发密码输入
        promptAdminPassword(() => {
            _renderPanelSafe(tab);
        });
        return;
    }
    
    _renderPanelSafe(tab);
}

// 安全包装函数：渲染面板并捕获错误
function _renderPanelSafe(tab) {
    const panel = $(`#adminPanel`);
    if (!panel) return;
    
    try {
        _renderPanel(tab, panel);
        
        // 渲染完成后绑定事件
        bindAdminEvents(tab);
    } catch(e) {
        console.error(`[渲染面板失败] tab=${tab}`, e);
        panel.innerHTML = `<div style="text-align:center;padding:40px;color:var(--red, #EF4444);">
            <p>❌ 渲染失败: ${e.message}</p>
            <button class="btn btn-outline" onclick="renderAdminPanel('${tab}')" style="margin-top:16px">重试</button>
        </div>`;
    }
}

// 实际渲染面板内容
function _renderPanel(tab, panel) {
    if(tab==='global'){
        const gc=appState.globalConfig;
        panel.innerHTML=`<h3>🌐 全局与概念设置</h3><div class="admin-grid">
        <div class="form-group"><label class="form-label">百炼 API Key</label><input type="password" class="form-control" id="adminApiKey" value="${appState.apiKey}"></div>
        <div class="form-group"><label class="form-label">默契指数名称</label><input class="form-control" id="gc_syncName" value="${gc.syncName}"></div>
        <div class="form-group"><label class="form-label">商务合作姓名</label><input class="form-control" id="gc_devName" value="${gc.devName}"></div>
        <div class="form-group"><label class="form-label">电话</label><input class="form-control" id="gc_devPhone" value="${gc.devPhone}"></div>
        <div class="form-group"><label class="form-label">微信</label><input class="form-control" id="gc_devWechat" value="${gc.devWechat}"></div>
        <div class="form-group"><label class="form-label">金句轮播间隔 (秒)</label><input type="number" class="form-control" id="gc_fillerInterval" value="${gc.fillerInterval}"></div>
        <div class="form-group"><label class="form-label">经验值增长系数</label><input type="number" step="0.1" class="form-control" id="gc_expMultiplier" value="${gc.expMultiplier||1.0}"></div>
        <div class="form-group">
            <label class="form-label">主题色选择</label>
            <div class="theme-options">
                <label><input type="radio" name="themeColor" value="#F59E0B" ${gc.themeColor==='#F59E0B'?'checked':''}> 尊贵金</label>
                <label><input type="radio" name="themeColor" value="#3B82F6" ${gc.themeColor==='#3B82F6'?'checked':''}> 科技蓝</label>
                <label><input type="radio" name="themeColor" value="#10B981" ${gc.themeColor==='#10B981'?'checked':''}> 翡翠绿</label>
                <label><input type="radio" name="themeColor" value="#EF4444" ${gc.themeColor==='#EF4444'?'checked':''}> 活力红</label>
                <label><input type="radio" name="themeColor" value="#8B5CF6" ${gc.themeColor==='#8B5CF6'?'checked':''}> 魅惑紫</label>
            </div>
        </div>
        </div><div class="form-group"><label class="form-label">默契指数提示语</label><input class="form-control" id="gc_syncHint" value="${gc.syncHint}"></div>
        <div class="form-group"><label class="form-label">控制台大标题</label><input class="form-control" id="gc_title" value="${gc.title}"></div>
        <div class="form-group"><label class="form-label">控制台描述</label><textarea class="form-control" id="gc_desc" style="min-height:60px">${gc.desc}</textarea></div>
        <div class="form-group"><label class="form-label">轮播金句 (每行一条)</label><textarea class="form-control" id="gc_fillers" style="min-height:80px">${gc.fillers.join('\n')}</textarea></div>
        <hr style="border-color:var(--brd, #2A3441);margin:20px 0">
        <h3>🚀 首页 Hero 设置</h3>
        <div class="admin-grid">
            <div class="form-group"><label class="form-label">Hero 大标题</label><input class="form-control" id="gc_heroTitle" value="${gc.heroTitle}"></div>
            <div class="form-group"><label class="form-label">Hero 描述</label><input class="form-control" id="gc_heroDesc" value="${gc.heroDesc}"></div>
            <div class="form-group"><label class="form-label">统计1 数值</label><input class="form-control" id="gc_stat1Val" value="${gc.stat1Val}"></div>
            <div class="form-group"><label class="form-label">统计1 标签</label><input class="form-control" id="gc_stat1Lbl" value="${gc.stat1Lbl}"></div>
            <div class="form-group"><label class="form-label">统计2 数值</label><input class="form-control" id="gc_stat2Val" value="${gc.stat2Val}"></div>
            <div class="form-group"><label class="form-label">统计2 标签</label><input class="form-control" id="gc_stat2Lbl" value="${gc.stat2Lbl}"></div>
            <div class="form-group"><label class="form-label">统计3 数值</label><input class="form-control" id="gc_stat3Val" value="${gc.stat3Val}"></div>
            <div class="form-group"><label class="form-label">统计3 标签</label><input class="form-control" id="gc_stat3Lbl" value="${gc.stat3Lbl}"></div>
        </div>
        <hr style="border-color:var(--brd, #2A3441);margin:20px 0">
        <h3>🌟 用户好评管理 (格式：身份|好评内容，每行一条)</h3>
        <div class="form-group"><textarea class="form-control" id="gc_reviews" style="min-height:150px">${gc.reviews.join('\n')}</textarea></div>
        <button class="btn btn-gold" id="btnSaveGlobal">保存全局设置</button>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px">
        <div><label class="form-label">导出配置</label><textarea class="form-control" id="exportArea" style="min-height:80px;font-size:11px" readonly></textarea><button class="btn btn-outline" id="btnExport" style="margin-top:8px;width:100%">导出</button></div>
        <div><label class="form-label">导入配置</label><textarea class="form-control" id="importArea" style="min-height:80px;font-size:11px"></textarea><button class="btn btn-outline" id="btnImport" style="margin-top:8px;width:100%">导入</button></div></div>`;
    } else if(tab==='nav'){
        panel.innerHTML=`<h3>📂 导航分组管理</h3>`;
        appState.navGroups.forEach((g,i)=>{panel.innerHTML+=`<div class="form-group"><label class="form-label">分组 ${i+1} 名称</label><input class="form-control nav-group-input" data-idx="${i}" value="${g.name}"></div>`;});
        panel.innerHTML+=`<button class="btn btn-gold" id="btnSaveNav">保存分组名称</button>`;
        $('#btnSaveNav').addEventListener('click',()=>{$$('.nav-group-input').forEach(input=>{appState.navGroups[input.dataset.idx].name=input.value;});renderNav();showToast('✅ 分组名称已保存');});
    } else if(tab==='ranks'){
        panel.innerHTML=`<h3>🏆 段位系统管理</h3>`;
        appState.ranks.forEach((r,i)=>{panel.innerHTML+=`<div style="background:var(--input, #1A2235);padding:12px;border-radius:8px;margin-bottom:12px;border:1px solid var(--brd, #2A3441);"><div class="admin-grid"><div class="form-group"><label class="form-label">段位 ${i+1} 名称</label><input class="form-control rank-name" data-idx="${i}" value="${r.name}"></div><div class="form-group"><label class="form-label">所需经验</label><input type="number" class="form-control rank-exp" data-idx="${i}" value="${r.minExp}"></div><div class="form-group"><label class="form-label">图标</label><input class="form-control rank-icon" data-idx="${i}" value="${r.icon}"></div></div><div class="form-group"><label class="form-label">段位特权描述</label><input class="form-control rank-perk" data-idx="${i}" value="${r.perk}"></div></div>`;});
        panel.innerHTML+=`<button class="btn btn-gold" id="btnSaveRanks">保存段位设置</button>`;
        $('#btnSaveRanks').addEventListener('click',()=>{$$('.rank-name').forEach(input=>{const i=input.dataset.idx;appState.ranks[i].name=input.value;appState.ranks[i].minExp=parseInt($('.rank-exp[data-idx="'+i+'"]').value)||0;appState.ranks[i].icon=$('.rank-icon[data-idx="'+i+'"]').value;appState.ranks[i].perk=$('.rank-perk[data-idx="'+i+'"]').value;});appState.ranks.sort((a,b)=>a.minExp-b.minExp);updateUserUI();showToast('✅ 段位设置已保存');});
    } else if(tab==='scripts'){
        panel.innerHTML=`<h3>话术库管理</h3><div class="admin-grid"><div class="form-group"><label class="form-label">分类</label><input class="form-control" id="sCat"></div><div class="form-group"><label class="form-label">标题</label><input class="form-control" id="sTitle"></div></div><div class="form-group"><label class="form-label">内容</label><textarea class="form-control" id="sContent"></textarea></div><button class="btn btn-gold" id="btnAddScript">添加话术</button><hr style="border-color:var(--brd, #2A3441);margin:20px 0"><div id="adminScriptsList"></div>`;
        const list=$('#adminScriptsList');
        const grouped = {};
        appState.scripts.forEach(s=>{if(!grouped[s.cat])grouped[s.cat]=[];grouped[s.cat].push(s);});
        let html = '';
        Object.keys(grouped).forEach(cat=>{
            html += `<div class="script-cat"><div class="script-cat-title">${cat} (${grouped[cat].length}) <span>▼</span></div><div class="script-cat-items">`;
            grouped[cat].forEach(s=>{
                var safe = (s.content||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
                html += '<div class="script-item"><p><span class="title">' + escapeHtml(s.title) + '</span><br>' + escapeHtml(s.content) + '</p><button class="mini-btn btn-copy-script" data-text="' + safe + '">复制</button><button class="mini-btn btn-del-script" data-id="' + s.id + '">删除</button></div>';
            });
            html += `</div></div>`;
        });
        list.innerHTML = html;

    } else if(tab==='activation'){
        // ★★★ 激活码管理 v2.0 - 卡片式布局（参考截图3）★★★
        panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
            <div>
                <h3 style="margin:0;display:inline">🔐 激活码管理</h3>
                <span style="color:var(--sub, #9CA3AF);font-size:12px;margin-left:8px;" id="codeCountBadge">加载中...</span>
            </div>
            <div style="display:flex;gap:8px;">
                <button class="btn btn-outline" id="btnRefreshCodes" style="padding:6px 14px;font-size:12px">🔄 刷新</button>
                <select id="codeFilterType" style="background:var(--input, #1A2235);color:var(--txt, #F3F4F6);border:1px solid var(--brd, #2A3441);border-radius:6px;padding:6px 10px;font-size:12px;">
                    <option value="all">全部类型</option>
                    <option value="trial7">7日体验卡</option>
                    <option value="vip30">月卡VIP</option>
                    <option value="trial1">日卡体验</option>
                </select>
                <select id="codeFilterStatus" style="background:var(--input, #1A2235);color:var(--txt, #F3F4F6);border:1px solid var(--brd, #2A3441);border-radius:6px;padding:6px 10px;font-size:12px;">
                    <option value="all">全部状态</option>
                    <option value="unused">未使用</option>
                    <option value="active">使用中</option>
                    <option value="expired">已过期</option>
                </select>
            </div>
        </div>

        <!-- 统计概览 -->
        <div id="codeOverviewCards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px;">
            <div style="text-align:center;padding:16px;background:var(--input, #1A2235);border-radius:10px;border:1px solid var(--brd, #2A3441);">
                <div style="font-size:28px;font-weight:bold;color:var(--gold, #F59E0B)" id="statTotal">-</div>
                <div style="font-size:11px;color:var(--sub, #9CA3AF)">总激活码</div>
            </div>
            <div style="text-align:center;padding:16px;background:var(--input, #1A2235);border-radius:10px;border:1px solid var(--brd, #2A3441);">
                <div style="font-size:28px;font-weight:bold;color:var(--ok, #10B981)" id="statActive">-</div>
                <div style="font-size:11px;color:var(--sub, #9CA3AF)">激活中</div>
            </div>
            <div style="text-align:center;padding:16px;background:var(--input, #1A2235);border-radius:10px;border:1px solid var(--brd, #2A3441);">
                <div style="font-size:28px;font-weight:bold;color:var(--sub, #9CA3AF);" id="statUnused">-</div>
                <div style="font-size:11px;color:var(--sub, #9CA3AF)">未使用</div>
            </div>
            <div style="text-align:center;padding:16px;background:var(--input, #1A2235);border-radius:10px;border:1px solid var(--brd, #2A3441);">
                <div style="font-size:28px;font-weight:bold;color:var(--red, #EF4444)" id="statDevices">-</div>
                <div style="font-size:11px;color:var(--sub, #9CA3AF)">绑定设备</div>
            </div>
        </div>

        <!-- 激活码列表 -->
        <div id="codeGridContainer" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;">
            <div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--sub, #9CA3AF);">正在加载激活码数据...</div>
        </div>`;

        loadActivationCodeGrid();
        
        $('#btnRefreshCodes')?.addEventListener('click', () => loadActivationCodeGrid());
        $('#codeFilterType')?.addEventListener('change', () => loadActivationCodeGrid());
        $('#codeFilterStatus')?.addEventListener('change', () => loadActivationCodeGrid());

    } else if(tab==='analytics'){
        // ★★★ 数据看板 v2.0（参考截图v2）★★★
        panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 style="margin:0">📊 数据统计分析</h3>
            <button class="btn btn-outline" id="btnRefreshAnalytics" style="padding:6px 14px;font-size:12px">🔄 刷新数据</button>
        </div>
        <div id="analyticsContent">
            <div style="text-align:center;padding:40px;color:var(--sub, #9CA3AF);">正在加载数据...</div>
        </div>`;
        loadAnalyticsDashboard();
        $('#btnRefreshAnalytics')?.addEventListener('click', () => loadAnalyticsDashboard());

    } else if(tab==='config'){
        // 配置管理
        panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 style="margin:0">⚙️ 配置管理</h3>
        </div>
        <div class="admin-grid">
            <div class="form-group">
                <label class="form-label">Whisper API Key (语音识别)</label>
                <input type="password" class="form-control" id="configWhisperKey" placeholder="Dashscope API Key（sk- 开头）">
                <div style="font-size:11px;color:var(--sub, #9CA3AF);margin-top:4px;">用于语音转文字功能。阿里云 Paraformer 兼容 OpenAI Whisper 格式，直接填您的 DASHSCOPE_API_KEY 即可。</div>
            </div>
        </div>
        <button class="btn btn-gold" id="btnSaveConfig">保存配置</button>
        <div id="configSaveStatus" style="margin-top:12px;"></div>`;
        
        // 加载当前配置
        loadConfigSettings();
        
        $('#btnSaveConfig')?.addEventListener('click', () => saveConfigSettings());

    } else if(tab==='export'){
        panel.innerHTML = `<h3>数据导出</h3>
        <div class="export-grid">
            <div class="export-card" id="btnExportChat"><div class="export-icon">💬</div><div class="export-title">导出聊天记录</div><div class="export-desc">备份所有功能对话历史</div></div>
            <div class="export-card" id="btnExportScripts"><div class="export-icon">📚</div><div class="export-title">导出话术库</div><div class="export-desc">备份全部话术数据</div></div>
            <div class="export-card" id="btnExportProfile"><div class="export-icon">👤</div><div class="export-title">导出个人数据</div><div class="export-desc">备份用户资料与配置</div></div>
            <div class="export-card" id="btnExportFull"><div class="export-icon">📦</div><div class="export-title">完整备份</div><div class="export-desc">一键导出所有数据</div></div>
        </div>`;
        
        $('#btnExportChat').addEventListener('click',()=>exportData('chat'));
        $('#btnExportScripts').addEventListener('click',()=>exportData('scripts'));
        $('#btnExportProfile').addEventListener('click',()=>exportData('profile'));
        $('#btnExportFull').addEventListener('click',()=>exportData('full'));
    } else if(tab==='features'){
        panel.innerHTML = `<h3>📋 功能排序</h3>
        <div style="font-size:12px;color:var(--sub, #9CA3AF);margin-bottom:16px">💡 点击排序调整功能顺序，点击"配置"编辑详情。</div>`;
        
        appState.navGroups.forEach((g, gi) => {
            let itemsHtml = '';
            g.features.forEach((fid, fi) => {
                const f = appState.features.find(x => x.id === fid);
                if(!f) return;
                itemsHtml += `<div class="feature-sort-item">
                    <span style="font-size:18px;margin-right:8px">${f.icon}</span>
                    <span style="font-weight:600;color:var(--txt, #F3F4F6);flex:1">${f.name}</span>
                    <span class="feature-tag ${PAYWALL_FEATURES.includes(f.id) ? 'vip' : 'free'}" style="margin-right:8px">${PAYWALL_FEATURES.includes(f.id) ? 'VIP' : '免费'}</span>
                    <div style="display:flex;gap:4px;margin-left:8px">
                        <button class="feature-sort-btn" data-action="up" data-gi="${gi}" data-fi="${fi}">↑</button>
                        <button class="feature-sort-btn" data-action="down" data-gi="${gi}" data-fi="${fi}">↓</button>
                        <button class="feature-sort-btn" data-action="config" data-id="${f.id}" style="background:var(--grad);color:#000;border:none">配置</button>
                    </div>
                </div>`;
            });
            
            panel.innerHTML += `<div class="feature-sort-group" data-group="${gi}">
                <div class="feature-sort-group-title" onclick="this.parentElement.classList.toggle('collapsed')">
                    <span style="font-weight:600">${g.name}</span>
                    <span style="color:var(--sub, #9CA3AF);font-size:12px">${g.features.length}个功能</span>
                    <span style="margin-left:auto;font-size:12px">▼</span>
                </div>
                <div class="feature-sort-group-items">${itemsHtml}</div>
            </div>`;
        });
        
        panel.querySelectorAll('.feature-sort-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const action = btn.dataset.action;
                if(action === 'config'){ renderAdminPanel('config_' + btn.dataset.id); return; }
                const gi = parseInt(btn.dataset.gi), fi = parseInt(btn.dataset.fi);
                const g = appState.navGroups[gi];
                if(action === 'up'){ if(fi <= 0) return; [g.features[fi], g.features[fi-1]] = [g.features[fi-1], g.features[fi]]; }
                else if(action === 'down'){ if(fi >= g.features.length - 1) return; [g.features[fi], g.features[fi+1]] = [g.features[fi+1], g.features[fi]]; }
                renderNav(); renderHome(); renderAdminPanel('features'); showToast('✅ 排序已保存');
            });
        });
    } else if(tab.startsWith('config_')){
        const fid = tab.replace('config_', '');
        const f = appState.features.find(x => x.id === fid);
        if(!f) { renderAdminPanel('features'); return; }
        appState.currentFeatureId = fid;
        panel.innerHTML = `<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
            <button class="btn btn-outline" onclick="renderAdminPanel('features')" style="padding:6px 12px;font-size:12px">← 返回功能排序</button>
            <h3 style="margin:0">${f.icon} ${f.name} 设定</h3>
        </div>
        <div class="form-group"><label class="form-label">是否显示</label><select class="form-control" id="f_visible"><option value="true" ${f.visible?'selected':''}>显示</option><option value="false" ${!f.visible?'selected':''}>隐藏</option></select></div>
        <div class="admin-grid">
            <div class="form-group"><label class="form-label">功能名称</label><input class="form-control" id="f_name" value="${f.name}"></div>
            <div class="form-group"><label class="form-label">图标 (Emoji)</label><input class="form-control" id="f_icon" value="${f.icon}"></div>
            <div class="form-group"><label class="form-label">自定义图标</label><input type="file" id="f_customIcon" accept="image/*" class="form-control" style="padding:6px"></div>
            <div class="form-group"><label class="form-label">字数上限</label><input type="number" class="form-control" id="f_maxLen" value="${f.maxLen}"></div>
            <div class="form-group"><label class="form-label">允许语音</label><select class="form-control" id="f_allowVoice"><option value="true" ${f.allowVoice?'selected':''}>是</option><option value="false" ${!f.allowVoice?'selected':''}>否</option></select></div>
            <div class="form-group"><label class="form-label">允许图片</label><select class="form-control" id="f_allowImage"><option value="true" ${f.allowImage?'selected':''}>是</option><option value="false" ${!f.allowImage?'selected':''}>否</option></select></div>
            <div class="form-group"><label class="form-label">允许视频</label><select class="form-control" id="f_allowVideo"><option value="true" ${f.allowVideo?'selected':''}>是</option><option value="false" ${!f.allowVideo?'selected':''}>否</option></select></div>
            <div class="form-group"><label class="form-label">允许文件</label><select class="form-control" id="f_allowFile"><option value="true" ${f.allowFile?'selected':''}>是</option><option value="false" ${!f.allowFile?'selected':''}>否</option></select></div>
            <div class="form-group"><label class="form-label">最大上传数</label><input type="number" class="form-control" id="f_maxFiles" value="${f.maxFiles||0}"></div>
        </div>
        <div class="form-group"><label class="form-label">卡片描述</label><input class="form-control" id="f_desc" value="${f.desc}"></div>
        <div class="form-group"><label class="form-label">输入框Label</label><input class="form-control" id="f_label" value="${f.label}"></div>
        <div class="form-group"><label class="form-label">输入框提示语</label><textarea class="form-control" id="f_placeholder" style="min-height:60px">${f.placeholder}</textarea></div>
        <div class="form-group"><label class="form-label">生成按钮名称</label><input class="form-control" id="f_btnGen" value="${f.btnGen}"></div>
        <div class="admin-grid">
            <div class="form-group"><label class="form-label">预设展示条数</label><input type="number" class="form-control" id="f_presetCount" value="${f.presetCount}"></div>
            <div class="form-group"><label class="form-label">是否随机展示</label><select class="form-control" id="f_presetRandom"><option value="false" ${!f.presetRandom?'selected':''}>否</option><option value="true" ${f.presetRandom?'selected':''}>是</option></select></div>
        </div>
        <div class="form-group"><label class="form-label">预设问题池 (每行一条)</label><textarea class="form-control" id="f_presets" style="min-height:100px">${f.presets.join('\n')}</textarea></div>
        <div class="form-group"><label class="form-label">系统 Prompt</label><textarea class="form-control" id="f_prompt" style="min-height:150px">${f.prompt}</textarea></div>
        <button class="btn btn-gold" id="btnSaveConf">保存设定</button>`;
    } else if(tab==='tokens'){
        // Token 消耗管理
        panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 style="margin:0">📊 Token 消耗管理</h3>
            <button class="btn btn-outline" id="btnRefreshTokens" style="padding:6px 14px;font-size:12px">🔄 刷新数据</button>
        </div>
        <div id="tokenContent">
            <div style="text-align:center;padding:40px;color:var(--sub, #9CA3AF);">⏳ 正在加载 Token 消耗数据...</div>
        </div>`;
        loadTokenManagement();
        $('#btnRefreshTokens')?.addEventListener('click', () => loadTokenManagement());
        
    }
}

// ============================================================
// ★★★ 激活码管理：从 Worker 加载全量数据并渲染卡片 ★★★
// ============================================================
async function loadActivationCodeGrid() {
    const grid = document.getElementById('codeGridContainer');
    if (!grid) return;
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--sub, #9CA3AF);">⏳ 正在加载...</div>';

    try {
        const WORKER_URL = window.AiApiProxy?.WORKER_URL || 'https://api.54xiaoguan.cn';
        const res = await fetch(`${WORKER_URL}/admin/codes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminPassword: ADMIN_PASSWORD })
        });
        const data = await res.json();

        if (!data.success) throw new Error(data.error);

        const stats = data.stats;
        const codes = data.codes;

        // 更新统计数字
        const el = (id) => document.getElementById(id);
        if(el('statTotal')) el('statTotal').textContent = stats.total;
        if(el('statActive')) el('statActive').textContent = stats.active;
        if(el('statUnused')) el('statUnused').textContent = stats.unused;
        if(el('statDevices')) el('statDevices').textContent = stats.totalDevices;
        if(el('codeCountBadge')) el('codeCountBadge').textContent = `共${stats.total}个 | ${stats.active}激活 | ${stats.unused}未用`;

        // 应用筛选
        const typeFilter = document.getElementById('codeFilterType')?.value || 'all';
        const statusFilter = document.getElementById('codeFilterStatus')?.value || 'all';
        let filtered = codes;
        if (typeFilter !== 'all') filtered = filtered.filter(c => c.type === typeFilter);
        if (statusFilter !== 'all') filtered = filtered.filter(c => c.status === statusFilter);

        // 渲染卡片网格
        if (filtered.length === 0) {
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--sub, #9CA3AF);">📭 没有符合条件的激活码</div>';
            return;
        }

        let html = '';
        filtered.forEach(c => {
            // 类型颜色映射
            const typeColors = { trial7: '#3B82F6', vip30: '#F59E0B', trial1: '#10B981' };
            const typeLabels = { trial7: '7日卡', vip30: '月卡', trial1: '日卡' };
            const statusColors = { active: 'var(--ok, #10B981)', unused: 'var(--sub, #9CA3AF)', expired: 'var(--red, #EF4444)' };
            const statusLabels = { active: '使用中', unused: '未使用', expired: '已过期' };
            const color = typeColors[c.type] || 'var(--gold, #F59E0B)';

            // 设备信息
            const devInfo = c.devices && c.devices.length > 0 
                ? c.devices.map(d => `
                    <div style="font-size:11px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05)">
                        <span style="color:var(--sub, #9CA3AF)">📱 ${d.deviceId.slice(0, 16)}...</span>
                        <span style="float:right;color:var(--ok, #10B981)">活跃</span>
                        <div style="color:var(--sub, #9CA3AF);margin-top:2px">会话:${d.sessions}次 | 对话:${d.chats}次 | 时长:${d.totalDuration || 0}分钟</div>
                    </div>`).join('')
                : '<div style="font-size:11px;color:var(--sub, #9CA3AF);padding:8px 0">未绑定设备</div>';

            html += `
            <div style="background:var(--input, #1A2235);border-radius:10px;border:1px solid var(--brd, #2A3441);overflow:hidden;transition:transform .2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''">
                <div style="padding:14px 14px 10px;display:flex;justify-content:space-between;align-items:flex-start">
                    <div>
                        <div style="font-family:monospace;font-size:15px;font-weight:700;color:${color};letter-spacing:.5px">${c.code}</div>
                        <div style="display:flex;gap:6px;margin-top:6px">
                            <span style="font-size:10px;background:${color}22;color:${color};padding:2px 8px;border-radius:4px;font-weight:600">${typeLabels[c.type] || c.type}</span>
                            <span style="font-size:10px;background:${statusColors[c.status]}22;color:${statusColors[c.status]};padding:2px 8px;border-radius:4px">${statusLabels[c.status]}</span>
                            ${c.deviceCount > 1 ? `<span style="font-size:10px;background:#EF444422;color:#EF4444;padding:2px 6px;border-radius:4px;font-weight:bold">⚠️${c.deviceCount}设备</span>` : ''}
                        </div>
                    </div>
                    <button onclick="navigator.clipboard.writeText('${c.code}');showToast('✅ 已复制')" style="background:none;border:1px solid var(--brd, #2A3441);color:var(--sub, #9CA3AF);cursor:pointer;padding:4px 8px;border-radius:4px;font-size:11px">复制</button>
                </div>
                <div style="padding:0 14px;font-size:11px;color:var(--sub, #9CA3AF);display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;margin-bottom:8px">
                    <span>有效期：<strong>${c.days}天</strong></span>
                    <span>状态：<strong style="color:${statusColors[c.status]}">${statusLabels[c.status]}</strong></span>
                    <span>激活次数：<strong>${c.totalActivations}</strong></span>
                    <span>绑定设备：<strong>${c.deviceCount}</strong></span>
                </div>
                <div style="background:rgba(0,0,0,.15);padding:8px 14px;max-height:120px;overflow-y:auto;">
                    <div style="font-size:10px;color:var(--sub, #9CA3AF);margin-bottom:4px">📋 设备详情：</div>
                    ${devInfo}
                </div>
            </div>`;
        });

        grid.innerHTML = html;

    } catch(e) {
        console.error('[加载激活码失败]', e);
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;">
            <div style="color:var(--red, #EF4444);margin-bottom:8px">❌ 加载失败: ${e.message}</div>
            <div style="font-size:12px;color:var(--sub, #9CA3AF)">请确保Worker已部署到最新版本</div>
        </div>`;
    }
}


// ============================================================
// ★★★ 数据看板 v3.0（全面维度升级） ★★★
// ============================================================
async function loadAnalyticsDashboard() {
    const container = document.getElementById('analyticsContent');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--sub, #9CA3AF);">⏳ 正在加载数据看板...</div>';

    try {
        const WORKER_URL = window.AiApiProxy?.WORKER_URL || 'https://api.54xiaoguan.cn';
        const res = await fetch(`${WORKER_URL}/admin/stats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminPassword: ADMIN_PASSWORD })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || '未知错误');

        const ov = data.overview;
        const features = data.featureRanking || [];
        const fv = data.featureViewVsUsage || [];  // 功能浏览vs使用
        const dailyTrend = data.dailyTrend || [];
        const codeDetails = data.codeDetails || [];

        const totalVisitors = ov.totalVisitors || 0;
        const totalActivations = ov.totalActivations || 0;
        const avgDur = ov.avgDurationMin || 0;
        const bounceRate = ov.bounceRate || 0;
        const activationRate = ov.activationRate || 0;
        const featureUsageRate = ov.featureUsageRate || 0;
        const todayNew = ov.todayNewVisitors || 0;

        const maxFCount = features.length > 0 ? Math.max(...features.map(f => f.count), 1) : 1;

        let html = '';

        // ========== 1. 核心指标卡（8张）==========
        html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:24px;">
            <div style="text-align:center;padding:16px 12px;background:var(--input, #1A2235);border-radius:10px;border:1px solid var(--brd, #2A3441);">
                <div style="font-size:32px;font-weight:bold;color:var(--gold, #F59E0B)">${totalVisitors}</div>
                <div style="font-size:11px;color:var(--sub, #9CA3AF);margin-top:4px">总访客</div>
            </div>
            <div style="text-align:center;padding:16px 12px;background:var(--input, #1A2235);border-radius:10px;border:1px solid var(--brd, #2A3441);">
                <div style="font-size:32px;font-weight:bold;color:#3B82F6">${todayNew}</div>
                <div style="font-size:11px;color:var(--sub, #9CA3AF);margin-top:4px">今日新增</div>
            </div>
            <div style="text-align:center;padding:16px 12px;background:var(--input, #1A2235);border-radius:10px;border:1px solid var(--brd, #2A3441);">
                <div style="font-size:32px;font-weight:bold;color:var(--accent)">${totalActivations}</div>
                <div style="font-size:11px;color:var(--sub, #9CA3AF);margin-top:4px">总激活 <span style="color:${activationRate>=50?'var(--ok, #10B981)':'var(--red, #EF4444)'}">(${activationRate}%)</span></div>
            </div>
            <div style="text-align:center;padding:16px 12px;background:var(--input, #1A2235);border-radius:10px;border:1px solid var(--brd, #2A3441);">
                <div style="font-size:32px;font-weight:bold;color:var(--ok, #10B981)">${ov.totalMessages}</div>
                <div style="font-size:11px;color:var(--sub, #9CA3AF);margin-top:4px">总消息</div>
            </div>
            <div style="text-align:center;padding:16px 12px;background:var(--input, #1A2235);border-radius:10px;border:1px solid var(--brd, #2A3441);">
                <div style="font-size:32px;font-weight:bold;color:#8B5CF6">${ov.totalDurationMin}</div>
                <div style="font-size:11px;color:var(--sub, #9CA3AF);margin-top:4px">总时长(分)</div>
            </div>
            <div style="text-align:center;padding:16px 12px;background:var(--input, #1A2235);border-radius:10px;border:1px solid var(--brd, #2A3441);">
                <div style="font-size:32px;font-weight:bold;color:#F59E0B">${avgDur}</div>
                <div style="font-size:11px;color:var(--sub, #9CA3AF);margin-top:4px">平均时长(分/人)</div>
            </div>
            <div style="text-align:center;padding:16px 12px;background:var(--input, #1A2235);border-radius:10px;border:1px solid var(--brd, #2A3441);">
                <div style="font-size:32px;font-weight:bold;color:${bounceRate>50?'var(--red, #EF4444)':'var(--ok, #10B981)'}">${bounceRate}%</div>
                <div style="font-size:11px;color:var(--sub, #9CA3AF);margin-top:4px">流失率</div>
            </div>
            <div style="text-align:center;padding:16px 12px;background:var(--input, #1A2235);border-radius:10px;border:1px solid var(--brd, #2A3441);">
                <div style="font-size:32px;font-weight:bold;color:${featureUsageRate>=60?'var(--ok, #10B981)':'var(--red, #EF4444)'}">${featureUsageRate}%</div>
                <div style="font-size:11px;color:var(--sub, #9CA3AF);margin-top:4px">功能使用率</div>
            </div>
        </div>`;

        // ========== 2. 转化漏斗 ==========
        const funnelSteps = [
            { label: '访客总数', value: totalVisitors, color: 'var(--gold, #F59E0B)', bg: 'rgba(245,158,11,.1)' },
            { label: '激活人数', value: totalActivations, color: '#3B82F6', bg: 'rgba(59,130,246,.1)' },
            { label: '功能使用', value: totalVisitors - (ov.bounceCount||0), color: 'var(--ok, #10B981)', bg: 'rgba(16,185,129,.1)' },
            { label: '对话消息', value: ov.totalMessages, color: '#8B5CF6', bg: 'rgba(139,92,246,.1)' }
        ];
        const maxFunnel = Math.max(...funnelSteps.map(s => s.value), 1);

        const funnelHtml = funnelSteps.map((s, i) => {
            const pct = Math.max(Math.round(s.value / maxFunnel * 100), 8);
            const convPct = i === 0 ? 100 : Math.round(s.value / funnelSteps[i-1].value * 100);
            return `<div style="margin-bottom:10px">
                <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
                    <span>${s.label}</span>
                    <span style="color:${s.color};font-weight:700">${s.value} <small style="color:var(--sub, #9CA3AF)">(${convPct}%)</small></span>
                </div>
                <div style="height:28px;background:${s.bg};border-radius:6px;overflow:hidden;display:flex;align-items:flex-end">
                    <div style="width:${pct}%;height:100%;background:${s.color};border-radius:6px;transition:width .6s;display:flex;align-items:flex-end;justify-content:flex-end;padding:0 8px;font-size:11px;color:#000;font-weight:600">${pct}%</div>
                </div>
            </div>`;
        }).join('');

        // ========== 3. 功能浏览vs使用对比（新）==========
        const fvHtml = fv.length > 0 ? fv.map(f => {
            const fname = appState.features.find(x=>x.id===f.id)?.name || f.id;
            const vPct = f.viewCount > 0 ? Math.round(f.useCount / f.viewCount * 100) : 0;
            return `<tr style="border-bottom:1px solid rgba(255,255,255,.04)">
                <td style="padding:8px 6px;font-size:12px;color:var(--txt, #F3F4F6)">${fname}</td>
                <td style="padding:8px 6px;text-align:center;font-size:12px">${f.viewCount}</td>
                <td style="padding:8px 6px;text-align:center;font-size:12px;color:var(--ok, #10B981)">${f.useCount}</td>
                <td style="padding:8px 6px;text-align:center">
                    <span style="font-size:11px;color:${vPct>=30?'var(--ok, #10B981)':'var(--red, #EF4444)'};font-weight:600">${vPct}%</span>
                </td>
                <td style="padding:8px 6px;text-align:center">
                    <div style="height:6px;background:rgba(255,255,255,.05);border-radius:3px;width:60px;display:inline-block">
                        <div style="width:${vPct}%;height:100%;background:${vPct>=30?'var(--ok, #10B981)':'var(--red, #EF4444)'};border-radius:3px"></div>
                    </div>
                </td>
            </tr>`;
        }).join('') : '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--sub, #9CA3AF)">暂无数据</td></tr>';

        // ========== 4. 功能使用排行榜 ==========
        const featureHtml = features.map(f => {
            const fname = appState.features.find(x=>x.id===f.id)?.name || f.id;
            const pct = Math.round(f.count / maxFCount * 100);
            return `<div style="margin-bottom:8px">
                <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
                    <span>${fname}</span><span style="color:var(--gold, #F59E0B);font-weight:600">${f.count}次</span>
                </div>
                <div style="height:8px;background:rgba(255,255,255,.05);border-radius:4px;overflow:hidden">
                    <div style="width:${Math.max(pct, 3)}%;height:100%;background:linear-gradient(90deg,var(--gold, #F59E0B),#FFD700);border-radius:4px;transition:width .5s"></div>
                </div>
            </div>`;
        }).join('');

        // ========== 5. 最近7天趋势 ==========
        const maxDaily = dailyTrend.length > 0 ? Math.max(...dailyTrend.map(d => d.activeUsers), 1) : 1;
        const trendBars = dailyTrend.map(d => {
            const h = Math.max(Math.round(d.activeUsers / maxDaily * 100), d.activeUsers > 0 ? 8 : 2);
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
                <span style="font-size:11px;font-weight:600;color:var(--gold, #F59E0B)">${d.activeUsers}</span>
                <div style="width:100%;max-width:32px;height:60px;background:rgba(255,255,255,.03);border-radius:4px 4px 0 0;display:flex;align-items:flex-end">
                    <div style="width:100%;height:${h}%;background:linear-gradient(to top,var(--gold, #F59E0B),rgba(245,158,11,.3));border-radius:4px;transition:height .5s"></div>
                </div>
                <span style="font-size:9px;color:var(--sub, #9CA3AF)">${d.date ? d.date.slice(5) : ''}</span>
            </div>`;
        }).join('');

        // 组装左侧+右侧2列
        html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
            <!-- 左：转化漏斗 + 功能浏览vs使用 -->
            <div>
                <div style="background:var(--input, #1A2235);border-radius:10px;border:1px solid var(--brd, #2A3441);padding:16px;margin-bottom:16px;">
                    <div style="font-size:14px;font-weight:700;margin-bottom:14px">🔄 转化漏斗</div>
                    ${funnelHtml}
                </div>
                <div style="background:var(--input, #1A2235);border-radius:10px;border:1px solid var(--brd, #2A3441);padding:16px;">
                    <div style="font-size:14px;font-weight:700;margin-bottom:4px">👁️ 功能浏览 vs 使用</div>
                    <div style="font-size:11px;color:var(--sub, #9CA3AF);margin-bottom:10px">看看用户看了但没用的功能（流失点）</div>
                    <table style="width:100%;font-size:12px;border-collapse:collapse">
                        <thead><tr style="color:var(--sub, #9CA3AF);font-size:11px">
                            <th style="text-align:left;padding:6px">功能</th>
                            <th style="text-align:center;padding:6px">浏览</th>
                            <th style="text-align:center;padding:6px">使用</th>
                            <th style="text-align:center;padding:6px">转化率</th>
                            <th style="text-align:center;padding:6px"></th>
                        </tr></thead>
                        <tbody>${fvHtml}</tbody>
                    </table>
                </div>
            </div>
            <!-- 右：功能排行 + 7日趋势 -->
            <div>
                <div style="background:var(--input, #1A2235);border-radius:10px;border:1px solid var(--brd, #2A3441);padding:16px;margin-bottom:16px;">
                    <div style="font-size:14px;font-weight:700;margin-bottom:12px">🔥 功能使用排行榜</div>
                    ${featureHtml || '<div style="text-align:center;color:var(--sub, #9CA3AF);padding:20px">暂无数据</div>'}
                </div>
                <div style="background:var(--input, #1A2235);border-radius:10px;border:1px solid var(--brd, #2A3441);padding:16px;">
                    <div style="font-size:14px;font-weight:700;margin-bottom:12px">📈 最近7天活跃趋势</div>
                    <div style="display:flex;gap:8px;align-items:flex-end;height:110px;padding:0 8px">
                        ${trendBars || '<div style="color:var(--sub, #9CA3AF);width:100%;text-align:center;padding:30px">暂无数据</div>'}
                    </div>
                </div>
            </div>
        </div>`;

        // ========== 6. 激活码使用明细表（可点击展开）==========
        html += `<div style="background:var(--input, #1A2235);border-radius:10px;border:1px solid var(--brd, #2A3441);padding:16px;margin-bottom:24px;">
            <div style="font-size:14px;font-weight:700;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center">
                <span>📋 激活码使用明细（点击展开详情）</span>
                <span style="font-size:11px;color:var(--sub, #9CA3AF)">共 ${codeDetails.length} 个已激活码</span>
            </div>
            <div style="font-size:11px;color:var(--sub, #9CA3AF);margin-bottom:12px">点击某一行查看该激活码对应用户使用了哪些功能、停留多久</div>
            <div style="overflow-x:auto;">
                <table style="width:100%;font-size:12px;border-collapse:collapse" id="codeDetailsTable">
                    <thead><tr style="border-bottom:1px solid var(--brd, #2A3441);color:var(--sub, #9CA3AF)">
                        <th style="text-align:left;padding:8px 6px;font-weight:600">激活码</th>
                        <th style="text-align:left;padding:8px 6px;font-weight:600">类型</th>
                        <th style="text-align:center;padding:8px 6px;font-weight:600">设备</th>
                        <th style="text-align:center;padding:8px 6px;font-weight:600">会话</th>
                        <th style="text-align:center;padding:8px 6px;font-weight:600">对话</th>
                        <th style="text-align:center;padding:8px 6px;font-weight:600">时长(分)</th>
                        <th style="text-align:center;padding:8px 6px;font-weight:600">激活时间</th>
                        <th style="text-align:center;padding:8px 6px;font-weight:600">Token消耗</th>
                        <th style="text-align:center;padding:8px 6px;font-weight:600">最后使用</th>
                    </tr></thead>
                    <tbody>`;

        codeDetails.forEach((c, idx) => {
            const statusColor = c.isExpired ? 'var(--red, #EF4444)' : c.deviceCount > 0 ? 'var(--ok, #10B981)' : 'var(--sub, #9CA3AF)';
            const lastDate = c.lastUsed ? new Date(c.lastUsed).toLocaleDateString('zh-CN') : '-';
            const firstDate = c.firstUsed ? new Date(c.firstUsed).toLocaleDateString('zh-CN') : '-';
            const codeId = `code-detail-${idx}`;
            html += `<tr style="border-bottom:1px solid rgba(255,255,255,.04);cursor:pointer" onclick="toggleCodeDetail('${codeId}')" id="row-${codeId}">
                <td style="padding:8px 6px;font-family:monospace;font-size:12px;color:var(--gold, #F59E0B)">${c.code}</td>
                <td style="padding:8px 6px;font-size:11px">${c.label}</td>
                <td style="padding:8px 6px;text-align:center;font-size:11px">${c.deviceCount}</td>
                <td style="padding:8px 6px;text-align:center;font-size:11px">${c.totalSessions}</td>
                <td style="padding:8px 6px;text-align:center;font-size:11px;color:var(--ok, #10B981)">${c.totalChats}</td>
                <td style="padding:8px 6px;text-align:center;font-size:11px">${c.totalDurationMin}</td>
                <td style="padding:8px 6px;text-align:center;font-size:11px;color:var(--accent)">${firstDate}</td>
                <td style="padding:8px 6px;text-align:center;font-size:11px;color:#8B5CF6">${c.totalTokens || 0}</td>
                <td style="padding:8px 6px;text-align:center;font-size:11px;color:${statusColor}">${lastDate}</td>
            </tr>
            <tr id="${codeId}" style="display:none">
                <td colspan="9" style="padding:12px;background:rgba(0,0,0,.15);font-size:12px">
                    ${renderCodeDetail(c)}
                </td>
            </tr>`;
        });

        html += `       </tbody>
                </table>
            </div>
        </div>`;

        container.innerHTML = html;

    } catch(e) {
        console.error('[加载看板失败]', e);
        container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--red, #EF4444);">
            ❌ 加载失败: ${e.message}
            <div style="font-size:12px;color:var(--sub, #9CA3AF);margin-top:8px">请确保 Worker 已部署最新版本</div>
        </div>`;
    }
}

// 渲染单个激活码的用户使用详情
function renderCodeDetail(c) {
    if (!c || !c.featureBreakdown) return '<div style="color:var(--sub, #9CA3AF)">暂无详细信息</div>';

    // 功能使用明细
    const featureRows = Object.entries(c.featureBreakdown || {}).map(([fid, cnt]) => {
        const fname = appState.features.find(x=>x.id===fid)?.name || fid;
        return `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04)">
            <span style="color:var(--txt, #F3F4F6)">${fname}</span>
            <span style="color:var(--gold, #F59E0B);font-weight:600">${cnt} 次</span>
        </div>`;
    }).join('');

    // 设备信息
    const devRows = (c.devices || []).map(d => {
        const ua = (d.userAgentShort || '').slice(0, 50);
        return `<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04)">
            <div style="font-size:11px;color:var(--sub, #9CA3AF)">📱 ${d.deviceId ? d.deviceId.slice(0,20) : ''}...</div>
            <div style="display:flex;gap:12px;font-size:11px;margin-top:2px">
                <span>会话:${d.sessions||0}</span>
                <span>对话:${d.chats||0}</span>
                <span>时长:${d.totalDurationMin||0}分</span>
            </div>
            ${ua ? `<div style="font-size:10px;color:var(--sub, #9CA3AF);margin-top:2px">${ua}</div>` : ''}
        </div>`;
    }).join('');

    return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div>
            <div style="font-size:12px;font-weight:700;color:var(--gold, #F59E0B);margin-bottom:8px">📊 功能使用明细</div>
            ${featureRows || '<div style="color:var(--sub, #9CA3AF)">无功能使用记录</div>'}
        </div>
        <div>
            <div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:8px">📱 设备信息</div>
            ${devRows || '<div style="color:var(--sub, #9CA3AF)">无设备信息</div>'}
        </div>
    </div>`;
}

// 展开/收起激活码详情行
function toggleCodeDetail(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = el.style.display === 'none' ? 'table-row' : 'none';
}

// ===== 原有的工具函数 =====
function saveGlobalConfig(){
    const newKey = getVal('adminApiKey').trim();
    appState.apiKey = newKey;
    if(newKey && newKey.startsWith('sk-')){
        localStorage.setItem('ai_sales_api_key', newKey);
    }
    appState.globalConfig.syncName = getVal('gc_syncName');
    appState.globalConfig.syncHint = getVal('gc_syncHint');
    appState.globalConfig.devName = getVal('gc_devName') || '范先森';
    appState.globalConfig.devPhone = getVal('gc_devPhone');
    appState.globalConfig.devWechat = getVal('gc_devWechat');
    appState.globalConfig.title = getVal('gc_title');
    appState.globalConfig.desc = getVal('gc_desc');
    appState.globalConfig.fillers = getVal('gc_fillers').split('\n').filter(x=>x.trim());
    appState.globalConfig.fillerInterval = parseInt(getVal('gc_fillerInterval')) || 3;
    appState.globalConfig.reviews = getVal('gc_reviews').split('\n').filter(x=>x.trim());
    appState.globalConfig.expMultiplier = parseFloat(getVal('gc_expMultiplier')) || 1.0;
    
    appState.globalConfig.heroTitle = getVal('gc_heroTitle');
    appState.globalConfig.heroDesc = getVal('gc_heroDesc');
    appState.globalConfig.stat1Val = getVal('gc_stat1Val');
    appState.globalConfig.stat1Lbl = getVal('gc_stat1Lbl');
    appState.globalConfig.stat2Val = getVal('gc_stat2Val');
    appState.globalConfig.stat2Lbl = getVal('gc_stat2Lbl');
    appState.globalConfig.stat3Val = getVal('gc_stat3Val');
    appState.globalConfig.stat3Lbl = getVal('gc_stat3Lbl');

    const themeRadio = document.querySelector('input[name="themeColor"]:checked');
    if(themeRadio) {
        appState.globalConfig.themeColor = themeRadio.value;
        document.documentElement.style.setProperty('--gold', themeRadio.value);
        const hex = themeRadio.value;
        const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
        const lighter = `rgb(${Math.min(r+40,255)},${Math.min(g+40,255)},${Math.min(b+40,255)})`;
        const darker = `rgb(${Math.max(r-40,0)},${Math.max(g-40,0)},${Math.max(b-40,0)})`;
        document.documentElement.style.setProperty('--grad', `linear-gradient(135deg, ${hex}, ${lighter}, ${darker})`);
    }

    renderHome();renderLanding();updateUserUI();showToast('✅ 全局设置已保存');
}

function saveFeatureConfig(){
    const f=appState.features.find(x=>x.id===appState.currentFeatureId);
    f.visible = getChecked('f_visible');
    f.name = getVal('f_name');
    f.icon = getVal('f_icon');
    f.maxLen = parseInt(getVal('f_maxLen')) || 1500;
    f.allowVoice = getChecked('f_allowVoice');
    f.allowImage = getChecked('f_allowImage');
    f.allowVideo = getChecked('f_allowVideo');
    f.allowFile = getChecked('f_allowFile');
    f.maxFiles = parseInt(getVal('f_maxFiles')) || 0;
    f.desc = getVal('f_desc');
    f.label = getVal('f_label');
    f.placeholder = getVal('f_placeholder');
    f.btnGen = getVal('f_btnGen');
    f.presetCount = parseInt(getVal('f_presetCount')) || 3;
    f.presetRandom = getChecked('f_presetRandom');
    f.presets = getVal('f_presets').split('\n').filter(x=>x.trim());
    f.prompt = getVal('f_prompt');
    
    const file=$('#f_customIcon').files[0];
    if(file){const r=new FileReader();r.onload=e=>{f.customIcon=e.target.result;renderNav();renderHome();showToast('✅ 设定已保存');};r.readAsDataURL(file);}
    else{renderNav();renderHome();showToast('✅ 设定已保存');}
}

function addScript(){appState.scripts.push({id:Date.now(),cat:getVal('sCat'),title:getVal('sTitle'),content:getVal('sContent')});renderAdminPanel('scripts');showToast('✅ 已添加');}

function renderActivationCodeList(filter = 'all'){
    // 旧函数保留兼容，现在主要用 loadActivationCodeGrid
    loadActivationCodeGrid();
}

// 绑定 admin 页面内的事件（针对动态生成的元素）
function bindAdminEvents(tab) {
    if (!tab) return;
    
    if (tab === 'activation') {
        const btnRefresh = document.getElementById('btnRefreshCodes');
        if (btnRefresh) btnRefresh.onclick = () => loadActivationCodeGrid();
        
        const filterType = document.getElementById('codeFilterType');
        if (filterType) filterType.onchange = () => loadActivationCodeGrid();
        
        const filterStatus = document.getElementById('codeFilterStatus');
        if (filterStatus) filterStatus.onchange = () => loadActivationCodeGrid();
        
    } else if (tab === 'analytics') {
        const btnRefresh = document.getElementById('btnRefreshAnalytics');
        if (btnRefresh) btnRefresh.onclick = () => loadAnalyticsDashboard();
        
    } else if (tab === 'scripts') {
        const btnAdd = document.getElementById('btnAddScript');
        if (btnAdd) btnAdd.onclick = addScript;
        
    } else if (tab === 'global') {
        const btnSave = document.getElementById('btnSaveGlobal');
        if (btnSave) btnSave.onclick = saveGlobalConfig;
        
        const btnExport = document.getElementById('btnExport');
        if (btnExport) btnExport.onclick = () => {
            const area = document.getElementById('exportArea');
            if (area) area.value = JSON.stringify(appState, null, 2);
            showToast('✅ 已生成，请复制保存');
        };
        
        const btnImport = document.getElementById('btnImport');
        if (btnImport) btnImport.onclick = () => {
            try {
                const area = document.getElementById('importArea');
                if (!area) return;
                const data = JSON.parse(area.value);
                if(data.user) Object.assign(appState.user, data.user);
                if(data.globalConfig) Object.assign(appState.globalConfig, data.globalConfig);
                if(data.navGroups) appState.navGroups = data.navGroups;
                if(data.ranks) appState.ranks = data.ranks;
                if(data.features) appState.features = data.features;
                if(data.scripts) appState.scripts = data.scripts;
                if(data.apiKey) appState.apiKey = data.apiKey;
                renderNav(); renderHome(); renderAdminPanel('global'); updateUserUI();
                showToast('✅ 导入成功');
            } catch(e) {
                showToast('❌ 格式错误');
            }
        };
        
    } else if (tab === 'features') {
        document.querySelectorAll('.feature-sort-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                if(action === 'config'){ renderAdminPanel('config_' + btn.dataset.id); return; }
                const gi = parseInt(btn.dataset.gi), fi = parseInt(btn.dataset.fi);
                const g = appState.navGroups[gi];
                if(action === 'up'){ if(fi <= 0) return; [g.features[fi], g.features[fi-1]] = [g.features[fi-1], g.features[fi]]; }
                else if(action === 'down'){ if(fi >= g.features.length - 1) return; [g.features[fi], g.features[fi+1]] = [g.features[fi+1], g.features[fi]]; }
                renderNav(); renderHome(); renderAdminPanel('features'); showToast('✅ 排序已保存');
            };
        });
        
    } else if (tab && tab.startsWith('config_')) {
        const btnSave = document.getElementById('btnSaveConf');
        if (btnSave) btnSave.onclick = saveFeatureConfig;
        
    } else if (tab === 'tokens') {
        // Token 管理页面不需要额外的事件绑定
    } else if (tab === 'nav') {
        const btnSave = document.getElementById('btnSaveNav');
        if (btnSave) btnSave.onclick = () => {
            document.querySelectorAll('.nav-group-input').forEach(input => {
                appState.navGroups[input.dataset.idx].name = input.value;
            });
            renderNav();
            showToast('✅ 分组名称已保存');
        };
        
    } else if (tab === 'ranks') {
        const btnSave = document.getElementById('btnSaveRanks');
        if (btnSave) btnSave.onclick = () => {
            document.querySelectorAll('.rank-name').forEach(input => {
                const i = input.dataset.idx;
                appState.ranks[i].name = input.value;
                const expInput = document.querySelector(`.rank-exp[data-idx="${i}"]`);
                appState.ranks[i].minExp = expInput ? (parseInt(expInput.value) || 0) : 0;
                const iconInput = document.querySelector(`.rank-icon[data-idx="${i}"]`);
                appState.ranks[i].icon = iconInput ? (iconInput.value || '') : '';
                const perkInput = document.querySelector(`.rank-perk[data-idx="${i}"]`);
                appState.ranks[i].perk = perkInput ? (perkInput.value || '') : '';
            });
            appState.ranks.sort((a,b) => a.minExp - b.minExp);
            updateUserUI();
            showToast('✅ 段位设置已保存');
        };
        
    } else if (tab === 'export') {
        const btnChat = document.getElementById('btnExportChat');
        if (btnChat) btnChat.onclick = () => exportData('chat');
        
        const btnScripts = document.getElementById('btnExportScripts');
        if (btnScripts) btnScripts.onclick = () => exportData('scripts');
        
        const btnProfile = document.getElementById('btnExportProfile');
        if (btnProfile) btnProfile.onclick = () => exportData('profile');
        
        const btnFull = document.getElementById('btnExportFull');
        if (btnFull) btnFull.onclick = () => exportData('full');
    }
}

// ========== 配置管理功能 ==========
async function loadConfigSettings() {
    try {
        const res = await fetch(API_BASE + '/admin/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminPassword: ADMIN_PASSWORD, action: 'get' })
        });
        const data = await res.json();
        if (data.success) {
            const input = document.getElementById('configWhisperKey');
            if (input) input.value = data.whisperKey || '';
        }
    } catch(e) {
        console.error('[加载配置失败]', e);
    }
}

async function saveConfigSettings() {
    const input = document.getElementById('configWhisperKey');
    const status = document.getElementById('configSaveStatus');
    if (!input) return;
    
    const key = input.value.trim();
    
    try {
        const res = await fetch(API_BASE + '/admin/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminPassword: ADMIN_PASSWORD, action: 'save', whisperKey: key })
        });
        const data = await res.json();
        
        if (status) {
            if (data.success) {
                status.innerHTML = '<div style="color:var(--ok, #10B981);padding:8px;background:rgba(16,185,129,0.1);border-radius:6px;">✅ 配置已保存</div>';
                setTimeout(() => status.innerHTML = '', 3000);
            } else {
                status.innerHTML = '<div style="color:var(--red, #EF4444);padding:8px;background:rgba(239,68,68,0.1);border-radius:6px;">❌ ' + (data.error || '保存失败') + '</div>';
            }
        }
    } catch(e) {
        if (status) {
            status.innerHTML = '<div style="color:var(--red, #EF4444);padding:8px;background:rgba(239,68,68,0.1);border-radius:6px;">❌ 网络错误：' + e.message + '</div>';
        }
    }
}

// ============================================================
// Token 消耗管理
// ============================================================
async function loadTokenManagement() {
    const container = document.getElementById('tokenContent');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--sub, #9CA3AF);">⏳ 正在加载 Token 消耗数据...</div>';
    
    try {
        const WORKER_URL = window.AiApiProxy?.WORKER_URL || 'https://api.54xiaoguan.cn';
        const res = await fetch(`${WORKER_URL}/admin/stats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminPassword: ADMIN_PASSWORD })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || '未知错误');
        
        const codeDetails = data.codeDetails || [];
        const totalTokens = data.overview?.totalTokens || 0;
        
        // 按 Token 消耗排序
        const sorted = [...codeDetails].sort((a, b) => (b.totalTokens || 0) - (a.totalTokens || 0));
        
        let html = '';
        
        // 总览卡片
        html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:24px;">
            <div style="text-align:center;padding:20px;background:var(--input, #1A2235);border-radius:10px;border:1px solid var(--brd, #2A3441);">
                <div style="font-size:32px;font-weight:bold;color:#8B5CF6">${totalTokens}</div>
                <div style="font-size:11px;color:var(--sub, #9CA3AF);margin-top:4px">总 Token 消耗</div>
            </div>
            <div style="text-align:center;padding:20px;background:var(--input, #1A2235);border-radius:10px;border:1px solid var(--brd, #2A3441);">
                <div style="font-size:32px;font-weight:bold;color:var(--gold, #F59E0B)">${codeDetails.length}</div>
                <div style="font-size:11px;color:var(--sub, #9CA3AF);margin-top:4px">已激活码数量</div>
            </div>
        </div>`;
        
        // 表格
        html += `<div style="background:var(--input, #1A2235);border-radius:10px;border:1px solid var(--brd, #2A3441);padding:16px;overflow-x:auto;">
            <table style="width:100%;font-size:12px;border-collapse:collapse">
                <thead><tr style="border-bottom:1px solid var(--brd, #2A3441);color:var(--sub, #9CA3AF)">
                    <th style="text-align:left;padding:8px 6px;font-weight:600">激活码</th>
                    <th style="text-align:left;padding:8px 6px;font-weight:600">类型</th>
                    <th style="text-align:center;padding:8px 6px;font-weight:600">对话次数</th>
                    <th style="text-align:center;padding:8px 6px;font-weight:600">Token 消耗</th>
                    <th style="text-align:center;padding:8px 6px;font-weight:600">平均每次</th>
                    <th style="text-align:center;padding:8px 6px;font-weight:600">最后使用</th>
                </tr></thead>
                <tbody>`;
        
        sorted.forEach(c => {
            const avgTokens = c.totalChats > 0 ? Math.round(c.totalTokens / c.totalChats) : 0;
            const lastDate = c.lastUsed ? new Date(c.lastUsed).toLocaleDateString('zh-CN') : '-';
            const typeLabels = { trial7: '7日卡', vip30: '月卡', trial1: '日卡' };
            html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.04)">
                <td style="padding:8px 6px;font-family:monospace;font-size:12px;color:var(--gold, #F59E0B)">${c.code}</td>
                <td style="padding:8px 6px;font-size:11px">${typeLabels[c.type] || c.type}</td>
                <td style="padding:8px 6px;text-align:center;font-size:11px;color:var(--ok, #10B981)">${c.totalChats}</td>
                <td style="padding:8px 6px;text-align:center;font-size:11px;color:#8B5CF6;font-weight:600">${c.totalTokens || 0}</td>
                <td style="padding:8px 6px;text-align:center;font-size:11px;color:var(--sub, #9CA3AF)">${avgTokens}</td>
                <td style="padding:8px 6px;text-align:center;font-size:11px;color:var(--sub, #9CA3AF)">${lastDate}</td>
            </tr>`;
        });
        
        html += `       </tbody>
            </table>
        </div>`;
        
        container.innerHTML = html;
        
    } catch(e) {
        console.error('[加载 Token 管理失败]', e);
        container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--red, #EF4444);">
            ❌ 加载失败: ${e.message}
            <div style="font-size:12px;color:var(--sub, #9CA3AF);margin-top:8px">请确保 Worker 已部署最新版本</div>
        </div>`;
    }
}
