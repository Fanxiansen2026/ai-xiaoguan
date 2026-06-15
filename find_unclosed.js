const fs = require('fs');

function analyzeFile(filename) {
  const code = fs.readFileSync(filename, 'utf8');
  const lines = code.split('\n');
  let depth = 0;
  let inBlockComment = false;
  let inString = false, strChar = '';
  let stack = []; // track opening braces with line numbers
  
  lines.forEach((line, lineNum) => {
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
        if (ch === '{') {
          depth++;
          stack.push({ depth, line: lineNum + 1, text: line.trim().slice(0, 60) });
        }
        if (ch === '}') {
          depth--;
          if (stack.length > 0) stack.pop();
        }
      }
    }
  });
  
  console.log(`\n=== ${filename} 最终深度: ${depth}, 未闭合括号: ${stack.length} ===`);
  if (stack.length > 0) {
    console.log('未闭合的括号位置:');
    stack.forEach(s => {
      console.log(`  第${s.line}行 深度=${s.depth}: ${s.text}`);
    });
  }
}

analyzeFile('api.src.js');
analyzeFile('core.src.js');
analyzeFile('admin.src.js');
