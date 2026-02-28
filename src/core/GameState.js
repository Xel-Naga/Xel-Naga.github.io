/**
 * 游戏状态管理器
 * 管理玩家状态、世界状态、任务状态等
 */

export class GameState {
  constructor(eventSystem) {
    this.eventSystem = eventSystem;
    
    // 默认初始状态
    this.defaultState = {
      // 玩家基础状态
      player: {
        name: '林墨',
        location: 'gate', // 当前位置ID
        inventory: [], // 道具ID列表
        clues: [], // 已收集线索ID列表
        examinedObjects: [], // 已检查对象ID列表（防重复）
      },
      
      // 状态数值（0-100）
      status: {
        stamina: { current: 100, max: 100 },     // 体力
        sanity: { current: 100, max: 100 },      // 理智
        temperature: { current: 37, max: 40 },   // 体温（摄氏度）
        intuition: { current: 0, max: 100 },     // 直觉（隐藏）
        luck: { current: 50, max: 100 },         // 运气（隐藏）
      },
      
      // 世界状态
      world: {
        chapter: 1,
        scene: 'gate',
        time: { hour: 15, minute: 0 }, // 24小时制（内部使用）
        date: { year: 2025, month: 1, day: 15 }, // 年月日
        lunarYear: '乙巳年', // 农历干支年
        timePhase: '黄昏', // 模糊时间段
        weather: 'blizzard',
        temperature: -5, // 环境温度
        visitedLocations: ['gate'],
        triggeredEvents: [],
        flags: {}, // 各种剧情标志
      },
      
      // NPC关系状态
      npcs: {
        chen_qingshan: { relationship: 70, knownInfo: [], trust: 70 },
        mingxin: { relationship: 10, knownInfo: [], trust: 50 },
        xuanzhen: { relationship: 0, knownInfo: [], trust: 30 },
      },
      
      // 任务状态
      quests: {
        active: [],
        completed: [],
        failed: [],
        progress: {}, // 任务进度 { questId: { currentStep: 0, completedSteps: [] } }
      },
      
      // 事件防重复计数器
      eventCounts: {},
      
      // 游戏设置
      settings: {
        textSpeed: 'normal', // slow, normal, fast
        soundEnabled: true,
        autoSave: true,
      },
    };

    // 当前状态
    this.state = this.deepClone(this.defaultState);
    
    // 状态变化缓存（用于批量更新）
    this.pendingChanges = {};
    this.updateTimer = null;
  }

  /**
   * 初始化状态
   */
  init() {
    // 尝试加载存档
    const saved = this.loadFromStorage();
    if (saved) {
      this.state = this.mergeState(saved);
      console.log('📂 已加载存档');
    } else {
      console.log('🆕 新游戏开始');
    }
  }

  /**
   * 获取状态值
   * @param {string} path - 状态路径，如 'player.location' 或 'status.stamina.current'
   * @returns {*} 状态值
   */
  get(path) {
    const keys = path.split('.');
    let value = this.state;
    
    for (const key of keys) {
      if (value === undefined || value === null) return undefined;
      value = value[key];
    }
    
    return value;
  }

  /**
   * 设置状态值
   * @param {string} path - 状态路径
   * @param {*} value - 新值
   * @param {boolean} silent - 是否静默更新（不触发事件）
   */
  set(path, value, silent = false) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this.state;
    
    for (const key of keys) {
      if (!(key in target)) {
        target[key] = {};
      }
      target = target[key];
    }
    
    const oldValue = target[lastKey];
    target[lastKey] = value;
    
