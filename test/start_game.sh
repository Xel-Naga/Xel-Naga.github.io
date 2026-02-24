#!/bin/bash
#
# 《悬观谜案：百年轮回》本地游戏启动器
#

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}"
    echo "========================================"
    echo " 《悬观谜案：百年轮回》本地游戏启动器"
    echo "========================================"
    echo -e "${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}📝 $1${NC}"
}

# 主函数
main() {
    print_header

    # 检查Python是否安装
    if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
        print_error "未找到Python，请先安装Python 3.x"
        echo "下载地址：https://www.python.org/downloads/"
        exit 1
    fi

    # 优先使用python3
    if command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
    else
        PYTHON_CMD="python"
    fi

    # 检查游戏文件
    if [ ! -f "../index.html" ]; then
        print_error "游戏文件不存在！"
        echo "请确保在项目根目录下运行此脚本"
        exit 1
    fi

    echo -e "${GREEN}🎮 启动本地游戏服务器...${NC}"
    echo "📁 游戏目录：$(pwd)/.."
    echo "🌐 访问地址：http://localhost:8000"
    echo ""
    print_info "操作说明："
    echo "  1. 服务器启动后会自动打开浏览器"
    echo "  2. 按 Ctrl+C 停止服务器"
    echo "  3. 如有端口冲突，请修改 start_server.py 中的端口号"
    echo ""

    # 启动服务器
    $PYTHON_CMD start_server.py

    if [ $? -ne 0 ]; then
        echo ""
        print_error "服务器启动失败"
        echo "可能的原因："
        echo "  - 端口 8000 被占用"
        echo "  - Python库缺失"
        echo "  - 文件权限问题"
        exit 1
    fi
}

# 运行主函数
main