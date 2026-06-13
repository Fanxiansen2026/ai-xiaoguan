// ===== 后台管理模块 v2.0 =====
// 功能：密码保护 + 激活码管理(卡片式) + 数据看板(v2) + 用户可查自己码

// 管理员密码
const ADMIN_PASSWORD = 'xiaoguan2024';

// 检查是否已通过管理员验证
function isAdminAuthed() {
  return sessionStorage.getItem('admin_auth') === '1';
}

// 验证管理员密码
function promptAdminPassword(callback) {
  if (isAdminAuthed()) {
    callback();
    return;
  }

  const pwd = prompt('🔒 请输入管理员密码：');
  if (pwd === ADMIN_PASSWORD) {
    sessionStorage.setItem('admin_auth', '1');
    callback();
  } else if (pwd !== null) {
    alert('❌ 密码错误！');
  }
}

function initAdmin(){
    const tabs=$('#adminTabs');
    tabs.innerHTML=`<div class="admin-tab active" data-admin="global">全局与概念</div><div class="admin-tab" data-admin="nav">导航分组管理</div><div class="admin-tab" data-admin="ranks">段位系统管理</div><div class="admin-tab" data-admin="scripts">话术库管理</div><div class="admin-tab" data-admin="activation">激活码管理</div><div class="admin-tab" data-admin="features">功能排序</div><div class="admin-tab" data-admin="analytics">数据看板</div><div class="admin-tab" data-admin="export">数据导出</div>`;
    
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
    const panel=$('#adminPanel');$$('.admin-tab').forEach(t=>t.classList.toggle('active',t.dataset.admin===tab));
    
    // ★★★ 敏感页面需要密码保护 ★★★
    const protectedTabs = ['activation', 'analytics', 'export'];
    if (protectedTabs.includes(tab)) {
        promptAdminPassword(() => {
            _renderPanel(tab, panel);
        });
        // 显示一个占位提示（等密码输入后替换）
        panel.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--sub);">
            <div style="font-size:48px;margin-bottom:16px">🔒</div>
            <p style="font-size:18px;font-weight:600;color:var(--txt);margin-bottom:8px;">需要管理员权限</p>
            <p style="font-size:13px;">此页面需要管理员密码才能访问<br>请点击上方选项卡重新触发密码输入</p>
            <button class="btn btn-gold" onclick="promptAdminPassword(()=>renderAdminPanel('${tab}'))" style="margin-top:20px">输入密码解锁</button>
        </div>`;
        $$(`[data-admin="${tab}"]`).classList.add('active');
        return;
    }
    
    _renderPanel(tab, panel);
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
        <hr style="border-color:var(--brd);margin:20px 0">
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
        <hr style="border-color:var(--brd);margin:20px 0">
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
        appState.ranks.forEach((r,i)=>{panel.innerHTML+=`<div style="background:var(--input);padding:12px;border-radius:8px;margin-bottom:12px;border:1px solid var(--brd);"><div class="admin-grid"><div class="form-group"><label class="form-label">段位 ${i+1} 名称</label><input class="form-control rank-name" data-idx="${i}" value="${r.name}"></div><div class="form-group"><label class="form-label">所需经验</label><input type="number" class="form-control rank-exp" data-idx="${i}" value="${r.minExp}"></div><div class="form-group"><label class="form-label">图标</label><input class="form-control rank-icon" data-idx="${i}" value="${r.icon}"></div></div><div class="form-group"><label class="form-label">段位特权描述</label><input class="form-control rank-perk" data-idx="${i}" value="${r.perk}"></div></div>`;});
        panel.innerHTML+=`<button class="btn btn-gold" id="btnSaveRanks">保存段位设置</button>`;
        $('#btnSaveRanks').addEventListener('click',()=>{$$('.rank-name').forEach(input=>{const i=input.dataset.idx;appState.ranks[i].name=input.value;appState.ranks[i].minExp=parseInt($('.rank-exp[data-idx="'+i+'"]').value)||0;appState.ranks[i].icon=$('.rank-icon[data-idx="'+i+'"]').value;appState.ranks[i].perk=$('.rank-perk[data-idx="'+i+'"]').value;});appState.ranks.sort((a,b)=>a.minExp-b.minExp);updateUserUI();showToast('✅ 段位设置已保存');});
    } else if(tab==='scripts'){
        panel.innerHTML=`<h3>话术库管理</h3><div class="admin-grid"><div class="form-group"><label class="form-label">分类</label><input class="form-control" id="sCat"></div><div class="form-group"><label class="form-label">标题</label><input class="form-control" id="sTitle"></div></div><div class="form-group"><label class="form-label">内容</label><textarea class="form-control" id="sContent"></textarea></div><button class="btn btn-gold" id="btnAddScript">添加话术</button><hr style="border-color:var(--brd);margin:20px 0"><div id="adminScriptsList"></div>`;
        const list=$('#adminScriptsList');
        const grouped = {};
        appState.scripts.forEach(s=>{if(!grouped[s.cat])grouped[s.cat]=[];grouped[s.cat].push(s);});
        let html = '';
        Object.keys(grouped).forEach(cat=>{
            html += `<div class="script-cat"><div class="script-cat-title">${cat} (${grouped[cat].length}) <span>▼</span></div><div class="script-cat-items">`;
            grouped[cat].forEach(s=>{html += `<div class="script-item"><p><span class="title">${s.title}</span><br>${s.content}</p><button class="mini-btn btn-copy-script" data-text="${s.content.replace(/"/g,'&quot;}">复制</button><button class="mini-btn btn-del-script" data-id="${s.id}">删除</button></div>`;});
            html += `</div></div>`;
        });
        list.innerHTML = html;

    } else if(tab==='activation'){
        // ★★★ 激活码管理 v2.0 - 卡片式布局（参考截图3）★★★
        panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
            <div>
                <h3 style="margin:0;display:inline">🔐 激活码管理</h3>
                <span style="color:var(--sub);font-size:12px;margin-left:8px;" id="codeCountBadge">加载中...</span>
            </div>
            <div style="display:flex;gap:8px;">
                <button class="btn btn-outline" id="btnRefreshCodes" style="padding:6px 14px;font-size:12px">🔄 刷新</button>
                <select id="codeFilterType" style="background:var(--input);color:var(--txt);border:1px solid var(--brd);border-radius:6px;padding:6px 10px;font-size:12px;">
                    <option value="all">全部类型</option>
                    <option value="trial7">7日体验卡</option>
                    <option value="vip30">月卡VIP</option>
                    <option value="trial1">日卡体验</option>
                </select>
                <select id="codeFilterStatus" style="background:var(--input);color:var(--txt);border:1px solid var(--brd);border-radius:6px;padding:6px 10px;font-size:12px;">
                    <option value="all">全部状态</option>
                    <option value="unused">未使用</option>
                    <option value="active">使用中</option>
                    <option value="expired">已过期</option>
                </select>
            </div>
        </div>

        <!-- 统计概览 -->
        <div id="codeOverviewCards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px;">
            <div style="text-align:center;padding:16px;background:var(--input);border-radius:10px;border:1px solid var(--brd);">
                <div style="font-size:28px;font-weight:bold;color:var(--gold)" id="statTotal">-</div>
                <div style="font-size:11px;color:var(--sub)">总激活码</div>
            </div>
            <div style="text-align:center;padding:16px;background:var(--input);border-radius:10px;border:1px solid var(--brd);">
                <div style="font-size:28px;font-weight:bold;color:var(--ok)" id="statActive">-</div>
                <div style="font-size:11px;color:var(--sub)">激活中</div>
            </div>
            <div style="text-align:center;padding:16px;background:var(--input);border-radius:10px;border:1px solid var(--brd);">
                <div style="font-size:28px;font-weight:bold;color:var(--sub);" id="statUnused">-</div>
                <div style="font-size:11px;color:var(--sub)">未使用</div>
            </div>
            <div style="text-align:center;padding:16px;background:var(--input);border-radius:10px;border:1px solid var(--brd);">
                <div style="font-size:28px;font-weight:bold;color:var(--red)" id="statDevices">-</div>
                <div style="font-size:11px;color:var(--sub)">绑定设备</div>
            </div>
        </div>

        <!-- 激活码列表 -->
        <div id="codeGridContainer" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;">
            <div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--sub);">正在加载激活码数据...</div>
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
            <div style="text-align:center;padding:40px;color:var(--sub);">正在加载数据...</div>
        </div>`;
        loadAnalyticsDashboard();
        $('#btnRefreshAnalytics')?.addEventListener('click', () => loadAnalyticsDashboard());

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
        <div style="font-size:12px;color:var(--sub);margin-bottom:16px">💡 点击排序调整功能顺序，点击"配置"编辑详情。</div>`;
        
        appState.navGroups.forEach((g, gi) => {
            let itemsHtml = '';
            g.features.forEach((fid, fi) => {
                const f = appState.features.find(x => x.id === fid);
                if(!f) return;
                itemsHtml += `<div class="feature-sort-item">
                    <span style="font-size:18px;margin-right:8px">${f.icon}</span>
                    <span style="font-weight:600;color:var(--txt);flex:1">${f.name}</span>
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
                    <span style="color:var(--sub);font-size:12px">${g.features.length}个功能</span>
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
    }
}

// ============================================================
// ★★★ 激活码管理：从 Worker 加载全量数据并渲染卡片 ★★★
// ============================================================
async function loadActivationCodeGrid() {
    const grid = document.getElementById('codeGridContainer');
    if (!grid) return;
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--sub);">⏳ 正在加载...</div>';

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
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--sub);">📭 没有符合条件的激活码</div>';
            return;
        }

        let html = '';
        filtered.forEach(c => {
            // 类型颜色映射
            const typeColors = { trial7: '#3B82F6', vip30: '#F59E0B', trial1: '#10B981' };
            const typeLabels = { trial7: '7日卡', vip30: '月卡', trial1: '日卡' };
            const statusColors = { active: 'var(--ok)', unused: 'var(--sub)', expired: 'var(--red)' };
            const statusLabels = { active: '使用中', unused: '未使用', expired: '已过期' };
            const color = typeColors[c.type] || 'var(--gold)';

            // 设备信息
            const devInfo = c.devices && c.devices.length > 0 
                ? c.devices.map(d => `
                    <div style="font-size:11px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05)">
                        <span style="color:var(--sub)">📱 ${d.deviceId.slice(0, 16)}...</span>
                        <span style="float:right;color:var(--ok)">活跃</span>
                        <div style="color:var(--sub);margin-top:2px">会话:${d.sessions}次 | 对话:${d.chats}次 | 时长:${d.totalDuration || 0}分钟</div>
                    </div>`).join('')
                : '<div style="font-size:11px;color:var(--sub);padding:8px 0">未绑定设备</div>';

            html += `
            <div style="background:var(--input);border-radius:10px;border:1px solid var(--brd);overflow:hidden;transition:transform .2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''">
                <div style="padding:14px 14px 10px;display:flex;justify-content:space-between;align-items:flex-start">
                    <div>
                        <div style="font-family:monospace;font-size:15px;font-weight:700;color:${color};letter-spacing:.5px">${c.code}</div>
                        <div style="display:flex;gap:6px;margin-top:6px">
                            <span style="font-size:10px;background:${color}22;color:${color};padding:2px 8px;border-radius:4px;font-weight:600">${typeLabels[c.type] || c.type}</span>
                            <span style="font-size:10px;background:${statusColors[c.status]}22;color:${statusColors[c.status]};padding:2px 8px;border-radius:4px">${statusLabels[c.status]}</span>
                            ${c.deviceCount > 1 ? `<span style="font-size:10px;background:#EF444422;color:#EF4444;padding:2px 6px;border-radius:4px;font-weight:bold">⚠️${c.deviceCount}设备</span>` : ''}
                        </div>
                    </div>
                    <button onclick="navigator.clipboard.writeText('${c.code}');showToast('✅ 已复制')" style="background:none;border:1px solid var(--brd);color:var(--sub);cursor:pointer;padding:4px 8px;border-radius:4px;font-size:11px">复制</button>
                </div>
                <div style="padding:0 14px;font-size:11px;color:var(--sub);display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;margin-bottom:8px">
                    <span>有效期：<strong>${c.days}天</strong></span>
                    <span>状态：<strong style="color:${statusColors[c.status]}">${statusLabels[c.status]}</strong></span>
                    <span>激活次数：<strong>${c.totalActivations}</strong></span>
                    <span>绑定设备：<strong>${c.deviceCount}</strong></span>
                </div>
                <div style="background:rgba(0,0,0,.15);padding:8px 14px;max-height:120px;overflow-y:auto;">
                    <div style="font-size:10px;color:var(--sub);margin-bottom:4px">📋 设备详情：</div>
                    ${devInfo}
                </div>
            </div>`;
        });

        grid.innerHTML = html;

    } catch(e) {
        console.error('[加载激活码失败]', e);
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;">
            <div style="color:var(--red);margin-bottom:8px">❌ 加载失败: ${e.message}</div>
            <div style="font-size:12px;color:var(--sub)">请确保Worker已部署到最新版本</div>
        </div>`;
    }
}


// ============================================================
// ★★★ 数据看板 v2.0（从 Worker 获取真实数据） ★★★
// ============================================================
async function loadAnalyticsDashboard() {
    const container = document.getElementById('analyticsContent');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--sub);">⏳ 正在加载数据看板...</div>';

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
        const features = data.featureRanking;
        const dailyTrend = data.dailyTrend || [];
        const codeDetails = data.codeDetails || [];

        // 计算转化漏斗
        const totalVisitors = ov.totalVisitors || 0;
        const totalActivations = ov.totalActivations || 0;
        const convRate = totalVisitors > 0 ? Math.round(totalActivations / totalVisitors * 100) : 0;

        // 功能排行最大值
        const maxFCount = features.length > 0 ? Math.max(...features.map(f => f.count), 1) : 1;

        let html = '';

        // ========== 1. 核心指标卡 ==========
        html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:24px;">
            <div style="text-align:center;padding:20px;background:var(--input);border-radius:10px;border:1px solid var(--brd);">
                <div style="font-size:36px;font-weight:bold;color:var(--gold)">${totalVisitors}</div>
                <div style="font-size:12px;color:var(--sub);margin-top:4px">总访客</div>
            </div>
            <div style="text-align:center;padding:20px;background:var(--input);border-radius:10px;border:1px solid var(--brd);">
                <div style="font-size:36px;font-weight:bold;color:var(--accent)">${totalActivations}</div>
                <div style="font-size:12px;color:var(--sub);margin-top:4px">总激活数</div>
            </div>
            <div style="text-align:center;padding:20px;background:var(--input);border-radius:10px;border:1px solid var(--brd);">
                <div style="font-size:36px;font-weight:bold;color:var(--ok)">${ov.totalMessages}</div>
                <div style="font-size:12px;color:var(--sub);margin-top:4px">消息总数</div>
            </div>
            <div style="text-align:center;padding:20px;background:var(--input);border-radius:10px;border:1px solid var(--brd);">
                <div style="font-size:36px;font-weight:bold;color:#8B5CF6">${ov.totalDurationMin}</div>
                <div style="font-size:12px;color:var(--sub);margin-top:4px">总时长(分)</div>
            </div>
        </div>`;

        // ========== 2. 功能使用排行榜 + 使用时长 ==========
        const featureHtml = features.map(f => {
            const fname = appState.features.find(x=>x.id===f.id)?.name || f.id;
            const pct = Math.round(f.count / maxFCount * 100);
            return `<div style="margin-bottom:8px">
                <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
                    <span>${fname}</span><span style="color:var(--gold);font-weight:600">${f.count}次</span>
                </div>
                <div style="height:8px;background:rgba(255,255,255,.05);border-radius:4px;overflow:hidden">
                    <div style="width:${Math.max(pct, 3)}%;height:100%;background:linear-gradient(90deg,var(--gold),#FFD700);border-radius:4px;transition:width .5s"></div>
                </div>
            </div>`;
        }).join('');

        html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
            <div style="background:var(--input);border-radius:10px;border:1px solid var(--brd);padding:16px;">
                <div style="font-size:14px;font-weight:700;margin-bottom:12px">🔥 功能使用排行</div>
                ${featureHtml || '<div style="text-align:center;color:var(--sub);padding:20px">暂无数据</div>'}
            </div>
            <div style="background:var(--input);border-radius:10px;border:1px solid var(--brd);padding:16px;">
                <div style="font-size:14px;font-weight:700;margin-bottom:12px">📊 转化漏斗</div>
                <div style="display:flex;flex-direction:column;gap:10px">
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(245,158,11,.08);border-radius:6px;border-left:3px solid var(--gold)">
                        <span>访客总数</span><strong style="color:var(--gold);font-size:16px">${totalVisitors}</strong>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(59,130,246,.08);border-radius:6px;border-left:3px solid #3B82F6">
                        <span>激活人数</span><strong style="color:#3B82F6;font-size:16px">${totalActivations}<small style="font-weight:normal;color:var(--sub)">(${convRate}%)</small></strong>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(16,185,129,.08);border-radius:6px;border-left:3px solid var(--ok)">
                        <span>对话消息</span><strong style="color:var(--ok);font-size:16px">${ov.totalMessages}</strong>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(139,92,246,.08);border-radius:6px;border-left:3px solid #8B5CF6">
                        <span>总使用时长</span><strong style="color:#8B5CF6;font-size:16px">${ov.totalDurationMin}分钟</strong>
                    </div>
                </div>
            </div>
        </div>`;

        // ========== 3. 最近7天趋势 ==========
        const maxDaily = dailyTrend.length > 0 ? Math.max(...dailyTrend.map(d => d.activeUsers), 1) : 1;
        const trendBars = dailyTrend.map(d => {
            const h = Math.max(Math.round(d.activeUsers / maxDaily * 100), d.activeUsers > 0 ? 8 : 2);
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
                <span style="font-size:11px;font-weight:600;color:var(--gold)">${d.activeUsers}</span>
                <div style="width:100%;max-width:32px;height:60px;background:rgba(255,255,255,.03);border-radius:4px 4px 0 0;display:flex;align-items:flex-end">
                    <div style="width:100%;height:${h}%;background:linear-gradient(to top,var(--gold),rgba(245,158,11,.3));border-radius:4px;transition:height .5s"></div>
                </div>
                <span style="font-size:9px;color:var(--sub)">${d.date.slice(5)}</span>
            </div>`;
        }).join('');

        html += `<div style="background:var(--input);border-radius:10px;border:1px solid var(--brd);padding:16px;margin-bottom:24px;">
            <div style="font-size:14px;font-weight:700;margin-bottom:12px">📈 最近7天活跃趋势</div>
            <div style="display:flex;gap:8px;align-items:flex-end;height:110px;padding:0 8px">
                ${trendBars || '<div style="color:var(--sub);width:100%;text-align:center;padding:30px">暂无数据</div>'}
            </div>
        </div>`;

        // ========== 4. 激活码使用明细表 ==========
        const tableRows = codeDetails.slice(0, 20).map(c => {
            const statusColor = c.isExpired ? 'var(--red)' : c.deviceCount > 0 ? 'var(--ok)' : 'var(--sub)';
            const statusText = c.isExpired ? '已过期' : c.deviceCount > 0 ? '使用中' : '未使用';
            const firstDate = c.firstUsed ? new Date(c.firstUsed).toLocaleDateString('zh-CN') : '-';
            const lastDate = c.lastUsed ? new Date(c.lastUsed).toLocaleDateString('zh-CN') : '-';
            
            return `<tr style="border-bottom:1px solid rgba(255,255,255,.03)">
                <td style="padding:8px 6px;font-family:monospace;font-size:12px;color:var(--gold)">${c.code}</td>
                <td style="padding:8px 6px;font-size:11px">${c.label}</td>
                <td style="padding:8px 6px;text-align:center"><span style="color:${statusColor};font-size:11px;font-weight:600">${statusText}</span></td>
                <td style="padding:8px 6px;text-align:center;font-size:11px">${c.deviceCount}</td>
                <td style="padding:8px 6px;text-align:center;font-size:11px">${c.totalSessions}</td>
                <td style="padding:8px 6px;text-align:center;font-size:11px">${c.totalChats}</td>
                <td style="padding:8px 6px;text-align:center;font-size:11px">${firstDate}</td>
                <td style="padding:8px 6px;text-align:center;font-size:11px">${lastDate}</td>
            </tr>`;
        }).join('');

        html += `<div style="background:var(--input);border-radius:10px;border:1px solid var(--brd);padding:16px;">
            <div style="font-size:14px;font-weight:700;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
                <span>📋 激活码使用明细</span>
                <span style="font-size:11px;color:var(--sub)">最近使用的 TOP20</span>
            </div>
            <div style="overflow-x:auto;">
                <table style="width:100%;font-size:12px;border-collapse:collapse">
                    <thead><tr style="border-bottom:1px solid var(--brd);color:var(--sub)">
                        <th style="padding:8px 6px;text-align:left;font-weight:600">激活码</th>
                        <th style="padding:8px 6px;text-align:left;font-weight:600">类型</th>
                        <th style="padding:8px 6px;text-align:center;font-weight:600">状态</th>
                        <th style="padding:8px 6px;text-align:center;font-weight:600">设备</th>
                        <th style="padding:8px 6px;text-align:center;font-weight:600">会话</th>
                        <th style="padding:8px 6px;text-align:center;font-weight:600">对话</th>
                        <th style="padding:8px 6px;text-align:center;font-weight:600">首次使用</th>
                        <th style="padding:8px 6px;text-align:center;font-weight:600">最后使用</th>
                    </tr></thead>
                    <tbody>${tableRows || '<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--sub)">暂无数据</td></tr>'}</tbody>
                </table>
            </div>
        </div>`;

        container.innerHTML = html;

    } catch(e) {
        console.error('[加载看板失败]', e);
        container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--red);">
            ❌ 加载失败: ${e.message}
            <div style="font-size:12px;color:var(--sub);margin-top:8px">请确保 Worker 已部署最新版本</div>
        </div>`;
    }
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
