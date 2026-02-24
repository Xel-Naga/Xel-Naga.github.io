/**
 * 玩家状态管理器
 * 负责管理玩家的多维状态属性（体力、理智、体温等）及其变化机制
 */

import { DEFAULT_CONFIG } from '../utils/Constants.js';
import { formatNumber } from '../utils/Helpers.js';

export class PlayerStatusManager {
    constructor(game) {
        this.game = game;
        this.statusEffects = new Map();
    }

    /**
     * 初始化状态管理器
     */
    init() {
        console.log('初始化玩家状态管理器...');
        this.setupStatusEffects();
    }

    /**
     * 设置状态效果阈值
     */
    setupStatusEffects() {
        // 体力效果
        this.statusEffects.set('stamina', {
            thresholds: [
                { level: 'high', value: 70, effect: '体力充沛，移动消耗减少10%' },
                { level: 'medium', value: 40, effect: '体力正常' },
                { level: 'low', value: 20, effect: '体力不足，移动消耗增加20%' },
                { level: 'critical', value: 10, effect: '体力耗尽，无法移动' }
            ]
        });

        // 理智效果
        this.statusEffects.set('sanity', {
            thresholds: [
                { level: 'high', value: 70, effect: '思维清晰，推理能力增强' },
                { level: 'medium', value: 40, effect: '理智正常' },
                { level: 'low', value: 20, effect: '开始产生幻觉，难度增加' },
                { level: 'critical', value: 10, effect: '理智崩溃，强制触发恐慌事件' }
            ]
        });

        // 体温效果
        this.statusEffects.set('temperature', {
            thresholds: [
                { level: 'high', value: 38.5, effect: '体温过高，体力消耗加快' },
                { level: 'normal', value: 36, effect: '体温正常' },
                { level: 'mild_hypothermia', value: 35, effect: '轻度失温，体力恢复-20%' },
                { level: 'moderate_hypothermia', value: 32, effect: '中度失温，动作迟缓' },
                { level: 'severe_hypothermia', value: 28, effect: '重度失温，生命危险' }
            ]
        });
    }

    /**
     * 消耗体力
     * @param {number} amount - 消耗量
     * @param {string} reason - 消耗原因
     * @returns {boolean} 是否消耗成功
     */
    consumeStamina(amount, reason = '未知') {
        const player = this.game.gameState.getPlayerState();
        const newStamina = Math.max(0, player.stamina.current - amount);

        if (newStamina === player.stamina.current) {
            return false;
        }

        player.stamina.current = newStamina;
        this.checkStatusEffects('stamina', player.stamina.current);

        // 触发事件
        this.game.eventSystem.emit('player:status:changed', {
            type: 'stamina',
            amount: -amount,
            reason,
            current: player.stamina.current,
            max: player.stamina.max
        });

        return true;
    }

    /**
     * 恢复体力
     * @param {number} amount - 恢复量
     * @param {string} reason - 恢复原因
     * @returns {boolean} 是否恢复成功
     */
    restoreStamina(amount, reason = '未知') {
        const player = this.game.gameState.getPlayerState();
        const newStamina = Math.min(player.stamina.max, player.stamina.current + amount);

        if (newStamina === player.stamina.current) {
            return false;
        }

        player.stamina.current = newStamina;
        this.checkStatusEffects('stamina', player.stamina.current);

        // 触发事件
        this.game.eventSystem.emit('player:status:changed', {
            type: 'stamina',
            amount: amount,
            reason,
            current: player.stamina.current,
            max: player.stamina.max
        });

        return true;
    }

    /**
     * 消耗理智
     * @param {number} amount - 消耗量
     * @param {string} reason - 消耗原因
     * @returns {boolean} 是否消耗成功
     */
    consumeSanity(amount, reason = '未知') {
        const player = this.game.gameState.getPlayerState();
        const newSanity = Math.max(0, player.sanity.current - amount);

        if (newSanity === player.sanity.current) {
            return false;
        }

        player.sanity.current = newSanity;
        this.checkStatusEffects('sanity', player.sanity.current);

        // 触发事件
        this.game.eventSystem.emit('player:status:changed', {
            type: 'sanity',
            amount: -amount,
            reason,
            current: player.sanity.current,
            max: player.sanity.max
        });

        return true;
    }

