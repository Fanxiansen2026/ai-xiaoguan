@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ==========================================
echo   AI销冠大脑 - 本地服务器
echo ==========================================
echo.
echo 步骤1: 在后台启动服务器 (端口8080)
start "Server" python -m http.server 8080
echo.
echo 步骤2: 等待服务器启动...
timeout /t 2 /nobreak >nul
echo.
echo 步骤3: 打开浏览器
echo http://localhost:8080/index.html
start http://localhost:8080/index.html
echo.
echo ==========================================
echo 服务器已启动！
echo 关闭名为"Server"的黑色窗口可停止服务
echo 按任意键关闭此窗口（不影响服务器运行）
echo ==========================================
pause
