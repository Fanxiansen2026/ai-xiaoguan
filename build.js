// ============================================================
//  AI销冠驾驶舱 - 生产构建脚本
//  功能：代码混淆 + 打包 + 输出到 dist/ 目录
//
//  使用方法：
//    node build.js          # 开发构建（不混淆，快速）
//    node build.js --prod   # 生产构建（混淆 + 压缩 + 安全）
// ============================================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SRC_DIR = __dirname;
const DIST_DIR = path.join(__dirname, 'dist');

// 需要处理的文件列表（按加载顺序）
const JS_FILES = [
  'api-proxy.js',
  'config.js',
  'core.js',
  'features.js',
  'admin.js',
  'api.js',
  'init.js'
];

// 不需要处理的静态文件
const STATIC_FILES = [
  'index.html',
  'style.css',
  'manifest.json'
];

// 清空目标目录
function cleanDist() {
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true });
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

// 复制静态文件
function copyStatic() {
  for (const file of STATIC_FILES) {
    const src = path.join(SRC_DIR, file);
    const dst = path.join(DIST_DIR, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
      console.log(`  ✓ ${file}`);
    }
  }
}

// 开发模式：直接复制 JS 文件（不做混淆，方便调试）
function devBuild() {
  for (const file of JS_FILES) {
    const src = path.join(SRC_DIR, file);
    const dst = path.join(DIST_DIR, file);
    if (fs.existsSync(src)) {
      let content = fs.readFileSync(src, 'utf-8');
      // 添加文件头注释
      content = `// ${file} - AI销冠驾驶舱 v2.0\n// Build: ${new Date().toISOString().slice(0,19)}\n` + content;
      fs.writeFileSync(dst, content);
      console.log(`  ✓ ${file}`);
    }
  }
}

// 生产模式：混淆 JS 文件
function prodBuild() {
  // 检查是否安装了混淆器
  try {
    require.resolve('javascript-obfuscator');
  } catch(e) {
    console.log('\n  ⚠️ 未检测到 javascript-obfuscator，正在安装...');
    try {
      execSync('npm install --save-dev javascript-obfuscator', { cwd: SRC_DIR, stdio: 'inherit' });
      console.log('  ✅ 安装完成！');
    } catch(err) {
      console.log('  ❌ 安装失败，回退到开发模式');
      devBuild();
      return;
    }
  }

  const JavaScriptObfuscator = require('javascript-obfuscator');

  for (const file of JS_FILES) {
    const src = path.join(SRC_DIR, file);
    const dst = path.join(DIST_DIR, file);
    if (fs.existsSync(src)) {
      const sourceCode = fs.readFileSync(src, 'utf-8');

      const obfuscationResult = JavaScriptObfuscator.obfuscate(sourceCode, {
        compact: true,                    // 压缩成一行
        controlFlowFlattening: true,       // 控制流平坦化（大幅增加阅读难度）
        controlFlowFlatteningThreshold: 0.75,
        deadCodeInjection: false,          // 注入死代码（会增大体积，暂不开启）
        debugProtection: false,            // 不启用反调试（会影响正常使用）
        disableConsoleOutput: false,       // 保留console输出（方便排查问题）
        identifierNamesGenerator: 'hexadecimal',  // 变量名用十六进制
        log: false,
        numbersToExpressions: true,        // 数字转表达式
        renameGlobals: false,              // 不重命名全局变量和函数名（保持接口兼容）
        selfDefending: false,              // 不自防御（会导致格式化工具崩溃）
        simplify: true,                    // 简化表达式
        splitStrings: true,                // 拆分字符串常量（隐藏硬编码文本）
        splitStringsChunkLength: 5,
        stringArray: true,                 // 字符串数组（核心防护）
        stringArrayCallsCountTransform: true,
        stringArrayEncoding: ['rc4'],      // RC4 加密字符串
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 2,
        stringArrayWrappersChainedCalls: true,
        stringArrayWrappersParametersMaxCount: 3,
        stringArrayWrappersType: 'function',
        stringArrayThreshold: 0.75,
        transformObjectKeys: true,         // 对象键名也混淆
        unicodeEscapeSequence: false
      });

      fs.writeFileSync(dst, obfuscationResult.getObfuscatedCode());
      console.log(`  ✓ ${file} [已混淆]`);
    }
  }

  // HTML 中添加安全 meta 标签
  const htmlPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(htmlPath)) {
    let html = fs.readFileSync(htmlPath, 'utf-8');
    // 在 </head> 前加安全头
    if (!html.includes('X-Content-Type-Options')) {
      html = html.replace('</head>',
        '<meta http-equiv="X-Content-Type-Options" content="nosniff">\n' +
        '<meta http-equiv="X-Frame-Options" content="DENY">\n' +
        '<meta name="referrer" content="no-referrer">\n' +
        '</head>'
      );
    }
    fs.writeFileSync(htmlPath, html);
    console.log('  ✓ index.html [已加固安全头]');
  }
}

// ===== 主流程 =====
const isProd = process.argv.includes('--prod');

console.log(`\n🚀 AI销冠驾驶舱 构建${isProd ? '（生产模式 - 混淆+加密）' : '（开发模式 - 快速）'}`);
console.log('━'.repeat(45));

cleanDist();
copyStatic();

if (isProd) {
  prodBuild();
} else {
  devBuild();
}

console.log('━'.repeat(45));
console.log(`✅ 构建完成！输出目录：dist/\n`);
console.log('部署步骤：');
console.log('  1. git add dist/');
console.log('  2. git commit -m "deploy: update production build"');
console.log('  3. git push origin main');
console.log('  4. GitHub Pages 自动部署（约1分钟生效）\n');