    /**
     * 恢复理智
     * @param {number} amount - 恢复量
     * @param {string} reason - 恢复原因
     * @returns {boolean} 是否恢复成功
     */
    restoreSanity(amount, reason = '未知') {
        const player = this.game.gameState.getPlayerState();
        const newSanity = Math.min(player.sanity.max, player.sanity.current + amount);

        if (newSanity === player.sanity.current) {
            return false;
        }

        player.sanity.current = newSanity;
        this.checkStatusEffects('sanity', player.sanity.current);

        // 触发事件
        this.game.eventSystem.emit('player:status:changed', {
            type: 'sanity',
            amount: amount,
            reason,
            current: player.sanity.current,
            max: player.sanity.max
        });

        return true;
    }

    /**
     * 改变体温
     * @param {number} amount - 变化量（正数为升温，负数为降温）
     * @param {string} reason - 变化原因
     * @returns {boolean} 是否变化成功
     */
    changeTemperature(amount, reason = '未知') {
        const player = this.game.gameState.getPlayerState();
        const newTemperature = player.body_temperature.current + amount;

        // 体温限制在合理范围内
        const clampedTemperature = Math.max(20, Math.min(42, newTemperature));

        if (clampedTemperature === player.body_temperature.current) {
            return false;
        }

        player.body_temperature.current = clampedTemperature;
        this.checkStatusEffects('temperature', player.body_temperature.current);

        // 触发事件
        this.game.eventSystem.emit('player:status:changed', {
            type: 'temperature',
            amount: amount,
            reason,
            current: player.body_temperature.current,
            normal_range: player.body_temperature.normal_range
        });

        return true;
    }

    /**
     * 检查状态效果
     * @param {string} statusType - 状态类型
     * @param {number} currentValue - 当前值
     */
    checkStatusEffects(statusType, currentValue) {
        const effects = this.statusEffects.get(statusType);
        if (!effects) return;

        // 找到当前所处的阈值等级
        let currentLevel = null;
        for (const threshold of effects.thresholds) {
            if (currentValue <= threshold.value) {
                currentLevel = threshold;
            } else {
                break;
            }
        }

        if (currentLevel) {
            // 触发阈值效果
            this.triggerStatusEffect(statusType, currentLevel);
        }
    }

    /**
     * 触发状态效果
     * @param {string} statusType - 状态类型
     * @param {Object} threshold - 阈值对象
     */
    triggerStatusEffect(statusType, threshold) {
        console.log(`触发${statusType}效果: ${threshold.level} - ${threshold.effect}`);

        // 触发事件
        this.game.eventSystem.emit('player:status:effect', {
            type: statusType,
            level: threshold.level,
            effect: threshold.effect,
            value: threshold.value
        });

        // 根据效果类型执行相应操作
        switch (statusType) {
            case 'stamina':
                this.handleStaminaEffect(threshold.level);
                break;
            case 'sanity':
                this.handleSanityEffect(threshold.level);
                break;
            case 'temperature':
                this.handleTemperatureEffect(threshold.level);
                break;
        }
    }

    /**
     * 处理体力效果
     * @param {string} level - 效果等级
     */
    handleStaminaEffect(level) {
        switch (level) {
            case 'critical':
                // 体力耗尽，无法移动
                this.game.eventSystem.emit('player:stamina:critical');
                break;
            case 'low':
                // 体力不足，移动消耗增加
                this.game.eventSystem.emit('player:stamina:low');
                break;
        }
    }

    /**
     * 处理理智效果
     * @param {string} level - 效果等级
     */
    handleSanityEffect(level) {
        switch (level) {
            case 'critical':
                // 理智崩溃，触发恐慌事件
                this.game.eventSystem.emit('player:sanity:critical');
                break;
            case 'low':
                // 开始产生幻觉
                this.game.eventSystem.emit('player:sanity:low');
                break;
            case 'high':
                // 思维清晰，推理加成
                this.game.eventSystem.emit('player:sanity:high');
                break;
        }
    }

    /**
     * 处理体温效果
     * @param {string} level - 效果等级
     */
    handleTemperatureEffect(level) {
        switch (level) {
            case 'severe_hypothermia':
                // 重度失温，生命危险
                this.game.eventSystem.emit('player:temperature:severe_hypothermia');
                break;
            case 'moderate_hypothermia':
                // 中度失温，动作迟缓
                this.game.eventSystem.emit('player:temperature:moderate_hypothermia');
                break;
            case 'mild_hypothermia':
                // 轻度失温，体力恢复减慢
                this.game.eventSystem.emit('player:temperature:mild_hypothermia');
                break;
            case 'high':
                // 体温过高，体力消耗加快
                this.game.eventSystem.emit('player:temperature:high');
                break;
        }
    }

