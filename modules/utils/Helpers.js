/**
 * 通用工具函数
 */

/**
 * 格式化时间显示
 * @param {string} timeStr - 时间字符串 (HH:MM)
 * @returns {string} 格式化后的时间
 */
export function formatTime(timeStr) {
    if (!timeStr) return '未知时间';

    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? '下午' : '上午';
    const displayHours = hours > 12 ? hours - 12 : hours;

    return `${period} ${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * 获取当前时间（游戏内）
 * @param {Object} worldState - 世界状态
 * @returns {string} 格式化时间
 */
export function getCurrentTimeDisplay(worldState) {
    if (!worldState || !worldState.time) return '未知时间';

    return `${worldState.date || '未知日期'} ${formatTime(worldState.time)}`;
}

/**
 * 安全获取嵌套对象属性
 * @param {Object} obj - 目标对象
 * @param {string} path - 属性路径
 * @param {*} defaultValue - 默认值
 * @returns {*} 属性值或默认值
 */
export function getSafe(obj, path, defaultValue = null) {
    if (!obj || typeof obj !== 'object') return defaultValue;

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
        if (current === null || current === undefined || typeof current !== 'object') {
            return defaultValue;
        }
        current = current[key];
    }

    return current !== undefined ? current : defaultValue;
}

/**
 * 生成随机ID
 * @param {number} length - ID长度
 * @returns {string} 随机ID
 */
export function generateId(length = 8) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
}

/**
 * 深拷贝对象
 * @param {Object} obj - 要拷贝的对象
 * @returns {Object} 深拷贝后的对象
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;

    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (obj instanceof Set) return new Set(Array.from(obj).map(item => deepClone(item)));
    if (obj instanceof Map) return new Map(Array.from(obj).map(([key, value]) => [key, deepClone(value)]));

    const cloned = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }

    return cloned;
}

/**
 * 防抖函数
 * @param {Function} func - 要执行的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 节流函数
 * @param {Function} func - 要执行的函数
 * @param {number} limit - 限制时间（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * 检查是否满足条件
 * @param {Object} condition - 条件对象
 * @param {Object} context - 上下文对象
 * @returns {boolean} 是否满足条件
 */
export function checkCondition(condition, context) {
    if (!condition) return true;

    // 简单条件检查
    if (typeof condition === 'string') {
        return getSafe(context, condition, false);
    }

    // 复杂条件检查
    if (typeof condition === 'object') {
        // TODO: 实现更复杂的条件检查逻辑
        return true;
    }

    return false;
}

/**
 * 计算百分比
 * @param {number} value - 当前值
 * @param {number} max - 最大值
 * @returns {number} 百分比（0-100）
 */
export function calculatePercentage(value, max) {
    if (max === 0) return 0;
    return Math.min(100, Math.max(0, (value / max) * 100));
}

/**
 * 格式化数字
 * @param {number} num - 要格式化的数字
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的数字
 */
export function formatNumber(num, decimals = 1) {
    return parseFloat(num.toFixed(decimals)).toString();
}

/**
 * 生成范围随机数
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number} 随机数
 */
export function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * 生成范围随机整数
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number} 随机整数
 */
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 数组随机元素
 * @param {Array} array - 数组
 * @returns {*} 随机元素
 */
export function randomElement(array) {
    if (!array || array.length === 0) return null;
    return array[randomInt(0, array.length - 1)];
}

/**
 * 等待指定时间
 * @param {number} ms - 等待时间（毫秒）
 * @returns {Promise} Promise对象
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}