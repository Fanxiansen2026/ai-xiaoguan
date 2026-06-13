// ===== 后台管理模块 =====
function initAdmin(){
    const tabs=$('#adminTabs');
    tabs.innerHTML=`<div class="admin-tab active" data-admin="global">全局与概念</div><div class="admin-tab" data-admin="nav">导航分组管理</div><div class="admin-tab" data-admin="ranks">段位系统管理</div><div class="admin-tab" data-admin="scripts">话术库管理</div><div class="admin-tab" data-admin="activation">激活码管理</div><div class="admin-tab" data-admin="features">功能排序</div><div class="admin-tab" data-admin="analytics">数据看板</div><div class="admin-tab" data-admin="export">数据导出</div>`;
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
            grouped[cat].forEach(s=>{html += `<div class="script-item"><p><span class="title">${s.title}</span><br>${s.content}</p><button class="mini-btn btn-copy-script" data-text="${s.content.replace(/"/g,'&quot;')}">复制</button><button class="mini-btn btn-del-script" data-id="${s.id}">删除</button></div>`;});
            html += `</div></div>`;
        });
        list.innerHTML = html;
    } else if(tab==='activation'){
        const stats = {total: appState.activationRecords.length, used: appState.activationRecords.filter(r=>r.used).length, unused: appState.activationRecords.filter(r=>!r.used).length};
        panel.innerHTML = `<h3>激活码管理</h3>
        
        <div class="activation-stats">
            <div class="activation-stat-card">
                <div class="activation-stat-num">${stats.total}</div>
                <div class="activation-stat-label">总生成</div>
            </div>
            <div class="activation-stat-card">
                <div class="activation-stat-num" style="color:var(--ok)">${stats.unused}</div>
                <div class="activation-stat-label">未使用</div>
            </div>
            <div class="activation-stat-card">
                <div class="activation-stat-num" style="color:var(--sub)">${stats.used}</div>
                <div class="activation-stat-label">已使用</div>
            </div>
            <div class="activation-stat-card">
                <div class="activation-stat-num" style="color:var(--gold)">${stats.total > 0 ? Math.round(stats.unused/stats.total*100) : 0}%</div>
                <div class="activation-stat-label">库存率</div>
            </div>
        </div>
        
        <div class="activation-generator">
            <h4>批量生成激活码</h4>
            <div class="activation-type-grid">
                <div class="activation-type-card" data-type="day" data-days="1">
                    <div class="type-name">日卡</div>
                    <div class="type-desc">1天体验</div>
                    <div class="type-price">¥0</div>
                </div>
                <div class="activation-type-card" data-type="week" data-days="7">
                    <div class="type-name">周卡</div>
                    <div class="type-desc">7天体验</div>
                    <div class="type-price">体验价</div>
                </div>
                <div class="activation-type-card active" data-type="month" data-days="30">
                    <div class="type-name">月卡</div>
                    <div class="type-desc">30天完整</div>
                    <div class="type-price">推荐</div>
                </div>
                <div class="activation-type-card" data-type="year" data-days="365">
                    <div class="type-name">年卡</div>
                    <div class="type-desc">365天全年</div>
                    <div class="type-price">VIP</div>
                </div>
                <div class="activation-type-card" data-type="custom" data-days="0">
                    <div class="type-name">自定义</div>
                    <div class="type-desc">手动设定</div>
                    <div class="type-price">灵活</div>
                </div>
            </div>
            <div class="admin-grid" id="customDaysRow" style="display:none;margin-top:12px">
                <div class="form-group"><label class="form-label">自定义天数</label><input type="number" class="form-control" id="actCustomDays" value="3" min="1" max="999"></div>
                <div class="form-group"><label class="form-label">生成数量</label><input type="number" class="form-control" id="actCount" value="5" min="1" max="50"></div>
            </div>
            <div class="form-group" id="defaultCountRow" style="margin-top:12px">
                <label class="form-label">生成数量</label>
                <input type="number" class="form-control" id="actCountDefault" value="5" min="1" max="50">
            </div>
            <button class="btn btn-gold" id="btnGenActivation" style="margin-top:16px;width:100%">生成激活码</button>
        </div>
        
        <div class="activation-filter-bar">
            <button class="activation-filter-btn active" data-filter="all">全部 (${stats.total})</button>
            <button class="activation-filter-btn" data-filter="unused">未使用 (${stats.unused})</button>
            <button class="activation-filter-btn" data-filter="used">已使用 (${stats.used})</button>
            <button class="activation-filter-btn" data-filter="day">日卡</button>
            <button class="activation-filter-btn" data-filter="week">周卡</button>
            <button class="activation-filter-btn" data-filter="month">月卡</button>
            <button class="activation-filter-btn" data-filter="year">年卡</button>
        </div>
        <div id="activationCodeList"></div>`;
        
        let selectedType = 'month';
        let selectedDays = 30;
        
        panel.querySelectorAll('.activation-type-card').forEach(card=>{
            card.addEventListener('click', ()=>{
                panel.querySelectorAll('.activation-type-card').forEach(c=>c.classList.remove('active'));
                card.classList.add('active');
                selectedType = card.dataset.type;
                selectedDays = parseInt(card.dataset.days);
                const isCustom = selectedType === 'custom';
                $('#customDaysRow').style.display = isCustom ? 'grid' : 'none';
                $('#defaultCountRow').style.display = isCustom ? 'none' : 'block';
            });
        });
        
        $('#btnGenActivation').addEventListener('click', ()=>{
            const isCustom = selectedType === 'custom';
            const count = parseInt(getVal(isCustom ? 'actCount' : 'actCountDefault')) || 1;
            const days = isCustom ? (parseInt(getVal('actCustomDays')) || 1) : selectedDays;
            const codes = generateActivationCode(selectedType, days, count);
            appState.activationRecords.push(...codes);
            renderActivationCodeList();
            showToast(`✅ 已生成 ${count} 个${selectedType==='day'?'日卡':selectedType==='week'?'周卡':selectedType==='month'?'月卡':selectedType==='year'?'年卡':'自定义'}激活码`);
            trackEvent('activation_code_generate',{type:selectedType,days,count});
        });
        
        panel.querySelectorAll('.activation-filter-btn').forEach(btn=>{
            btn.addEventListener('click', ()=>{
                panel.querySelectorAll('.activation-filter-btn').forEach(b=>b.classList.remove('active'));
                btn.classList.add('active');
                renderActivationCodeList(btn.dataset.filter);
            });
        });
        
        renderActivationCodeList();
    } else if(tab==='analytics'){
        const summary = getAnalyticsSummary();
        const totalUsers = Object.keys(summary.uniqueUsers).length;
        const cm = summary.coreMetrics;
        
        // 功能使用排行（带百分比）
        let totalFeatureUses = 0;
        Object.values(summary.featureUsage).forEach(v => totalFeatureUses += v);
        const maxFeatureUsage = Math.max(...Object.values(summary.featureUsage), 1);
        let featureHtml = '';
        let rank = 0;
        Object.entries(summary.featureUsage).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>{
            rank++;
            const fName = appState.features.find(x=>x.id===k)?.name || k;
            const pct = totalFeatureUses ? Math.round(v/totalFeatureUses*100) : 0;
            const barWidth = Math.max(5, Math.round(v/maxFeatureUsage*100));
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
            featureHtml += `<div class="analytics-bar"><div class="analytics-bar-label">${medal} ${fName}</div><div class="analytics-bar-track"><div class="analytics-bar-fill" style="width:${barWidth}%"></div></div><div class="analytics-bar-val">${v}次 (${pct}%)</div></div>`;
        });
        
        // 近7日趋势
        let dailyHtml = '';
        const last7Days = Object.entries(summary.dailyActive).sort().slice(-7);
        const maxDaily = Math.max(...last7Days.map(([d,v])=>v), 1);
        last7Days.forEach(([d,v])=>{
            const h = Math.min(100, Math.round(v/maxDaily*100));
            const dateLabel = d.slice(5);
            dailyHtml += `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px"><div style="width:100%;min-height:4px;background:var(--brd);border-radius:4px;position:relative;height:80px"><div style="position:absolute;bottom:0;width:100%;background:var(--grad);border-radius:4px 4px 0 0;transition:height .5s;height:${h}%"></div></div><div style="font-size:10px;color:var(--sub)">${dateLabel}</div><div style="font-size:11px;font-weight:600;color:var(--gold)">${v}</div></div>`;
        });
        
        // 功能留存分析
        let retentionHtml = '';
        appState.features.forEach(f => {
            const opens = summary.featureUsage[f.id] || 0;
            const enters = summary.featureRetention[f.id] || 0;
            const retention = opens > 0 ? Math.round(enters/opens*100) : 0;
            let status = '';
            if(opens === 0) status = '<span style="color:var(--sub)">未使用</span>';
            else if(retention >= 70) status = '<span style="color:var(--ok)">高留存</span>';
            else if(retention >= 30) status = '<span style="color:var(--gold)">一般</span>';
            else status = '<span style="color:var(--red)">流失严重</span>';
            retentionHtml += `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05)"><span>${f.icon} ${f.name}</span><span>${status} (${enters}/${opens})</span></div>`;
        });
        
        // 激活转化漏斗
        const conv = summary.conversionFunnel;
        const convSteps = [
            {label:'浏览产品', n:conv.visit, rate:100},
            {label:'使用AI功能', n:conv.register, rate:conv.visit ? Math.round(conv.register/conv.visit*100) : 0},
            {label:'付费激活', n:conv.activate, rate:conv.register ? Math.round(conv.activate/conv.register*100) : 0},
            {label:'激活类型', n:conv.paid, rate:conv.activate ? Math.round(conv.paid/conv.activate*100) : 0}
        ];
        let convHtml = '';
        convSteps.forEach((step, i)=>{
            const isLast = i === convSteps.length - 1;
            const rateText = step.rate + '%';
            const statusColor = step.rate < 20 ? 'var(--red)' : step.rate < 50 ? 'var(--gold)' : 'var(--ok)';
            convHtml += `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05)"><span>${step.label}</span><span style="color:${statusColor};font-weight:600">${step.n > 0 ? rateText : (isLast ? 'N/A' : '✗ 未激活')}</span></div>`;
        });
        
        panel.innerHTML = `<h3>📊 数据统计分析</h3>
        
        <!-- 核心指标卡片 -->
        <div class="analytics-dashboard">
            <div class="analytics-metric">
                <div class="analytics-metric-icon">📝</div>
                <div class="analytics-metric-num">${cm.totalGenerations}</div>
                <div class="analytics-metric-label">总生成次数</div>
                <div class="analytics-metric-trend">AI产出</div>
            </div>
            <div class="analytics-metric">
                <div class="analytics-metric-icon">⭐</div>
                <div class="analytics-metric-num">${cm.totalFavorites}</div>
                <div class="analytics-metric-label">话术收藏</div>
                <div class="analytics-metric-trend">用户沉淀</div>
            </div>
            <div class="analytics-metric">
                <div class="analytics-metric-icon">🔥</div>
                <div class="analytics-metric-num">${cm.consecutiveDays}</div>
                <div class="analytics-metric-label">连续活跃</div>
                <div class="analytics-metric-trend">${cm.activeDays}天总活跃</div>
            </div>
            <div class="analytics-metric">
                <div class="analytics-metric-icon">👥</div>
                <div class="analytics-metric-num">${totalUsers}</div>
                <div class="analytics-metric-label">独立用户</div>
                <div class="analytics-metric-trend">${summary.totalSessions}会话</div>
            </div>
        </div>
        
        <!-- 功能使用排行榜 -->
        <div class="analytics-section-title">功能使用排行榜</div>
        <div class="analytics-section">${featureHtml || '<div style="color:var(--sub);text-align:center;padding:20px">暂无数据，使用功能后将自动统计</div>'}</div>
        
        <!-- 最近7天使用趋势 -->
        <div class="analytics-section-title">最近7天使用趋势</div>
        <div style="display:flex;gap:8px;height:120px;padding:16px;background:var(--input);border:1px solid var(--brd);border-radius:10px;margin-bottom:20px;align-items:flex-end">${dailyHtml || '<div style="color:var(--sub);text-align:center;width:100%">暂无数据</div>'}</div>
        
        <!-- 功能留存分析 -->
        <div class="analytics-section-title">功能留存分析</div>
        <div style="font-size:12px;color:var(--sub);margin-bottom:8px">功能打开后用户实际使用比例</div>
        <div class="analytics-section">${retentionHtml || '<div style="color:var(--sub)">暂无数据</div>'}</div>
        
        <!-- 激活转化漏斗 -->
        <div class="analytics-section-title">🔒 激活转化漏斗</div>
        <div class="analytics-section">${convHtml}</div>`;
        
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
        <div style="font-size:12px;color:var(--sub);margin-bottom:16px">💡 点击分组展开/折叠，点击 ↑↓ 调整功能顺序，点击"配置"编辑功能详情。排序会自动同步到导航分组。</div>`;
        
        appState.navGroups.forEach((g, gi) => {
            let itemsHtml = '';
            g.features.forEach((fid, fi) => {
                const f = appState.features.find(x => x.id === fid);
                if(!f) return;
                itemsHtml += `<div class="feature-sort-item">
                    <span style="font-size:18px;margin-right:8px">${f.icon}</span>
                    <span style="font-weight:600;color:var(--txt);flex:1">${f.name}</span>
                    <span class="feature-tag ${PAYWALL_FEATURES.includes(f.id) ? 'vip' : 'free'}" style="margin-right:8px">${PAYWALL_FEATURES.includes(f.id) ? 'VIP' : '免费'}</span>
                    <span style="font-size:11px;color:var(--sub)">${f.desc.substring(0,20)}${f.desc.length>20?'...':''}</span>
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
                if(action === 'config'){
                    renderAdminPanel('config_' + btn.dataset.id);
                    return;
                }
                const gi = parseInt(btn.dataset.gi);
                const fi = parseInt(btn.dataset.fi);
                const g = appState.navGroups[gi];
                if(action === 'up'){
                    if(fi <= 0) return;
                    [g.features[fi], g.features[fi-1]] = [g.features[fi-1], g.features[fi]];
                } else if(action === 'down'){
                    if(fi >= g.features.length - 1) return;
                    [g.features[fi], g.features[fi+1]] = [g.features[fi+1], g.features[fi]];
                }
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
    const list = $('#activationCodeList');
    if(!list) return;
    
    let records = appState.activationRecords;
    if(filter !== 'all') {
        if(filter === 'unused' || filter === 'used') {
            records = records.filter(r => filter === 'used' ? r.used : !r.used);
        } else {
            records = records.filter(r => r.type === filter);
        }
    }
    
    if(records.length === 0){
        list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--sub)">暂无激活码记录</div>';
        return;
    }
    
    let html = '';
    records.forEach((r, i) => {
        const tagClass = r.type;
        const statusClass = r.used ? 'used' : 'unused';
        const statusText = r.used ? '已使用' : '未使用';
        html += `<div class="activation-code-row">
            <div class="activation-code-text">${r.code}</div>
            <div class="activation-code-tag ${tagClass}">${r.type === 'day' ? '日卡' : r.type === 'week' ? '周卡' : r.type === 'month' ? '月卡' : r.type === 'year' ? '年卡' : '自定义'}</div>
            <div style="font-size:12px;color:var(--sub);width:60px">${r.days}天</div>
            <div class="activation-code-status ${statusClass}">${statusText}</div>
            <div class="activation-code-actions">
                <button class="activation-code-btn" data-code="${r.code}" data-idx="${i}">复制</button>
                <button class="activation-code-btn activation-code-btn-del" data-code="${r.code}" data-idx="${i}" style="color:var(--red);border-color:var(--red)">删除</button>
            </div>
        </div>`;
    });
    list.innerHTML = html;
    
    list.querySelectorAll('.activation-code-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            safeCopy(btn.dataset.code);
            showToast('激活码已复制');
        });
    });
    
    list.querySelectorAll('.activation-code-btn-del').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.idx);
            if(confirm(`确定删除激活码 ${btn.dataset.code} 吗？`)){
                appState.activationRecords.splice(idx, 1);
                renderActivationCodeList(filter);
                showToast('已删除');
            }
        });
    });
}
