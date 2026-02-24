/**
 * 决策管理器
 * 负责管理关键时刻的动作决策系统
 */

import { RISK_LEVELS, RISK_LEVEL_TEXTS } from '../utils/Constants.js';
import { randomInt } from '../utils/Helpers.js';

export class DecisionManager {
    constructor(game) {
        this.game = game;
        this.activeDecision = null;
        this.decisionHistory = [];
        this.echoEffects = new Map();
        this.timerInterval = null;
        this.timeRemaining = 0;
    }

    /**
     * 初始化决策管理器
     */
    init() {
        console.log('初始化决策管理器...');
        this.setupEventListeners();
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 监听决策相关事件
        this.game.eventSystem.on('player:moved', (data) => this.checkLocationDecisions(data));
        this.game.eventSystem.on('player:interacted', (data) => this.checkInteractionDecisions(data));
        this.game.eventSystem.on('player:status:changed', (data) => this.checkStatusDecisions(data));
    }

    /**
     * 检查位置相关决策
     * @param {Object} data - 移动数据
     */
    checkLocationDecisions(data) {
        const locationId = data.location;
        const decisions = this.game.dataLoader.getDecisions();

        for (const [decisionId, decision] of decisions) {
            if (decision.trigger_type === 'location' && decision.trigger_location === locationId) {
                this.triggerDecision(decisionId);
                break;
            }
        }
    }

    /**
     * 检查交互相关决策
     * @param {Object} data - 交互数据
     */
    checkInteractionDecisions(data) {
        const interactiveId = data.interactiveId;
        const decisions = this.game.dataLoader.getDecisions();

        for (const [decisionId, decision] of decisions) {
            if (decision.trigger_type === 'interaction' && decision.trigger_interactive === interactiveId) {
                this.triggerDecision(decisionId);
                break;
            }
        }
    }

    /**
     * 检查状态相关决策
     * @param {Object} data - 状态数据
     */
    checkStatusDecisions(data) {
        const statusType = data.type;
        const currentValue = data.current;
        const decisions = this.game.dataLoader.getDecisions();

        for (const [decisionId, decision] of decisions) {
            if (decision.trigger_type === 'status' &&
                decision.trigger_status === statusType &&
                currentValue <= decision.trigger_threshold) {
                this.triggerDecision(decisionId);
                break;
            }
        }
    }

    /**
     * 触发决策
     * @param {string} decisionId - 决策ID
     * @returns {boolean} 是否触发成功
     */
    triggerDecision(decisionId) {
        const decision = this.game.dataLoader.getDecision(decisionId);
        if (!decision) {
            console.warn(`决策不存在: ${decisionId}`);
            return false;
        }

        // 检查触发条件
        if (!this.checkDecisionRequirements(decision)) {
            return false;
        }

        // 检查是否已触发过
        if (decision.trigger_once && this.decisionHistory.some(d => d.decisionId === decisionId)) {
            return false;
        }

        this.activeDecision = decision;
        this.timeRemaining = decision.time_limit || 30;

        // 显示决策对话框
        this.showDecisionDialog();

        // 触发事件
        this.game.eventSystem.emit('decision:triggered', {
            decisionId,
            decision,
            timeLimit: this.timeRemaining
        });

        return true;
    }