    /**
     * 更新隐藏状态
     * @param {string} stateType - 状态类型
     * @param {number} amount - 变化量
     * @param {string} reason - 变化原因
     */
    updateHiddenState(stateType, amount, reason = '未知') {
        const player = this.game.gameState.getPlayerState();
        const hiddenStates = player.hidden_states;

        if (!hiddenStates.hasOwnProperty(stateType)) {
            console.warn(`未知的隐藏状态类型: ${stateType}`);
            return;
        }

        const newValue = Math.max(0, Math.min(100, hiddenStates[stateType] + amount));
        const changed = newValue !== hiddenStates[stateType];

        if (changed) {
            hiddenStates[stateType] = newValue;

            // 触发事件
            this.game.eventSystem.emit('player:hidden_state:changed', {
                type: stateType,
                amount: amount,
                reason,
                current: newValue
            });
        }

        return changed;
    }

    /**
     * 获取状态效果描述
     * @param {string} statusType - 状态类型
     * @param {number} currentValue - 当前值
     * @returns {string} 效果描述
     */
    getStatusEffectDescription(statusType, currentValue) {
        const effects = this.statusEffects.get(statusType);
        if (!effects) return '未知状态';

        for (const threshold of effects.thresholds) {
            if (currentValue <= threshold.value) {
                return threshold.effect;
            }
        }

        return '状态正常';
    }

    /**
     * 获取所有状态信息
     * @returns {Object} 状态信息对象
     */
    getAllStatusInfo() {
        const player = this.game.gameState.getPlayerState();

        return {
            stamina: {
                current: player.stamina.current,
                max: player.stamina.max,
                percentage: (player.stamina.current / player.stamina.max) * 100,
                effect: this.getStatusEffectDescription('stamina', player.stamina.current)
            },
            sanity: {
                current: player.sanity.current,
                max: player.sanity.max,
                percentage: (player.sanity.current / player.sanity.max) * 100,
                effect: this.getStatusEffectDescription('sanity', player.sanity.current)
            },
            temperature: {
                current: player.body_temperature.current,
                normal_range: player.body_temperature.normal_range,
                effect: this.getStatusEffectDescription('temperature', player.body_temperature.current)
            },
            hidden_states: {
                intuition: player.hidden_states.intuition,
                suspicion: player.hidden_states.suspicion,
                luck: player.hidden_states.luck,
                trauma_level: player.hidden_states.trauma_level
            }
        };
    }

    /**
     * 休息动作 - 恢复所有状态
     * @returns {boolean} 是否休息成功
     */
    rest() {
        const player = this.game.gameState.getPlayerState();

        // 恢复体力
        const staminaRestored = player.stamina.max - player.stamina.current;
        if (staminaRestored > 0) {
            this.restoreStamina(staminaRestored, '休息');
        }

        // 恢复理智
        const sanityRestored = Math.min(20, player.sanity.max - player.sanity.current);
        if (sanityRestored > 0) {
            this.restoreSanity(sanityRestored, '休息');
        }

        // 恢复体温到正常范围
        const normalTemp = (player.body_temperature.normal_range[0] + player.body_temperature.normal_range[1]) / 2;
        const tempChange = normalTemp - player.body_temperature.current;
        if (Math.abs(tempChange) > 0.1) {
            this.changeTemperature(tempChange, '休息');
        }

        // 触发事件
        this.game.eventSystem.emit('player:rested', {
            stamina_restored: staminaRestored,
            sanity_restored: sanityRestored,
            temperature_change: tempChange
        });

        return staminaRestored > 0 || sanityRestored > 0 || Math.abs(tempChange) > 0.1;
    }

    /**
     * 取暖动作 - 恢复体温
     * @returns {boolean} 是否取暖成功
     */
    warmUp() {
        const player = this.game.gameState.getPlayerState();
        const targetTemp = 37.0; // 目标体温
        const tempChange = targetTemp - player.body_temperature.current;

        if (Math.abs(tempChange) < 0.1) {
            return false;
        }

        // 升温（最多升到目标体温）
        const actualChange = Math.min(2.0, Math.max(0.5, tempChange));
        this.changeTemperature(actualChange, '取暖');

        // 触发事件
        this.game.eventSystem.emit('player:warmed_up', {
            temperature_change: actualChange
        });

        return true;
    }

    /**
     * 冷静动作 - 恢复理智
     * @returns {boolean} 是否冷静成功
     */
    calmDown() {
        const player = this.game.gameState.getPlayerState();
        const sanityToRestore = Math.min(15, player.sanity.max - player.sanity.current);

        if (sanityToRestore <= 0) {
            return false;
        }

        this.restoreSanity(sanityToRestore, '冷静');

        // 触发事件
        this.game.eventSystem.emit('player:calmed_down', {
            sanity_restored: sanityToRestore
        });

        return true;
    }

