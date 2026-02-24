/**
 * 游戏核心控制器
 * 协调所有游戏模块的工作
 */

// 导入核心模块
import { GameState } from './GameState.js';
import { EventSystem, GAME_EVENTS } from './EventSystem.js';

// 导入管理器模块
import { PlayerStatusManager } from '../managers/PlayerStatusManager.js';
import { DecisionManager } from '../managers/DecisionManager.js';
import { InventoryManager } from '../managers/InventoryManager.js';
import { QuestManager } from '../managers/QuestManager.js';
import { DialogueManager } from '../managers/DialogueManager.js';
import { MapManager } from '../managers/MapManager.js';

// 导入系统模块
import { DataLoader } from '../systems/DataLoader.js';
import { InteractionSystem } from '../systems/InteractionSystem.js';
import { UIRenderer } from '../systems/UIRenderer.js';
import { MoveSystem } from '../systems/MoveSystem.js';
import { TimeSystem } from '../systems/TimeSystem.js';

export class AdventureGame {
    constructor() {
        console.log('创建游戏实例...');

        // 初始化核心模块
        this.gameState = new GameState();
        this.eventSystem = new EventSystem();

        // 初始化数据加载器
        this.dataLoader = new DataLoader(this);

        // 初始化管理器
        this.statusManager = new PlayerStatusManager(this);
        this.decisionManager = new DecisionManager(this);
        this.inventoryManager = new InventoryManager(this);
        this.questManager = new QuestManager(this);
        this.dialogueManager = new DialogueManager(this);
        this.mapManager = new MapManager(this);

        // 初始化系统
        this.interactionSystem = new InteractionSystem(this);
        this.uiRenderer = new UIRenderer(this);
        this.moveSystem = new MoveSystem(this);
        this.timeSystem = new TimeSystem(this);

        // 其他状态
        this.selectedItem = null;
        this.isInitialized = false;
    }

    /**
     * 初始化游戏
     */
    async init() {
        console.log('🔄 开始AdventureGame初始化...');
        console.log('🔍 AdventureGame.init()开始时间:', new Date().toISOString());
        console.time('AdventureGame.init()执行时间');

        try {
            // 显示加载遮罩
            console.log('👁️ 显示加载遮罩');
            this.showLoading(true);

            // 加载游戏数据
            console.log('📂 开始加载游戏数据...');
            await this.dataLoader.loadGameData();
            console.log('✅ 游戏数据加载完成');

            console.log('🔄 初始化管理器...');
            // 初始化所有管理器
            this.statusManager.init();
            console.log('  ✅ PlayerStatusManager');
            this.decisionManager.init();
            console.log('  ✅ DecisionManager');
            this.inventoryManager.init();
            console.log('  ✅ InventoryManager');
            this.questManager.init();
            console.log('  ✅ QuestManager');
            this.dialogueManager.init();
            console.log('  ✅ DialogueManager');
            this.mapManager.init();
            console.log('  ✅ MapManager');

            console.log('🔄 初始化系统...');
            // 初始化所有系统
            this.interactionSystem.init();
            console.log('  ✅ InteractionSystem');
            this.uiRenderer.init();
            console.log('  ✅ UIRenderer');
            this.moveSystem.init();
            console.log('  ✅ MoveSystem');
            this.timeSystem.init();
            console.log('  ✅ TimeSystem');

            // 设置游戏数据
            console.log('📊 设置游戏数据...');
            this.gameState.setGameData(this.dataLoader.getData());

            // 初始化游戏状态
            console.log('🎮 初始化游戏状态...');
            this.initGameState();

            // 标记为已初始化
            this.isInitialized = true;

            // 隐藏加载遮罩
            console.log('👁️ 隐藏加载遮罩');
            this.showLoading(false);

            // 触发游戏初始化完成事件
            this.eventSystem.emit(GAME_EVENTS.GAME_INITIALIZED, {
                timestamp: new Date().toISOString(),
                chapter: this.gameState.getWorldState().chapter
            });

            console.log('🎉 AdventureGame初始化完成！');
            console.timeEnd('AdventureGame.init()执行时间');

            // 测试任务系统
            setTimeout(() => {
                console.log('🧪 开始任务系统测试...');
                this.questManager.testQuestSystem();
            }, 500);

        } catch (error) {
            console.error('❌ AdventureGame初始化失败:', error);
            console.error('🔍 错误堆栈:', error.stack);
            this.showLoading(false);

            // 显示错误信息
            if (this.uiRenderer && this.uiRenderer.addFeedback) {
                this.uiRenderer.addFeedback('系统', `游戏初始化失败: ${error.message}`, 'error');
            } else {
                console.error('⚠️ UIRenderer不可用，无法显示错误信息');
            }

            throw error;
        }
    }

