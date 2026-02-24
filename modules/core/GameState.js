/**
 * 游戏状态管理
 * 负责管理游戏的所有状态数据
 */

import { DEFAULT_CONFIG, QUEST_STATES } from '../utils/Constants.js';
import { deepClone } from '../utils/Helpers.js';

export class GameState {
    constructor() {
        // 初始化默认状态
        this.state = this.createDefaultState();
    }

    /**
     * 创建默认游戏状态
     * @returns {Object} 默认状态对象
     */
    createDefaultState() {
        return {
            player: {
                name: "林墨",
                location: "college_dorm",
                inventory: [],
                clues: [],
                // 生理状态
                stamina: {
                    current: DEFAULT_CONFIG.DEFAULT_STAMINA,
                    max: DEFAULT_CONFIG.DEFAULT_STAMINA
                },
                body_temperature: {
                    current: DEFAULT_CONFIG.DEFAULT_TEMPERATURE,
                    normal_range: DEFAULT_CONFIG.NORMAL_TEMPERATURE_RANGE
                },
                // 心理状态
                sanity: {
                    current: DEFAULT_CONFIG.DEFAULT_SANITY,
                    max: DEFAULT_CONFIG.DEFAULT_SANITY
                },
                // 隐藏状态
                hidden_states: {
                    intuition: 0,     // 直觉值 (0-100)
                    suspicion: 0,     // 疑心值 (0-100)
                    luck: 50,         // 运气值 (0-100)
                    trauma_level: 0   // 创伤等级
                },
                discoveredLocations: new Set(["college_dorm"]),
                currentQuest: null,
                quests: {
                    active: [],
                    completed: [],
                    failed: []
                },
                flags: new Map(),
                relationships: new Map(),
                dialogueHistory: new Set(),
                decisionHistory: []
            },
            world: {
                time: "15:00",
                date: "2025-01-15",
                weather: "snowstorm",
                chapter: 1,
                triggeredEvents: new Set(),
                clues: null,
                events: null,
                chapterData: null
            },
            gameData: null
        };
    }

    // ==================== 玩家状态方法 ====================

    /**
     * 获取玩家状态
     * @returns {Object} 玩家状态
     */
    getPlayerState() {
        return this.state.player;
    }

    /**
     * 获取玩家位置
     * @returns {string} 位置ID
     */
    getPlayerLocation() {
        return this.state.player.location;
    }

    /**
     * 设置玩家位置
     * @param {string} locationId - 位置ID
     */
    setPlayerLocation(locationId) {
        this.state.player.location = locationId;
        this.state.player.discoveredLocations.add(locationId);
    }

    /**
     * 获取玩家库存
     * @returns {Array} 道具列表
     */
    getPlayerInventory() {
        return this.state.player.inventory;
    }

    /**
     * 添加道具到库存
     * @param {Object} item - 道具对象
     * @returns {boolean} 是否添加成功
     */
    addItemToInventory(item) {
        if (!item || !item.id) return false;

        // 检查库存是否已满
        if (this.state.player.inventory.length >= DEFAULT_CONFIG.MAX_INVENTORY_SLOTS) {
            return false;
        }

        // 检查是否已存在
        const existingIndex = this.state.player.inventory.findIndex(i => i.id === item.id);
        if (existingIndex >= 0) {
            // 更新现有道具
            this.state.player.inventory[existingIndex] = item;
        } else {
            // 添加新道具
            this.state.player.inventory.push(item);
        }

        return true;
    }

    /**
     * 从库存移除道具
     * @param {string} itemId - 道具ID
     * @returns {Object|null} 被移除的道具
     */
    removeItemFromInventory(itemId) {
        const index = this.state.player.inventory.findIndex(item => item.id === itemId);
        if (index >= 0) {
            return this.state.player.inventory.splice(index, 1)[0];
        }
        return null;
    }

    /**
     * 获取库存中的道具
     * @param {string} itemId - 道具ID
     * @returns {Object|null} 道具对象
     */
    getItemFromInventory(itemId) {
        return this.state.player.inventory.find(item => item.id === itemId) || null;
    }

    /**
     * 检查库存是否包含道具
     * @param {string} itemId - 道具ID
     * @returns {boolean} 是否包含
     */
    hasItemInInventory(itemId) {
        return this.state.player.inventory.some(item => item.id === itemId);
    }

    /**
     * 获取库存数量
     * @returns {number} 库存道具数量
     */
    getInventoryCount() {
        return this.state.player.inventory.length;
    }

    // ==================== 线索方法 ====================

    /**
     * 获取所有线索
     * @returns {Array} 线索列表
     */
    getClues() {
        return this.state.player.clues;
    }

