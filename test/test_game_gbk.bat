@echo off
rem 设置控制台编码为中文GBK
chcp 936 >nul

echo ========================================
echo  《悬观谜案：百年轮回》游戏测试工具
echo ========================================
echo.

rem 检查Python是否安装（支持python和python3）
echo 正在检查Python...
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] 找到Python
    set PYTHON_CMD=python
    goto run_test
)

python3 --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] 找到Python3
    set PYTHON_CMD=python3
    goto run_test
)

echo [错误] 未找到Python，请先安装Python 3.x
echo 下载地址：https://www.python.org/downloads/
echo 安装时请勾选"Add Python to PATH"选项
echo.
pause
exit /b 1

:run_test
echo [OK] 开始运行游戏状态测试...
echo.

rem 运行测试
%PYTHON_CMD% test_game.py

if %errorlevel% neq 0 (
    echo.
    echo [错误] 测试过程中出现错误
    echo 请检查以上错误信息
    echo.
    pause
    exit /b 1
)

echo.
echo [完成] 测试完成！
echo.
echo 如需启动游戏进行详细测试，请运行：
echo   start_game_gbk.bat
echo.
pause