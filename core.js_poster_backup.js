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
        const questionEndY = wrapText(ctx, cleanQuestion, 60 + cardPad, questionStartY + 40, cardW - cardPad * 2, 42);

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