    if (!silent) {
      this.queueChange(path, value, oldValue);
    }
  }

  /**
   * 批量设置状态
   * @param {Object} updates - 要更新的状态对象
   */
  setMultiple(updates) {
    Object.entries(updates).forEach(([path, value]) => {
      this.set(path, value, true);
    });
    this.flushChanges();
  }

  /**
   * 队列状态变化
   */
  queueChange(path, newValue, oldValue) {
    this.pendingChanges[path] = { newValue, oldValue };
    
    // 防抖批量更新
    clearTimeout(this.updateTimer);
    this.updateTimer = setTimeout(() => {
      this.flushChanges();
    }, 50);
  }

  /**
   * 刷新状态变化（触发事件）
   */
  flushChanges() {
    const changes = { ...this.pendingChanges };
    this.pendingChanges = {};
    
    if (Object.keys(changes).length > 0) {
      this.eventSystem.emit('state:changed', changes);
      
      // 触发具体路径的事件
      Object.keys(changes).forEach(path => {
        this.eventSystem.emit(`state:changed:${path}`, changes[path]);
      });
    }
  }

  /**
   * 修改状态数值（如体力、理智等）
   * @param {string} statusName - 状态名称
   * @param {number} delta - 变化值（可为负数）
   */
  modifyStatus(statusName, delta) {
    const status = this.get(`status.${statusName}`);
    if (!status) {
      console.warn(`未知状态: ${statusName}`);
      return;
    }

    const oldValue = status.current;
    let newValue = oldValue + delta;

    // 体温使用摄氏度范围，最小值为28°C（重度失温线），最大值为40°C
    if (statusName === 'temperature') {
      newValue = Math.max(28, Math.min(newValue, status.max));
    } else {
      // 其他状态使用0-100范围
      newValue = Math.max(0, Math.min(newValue, status.max));
    }

    this.set(`status.${statusName}.current`, newValue);

    // 检查阈值事件
    this.checkStatusThreshold(statusName, oldValue, newValue);
  }

  /**
   * 检查状态阈值事件
   */
  checkStatusThreshold(statusName, oldValue, newValue) {
    const thresholds = {
      sanity: [
        { value: 70, type: 'above', desc: '思维清晰' },
        { value: 40, type: 'below', desc: '开始出现幻觉' },
        { value: 20, type: 'below', desc: '现实扭曲' },
        { value: 10, type: 'below', desc: '理智崩溃边缘' },
      ],
      stamina: [
        { value: 30, type: 'below', desc: '体力不支' },
        { value: 10, type: 'below', desc: '极度疲惫' },
      ],
      temperature: [
        { value: 35, type: 'below', desc: '轻度失温', celsius: true },
        { value: 32, type: 'below', desc: '中度失温', celsius: true },
        { value: 28, type: 'below', desc: '重度失温', celsius: true },
      ],
    };

    const statusThresholds = thresholds[statusName];
    if (!statusThresholds) return;

    for (const threshold of statusThresholds) {
      const crossed = threshold.type === 'below'
        ? (oldValue >= threshold.value && newValue < threshold.value)
        : (oldValue < threshold.value && newValue >= threshold.value);
      
      if (crossed) {
        this.eventSystem.emit(`status:threshold`, {
          status: statusName,
          threshold: threshold.value,
          type: threshold.type,
          description: threshold.desc,
          current: newValue,
        });
      }
    }
  }

  /**
   * 记录事件触发次数（防重复）
   * @param {string} eventId - 事件ID
   * @returns {number} 当前触发次数
   */
  recordEvent(eventId) {
    const currentCount = this.get(`eventCounts.${eventId}`) || 0;
    this.set(`eventCounts.${eventId}`, currentCount + 1);
    return currentCount + 1;
  }

  /**
   * 获取事件触发次数
   * @param {string} eventId - 事件ID
   * @returns {number}
   */
  getEventCount(eventId) {
    return this.get(`eventCounts.${eventId}`) || 0;
  }

  /**
   * 添加道具到背包
   * @param {string} itemId - 道具ID
   * @returns {boolean}
   */
  addItem(itemId) {
    const inventory = this.get('player.inventory');
    if (inventory.includes(itemId)) {
      return false; // 已存在
    }
    
    inventory.push(itemId);
    this.set('player.inventory', inventory);
    this.eventSystem.emit('item:acquired', { itemId });
    return true;
  }

  /**
   * 从背包移除道具
   * @param {string} itemId - 道具ID
   */
  removeItem(itemId) {
    const inventory = this.get('player.inventory');
    const index = inventory.indexOf(itemId);
    
    if (index !== -1) {
      inventory.splice(index, 1);
      this.set('player.inventory', inventory);
      this.eventSystem.emit('item:removed', { itemId });
    }
  }

  /**
   * 添加线索
   * @param {string} clueId - 线索ID
   */
  addClue(clueId) {
    const clues = this.get('player.clues');
    if (!clues.includes(clueId)) {
      clues.push(clueId);
      this.set('player.clues', clues);
      this.eventSystem.emit('clue:discovered', { clueId });
    }
  }

  /**
   * 记录已检查对象
   * @param {string} objectId - 对象ID
   */
  recordExamined(objectId) {
    const examined = this.get('player.examinedObjects');
    if (!examined.includes(objectId)) {
      examined.push(objectId);
      this.set('player.examinedObjects', examined);
    }
  }

  /**
   * 检查对象是否已检查过
   * @param {string} objectId - 对象ID
   * @returns {boolean}
   */
  hasExamined(objectId) {
    return this.get('player.examinedObjects').includes(objectId);
  }

  // ========== 任务系统 ==========

  /**
   * 激活任务
   * @param {string} questId - 任务ID
   */
  activateQuest(questId) {
    const active = this.get('quests.active');
    if (!active.includes(questId)) {
      active.push(questId);
      this.set('quests.active', active);
      this.set(`quests.progress.${questId}`, { currentStep: 0, completedSteps: [] });
      this.eventSystem.emit('quest:activated', { questId });
    }
  }

  /**
   * 更新任务进度
   * @param {string} questId - 任务ID
   * @param {string} stepId - 步骤ID
   */
  updateQuestProgress(questId, stepId) {
    const progress = this.get(`quests.progress.${questId}`);
    if (!progress) return;

    if (!progress.completedSteps.includes(stepId)) {
      progress.completedSteps.push(stepId);
      this.set(`quests.progress.${questId}`, progress);
      this.eventSystem.emit('quest:progress', { questId, stepId });
    }
  }

  /**
   * 完成任务
   * @param {string} questId - 任务ID
   */
  completeQuest(questId) {
    const active = this.get('quests.active');
    const index = active.indexOf(questId);
    
    if (index !== -1) {
      active.splice(index, 1);
      this.set('quests.active', active);
      
      const completed = this.get('quests.completed');
      completed.push(questId);
      this.set('quests.completed', completed);
      
      this.eventSystem.emit('quest:completed', { questId });
    }
  }

  /**
   * 获取任务进度
   * @param {string} questId - 任务ID
   * @returns {Object}
   */
  getQuestProgress(questId) {
    return this.get(`quests.progress.${questId}`) || { currentStep: 0, completedSteps: [] };
  }

  /**
   * 移动到位置
   * @param {string} locationId - 位置ID
   */
  moveTo(locationId) {
    const oldLocation = this.get('player.location');
    this.set('player.location', locationId);
    
    // 记录访问过的位置
    const visited = this.get('world.visitedLocations');
    if (!visited.includes(locationId)) {
      visited.push(locationId);
      this.set('world.visitedLocations', visited);
    }
    
    // 场景变化时推进时间（2-4小时）
    this.advanceTime();
    
    this.eventSystem.emit('location:changed', {
      from: oldLocation,
      to: locationId,
    });
  }

  /**
   * 推进时间
   * @param {number} hours - 推进小时数（默认随机2-4小时）
   */
  advanceTime(hours) {
    const advanceHours = hours || Math.floor(Math.random() * 3) + 2; // 2-4小时
    const currentTime = this.get('world.time');
    const currentDate = this.get('world.date');
    
    let newYear = currentDate.year;
    let newHour = currentTime.hour + advanceHours;
    let newDay = currentDate.day;
    let newMonth = currentDate.month;
    const year = 2025;
    
    // 处理日期进位
    if (newHour >= 24) {
      newHour -= 24;
      newDay++;
      
      // 简单处理月份天数（不考虑闰年）
      const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      if (newDay > daysInMonth[newMonth - 1]) {
        newDay = 1;
        newMonth++;
        if (newMonth > 12) {
          newMonth = 1;
        }
      }
    }
    
    // 更新时间
    this.set('world.time', { hour: newHour, minute: 0 });
    this.set('world.date', { year: newYear, month: newMonth, day: newDay });
    
    // 更新模糊时间段
    this.set('world.timePhase', this.getTimePhase(newHour));
    
    console.log(`时间推进: ${currentDate.year}年${currentDate.month}月${currentDate.day}日 ${currentTime.hour}时 -> ${newYear}年${newMonth}月${newDay}日 ${newHour}时 (${this.getTimePhase(newHour)})`);
  }

  /**
   * 计算农历干支年份
   * @param {number} year - 公历年份
   * @returns {string} 干支年份
   */
  calculateLunarYear(year) {
    const gan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const zhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    
    // 1984年是甲子年
    const offset = year - 1984;
    const ganIndex = ((offset % 10) + 10) % 10;
    const zhiIndex = ((offset % 12) + 12) % 12;
    
    return gan[ganIndex] + zhi[zhiIndex] + '年';
  }

  /**
   * 获取模糊时间段描述
   * @param {number} hour - 小时（0-23）
   * @returns {string} 时间段描述
   */
  getTimePhase(hour) {
    if (hour >= 5 && hour < 7) return '黎明';
    if (hour >= 7 && hour < 9) return '清晨';
    if (hour >= 9 && hour < 12) return '上午';
    if (hour >= 12 && hour < 14) return '正午';
    if (hour >= 14 && hour < 17) return '下午';
    if (hour >= 17 && hour < 19) return '黄昏';
    if (hour >= 19 && hour < 21) return '傍晚';
    if (hour >= 21 && hour < 23) return '晚上';
    if (hour >= 23 || hour < 1) return '午夜';
    if (hour >= 1 && hour < 3) return '深夜';
    if (hour >= 3 && hour < 5) return '凌晨';
    return '深夜';
  }

  /**
   * 保存游戏到本地存储
   */
  saveToStorage() {
    try {
      const saveData = {
        version: '0.1.0',
        timestamp: Date.now(),
        state: this.state,
      };
      localStorage.setItem('xuan_guan_mystery_save', JSON.stringify(saveData));
      this.eventSystem.emit('game:saved');
      return true;
    } catch (error) {
      console.error('保存失败:', error);
      return false;
    }
  }

  /**
   * 从本地存储加载
   * @returns {Object|null}
   */
  loadFromStorage() {
    try {
      const saveData = localStorage.getItem('xuan_guan_mystery_save');
      if (saveData) {
        const parsed = JSON.parse(saveData);
        return parsed.state || null;
      }
    } catch (error) {
      console.error('加载存档失败:', error);
    }
    return null;
  }

  /**
   * 合并存档状态（处理版本差异）
   * @param {Object} saved - 存档状态
   * @returns {Object}
   */
  mergeState(saved) {
    // 深度合并，保留默认值
    return this.deepMerge(this.deepClone(this.defaultState), saved);
  }

  /**
   * 重置游戏
   */
  reset() {
    this.state = this.deepClone(this.defaultState);
    localStorage.removeItem('xuan_guan_mystery_save');
    this.eventSystem.emit('game:reset');
  }

  /**
   * 深度克隆
   */
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * 深度合并
   */
  deepMerge(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        target[key] = target[key] || {};
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }
}
