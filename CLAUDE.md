# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

《悬观谜案：百年轮回》(Suspended Temple Mystery: Century Cycle) is a web-based interactive text adventure game with Chinese horror themes. Players control a civil engineering student investigating supernatural events in a remote Taoist temple during a snowstorm.

**Current State**: The implementation code has been removed (git status shows deletions of `index.html`, `main.js`, `style.css`, `modules/`, `data/`), but comprehensive design documentation, story scripts, and testing infrastructure remain intact. The project appears to be in a transitional state.

## Architecture (As Designed)

The game was designed with a modular JavaScript architecture documented in `doc/游戏设定.md`:

### Module Categories
- **Core Modules (3)**: `AdventureGame.js` (game controller), `GameState.js` (state management), `EventSystem.js` (pub/sub communication)
- **Manager Modules (6)**: `PlayerStatusManager.js`, `DecisionManager.js`, `InventoryManager.js`, `QuestManager.js`, `DialogueManager.js`, `MapManager.js`
- **System Modules (5)**: `DataLoader.js`, `InteractionSystem.js`, `UIRenderer.js`, `MoveSystem.js`, `TimeSystem.js`
- **Utility Modules (2)**: `Constants.js`, `Helpers.js`

### Key Game Systems
1. **Color-coded Interaction**: Blue (examine), Green (collect), Yellow (clue), Red (danger), Purple (NPC), Orange (device)
2. **Player State Management**: Stamina, Sanity, Body Temperature, Intuition, Luck with dynamic effects
3. **Decision System**: Time-limited choices with permanent consequences and risk levels
4. **Dynamic Narrative**: Scene descriptions change based on time, progress, and player state
5. **Event Anti-repeat**: Intelligent feedback for repeated actions

### Data Structure
Game content defined in JSON files (`data/chapter1.json`) with locations, items, NPCs, quests, and dialogue trees.

## Development Workflow

### Essential Commands
- `python start_server.py` - Start local HTTP server on port 8000 (required for ES6 modules due to CORS)
- `python test_game.py` - Run comprehensive game tests
- `python test_game.py quick` - Quick file structure and JSON validation
- `start_game_gbk.bat` - Windows launcher with GBK encoding support

### Testing
1. **File Validation**: `python test_game.py quick` checks required files and JSON syntax
2. **Full Test**: Start server, then run `python test_game.py` in another terminal
3. **Windows**: Double-click `test_game_gbk.bat` for one-click testing

### Development Notes
- **Never** double-click `index.html` directly - always use HTTP server to avoid CORS errors
- Python 3.6+ required with `requests` library optional (`pip install requests`)
- Modern browser required (Chrome 90+, Firefox 88+, Edge 90+) with ES6 module support
- Windows console encoding handled via GBK batch files

## Directory Structure

- `doc/` - Comprehensive design documentation (5 files, 1879+ lines total)
- `story/` - Game script files (4 chapters with interactive markup)
- `outline/` - Story outlines matching chapters
- `test/` - Development tools (Python server, batch files, test scripts)
- `assets/` - Game assets (fonts, icons, scene images)
- `.claude/` - Claude Code permission settings
- `modules/` - **Currently empty** (implementation removed)
- `data/` - **Currently empty** (game data removed)

## Content Creation

### Story Scripts
Located in `story/` with Chinese markup for interactive elements:
- Blue `(可检查)` - Examine items/books/engravings/tools
- Green `(可收集)` - Collect props/clues/keys
- Yellow `(线索)` - Important information/reasoning keys
- Red `(危险)` - Warnings/traps/fatal choices
- Purple `(NPC)` - Dialogue characters with options
- Orange `(设备)` - Operable mechanisms/devices

### Design Documentation
- `doc/游戏设定.md` - Complete game system design (1879 lines)
- `doc/道观传奇-推理解密游戏框架.md` - Game framework documentation
- `doc/动态叙事系统.md` - Dynamic narrative system design
- `doc/开发计划.md` - Development roadmap
- `doc/道家传奇.md` - Taoist legend background

## Git Status Context

Most implementation files are staged for deletion (`git status` shows `D` prefix):
- `index.html`, `main.js`, `style.css`
- All JavaScript modules in `modules/`
- `data/chapter1.json`
- README files

The remaining structure includes design docs, story content, and test infrastructure - suggesting a possible rebuild or major refactor.

## Common Issues & Solutions

1. **CORS Errors**: Always use `python start_server.py`, never direct file access
2. **Port 8000 Busy**: Modify `PORT` in `start_server.py` or close conflicting process
3. **Python Not Found**: Ensure Python 3.6+ installed with "Add Python to PATH" checked
4. **Encoding Issues**: Use `*_gbk.bat` files on Windows for proper Chinese display
5. **Missing Requests Library**: `pip install requests` or use `python -m pip install requests`

## Claude Code Permissions

`.claude/settings.local.json` allows:
- Python execution (`python`, `python3`)
- Node.js commands (`node`, `node -c`)
- System utilities (`taskkill`, `pkill`, `netstat`, `findstr`, `tasklist`, `PowerShell`)
- File operations (`ls`, `chmod`)
- Network tools (`curl`)