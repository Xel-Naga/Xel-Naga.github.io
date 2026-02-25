#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
《悬观谜案：百年轮回》游戏状态测试工具
用于验证游戏运行状态和关键功能
"""

import sys
import os
import io

# 处理Windows控制台编码问题
if sys.platform == 'win32':
    # 设置标准输出为UTF-8编码
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# 检查并导入requests库
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    print("⚠️  requests库未安装，部分测试功能受限")
    print("   安装命令: pip install requests")
    print("   或使用: python -m pip install requests")

import json
import time
from pathlib import Path
import subprocess

# 设置测试配置
GAME_DIR = Path(__file__).parent.parent
SERVER_URL = "http://localhost:8000"
TEST_TIMEOUT = 10  # 秒

def print_header(title):
    """打印标题"""
    print("\n" + "=" * 60)
    print(f"🧪 {title}")
    print("=" * 60)

def print_result(success, message):
    """打印测试结果"""
    status = "✅" if success else "❌"
    print(f"{status} {message}")

def test_file_structure():
    """测试游戏文件结构"""
    print_header("文件结构测试")

    tests = [
        ("游戏根目录", GAME_DIR, True),
        ("HTML主文件", GAME_DIR / "index.html", True),
        ("样式文件", GAME_DIR / "style.css", True),
        ("模块化脚本文件", GAME_DIR / "main.js", True),
        ("数据目录", GAME_DIR / "data", True),
        ("章节数据", GAME_DIR / "data" / "chapter1.json", True),
    ]

    all_passed = True
    for test_name, path, required in tests:
        exists = path.exists()
        if required and not exists:
            print_result(False, f"{test_name}: {path} 不存在")
            all_passed = False
        else:
            status = "存在" if exists else "可选"
            print_result(True if required else True, f"{test_name}: {status}")

    # 检查模块化文件
    print("\n模块化架构检查:")
    modules_path = GAME_DIR / "modules"
    if modules_path.exists():
        module_files = list(modules_path.rglob("*.js"))
        print_result(True, f"找到 {len(module_files)} 个模块文件")
        if len(module_files) > 0:
            print(f"   第一个模块: {module_files[0].relative_to(GAME_DIR)}")
    else:
        print_result(False, "modules/ 目录不存在（模块化版本可能未完全部署）")

    return all_passed

def test_json_data():
    """测试JSON数据文件有效性"""
    print_header("JSON数据文件测试")

    json_file = GAME_DIR / "data" / "chapter1.json"
    if not json_file.exists():
        print_result(False, "章节数据文件不存在")
        return False

    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # 检查必需字段
        required_sections = ['locations', 'items', 'npcs', 'quests']
        missing_sections = []
        for section in required_sections:
            if section not in data:
                missing_sections.append(section)

        if missing_sections:
            print_result(False, f"缺少必需数据节: {', '.join(missing_sections)}")
            return False

        # 统计内容
        print_result(True, f"位置数量: {len(data['locations'])}")
        print_result(True, f"道具数量: {len(data['items'])}")
        print_result(True, f"NPC数量: {len(data['npcs'])}")
        print_result(True, f"任务数量: {len(data['quests'])}")

        # 检查初始位置
        if 'initial_location' in data:
            print_result(True, f"初始位置: {data['initial_location']}")

        return True

    except json.JSONDecodeError as e:
        print_result(False, f"JSON解析错误: {e}")
        return False
    except Exception as e:
        print_result(False, f"数据文件读取错误: {e}")
        return False

def test_server_connection():
    """测试HTTP服务器连接"""
    print_header("HTTP服务器连接测试")

    if not REQUESTS_AVAILABLE:
        print_result(False, "requests库未安装，跳过连接测试")
        print("   安装命令: pip install requests")
        return False

    try:
        response = requests.get(SERVER_URL, timeout=TEST_TIMEOUT)
        if response.status_code == 200:
            print_result(True, f"服务器响应正常 (HTTP {response.status_code})")
            return True
        else:
            print_result(False, f"服务器返回错误状态码: {response.status_code}")
            return False
    except requests.ConnectionError:
        print_result(False, "无法连接到服务器，可能未启动")
        print("   请先运行: python start_server.py")
        return False
    except Exception as e:
        print_result(False, f"连接测试失败: {e}")
        return False

def test_game_page():
    """测试游戏页面内容"""
    print_header("游戏页面内容测试")

    if not REQUESTS_AVAILABLE:
        print_result(False, "requests库未安装，跳过页面测试")
        print("   安装命令: pip install requests")
        return False

    try:
        response = requests.get(SERVER_URL, timeout=TEST_TIMEOUT)
        content = response.text

        # 检查关键HTML元素
        checks = [
            ("包含游戏标题", "悬观谜案：百年轮回" in content),
            ("包含场景描述区域", 'scene-description' in content),
            ("包含命令输入框", 'command-input' in content),
            ("包含道具库存", 'inventory-panel' in content),
            ("包含决策模态框", 'decision-modal' in content),
            ("包含脚本引用", 'script.js' in content or 'main.js' in content),
        ]

        all_passed = True
        for check_name, check_result in checks:
            if check_result:
                print_result(True, check_name)
            else:
                print_result(False, check_name)
                all_passed = False

        return all_passed

    except Exception as e:
        print_result(False, f"页面测试失败: {e}")
        return False

def provide_test_instructions():
    """提供手动测试指导"""
    print_header("手动测试指导")

    print("🚀 启动测试服务器:")
    print(f"   python start_server.py")
    print("\n🌐 浏览器测试步骤:")
    print(f"   1. 打开浏览器访问: {SERVER_URL}")
    print(f"   2. 按 F12 打开开发者工具")
    print(f"   3. 切换到控制台(Console)选项卡")
    print(f"   4. 检查是否有红色错误信息")
    print(f"   5. 检查是否有 '游戏初始化完成' 消息")
    print("\n🎮 游戏功能测试清单:")
    print("   ✅ 页面加载完成，无错误")
    print("   ✅ 场景描述区域显示正常")
    print("   ✅ 顶部状态栏显示(体力、体温、理智)")
    print("   ✅ 右侧面板按钮可点击")
    print("   ✅ 命令输入框可用")
    print("   ✅ 点击高亮文字可交互")
    print("   ✅ 使用 '测试决策' 命令触发决策系统")
    print("\n🔧 高级测试命令:")
    print("   在命令输入框中尝试以下命令:")
    print("   - '测试决策' - 触发决策对话框")
    print("   - '查看手机' - 测试道具查看")
    print("   - '前往山门' - 测试位置移动")
    print("   - '状态' - 打开状态面板")

def run_comprehensive_test():
    """运行综合测试"""
    print("🎮 《悬观谜案：百年轮回》游戏状态测试")
    print("=" * 60)

    # 运行各项测试
    tests = [
        ("文件结构", test_file_structure),
        ("JSON数据", test_json_data),
        ("服务器连接", test_server_connection),
        ("游戏页面", test_game_page),
    ]

    results = []
    for test_name, test_func in tests:
        print(f"\n▶ 正在运行: {test_name}")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"⚠️ 测试异常: {e}")
            results.append((test_name, False))

    # 汇总结果
    print_header("测试结果汇总")
    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "通过" if result else "失败"
        print(f"{'✅' if result else '❌'} {test_name}: {status}")

    print(f"\n📊 总计: {passed}/{total} 项测试通过")

    if passed == total:
        print("\n🎉 所有测试通过！游戏状态良好。")
    else:
        print("\n⚠️ 部分测试失败，请检查上述问题。")

    # 提供测试指导
    provide_test_instructions()

    return passed == total

def quick_test():
    """快速测试（不启动服务器）"""
    print("⚡ 快速测试模式")
    print_header("基础文件检查")

    test_file_structure()
    test_json_data()

    print("\n📝 下一步:")
    print(f"   1. 启动服务器: python start_server.py")
    print(f"   2. 在浏览器中手动测试游戏功能")
    print(f"   3. 查看控制台是否有错误")

def main():
    """主函数"""
    if len(sys.argv) > 1 and sys.argv[1] == "quick":
        quick_test()
    else:
        run_comprehensive_test()

if __name__ == "__main__":
    main()