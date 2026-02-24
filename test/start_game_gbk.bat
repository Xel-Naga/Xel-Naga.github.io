@echo off
rem 设置控制台编码为中文GBK
chcp 936 >nul

echo ========================================
echo  《悬观谜案：百年轮回》本地游戏启动器
echo ========================================
echo.

rem 检查Python是否安装（支持python和python3）
echo 正在检查Python...
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] 找到Python
    set PYTHON_CMD=python
    goto check_dir
)

python3 --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] 找到Python3
    set PYTHON_CMD=python3
    goto check_dir
)

echo [错误] 未找到Python，请先安装Python 3.x
echo 下载地址：https://www.python.org/downloads/
echo 安装时请勾选"Add Python to PATH"选项
echo.
pause
exit /b 1

:check_dir
rem 检查游戏文件
if not exist "..\index.html" (
    echo [错误] 游戏文件不存在！
    echo 请确保在项目根目录下运行此脚本
    echo.
    pause
    exit /b 1
)

echo [OK] 游戏文件存在
echo.
echo ========================================
echo 启动信息：
echo   游戏目录：%cd%\..
echo   访问地址：http://localhost:8000
echo   Python命令：%PYTHON_CMD%
echo ========================================
echo.
echo 操作说明：
echo   1. 服务器启动后会自动打开浏览器
echo   2. 按 Ctrl+C 停止服务器
echo   3. 如有端口冲突，请修改 start_server.py 中的端口号
echo.
echo 正在启动服务器...

rem 启动服务器
%PYTHON_CMD% start_server.py

if %errorlevel% neq 0 (
    echo.
    echo [错误] 服务器启动失败
    echo 可能的原因：
    echo   - 端口 8000 被占用
    echo   - Python库缺失
    echo   - 文件权限问题
    echo.
    echo 解决方法：
    echo   1. 检查端口占用：netstat -ano | findstr :8000
    echo   2. 安装依赖：%PYTHON_CMD% -m pip install requests
    echo   3. 或修改 start_server.py 中的端口号
    echo.
    pause
    exit /b 1
)