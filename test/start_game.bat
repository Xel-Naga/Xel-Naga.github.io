@echo off
chcp 65001 >nul
echo ========================================
echo  《悬观谜案：百年轮回》本地游戏启动器
echo ========================================
echo.

REM 检查Python是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 未找到Python，请先安装Python 3.x
    echo 下载地址：https://www.python.org/downloads/
    pause
    exit /b 1
)

REM 检查游戏文件
if not exist "..\index.html" (
    echo ❌ 游戏文件不存在！
    echo 请确保在项目根目录下运行此脚本
    pause
    exit /b 1
)

echo 🎮 启动本地游戏服务器...
echo 📁 游戏目录：%cd%\..
echo 🌐 访问地址：http://localhost:8000
echo.
echo 📝 操作说明：
echo   1. 服务器启动后会自动打开浏览器
echo   2. 按 Ctrl+C 停止服务器
echo   3. 如有端口冲突，请修改 start_server.py 中的端口号
echo.

REM 启动服务器
python start_server.py

if errorlevel 1 (
    echo.
    echo ⚠️ 服务器启动失败
    echo 可能的原因：
    echo   - 端口 8000 被占用
    echo   - Python库缺失
    echo   - 文件权限问题
    pause
    exit /b 1
)