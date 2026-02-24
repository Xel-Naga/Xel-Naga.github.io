/**
 * 任务管理器
 * 负责管理任务进度和触发
 */

import { QUEST_STATES } from '../utils/Constants.js';

export class QuestManager {
    constructor(game) {
        this.game = game;
    }

    /**
     * 初始化任务管理器
     */
    init() {
        console.log('初始化任务管理器...');
        this.setupEventListeners();

        // 初始检查可用的任务
        setTimeout(() => {
            this.checkAvailableQuests();
        }, 1000);
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 监听可能触发任务的事件
        this.game.eventSystem.on('player:moved', (data) => this.checkLocationTriggers(data));
        this.game.eventSystem.on('player:item:added', (data) => this.checkItemTriggers(data));
        this.game.eventSystem.on('dialogue:choice:made', (data) => this.checkDialogueTriggers(data));
        this.game.eventSystem.on('time:updated', (data) => this.checkTimeTriggers(data));
    }

    /**
     * 检查位置触发器
     * @param {Object} data - 移动数据
     */
    checkLocationTriggers(data) {
        const locationId = data.to;
        const quests = this.game.dataLoader.getQuests();

        for (const [questId, quest] of quests) {
            if (this.isQuestActive(questId) && quest.triggers) {
                quest.triggers.forEach(trigger => {
                    if (trigger.type === 'location' && trigger.location === locationId) {
                        this.triggerQuestEvent(questId, trigger);
                    }
                });
            }
        }
    }

    /**
     * 检查道具触发器
     * @param {Object} data - 道具数据
     */
    checkItemTriggers(data) {
        const itemId = data.itemId;
        const quests = this.game.dataLoader.getQuests();

        for (const [questId, quest] of quests) {
            if (this.isQuestActive(questId) && quest.triggers) {
                quest.triggers.forEach(trigger => {
                    if (trigger.type === 'item' && trigger.item === itemId) {
                        this.triggerQuestEvent(questId, trigger);
                    }
                });
            }
        }
    }

    /**
     * 检查对话触发器
     * @param {Object} data - 对话数据
     */
    checkDialogueTriggers(data) {
        const dialogueId = data.dialogueId;
        const quests = this.game.dataLoader.getQuests();

        for (const [questId, quest] of quests) {
            if (this.isQuestActive(questId) && quest.triggers) {
                quest.triggers.forEach(trigger => {
                    if (trigger.type === 'dialogue' && trigger.dialogue === dialogueId) {
                        this.triggerQuestEvent(questId, trigger);
                    }
                });
            }
        }
    }

    /**
     * 检查时间触发器
     * @param {Object} data - 时间数据
     */
    checkTimeTriggers(data) {
        const currentTime = data.time;
        const quests = this.game.dataLoader.getQuests();

        for (const [questId, quest] of quests) {
            if (this.isQuestActive(questId) && quest.triggers) {
                quest.triggers.forEach(trigger => {
                    if (trigger.type === 'time' && trigger.time === currentTime) {
                        this.triggerQuestEvent(questId, trigger);
                    }
                });
            }
        }
    }

    /**
     * 触发任务事件
     * @param {string} questId - 任务ID
     * @param {Object} trigger - 触发器
     */
    triggerQuestEvent(questId, trigger) {
        const quest = this.game.dataLoader.getQuest(questId);
        if (!quest) return;

        console.log(`触发任务事件: ${questId} - ${trigger.type}`);

        // 执行触发器效果
        this.executeTriggerEffect(questId, trigger);

        // 更新任务进度
        this.updateQuestProgress(questId, trigger);
    }

    /**
     * 执行触发器效果
     * @param {string} questId - 任务ID
     * @param {Object} trigger - 触发器
     */
    executeTriggerEffect(questId, trigger) {
        if (!trigger.effect) return;

        switch (trigger.effect.type) {
            case 'complete_step':
                this.completeQuestStep(questId, trigger.effect.step_id);
                break;
            case 'start_quest':
                this.startQuest(trigger.effect.quest_id);
                break;
            case 'complete_quest':
                this.completeQuest(trigger.effect.quest_id);
                break;
            case 'fail_quest':
                this.failQuest(trigger.effect.quest_id);
                break;
            case 'update_flag':
                this.game.gameState.setFlag(trigger.effect.flag, trigger.effect.value);
                break;
        }
    }

