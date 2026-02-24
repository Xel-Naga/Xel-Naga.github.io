@echo off
chcp 65001 >nul
echo ========================================
echo  《悬观谜案：百年轮回》游戏测试工具
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

echo 🧪 运行游戏状态测试...
echo.

REM 运行测试
python test_game.py

if errorlevel 1 (
    echo.
    echo ⚠️ 测试过程中出现错误
    pause
    exit /b 1
)

echo.
echo 📝 测试完成！
echo 如需启动游戏进行详细测试，请运行：start_game.bat
echo.
pause