    /**
     * 添加线索
     * @param {Object} clue - 线索对象
     */
    addClue(clue) {
        if (!clue || !clue.id) return;

        // 检查是否已存在
        const existingIndex = this.state.player.clues.findIndex(c => c.id === clue.id);
        if (existingIndex >= 0) {
            // 更新现有线索
            this.state.player.clues[existingIndex] = clue;
        } else {
            // 添加新线索
            this.state.player.clues.push(clue);
        }
    }

    /**
     * 获取线索
     * @param {string} clueId - 线索ID
     * @returns {Object|null} 线索对象
     */
    getClue(clueId) {
        return this.state.player.clues.find(clue => clue.id === clueId) || null;
    }

    /**
     * 检查是否已有线索
     * @param {string} clueId - 线索ID
     * @returns {boolean} 是否已有
     */
    hasClue(clueId) {
        return this.state.player.clues.some(clue => clue.id === clueId);
    }

    // ==================== 任务方法 ====================

    /**
     * 获取所有任务
     * @returns {Object} 任务状态
     */
    getQuests() {
        return this.state.player.quests;
    }

    /**
     * 开始任务
     * @param {string} questId - 任务ID
     */
    startQuest(questId) {
        if (!this.state.player.quests.active.includes(questId)) {
            this.state.player.quests.active.push(questId);
        }
    }

    /**
     * 完成任务
     * @param {string} questId - 任务ID
     */
    completeQuest(questId) {
        const activeIndex = this.state.player.quests.active.indexOf(questId);
        if (activeIndex >= 0) {
            this.state.player.quests.active.splice(activeIndex, 1);
        }

        if (!this.state.player.quests.completed.includes(questId)) {
            this.state.player.quests.completed.push(questId);
        }
    }

    /**
     * 任务失败
     * @param {string} questId - 任务ID
     */
    failQuest(questId) {
        const activeIndex = this.state.player.quests.active.indexOf(questId);
        if (activeIndex >= 0) {
            this.state.player.quests.active.splice(activeIndex, 1);
        }

        if (!this.state.player.quests.failed.includes(questId)) {
            this.state.player.quests.failed.push(questId);
        }
    }

    /**
     * 检查任务状态
     * @param {string} questId - 任务ID
     * @returns {string} 任务状态
     */
    getQuestStatus(questId) {
        if (this.state.player.quests.active.includes(questId)) return QUEST_STATES.ACTIVE;
        if (this.state.player.quests.completed.includes(questId)) return QUEST_STATES.COMPLETED;
        if (this.state.player.quests.failed.includes(questId)) return QUEST_STATES.FAILED;
        return QUEST_STATES.NOT_STARTED;
    }

    // ==================== 世界状态方法 ====================

    /**
     * 获取世界状态
     * @returns {Object} 世界状态
     */
    getWorldState() {
        return this.state.world;
    }

    /**
     * 获取当前时间
     * @returns {string} 时间字符串 (HH:MM)
     */
    getCurrentTime() {
        return this.state.world.time;
    }

    /**
     * 设置当前时间
     * @param {string} time - 时间字符串 (HH:MM)
     */
    setCurrentTime(time) {
        this.state.world.time = time;
    }

    /**
     * 获取当前日期
     * @returns {string} 日期字符串
     */
    getCurrentDate() {
        return this.state.world.date;
    }

    /**
     * 设置当前日期
     * @param {string} date - 日期字符串
     */
    setCurrentDate(date) {
        this.state.world.date = date;
    }

    /**
     * 获取当前天气
     * @returns {string} 天气
     */
    getCurrentWeather() {
        return this.state.world.weather;
    }

    /**
     * 设置当前天气
     * @param {string} weather - 天气
     */
    setCurrentWeather(weather) {
        this.state.world.weather = weather;
    }

    /**
     * 获取当前章节
     * @returns {number} 章节编号
     */
    getCurrentChapter() {
        return this.state.world.chapter;
    }

    /**
     * 设置当前章节
     * @param {number} chapter - 章节编号
     */
    setCurrentChapter(chapter) {
        this.state.world.chapter = chapter;
    }

    // ==================== 标志和关系方法 ====================

    /**
     * 设置标志
     * @param {string} flag - 标志名称
     * @param {*} value - 标志值
     */
    setFlag(flag, value = true) {
        this.state.player.flags.set(flag, value);
    }

    /**
     * 获取标志
     * @param {string} flag - 标志名称
     * @param {*} defaultValue - 默认值
     * @returns {*} 标志值
     */
    getFlag(flag, defaultValue = false) {
        return this.state.player.flags.has(flag) ? this.state.player.flags.get(flag) : defaultValue;
    }

