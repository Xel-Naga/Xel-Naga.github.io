#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
《悬观谜案：百年轮回》本地开发服务器
用于解决本地文件系统ES6模块CORS限制问题
"""

import sys
import os
import io

# 处理Windows控制台编码问题
if sys.platform == 'win32':
    # 设置标准输出为UTF-8编码
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import http.server
import socketserver
import webbrowser
from pathlib import Path

# 设置服务器配置
HOST = "localhost"
PORT = 8000
GAME_DIR = Path(__file__).parent.parent

def check_game_files():
    """检查游戏必需文件是否存在"""
    required_files = [
        "index.html",
        "src/main.js",
        "src/assets/styles/main.css",
        "src/data/chapter1.js"
    ]

    missing_files = []
    for file_path in required_files:
        full_path = GAME_DIR / file_path
        if not full_path.exists():
            missing_files.append(str(file_path))

    if missing_files:
        print(f"❌ 缺少必需文件: {', '.join(missing_files)}")
        return False

    # 检查核心模块文件（可选）
    module_files = [
        "src/core/GameEngine.js",
        "src/core/GameState.js",
        "src/core/EventSystem.js",
        "src/core/SceneManager.js",
        "src/core/InteractionSystem.js",
        "src/core/UIRenderer.js"
    ]
    module_count = 0
    for file_path in module_files:
        full_path = GAME_DIR / file_path
        if full_path.exists():
            module_count += 1
    if module_count > 0:
        print(f"✅ 找到 {module_count}/{len(module_files)} 个核心模块文件")

    return True

def start_server():
    """启动本地HTTP服务器"""
    # 切换到游戏目录
    os.chdir(GAME_DIR)

    # 创建HTTP请求处理器
    class GameRequestHandler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, format, *args):
            # 减少日志输出噪音
            pass

        def do_GET(self):
            # 处理favicon.ico请求，避免404错误
            if self.path == '/favicon.ico':
                self.send_response(204)  # No Content
                self.end_headers()
                return

            # 其他请求交由父类处理
            super().do_GET()

    # 创建并启动服务器
    with socketserver.TCPServer((HOST, PORT), GameRequestHandler) as httpd:
        server_url = f"http://{HOST}:{PORT}/"

        print("=" * 60)
        print("🎮 《悬观谜案：百年轮回》本地开发服务器")
        print("=" * 60)
        print(f"服务器地址: {server_url}")
        print(f"游戏目录: {GAME_DIR}")
        print(f"端口: {PORT}")
        print("\n访问说明:")
        print("1. 游戏将通过HTTP协议加载，避免CORS限制")
        print("2. ES6模块化版本将可用")
        print("3. 浏览器打开开发者工具(F12)查看控制台")
        print("\n启动中...")
        print(f"按 Ctrl+C 停止服务器")
        print("-" * 60)

        # 尝试打开浏览器
        try:
            webbrowser.open(server_url)
            print("✅ 浏览器已自动打开")
        except Exception as e:
            print(f"⚠️ 无法自动打开浏览器: {e}")
            print(f"请手动访问: {server_url}")

        # 启动服务器
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n🛑 服务器已停止")
            sys.exit(0)

def main():
    """主函数"""
    print("正在检查游戏文件...")

    if not GAME_DIR.exists():
        print(f"❌ 游戏目录不存在: {GAME_DIR}")
        print("请确保在项目根目录下运行此脚本")
        sys.exit(1)

    if not check_game_files():
        print("\n⚠️ 游戏文件检查失败，是否继续启动服务器？")
        response = input("输入 'y' 继续，其他键退出: ").strip().lower()
        if response != 'y':
            print("退出")
            sys.exit(1)

    try:
        start_server()
    except PermissionError:
        print(f"❌ 端口 {PORT} 被占用或无权限")
        print(f"尝试使用其他端口，或关闭占用该端口的程序")
        sys.exit(1)
    except Exception as e:
        print(f"❌ 服务器启动失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()