    /**
     * 检查决策要求
     * @param {Object} decision - 决策对象
     * @returns {boolean} 是否满足要求
     */
    checkDecisionRequirements(decision) {
        if (!decision.requirements) return true;

        const player = this.game.gameState.getPlayerState();

        // 检查属性要求
        if (decision.requirements.attributes) {
            for (const [attr, minValue] of Object.entries(decision.requirements.attributes)) {
                let currentValue;

                switch (attr) {
                    case 'stamina':
                        currentValue = player.stamina.current;
                        break;
                    case 'sanity':
                        currentValue = player.sanity.current;
                        break;
                    case 'intuition':
                        currentValue = player.hidden_states.intuition;
                        break;
                    case 'suspicion':
                        currentValue = player.hidden_states.suspicion;
                        break;
                    default:
                        console.warn(`未知属性要求: ${attr}`);
                        continue;
                }

                if (currentValue < minValue) {
                    return false;
                }
            }
        }

        // 检查道具要求
        if (decision.requirements.items) {
            for (const itemId of decision.requirements.items) {
                if (!this.game.gameState.hasItemInInventory(itemId)) {
                    return false;
                }
            }
        }

        // 检查标志要求
        if (decision.requirements.flags) {
            for (const flag of decision.requirements.flags) {
                if (!this.game.gameState.hasFlag(flag)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * 显示决策对话框
     */
    showDecisionDialog() {
        const modal = document.getElementById('decision-modal');
        const title = document.getElementById('decision-title');
        const description = document.getElementById('decision-description');
        const optionsContainer = document.getElementById('decision-options');
        const timerBar = document.getElementById('timer-progress');
        const timeRemainingSpan = document.getElementById('time-remaining');

        if (!modal || !title || !description || !optionsContainer) {
            console.error('决策对话框元素不存在');
            return;
        }

        // 设置对话框内容
        title.textContent = this.activeDecision.title;
        description.textContent = this.activeDecision.description;

        // 生成选项
        optionsContainer.innerHTML = '';
        this.activeDecision.options.forEach((option, index) => {
            const optionElement = this.createOptionElement(option, index);
            optionsContainer.appendChild(optionElement);
        });

        // 设置计时器
        if (this.activeDecision.time_limit) {
            this.startTimer(timerBar, timeRemainingSpan);
        } else {
            timerBar.style.display = 'none';
            timeRemainingSpan.style.display = 'none';
        }

        // 显示对话框
        modal.style.display = 'flex';

        // 绑定关闭按钮事件
        const closeBtn = document.getElementById('close-decision');
        if (closeBtn) {
            closeBtn.onclick = () => this.closeDecisionDialog();
        }

        // 绑定取消按钮事件
        const cancelBtn = document.getElementById('cancel-decision-btn');
        if (cancelBtn) {
            cancelBtn.onclick = () => this.handleCancelDecision();
        }
    }

    /**
     * 创建选项元素
     * @param {Object} option - 选项对象
     * @param {number} index - 选项索引
     * @returns {HTMLElement} 选项元素
     */
    createOptionElement(option, index) {
        const optionElement = document.createElement('div');
        optionElement.className = 'decision-option';
        optionElement.dataset.optionIndex = index;

        // 检查要求是否满足
        const requirementsMet = this.checkOptionRequirements(option);

        // 构建选项HTML
        let html = `<div class="option-text">${option.text}</div>`;

        // 添加风险等级
        if (option.risk_level) {
            html += `<div class="risk-level risk-${option.risk_level}">${this.getRiskLevelText(option.risk_level)}</div>`;
        }

        // 添加要求文本
        if (!requirementsMet) {
            const reqText = this.getRequirementsText(option.requirements);
            html += `<div class="requirements">需要：${reqText}</div>`;
        }

        // 添加成功率
        if (option.success_probability && option.success_probability < 1.0) {
            const successPercent = Math.round(option.success_probability * 100);
            html += `<div class="requirements">成功率：${successPercent}%</div>`;
        }

        optionElement.innerHTML = html;

        // 添加点击事件
        if (requirementsMet) {
            optionElement.classList.add('available');
            optionElement.addEventListener('click', () => this.handleOptionSelect(index));
        } else {
            optionElement.classList.add('unavailable');
        }

        return optionElement;
    }

    /**
     * 检查选项要求
     * @param {Object} option - 选项对象
     * @returns {boolean} 是否满足要求
     */
    checkOptionRequirements(option) {
        if (!option.requirements) return true;

        const player = this.game.gameState.getPlayerState();

        // 检查属性要求
        if (option.requirements.attributes) {
            for (const [attr, minValue] of Object.entries(option.requirements.attributes)) {
                let currentValue;

                switch (attr) {
                    case 'stamina':
                        currentValue = player.stamina.current;
                        break;
                    case 'sanity':
                        currentValue = player.sanity.current;
                        break;
                    case 'intuition':
                        currentValue = player.hidden_states.intuition;
                        break;
                    case 'suspicion':
                        currentValue = player.hidden_states.suspicion;
                        break;
                    default:
                        console.warn(`未知属性要求: ${attr}`);
                        continue;
                }

                if (currentValue < minValue) {
                    return false;
                }
            }
        }

        // 检查道具要求
        if (option.requirements.items) {
            for (const itemId of option.requirements.items) {
                if (!this.game.gameState.hasItemInInventory(itemId)) {
                    return false;
                }
            }
        }

        // 检查标志要求
        if (option.requirements.flags) {
            for (const flag of option.requirements.flags) {
                if (!this.game.gameState.hasFlag(flag)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * 获取要求文本
     * @param {Object} requirements - 要求对象
     * @returns {string} 要求文本
     */
    getRequirementsText(requirements) {
        if (!requirements) return '';

        const texts = [];

        if (requirements.attributes) {
            for (const [attr, value] of Object.entries(requirements.attributes)) {
                let attrName;
                switch (attr) {
                    case 'stamina': attrName = '体力'; break;
                    case 'sanity': attrName = '理智'; break;
                    case 'intuition': attrName = '直觉'; break;
                    case 'suspicion': attrName = '疑心'; break;
                    default: attrName = attr;
                }
                texts.push(`${attrName}≥${value}`);
            }
        }

        if (requirements.items && requirements.items.length > 0) {
            const itemNames = requirements.items.map(itemId => {
                const item = this.game.dataLoader.getItem(itemId);
                return item ? item.name : itemId;
            });
            texts.push(`需要: ${itemNames.join('、')}`);
        }

        return texts.join('，');
    }

    /**
     * 获取风险等级文本
     * @param {string} riskLevel - 风险等级
     * @returns {string} 风险等级文本
     */
    getRiskLevelText(riskLevel) {
        return RISK_LEVEL_TEXTS[riskLevel] || '未知风险';
    }

    /**
     * 开始计时器
     * @param {HTMLElement} timerBar - 计时器进度条
     * @param {HTMLElement} timeRemainingSpan - 剩余时间显示
     */
    startTimer(timerBar, timeRemainingSpan) {
        const totalTime = this.timeRemaining;
        const updateInterval = 100; // 100毫秒更新一次

        this.timerInterval = setInterval(() => {
            this.timeRemaining -= 0.1;

            if (this.timeRemaining <= 0) {
                this.handleTimeout();
                return;
            }

            // 更新进度条
            const percentage = (this.timeRemaining / totalTime) * 100;
            timerBar.style.width = `${percentage}%`;

            // 更新剩余时间显示
            timeRemainingSpan.textContent = `${Math.ceil(this.timeRemaining)}秒`;
        }, updateInterval);
    }

    /**
     * 停止计时器
     */
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    /**
     * 处理超时
     */
    handleTimeout() {
        this.stopTimer();

        // 执行默认选项或失败处理
        if (this.activeDecision.timeout_option !== undefined) {
            this.handleOptionSelect(this.activeDecision.timeout_option);
        } else {
            // 默认失败处理
            this.game.eventSystem.emit('decision:timeout', {
                decisionId: this.activeDecision.id,
                decision: this.activeDecision
            });

            this.closeDecisionDialog();
        }
    }

    /**
     * 处理选项选择
     * @param {number} optionIndex - 选项索引
     */
    handleOptionSelect(optionIndex) {
        this.stopTimer();

        const option = this.activeDecision.options[optionIndex];
        if (!option) {
            console.error(`选项不存在: ${optionIndex}`);
            return;
        }

        // 计算成功率
        const success = this.calculateSuccess(option);

        // 应用即时效果
        this.applyImmediateEffects(option, success);

        // 记录决策历史
        this.recordDecision(option, optionIndex, success);

        // 设置回响效果
        this.setEchoEffects(option, success);

        // 触发后续事件
        this.triggerFollowupEvents(option, success);

        // 关闭对话框
        this.closeDecisionDialog();

        // 触发事件
        this.game.eventSystem.emit('decision:made', {
            decisionId: this.activeDecision.id,
            optionIndex,
            option,
            success,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * 计算成功率
     * @param {Object} option - 选项对象
     * @returns {boolean} 是否成功
     */
    calculateSuccess(option) {
        if (!option.success_probability || option.success_probability >= 1.0) {
            return true;
        }

        const player = this.game.gameState.getPlayerState();
        const baseProbability = option.success_probability;

        // 运气影响
        const luckBonus = player.hidden_states.luck / 200; // 0-0.5的加成
        const finalProbability = Math.min(0.95, baseProbability + luckBonus);

        return Math.random() < finalProbability;
    }

    /**
     * 应用即时效果
     * @param {Object} option - 选项对象
     * @param {boolean} success - 是否成功
     */
    applyImmediateEffects(option, success) {
        const effects = success ? option.immediate_effects : (option.failure_consequences || {});

        if (!effects) return;

        // 属性变化
        if (effects.attribute_changes) {
            for (const [attr, change] of Object.entries(effects.attribute_changes)) {
                this.applyAttributeChange(attr, change);
            }
        }

        // 设置标志
        if (effects.flag_set) {
            for (const flag of effects.flag_set) {
                this.game.gameState.setFlag(flag);
            }
        }

        // 关系变化
        if (effects.relationship_changes) {
            for (const [npcId, change] of Object.entries(effects.relationship_changes)) {
                this.game.gameState.modifyRelationship(npcId, change);
            }
        }
    }

    /**
     * 应用属性变化
     * @param {string} attr - 属性名称
     * @param {number} change - 变化量
     */
    applyAttributeChange(attr, change) {
        switch (attr) {
            case 'stamina':
                if (change > 0) {
                    this.game.statusManager.restoreStamina(change, '决策效果');
                } else {
                    this.game.statusManager.consumeStamina(-change, '决策效果');
                }
                break;
            case 'sanity':
                if (change > 0) {
                    this.game.statusManager.restoreSanity(change, '决策效果');
                } else {
                    this.game.statusManager.consumeSanity(-change, '决策效果');
                }
                break;
            case 'intuition':
            case 'suspicion':
            case 'luck':
            case 'trauma_level':
                this.game.statusManager.updateHiddenState(attr, change, '决策效果');
                break;
            default:
                console.warn(`未知属性: ${attr}`);
        }
    }

    /**
     * 记录决策
     * @param {Object} option - 选项对象
     * @param {number} optionIndex - 选项索引
     * @param {boolean} success - 是否成功
     */
    recordDecision(option, optionIndex, success) {
        const decisionRecord = {
            decisionId: this.activeDecision.id,
            decisionTitle: this.activeDecision.title,
            optionIndex,
            optionText: option.text,
            success,
            timestamp: new Date().toISOString()
        };

        this.decisionHistory.push(decisionRecord);
        this.game.gameState.recordDecisionHistory(decisionRecord);
    }

    /**
     * 设置回响效果
     * @param {Object} option - 选项对象
     * @param {boolean} success - 是否成功
     */
    setEchoEffects(option, success) {
        const consequences = success ? option.long_term_consequences : (option.failure_consequences || {});

        if (!consequences) return;

        // 解锁分支
        if (consequences.unlock_branch) {
            this.game.gameState.setFlag(`unlocked_${consequences.unlock_branch}`, true);
        }

        // 关闭分支
        if (consequences.close_branch) {
            this.game.gameState.setFlag(`closed_${consequences.close_branch}`, true);
        }

        // 未来触发器
        if (consequences.future_triggers) {
            for (const trigger of consequences.future_triggers) {
                this.echoEffects.set(trigger, {
                    decisionId: this.activeDecision.id,
                    optionIndex: option.index,
                    timestamp: new Date().toISOString()
                });
            }
        }

        // 结局权重
        if (consequences.ending_weight) {
            for (const [ending, weight] of Object.entries(consequences.ending_weight)) {
                const currentWeight = this.game.gameState.getFlag(`ending_weight_${ending}`, 0);
                this.game.gameState.setFlag(`ending_weight_${ending}`, currentWeight + weight);
            }
        }
    }

    /**
     * 触发后续事件
     * @param {Object} option - 选项对象
     * @param {boolean} success - 是否成功
     */
    triggerFollowupEvents(option, success) {
        const consequences = success ? option.long_term_consequences : (option.failure_consequences || {});

        if (!consequences) return;

        // 触发任务变化
        if (consequences.quest_changes) {
            for (const [questId, change] of Object.entries(consequences.quest_changes)) {
                if (change === 'start') {
                    this.game.gameState.startQuest(questId);
                } else if (change === 'complete') {
                    this.game.gameState.completeQuest(questId);
                } else if (change === 'fail') {
                    this.game.gameState.failQuest(questId);
                }
            }
        }
    }

    /**
     * 处理取消决策
     */
    handleCancelDecision() {
        this.stopTimer();

        // 触发取消事件
        this.game.eventSystem.emit('decision:cancelled', {
            decisionId: this.activeDecision.id,
            decision: this.activeDecision
        });

        this.closeDecisionDialog();
    }

    /**
     * 关闭决策对话框
     */
    closeDecisionDialog() {
        this.stopTimer();
        this.activeDecision = null;
        this.timeRemaining = 0;

        const modal = document.getElementById('decision-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * 测试决策（用于调试）
     * @param {string} decisionId - 决策ID
     */
    testDecision(decisionId = 'test_decision') {
        const testDecision = {
            id: decisionId,
            title: '测试决策',
            description: '这是一个测试决策，用于验证决策系统功能。',
            time_limit: 30,
            options: [
                {
                    text: '选择选项一',
                    risk_level: RISK_LEVELS.LOW,
                    success_probability: 0.9,
                    immediate_effects: {
                        attribute_changes: {
                            stamina: -10,
                            sanity: 5
                        }
                    }
                },
                {
                    text: '选择选项二',
                    risk_level: RISK_LEVELS.HIGH,
                    success_probability: 0.5,
                    requirements: {
                        attributes: {
                            stamina: 50
                        }
                    },
                    immediate_effects: {
                        attribute_changes: {
                            stamina: -30,
                            sanity: -20
                        }
                    }
                }
            ]
        };

        this.activeDecision = testDecision;
        this.timeRemaining = testDecision.time_limit;
        this.showDecisionDialog();
    }
}