    /**
     * 初始化游戏状态
     */
    initGameState() {
        console.log('初始化游戏状态...');

        // 添加初始道具
        this.inventoryManager.addItem("item_tools");

        // 激活第一章任务
        this.questManager.startQuest("quest_chapter1");

        // 更新UI显示
        this.uiRenderer.updateAllUI();
    }

    /**
     * 显示/隐藏加载遮罩
     * @param {boolean} show - 是否显示
     */
    showLoading(show) {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * 保存游戏
     * @param {string} slot - 存档槽位
     * @returns {boolean} 是否保存成功
     */
    saveGame(slot = 'autosave') {
        const success = this.gameState.saveToLocalStorage(slot);
        if (success) {
            this.eventSystem.emit(GAME_EVENTS.GAME_SAVED, { slot });
        }
        return success;
    }

    /**
     * 加载游戏
     * @param {string} slot - 存档槽位
     * @returns {boolean} 是否加载成功
     */
    loadGame(slot = 'autosave') {
        const success = this.gameState.loadFromLocalStorage(slot);
        if (success) {
            // 更新所有UI
            this.uiRenderer.updateAllUI();

            // 更新地图数据
            this.mapManager.updateMapData();

            this.eventSystem.emit(GAME_EVENTS.GAME_LOADED, { slot });
        }
        return success;
    }

    /**
     * 重置游戏
     */
    resetGame() {
        this.gameState.resetState();
        this.uiRenderer.updateAllUI();
        this.mapManager.resetMap();

        this.eventSystem.emit(GAME_EVENTS.GAME_RESET, {});
    }

    /**
     * 移动到指定方向
     * @param {string} direction - 移动方向
     * @returns {boolean} 是否移动成功
     */
    move(direction) {
        return this.moveSystem.move(direction);
    }

    /**
     * 直接传送到指定位置
     * @param {string} locationId - 位置ID
     * @param {string} reason - 传送原因
     * @returns {boolean} 是否传送成功
     */
    teleport(locationId, reason = '未知') {
        return this.moveSystem.teleport(locationId, reason);
    }

    /**
     * 推进时间
     * @param {number} minutes - 分钟数
     */
    advanceTime(minutes) {
        this.timeSystem.advanceTime(minutes);
    }

    /**
     * 开始对话
     * @param {string} dialogueId - 对话ID
     * @param {string} npcId - NPC ID
     * @returns {boolean} 是否开始成功
     */
    startDialogue(dialogueId, npcId = null) {
        return this.dialogueManager.startDialogue(dialogueId, npcId);
    }

    /**
     * 触发决策
     * @param {string} decisionId - 决策ID
     * @returns {boolean} 是否触发成功
     */
    triggerDecision(decisionId) {
        return this.decisionManager.triggerDecision(decisionId);
    }

    /**
     * 开始任务
     * @param {string} questId - 任务ID
     * @returns {boolean} 是否开始成功
     */
    startQuest(questId) {
        return this.questManager.startQuest(questId);
    }

    /**
     * 完成任务
     * @param {string} questId - 任务ID
     * @returns {boolean} 是否完成成功
     */
    completeQuest(questId) {
        return this.questManager.completeQuest(questId);
    }

    /**
     * 添加道具到库存
     * @param {string} itemId - 道具ID
     * @returns {boolean} 是否添加成功
     */
    addItem(itemId) {
        return this.inventoryManager.addItem(itemId);
    }

    /**
     * 从库存移除道具
     * @param {string} itemId - 道具ID
     * @returns {Object|null} 被移除的道具
     */
    removeItem(itemId) {
        return this.inventoryManager.removeItem(itemId);
    }

    /**
     * 使用道具
     * @param {string} itemId - 道具ID
     * @param {string} targetId - 目标ID
     * @returns {boolean} 是否使用成功
     */
    useItem(itemId, targetId) {
        return this.inventoryManager.useItemOnTarget(itemId, targetId);
    }

    /**
     * 休息动作
     * @returns {boolean} 是否休息成功
     */
    rest() {
        return this.statusManager.rest();
    }

    /**
     * 取暖动作
     * @returns {boolean} 是否取暖成功
     */
    warmUp() {
        return this.statusManager.warmUp();
    }

    /**
     * 冷静动作
     * @returns {boolean} 是否冷静成功
     */
    calmDown() {
        return this.statusManager.calmDown();
    }

    /**
     * 获取游戏状态
     * @returns {Object} 游戏状态
     */
    getGameState() {
        return this.gameState.getState();
    }

    /**
     * 获取游戏数据
     * @returns {Object} 游戏数据
     */
    getGameData() {
        return this.dataLoader.getData();
    }

    /**
     * 检查游戏是否已初始化
     * @returns {boolean} 是否已初始化
     */
    isInitialized() {
        return this.isInitialized;
    }

    /**
     * 获取事件系统
     * @returns {EventSystem} 事件系统
     */
    getEventSystem() {
        return this.eventSystem;
    }

    /**
     * 获取UI渲染器
     * @returns {UIRenderer} UI渲染器
     */
    getUIRenderer() {
        return this.uiRenderer;
    }

    /**
     * 获取状态管理器
     * @returns {PlayerStatusManager} 状态管理器
     */
    getStatusManager() {
        return this.statusManager;
    }

    /**
     * 获取决策管理器
     * @returns {DecisionManager} 决策管理器
     */
    getDecisionManager() {
        return this.decisionManager;
    }

    /**
     * 获取道具管理器
     * @returns {InventoryManager} 道具管理器
     */
    getInventoryManager() {
        return this.inventoryManager;
    }

    /**
     * 获取任务管理器
     * @returns {QuestManager} 任务管理器
     */
    getQuestManager() {
        return this.questManager;
    }

    /**
     * 获取对话管理器
     * @returns {DialogueManager} 对话管理器
     */
    getDialogueManager() {
        return this.dialogueManager;
    }

    /**
     * 获取地图管理器
     * @returns {MapManager} 地图管理器
     */
    getMapManager() {
        return this.mapManager;
    }

    /**
     * 获取交互系统
     * @returns {InteractionSystem} 交互系统
     */
    getInteractionSystem() {
        return this.interactionSystem;
    }

    /**
     * 获取移动系统
     * @returns {MoveSystem} 移动系统
     */
    getMoveSystem() {
        return this.moveSystem;
    }

    /**
     * 获取时间系统
     * @returns {TimeSystem} 时间系统
     */
    getTimeSystem() {
        return this.timeSystem;
    }

    /**
     * 获取数据加载器
     * @returns {DataLoader} 数据加载器
     */
    getDataLoader() {
        return this.dataLoader;
    }

    /**
     * 测试方法（用于调试）
     */
    test() {
        console.log('=== 游戏测试 ===');

        // 测试状态管理器
        console.log('测试状态管理器...');
        this.statusManager.consumeStamina(20, '测试');
        this.statusManager.consumeSanity(15, '测试');

        // 测试决策系统
        console.log('测试决策系统...');
        this.decisionManager.testDecision();

        // 测试对话系统
        console.log('测试对话系统...');
        this.dialogueManager.testDialogue();

        // 测试UI更新
        console.log('测试UI更新...');
        this.uiRenderer.updateAllUI();

        console.log('=== 测试完成 ===');
    }

    /**
     * 销毁游戏实例
     */
    destroy() {
        // 停止时间更新
        this.timeSystem.stopTimeUpdates();

        // 移除所有事件监听器
        this.eventSystem.removeAllListeners();

        // 重置状态
        this.isInitialized = false;
        this.selectedItem = null;

        console.log('游戏实例已销毁');
    }
}