    /**
     * 更新任务进度
     * @param {string} questId - 任务ID
     * @param {Object} trigger - 触发器
     */
    updateQuestProgress(questId, trigger) {
        const quest = this.game.dataLoader.getQuest(questId);
        if (!quest || !quest.steps) return;

        console.log(`更新任务进度: ${questId}`);

        // 检查触发器是否匹配任务步骤
        if (trigger.step_id) {
            this.completeQuestStep(questId, trigger.step_id);
        }

        // 检查任务是否完成
        this.updateQuestCompletion(questId);

        // 更新UI
        this.game.uiRenderer.updateTasksUI();
    }

    /**
     * 开始任务
     * @param {string} questId - 任务ID
     * @returns {boolean} 是否开始成功
     */
    startQuest(questId) {
        const quest = this.game.dataLoader.getQuest(questId);
        if (!quest) {
            console.warn(`任务不存在: ${questId}`);
            return false;
        }

        // 检查前置任务
        if (quest.prerequisites && quest.prerequisites.length > 0) {
            for (const prereqId of quest.prerequisites) {
                if (!this.isQuestCompleted(prereqId)) {
                    console.log(`前置任务未完成: ${prereqId}`);
                    return false;
                }
            }
        }

        // 开始任务
        this.game.gameState.startQuest(questId);

        // 显示任务开始消息
        this.game.uiRenderer.addFeedback('系统', `新任务: ${quest.name}`, 'quest');
        this.game.uiRenderer.addFeedback('系统', quest.description, 'info');

        // 更新UI
        this.game.uiRenderer.updateTasksUI();
        this.game.uiRenderer.updateGameInfo();

        // 触发事件
        this.game.eventSystem.emit('quest:started', {
            questId,
            quest
        });

        return true;
    }

    /**
     * 完成任务
     * @param {string} questId - 任务ID
     * @returns {boolean} 是否完成成功
     */
    completeQuest(questId) {
        const quest = this.game.dataLoader.getQuest(questId);
        if (!quest) {
            console.warn(`任务不存在: ${questId}`);
            return false;
        }

        // 完成任务
        this.game.gameState.completeQuest(questId);

        // 发放奖励
        this.giveQuestRewards(quest);

        // 显示任务完成消息
        this.game.uiRenderer.addFeedback('系统', `任务完成: ${quest.name}`, 'success');

        // 更新UI
        this.game.uiRenderer.updateTasksUI();
        this.game.uiRenderer.updateGameInfo();

        // 触发事件
        this.game.eventSystem.emit('quest:completed', {
            questId,
            quest
        });

        return true;
    }

    /**
     * 任务失败
     * @param {string} questId - 任务ID
     * @returns {boolean} 是否失败成功
     */
    failQuest(questId) {
        const quest = this.game.dataLoader.getQuest(questId);
        if (!quest) {
            console.warn(`任务不存在: ${questId}`);
            return false;
        }

        // 标记任务失败
        this.game.gameState.failQuest(questId);

        // 显示任务失败消息
        this.game.uiRenderer.addFeedback('系统', `任务失败: ${quest.name}`, 'error');

        // 更新UI
        this.game.uiRenderer.updateTasksUI();
        this.game.uiRenderer.updateGameInfo();

        // 触发事件
        this.game.eventSystem.emit('quest:failed', {
            questId,
            quest
        });

        return true;
    }

    /**
     * 完成任务步骤
     * @param {string} questId - 任务ID
     * @param {string} stepId - 步骤ID
     * @returns {boolean} 是否完成成功
     */
    completeQuestStep(questId, stepId) {
        const quest = this.game.dataLoader.getQuest(questId);
        if (!quest || !quest.steps) return false;

        // 查找并标记步骤为完成
        const stepIndex = quest.steps.findIndex(step => step.id === stepId);
        if (stepIndex >= 0) {
            quest.steps[stepIndex].completed = true;
            console.log(`完成任务步骤: ${questId} - ${stepId}`);

            // 触发事件
            this.game.eventSystem.emit('quest:step:completed', {
                questId,
                stepId,
                step: quest.steps[stepIndex]
            });

            return true;
        }

        console.warn(`未找到任务步骤: ${questId} - ${stepId}`);
        return false;
    }

