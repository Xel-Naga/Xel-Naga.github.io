@echo off
echo ========================================
echo  《悬观谜案：百年轮回》游戏启动器
echo ========================================
echo.

rem 检测系统编码支持
chcp >nul 2>&1
if %errorlevel% equ 0 (
    rem 尝试设置UTF-8编码
    chcp 65001 >nul 2>&1
    if %errorlevel% equ 0 (
        echo [信息] 使用UTF-8编码版本
        call start_game.bat
    ) else (
        echo [信息] UTF-8不可用，使用GBK编码版本
        call start_game_gbk.bat
    )
) else (
    echo [信息] 使用GBK编码版本
    call start_game_gbk.bat
)

if %errorlevel% neq 0 (
    echo.
    echo [错误] 游戏启动失败
    echo 请尝试：
    echo   1. 直接运行 start_game_gbk.bat
    echo   2. 或运行 python start_server.py
    echo.
    pause
)