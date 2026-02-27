# AGENTS.md

本文件为 Claude Code (claude.ai/code) 提供本项目的工作指南。

## 项目概述

《悬观谜案：百年轮回》是一款基于网页的交互式文字冒险游戏，采用中式恐怖题材。玩家扮演一名土木工程专业的学生，在暴风雪中调查一座偏远道观里的超自然事件。

**当前状态**：实现代码已被移除（git status 显示删除了 `index.html`、`main.js`、`style.css`、`modules/`、`data/`），但完整的设计文档、故事脚本和测试基础设施仍然保留。项目目前处于过渡状态。

## 架构设计

游戏采用模块化 JavaScript 架构，详细设计见 `doc/游戏设定.md`：

### 模块分类
- **核心模块 (3个)**：`AdventureGame.js`（游戏控制器）、`GameState.js`（状态管理）、`EventSystem.js`（发布/订阅通信）
- **管理模块 (6个)**：`PlayerStatusManager.js`、`DecisionManager.js`、`InventoryManager.js`、`QuestManager.js`、`DialogueManager.js`、`MapManager.js`
- **系统模块 (5个)**：`DataLoader.js`、`InteractionSystem.js`、`UIRenderer.js`、`MoveSystem.js`、`TimeSystem.js`
- **工具模块 (2个)**：`Constants.js`、`Helpers.js`

### 核心游戏系统
1. **颜色编码交互**：蓝色（检查）、绿色（收集）、黄色（线索）、红色（危险）、紫色（NPC）、橙色（设备）
2. **玩家状态管理**：体力、理智、体温、直觉、运气，带有动态效果
3. **决策系统**：限时选择，永久后果，风险等级
4. **动态叙事**：场景描述根据时间、进度和玩家状态变化
5. **事件防重复**：对重复动作提供智能反馈

### 数据结构
游戏内容定义在 JSON 文件（`data/chapter1.json`）中，包含地点、物品、NPC、任务和对话树。

## 开发工作流

### 常用命令
- `python start_server.py` - 启动本地 HTTP 服务器，端口 8000（ES6 模块需要 HTTP 服务器以解决 CORS 问题）
- `python test_game.py` - 运行完整的游戏测试
- `python test_game.py quick` - 快速检查文件结构和 JSON 验证
- `start_game_gbk.bat` - Windows 启动器，支持 GBK 编码

### 测试
1. **文件验证**：`python test_game.py quick` 检查必需文件和 JSON 语法
2. **完整测试**：启动服务器，然后在另一个终端运行 `python test_game.py`
3. **Windows**：双击 `test_game_gbk.bat` 进行一键测试

### 开发注意事项
- **切勿**直接双击 `index.html` - 始终使用 HTTP 服务器以避免 CORS 错误
- 需要 Python 3.6+，`requests` 库可选（`pip install requests`）
- 需要现代浏览器（Chrome 90+、Firefox 88+、Edge 90+），支持 ES6 模块
- Windows 控制台编码通过 GBK 批处理文件处理

## 目录结构

- `doc/` - 完整的设计文档（5个文件，共 1879+ 行）
- `story/` - 游戏脚本文件（4个章节，带交互标记）
- `outline/` - 与章节对应的故事大纲
- `test/` - 开发工具（Python 服务器、批处理文件、测试脚本）
- `assets/` - 游戏资源（字体、图标、场景图片）
- `.claude/` - Claude Code 权限设置
- `modules/` - **当前为空**（实现代码已移除）
- `data/` - **当前为空**（游戏数据已移除）

## 内容创作

### 故事脚本
位于 `story/` 目录，使用中文标记标注交互元素：
- 蓝色 `(可检查)` - 检查物品/书籍/雕刻/工具
- 绿色 `(可收集)` - 收集道具/线索/钥匙
- 黄色 `(线索)` - 重要信息/推理关键
- 红色 `(危险)` - 警告/陷阱/致命选择
- 紫色 `(NPC)` - 带选项的对话角色
- 橙色 `(设备)` - 可操作机关/设备

### 设计文档
- `doc/游戏设定.md` - 完整的游戏系统设计（1879 行）
- `doc/道观传奇-推理解密游戏框架.md` - 游戏框架文档
- `doc/动态叙事系统.md` - 动态叙事系统设计
- `doc/开发计划.md` - 开发路线图
- `doc/道家传奇.md` - 道家传说背景

## Git 状态说明

大部分实现文件已标记为删除（`git status` 显示 `D` 前缀）：
- `index.html`、`main.js`、`style.css`
- `modules/` 中的所有 JavaScript 模块
- `data/chapter1.json`
- README 文件

剩余结构包括设计文档、故事内容和测试基础设施 - 暗示可能进行重构或重大改版。

## 常见问题与解决方案

1. **CORS 错误**：始终使用 `python start_server.py`，切勿直接访问文件
2. **端口 8000 被占用**：修改 `start_server.py` 中的 `PORT` 或关闭冲突进程
3. **找不到 Python**：确保已安装 Python 3.6+，并勾选 "Add Python to PATH"
4. **编码问题**：Windows 上使用 `*_gbk.bat` 文件以正确显示中文
5. **缺少 Requests 库**：`pip install requests` 或使用 `python -m pip install requests`

## Claude Code 权限

`.claude/settings.local.json` 允许：
- Python 执行（`python`、`python3`）
- Node.js 命令（`node`、`node -c`）
- 系统工具（`taskkill`、`pkill`、`netstat`、`findstr`、`tasklist`、`PowerShell`）
- 文件操作（`ls`、`chmod`）
- 网络工具（`curl`）
