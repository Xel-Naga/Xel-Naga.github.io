/**
 * 事件系统 - 发布/订阅模式
 * 用于模块间通信
 */

export class EventSystem {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * 订阅事件
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   * @param {Object} context - 回调函数的this上下文
   * @returns {Function} 取消订阅的函数
   */
  on(event, callback, context = null) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const listener = { callback, context };
    this.listeners.get(event).push(listener);

    // 返回取消订阅函数
    return () => this.off(event, callback);
  }

  /**
   * 取消订阅
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;

    const listeners = this.listeners.get(event);
    const index = listeners.findIndex(l => l.callback === callback);
    
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * 触发事件
   * @param {string} event - 事件名称
   * @param {*} data - 传递给回调函数的数据
   */
  emit(event, data = null) {
    if (!this.listeners.has(event)) return;

    const listeners = this.listeners.get(event);
    listeners.forEach(({ callback, context }) => {
      try {
        if (context) {
          callback.call(context, data);
        } else {
          callback(data);
        }
      } catch (error) {
        console.error(`事件处理错误 [${event}]:`, error);
      }
    });
  }

  /**
   * 订阅一次性事件
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   * @param {Object} context - 回调函数的this上下文
   */
  once(event, callback, context = null) {
    const onceCallback = (data) => {
      this.off(event, onceCallback);
      callback.call(context, data);
    };
    this.on(event, onceCallback);
  }

  /**
   * 清除所有监听器
   */
  clear() {
    this.listeners.clear();
  }

  /**
   * 获取事件监听器数量
   * @param {string} event - 事件名称
   * @returns {number}
   */
  listenerCount(event) {
    if (!this.listeners.has(event)) return 0;
    return this.listeners.get(event).length;
  }
}
