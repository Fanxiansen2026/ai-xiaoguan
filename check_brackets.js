const fs = require('fs');
const files = ['config.src.js', 'core.src.js', 'features.src.js', 'admin.src.js', 'api.src.js', 'init.src.js'];
files.forEach(f => {
  const code = fs.readFileSync(f, 'utf8');
  let open = 0, close = 0;
  let inString = false, strChar = '', inLineComment = false, inBlockComment = false;
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (inLineComment) { if (ch === '\n') inLineComment = false; continue; }
    if (inBlockComment) { if (ch === '*' && code[i+1] === '/') { inBlockComment = false; i++; } continue; }
    if (!inString && ch === '/' && code[i+1] === '/') { inLineComment = true; continue; }
    if (!inString && ch === '/' && code[i+1] === '*') { inBlockComment = true; continue; }
    if (!inString && (ch === '"' || ch === "'" || ch === '`')) { inString = true; strChar = ch; continue; }
    if (inString && ch === strChar && code[i-1] !== '\\') { inString = false; continue; }
    if (!inString) { if (ch === '{') open++; if (ch === '}') close++; }
  }
  const diff = open - close;
  const status = diff === 0 ? '✅' : '❌';
  console.log(status + ' ' + f + ': { =' + open + ', } =' + close + ', 差值=' + diff);
});