    /**
     * 发放任务奖励
     * @param {Object} quest - 任务对象
     */
    giveQuestRewards(quest) {
        if (!quest.rewards) return;

        // 经验值
        if (quest.rewards.experience) {
            // TODO: 实现经验值系统
            this.game.uiRenderer.addFeedback('系统', `获得经验值: ${quest.rewards.experience}`, 'info');
        }

        // 道具奖励
        if (quest.rewards.items && quest.rewards.items.length > 0) {
            quest.rewards.items.forEach(itemId => {
                const item = this.game.dataLoader.getItem(itemId);
                if (item) {
                    this.game.inventoryManager.addItem(itemId);
                    this.game.uiRenderer.addFeedback('系统', `获得道具: ${item.name}`, 'success');
                }
            });
        }

        // 解锁内容
        if (quest.rewards.unlock && quest.rewards.unlock.length > 0) {
            quest.rewards.unlock.forEach(unlockId => {
                this.game.gameState.setFlag(`unlocked_${unlockId}`, true);
                this.game.uiRenderer.addFeedback('系统', `解锁: ${unlockId}`, 'info');
            });
        }

        // 关系奖励
        if (quest.rewards.relationships) {
            for (const [npcId, change] of Object.entries(quest.rewards.relationships)) {
                this.game.gameState.modifyRelationship(npcId, change);
                this.game.uiRenderer.addFeedback('系统', `${npcId}关系${change > 0 ? '提升' : '下降'}`, 'info');
            }
        }
    }

    /**
     * 检查任务状态
     * @param {string} questId - 任务ID
     * @returns {string} 任务状态
     */
    getQuestStatus(questId) {
        return this.game.gameState.getQuestStatus(questId);
    }

    /**
     * 检查任务是否进行中
     * @param {string} questId - 任务ID
     * @returns {boolean} 是否进行中
     */
    isQuestActive(questId) {
        return this.getQuestStatus(questId) === QUEST_STATES.ACTIVE;
    }

    /**
     * 检查任务是否已完成
     * @param {string} questId - 任务ID
     * @returns {boolean} 是否已完成
     */
    isQuestCompleted(questId) {
        return this.getQuestStatus(questId) === QUEST_STATES.COMPLETED;
    }

    /**
     * 检查任务是否已失败
     * @param {string} questId - 任务ID
     * @returns {boolean} 是否已失败
     */
    isQuestFailed(questId) {
        return this.getQuestStatus(questId) === QUEST_STATES.FAILED;
    }

    /**
     * 检查任务是否未开始
     * @param {string} questId - 任务ID
     * @returns {boolean} 是否未开始
     */
    isQuestNotStarted(questId) {
        return this.getQuestStatus(questId) === QUEST_STATES.NOT_STARTED;
    }

    /**
     * 获取进行中的任务列表
     * @returns {Array} 进行中的任务ID列表
     */
    getActiveQuests() {
        const quests = this.game.gameState.getQuests();
        return quests.active;
    }

    /**
     * 获取已完成的任务列表
     * @returns {Array} 已完成的任务ID列表
     */
    getCompletedQuests() {
        const quests = this.game.gameState.getQuests();
        return quests.completed;
    }

    /**
     * 获取已失败的任务列表
     * @returns {Array} 已失败的任务ID列表
     */
    getFailedQuests() {
        const quests = this.game.gameState.getQuests();
        return quests.failed;
    }

    /**
     * 获取所有任务
     * @returns {Object} 所有任务状态
     */
    getAllQuests() {
        return this.game.gameState.getQuests();
    }

    /**
     * 获取任务进度
     * @param {string} questId - 任务ID
     * @returns {number} 任务进度 (0-100)
     */
    getQuestProgress(questId) {
        const quest = this.game.dataLoader.getQuest(questId);
        if (!quest || !quest.steps) return 0;

        const completedSteps = quest.steps.filter(step => step.completed).length;
        const totalSteps = quest.steps.length;

        return totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
    }