    /**
     * 检查是否可以进行移动
     * @returns {boolean} 是否可以移动
     */
    canMove() {
        const player = this.game.gameState.getPlayerState();
        return player.stamina.current >= DEFAULT_CONFIG.MOVE_STAMINA_COST;
    }

    /**
     * 检查是否可以进行交互
     * @returns {boolean} 是否可以交互
     */
    canInteract() {
        const player = this.game.gameState.getPlayerState();
        return player.stamina.current >= DEFAULT_CONFIG.INTERACTION_STAMINA_COST;
    }

    /**
     * 获取状态HTML
     * @returns {string} 状态HTML
     */
    getStatusHTML() {
        const statusInfo = this.getAllStatusInfo();

        return `
            <div class="status-section">
                <h4>主要状态</h4>
                <div class="status-item">
                    <div class="status-label">体力</div>
                    <div class="status-bar-container">
                        <div class="status-bar stamina-bar" style="width: ${statusInfo.stamina.percentage}%"></div>
                    </div>
                    <div class="status-value">${statusInfo.stamina.current}/${statusInfo.stamina.max}</div>
                </div>
                <div class="status-item">
                    <div class="status-label">理智</div>
                    <div class="status-bar-container">
                        <div class="status-bar sanity-bar" style="width: ${statusInfo.sanity.percentage}%"></div>
                    </div>
                    <div class="status-value">${statusInfo.sanity.current}/${statusInfo.sanity.max}</div>
                </div>
                <div class="status-item">
                    <div class="status-label">体温</div>
                    <div class="status-bar-container">
                        <div class="status-bar temperature-bar" style="width: ${((statusInfo.temperature.current - 35) / (40 - 35)) * 100}%"></div>
                    </div>
                    <div class="status-value">${formatNumber(statusInfo.temperature.current, 1)}°C</div>
                </div>
            </div>
            <div class="status-section">
                <h4>隐藏状态</h4>
                <div class="status-item">
                    <div class="status-label">直觉</div>
                    <div class="status-bar-container">
                        <div class="status-bar intuition-bar" style="width: ${statusInfo.hidden_states.intuition}%"></div>
                    </div>
                    <div class="status-value">${statusInfo.hidden_states.intuition}%</div>
                </div>
                <div class="status-item">
                    <div class="status-label">疑心</div>
                    <div class="status-bar-container">
                        <div class="status-bar suspicion-bar" style="width: ${statusInfo.hidden_states.suspicion}%"></div>
                    </div>
                    <div class="status-value">${statusInfo.hidden_states.suspicion}%</div>
                </div>
                <div class="status-item">
                    <div class="status-label">运气</div>
                    <div class="status-bar-container">
                        <div class="status-bar luck-bar" style="width: ${statusInfo.hidden_states.luck}%"></div>
                    </div>
                    <div class="status-value">${statusInfo.hidden_states.luck}%</div>
                </div>
                <div class="status-item">
                    <div class="status-label">创伤等级</div>
                    <div class="status-bar-container">
                        <div class="status-bar trauma-bar" style="width: ${statusInfo.hidden_states.trauma_level}%"></div>
                    </div>
                    <div class="status-value">${statusInfo.hidden_states.trauma_level}%</div>
                </div>
            </div>
            <div class="status-effects" id="status-effects">
                ${this.getStatusEffectsHTML()}
            </div>
        `;
    }

    /**
     * 获取状态效果HTML
     * @returns {string} 状态效果HTML
     */
    getStatusEffectsHTML() {
        const statusInfo = this.getAllStatusInfo();
        let effectsHTML = '';

        // 检查每个状态的效果
        if (statusInfo.stamina.effect !== '状态正常') {
            effectsHTML += `<div class="status-effect stamina-effect">体力: ${statusInfo.stamina.effect}</div>`;
        }

        if (statusInfo.sanity.effect !== '状态正常') {
            effectsHTML += `<div class="status-effect sanity-effect">理智: ${statusInfo.sanity.effect}</div>`;
        }

        if (statusInfo.temperature.effect !== '状态正常') {
            effectsHTML += `<div class="status-effect temperature-effect">体温: ${statusInfo.temperature.effect}</div>`;
        }

        if (!effectsHTML) {
            effectsHTML = '<div class="status-effect normal">所有状态正常</div>';
        }

        return effectsHTML;
    }
}