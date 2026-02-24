/**
 * 游戏事件系统
 * 实现发布-订阅模式，用于模块间通信
 */

export class EventSystem {
    constructor() {
        this.listeners = new Map();
        this.onceListeners = new Map();
    }

    /**
     * 注册事件监听器
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     * @returns {Function} 取消监听函数
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);

        // 返回取消监听函数
        return () => this.off(event, callback);
    }

    /**
     * 注册一次性事件监听器
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     * @returns {Function} 取消监听函数
     */
    once(event, callback) {
        if (!this.onceListeners.has(event)) {
            this.onceListeners.set(event, new Set());
        }
        this.onceListeners.get(event).add(callback);

        // 返回取消监听函数
        return () => {
            if (this.onceListeners.has(event)) {
                this.onceListeners.get(event).delete(callback);
            }
        };
    }

    /**
     * 移除事件监听器
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
        if (this.onceListeners.has(event)) {
            this.onceListeners.get(event).delete(callback);
        }
    }

    /**
     * 触发事件
     * @param {string} event - 事件名称
     * @param {*} data - 事件数据
     */
    emit(event, data = null) {
        // 触发普通监听器
        if (this.listeners.has(event)) {
            const callbacks = Array.from(this.listeners.get(event));
            for (const callback of callbacks) {
                try {
                    callback(data, event);
                } catch (error) {
                    console.error(`事件监听器执行错误 (${event}):`, error);
                }
            }
        }

        // 触发一次性监听器
        if (this.onceListeners.has(event)) {
            const callbacks = Array.from(this.onceListeners.get(event));
            for (const callback of callbacks) {
                try {
                    callback(data, event);
                } catch (error) {
                    console.error(`一次性事件监听器执行错误 (${event}):`, error);
                }
            }
            // 清除一次性监听器
            this.onceListeners.delete(event);
        }
    }

    /**
     * 移除所有事件监听器
     * @param {string} [event] - 可选的事件名称，不传则移除所有
     */
    removeAllListeners(event = null) {
        if (event) {
            this.listeners.delete(event);
            this.onceListeners.delete(event);
        } else {
            this.listeners.clear();
            this.onceListeners.clear();
        }
    }

    /**
     * 获取事件监听器数量
     * @param {string} event - 事件名称
     * @returns {number} 监听器数量
     */
    listenerCount(event) {
        let count = 0;
        if (this.listeners.has(event)) {
            count += this.listeners.get(event).size;
        }
        if (this.onceListeners.has(event)) {
            count += this.onceListeners.get(event).size;
        }
        return count;
    }

    /**
     * 检查是否有监听器
     * @param {string} event - 事件名称
     * @returns {boolean} 是否有监听器
     */
    hasListeners(event) {
        return this.listenerCount(event) > 0;
    }
}

// 预定义游戏事件
export const GAME_EVENTS = {
    // 游戏状态事件
    GAME_INITIALIZED: 'game:initialized',
    GAME_LOADED: 'game:loaded',
    GAME_SAVED: 'game:saved',
    GAME_RESET: 'game:reset',

    // 玩家事件
    PLAYER_MOVED: 'player:moved',
    PLAYER_INTERACTED: 'player:interacted',
    PLAYER_ITEM_ADDED: 'player:item:added',
    PLAYER_ITEM_REMOVED: 'player:item:removed',
    PLAYER_ITEM_USED: 'player:item:used',
    PLAYER_STATUS_CHANGED: 'player:status:changed',

    // 任务事件
    QUEST_STARTED: 'quest:started',
    QUEST_UPDATED: 'quest:updated',
    QUEST_COMPLETED: 'quest:completed',
    QUEST_FAILED: 'quest:failed',

    // 对话事件
    DIALOGUE_STARTED: 'dialogue:started',
    DIALOGUE_ENDED: 'dialogue:ended',
    DIALOGUE_CHOICE_MADE: 'dialogue:choice:made',

    // 决策事件
    DECISION_TRIGGERED: 'decision:triggered',
    DECISION_MADE: 'decision:made',
    DECISION_TIMEOUT: 'decision:timeout',

    // UI事件
    UI_PANEL_OPENED: 'ui:panel:opened',
    UI_PANEL_CLOSED: 'ui:panel:closed',
    UI_MODAL_OPENED: 'ui:modal:opened',
    UI_MODAL_CLOSED: 'ui:modal:closed',

    // 系统事件
    ERROR_OCCURRED: 'system:error',
    WARNING_OCCURRED: 'system:warning',
    INFO_MESSAGE: 'system:info'
};