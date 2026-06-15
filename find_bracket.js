const fs = require('fs');

function analyzeFile(filename) {
  const code = fs.readFileSync(filename, 'utf8');
  const lines = code.split('\n');
  let depth = 0;
  let inBlockComment = false;
  let inString = false, strChar = '';
  
  // Track max depth to find unclosed
  let maxDepth = 0;
  let depthHistory = [];
  
  lines.forEach((line, lineNum) => {
    let lineDepthStart = depth;
    let inLineComment = false;
    
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inBlockComment) {
        if (ch === '*' && line[i+1] === '/') { inBlockComment = false; i++; }
        continue;
      }
      if (inLineComment) break;
      if (!inString && ch === '/' && line[i+1] === '/') { inLineComment = true; break; }
      if (!inString && ch === '/' && line[i+1] === '*') { inBlockComment = true; continue; }
      if (!inString && (ch === '"' || ch === "'" || ch === '`')) { 
        inString = true; strChar = ch; continue; 
      }
      if (inString && ch === strChar && (i === 0 || line[i-1] !== '\\')) { 
        inString = false; continue; 
      }
      if (!inString) {
        if (ch === '{') { depth++; if (depth > maxDepth) maxDepth = depth; }
        if (ch === '}') depth--;
      }
    }
    
    if (depth !== lineDepthStart) {
      depthHistory.push({ line: lineNum + 1, depth, change: depth - lineDepthStart, text: line.trim().slice(0, 70) });
    }
  });
  
  console.log(`\n=== ${filename} 最终深度: ${depth} ===`);
  // 显示最后20个变化
  const last = depthHistory.slice(-20);
  last.forEach(h => {
    console.log(`  第${h.line}行 深度=${h.depth} (${h.change >= 0 ? '+' : ''}${h.change}): ${h.text}`);
  });
}

analyzeFile('api.src.js');
analyzeFile('core.src.js');