    /**
     * 检查标志
     * @param {string} flag - 标志名称
     * @returns {boolean} 是否设置
     */
    hasFlag(flag) {
        return this.state.player.flags.has(flag);
    }

    /**
     * 清除标志
     * @param {string} flag - 标志名称
     */
    clearFlag(flag) {
        this.state.player.flags.delete(flag);
    }

    /**
     * 设置关系值
     * @param {string} npcId - NPC ID
     * @param {number} value - 关系值
     */
    setRelationship(npcId, value) {
        this.state.player.relationships.set(npcId, value);
    }

    /**
     * 获取关系值
     * @param {string} npcId - NPC ID
     * @param {number} defaultValue - 默认值
     * @returns {number} 关系值
     */
    getRelationship(npcId, defaultValue = 0) {
        return this.state.player.relationships.has(npcId) ?
               this.state.player.relationships.get(npcId) : defaultValue;
    }

    /**
     * 修改关系值
     * @param {string} npcId - NPC ID
     * @param {number} delta - 变化量
     */
    modifyRelationship(npcId, delta) {
        const current = this.getRelationship(npcId);
        this.setRelationship(npcId, Math.max(-100, Math.min(100, current + delta)));
    }

    // ==================== 对话历史方法 ====================

    /**
     * 记录对话历史
     * @param {string} dialogueId - 对话ID
     */
    recordDialogueHistory(dialogueId) {
        this.state.player.dialogueHistory.add(dialogueId);
    }

    /**
     * 检查对话是否已读
     * @param {string} dialogueId - 对话ID
     * @returns {boolean} 是否已读
     */
    isDialogueRead(dialogueId) {
        return this.state.player.dialogueHistory.has(dialogueId);
    }

    // ==================== 决策历史方法 ====================

    /**
     * 记录决策历史
     * @param {Object} decision - 决策对象
     */
    recordDecisionHistory(decision) {
        this.state.player.decisionHistory.push({
            timestamp: new Date().toISOString(),
            ...decision
        });
    }

    /**
     * 获取决策历史
     * @returns {Array} 决策历史列表
     */
    getDecisionHistory() {
        return this.state.player.decisionHistory;
    }

    // ==================== 游戏数据方法 ====================

    /**
     * 设置游戏数据
     * @param {Object} gameData - 游戏数据
     */
    setGameData(gameData) {
        this.state.gameData = gameData;
    }

    /**
     * 获取游戏数据
     * @returns {Object} 游戏数据
     */
    getGameData() {
        return this.state.gameData;
    }

    // ==================== 状态操作方法 ====================

    /**
     * 获取完整状态（深拷贝）
     * @returns {Object} 游戏状态
     */
    getState() {
        return deepClone(this.state);
    }

    /**
     * 设置状态
     * @param {Object} state - 状态对象
     */
    setState(state) {
        this.state = deepClone(state);
    }

    /**
     * 重置状态
     */
    resetState() {
        this.state = this.createDefaultState();
    }

    /**
     * 保存状态到本地存储
     * @param {string} slot - 存档槽位
     */
    saveToLocalStorage(slot = 'autosave') {
        try {
            const stateToSave = this.getState();
            // 转换Set和Map为数组
            stateToSave.player.discoveredLocations = Array.from(stateToSave.player.discoveredLocations);
            stateToSave.player.flags = Array.from(stateToSave.player.flags);
            stateToSave.player.relationships = Array.from(stateToSave.player.relationships);
            stateToSave.player.dialogueHistory = Array.from(stateToSave.player.dialogueHistory);
            stateToSave.world.triggeredEvents = Array.from(stateToSave.world.triggeredEvents);

            localStorage.setItem(`saved_game_${slot}`, JSON.stringify(stateToSave));
            return true;
        } catch (error) {
            console.error('保存游戏状态失败:', error);
            return false;
        }
    }

    /**
     * 从本地存储加载状态
     * @param {string} slot - 存档槽位
     * @returns {boolean} 是否加载成功
     */
    loadFromLocalStorage(slot = 'autosave') {
        try {
            const saved = localStorage.getItem(`saved_game_${slot}`);
            if (!saved) return false;

            const loadedState = JSON.parse(saved);
            // 恢复Set和Map
            loadedState.player.discoveredLocations = new Set(loadedState.player.discoveredLocations);
            loadedState.player.flags = new Map(loadedState.player.flags);
            loadedState.player.relationships = new Map(loadedState.player.relationships);
            loadedState.player.dialogueHistory = new Set(loadedState.player.dialogueHistory);
            loadedState.world.triggeredEvents = new Set(loadedState.world.triggeredEvents);

            this.setState(loadedState);
            return true;
        } catch (error) {
            console.error('加载游戏状态失败:', error);
            return false;
        }
    }
}