    /**
     * 检查任务是否满足开始条件
     * @param {string} questId - 任务ID
     * @returns {boolean} 是否满足条件
     */
    checkQuestStartConditions(questId) {
        const quest = this.game.dataLoader.getQuest(questId);
        if (!quest) return false;

        // 检查前置任务
        if (quest.prerequisites && quest.prerequisites.length > 0) {
            for (const prereqId of quest.prerequisites) {
                if (!this.isQuestCompleted(prereqId)) {
                    return false;
                }
            }
        }

        // 检查标志要求
        if (quest.requirements && quest.requirements.flags) {
            for (const flag of quest.requirements.flags) {
                if (!this.game.gameState.hasFlag(flag)) {
                    return false;
                }
            }
        }

        // 检查道具要求
        if (quest.requirements && quest.requirements.items) {
            for (const itemId of quest.requirements.items) {
                if (!this.game.gameState.hasItemInInventory(itemId)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * 自动检查可开始的任务
     */
    checkAvailableQuests() {
        const quests = this.game.dataLoader.getQuests();

        for (const [questId, quest] of quests) {
            if (this.isQuestNotStarted(questId) && this.checkQuestStartConditions(questId)) {
                // 任务可以自动开始
                if (quest.auto_start) {
                    this.startQuest(questId);
                }
            }
        }
    }

    /**
     * 更新所有任务进度
     */
    updateAllQuestProgress() {
        const activeQuests = this.getActiveQuests();

        activeQuests.forEach(questId => {
            this.updateQuestCompletion(questId);
        });
    }

    /**
     * 更新任务完成状态
     * @param {string} questId - 任务ID
     */
    updateQuestCompletion(questId) {
        const quest = this.game.dataLoader.getQuest(questId);
        if (!quest || !quest.completion_conditions) return;

        const conditionsMet = this.checkCompletionConditions(quest.completion_conditions);

        if (conditionsMet) {
            this.completeQuest(questId);
        }
    }

    /**
     * 检查完成条件
     * @param {Array} conditions - 完成条件列表
     * @returns {boolean} 是否满足条件
     */
    checkCompletionConditions(conditions) {
        if (!conditions || conditions.length === 0) return true;

        for (const condition of conditions) {
            if (!this.checkSingleCondition(condition)) {
                return false;
            }
        }

        return true;
    }

    /**
     * 检查单个条件
     * @param {Object} condition - 条件对象
     * @returns {boolean} 是否满足条件
     */
    checkSingleCondition(condition) {
        switch (condition.type) {
            case 'step_completed':
                const quest = this.game.dataLoader.getQuest(condition.quest_id);
                if (!quest || !quest.steps) return false;
                const step = quest.steps.find(s => s.id === condition.step_id);
                return step ? step.completed === true : false;
            case 'item_collected':
                return this.game.gameState.hasItemInInventory(condition.item_id);
            case 'location_visited':
                return this.game.gameState.getPlayerState().discoveredLocations.has(condition.location_id);
            case 'flag_set':
                return this.game.gameState.hasFlag(condition.flag);
            case 'relationship_min':
                return this.game.gameState.getRelationship(condition.npc_id) >= condition.min_value;
            default:
                console.warn(`未知条件类型: ${condition.type}`);
                return false;
        }
    }

    /**
     * 测试任务系统
     */
    testQuestSystem() {
        console.log('🧪 测试任务系统...');

        // 测试任务状态
        const questId = 'quest_chapter1';
        const status = this.getQuestStatus(questId);
        console.log(`任务状态: ${questId} = ${status}`);

        // 测试任务步骤
        const quest = this.game.dataLoader.getQuest(questId);
        if (quest && quest.steps) {
            console.log(`任务步骤数量: ${quest.steps.length}`);
            quest.steps.forEach(step => {
                console.log(`步骤: ${step.id} - ${step.description} (完成: ${step.completed})`);
            });
        }

        // 测试UI更新
        this.game.uiRenderer.updateTasksUI();

        console.log('✅ 任务系统测试完成');
    }

    /**
     * 获取任务详情HTML
     * @param {string} questId - 任务ID
     * @returns {string} 任务详情HTML
     */
    getQuestDetailsHTML(questId) {
        const quest = this.game.dataLoader.getQuest(questId);
        if (!quest) return '';

        let stepsHTML = '';
        if (quest.steps && quest.steps.length > 0) {
            quest.steps.forEach(step => {
                stepsHTML += `
                    <div class="quest-step ${step.completed ? 'completed' : ''}">
                        <i class="fas fa-${step.completed ? 'check' : 'circle'}"></i>
                        ${step.description}
                    </div>
                `;
            });
        }

        return `
            <div class="quest-details">
                <h4>${quest.name}</h4>
                <p class="quest-description">${quest.description}</p>
                <div class="quest-steps">${stepsHTML}</div>
                <div class="quest-rewards">
                    <strong>奖励:</strong>
                    ${quest.rewards?.experience ? `<div>经验值: ${quest.rewards.experience}</div>` : ''}
                    ${quest.rewards?.items ? `<div>道具: ${quest.rewards.items.join(', ')}</div>` : ''}
                </div>
            </div>
        `;
    }
}