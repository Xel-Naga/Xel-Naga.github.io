/**
 * 决策系统
 * 处理危险场景随机事件和动作决策
 */

export class DecisionSystem {
  constructor(gameState, eventSystem, gameEngine) {
    this.gameState = gameState;
    this.eventSystem = eventSystem;
    this.gameEngine = gameEngine;

    // 定时器
    this.checkInterval = 10000; // 10秒
    this.timer = null;
    this.isPaused = false;

    // 随机事件配置
    this.randomEvents = [];

    // 决策对话框状态
    this.currentDecision = null;
    this.decisionTimer = null;

    // 绑定事件
    this.bindEvents();
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 监听位置变化
    this.eventSystem.on('location:changed', (data) => {
      this.onLocationChanged(data);
    });

    // 监听游戏暂停
    this.eventSystem.on('game:pause', () => {
      this.pause();
    });

    // 监听游戏恢复
    this.eventSystem.on('game:resume', () => {
      this.resume();
    });

    // 监听交互完成（用于动态叙事刷新）
    this.eventSystem.on('interaction:completed', (data) => {
      this.onInteractionCompleted(data);
    });
  }

  /**
   * 初始化决策系统
   */
  init(randomEventsConfig = []) {
    this.randomEvents = randomEventsConfig;
    this.startMonitoring();
    console.log('决策系统初始化完成');
  }

  /**
   * 开始监控
   */
  startMonitoring() {
    if (this.timer) return;

    this.timer = setInterval(() => {
      if (!this.isPaused) {
        this.checkRandomEvents();
      }
    }, this.checkInterval);

    console.log('决策监控已启动');
  }

  /**
   * 停止监控
   */
  stopMonitoring() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * 暂停
   */
  pause() {
    this.isPaused = true;
  }

  /**
   * 恢复
   */
  resume() {
    this.isPaused = false;
  }

  /**
   * 位置变化回调
   */
  onLocationChanged(data) {
    const locationId = data.locationId;
    const scene = this.getSceneData(locationId);

    // 检查是否为危险场景
    if (scene?.dangerous) {
      console.log(`进入危险场景: ${locationId}`);
    }
  }

  /**
   * 交互完成回调
   */
  onInteractionCompleted(data) {
    // 触发场景刷新事件（用于动态叙事）
    this.eventSystem.emit('scene:refresh', {
      locationId: this.gameState.get('player.location'),
      interactionType: data.action,
      elementId: data.elementId,
    });
  }

  /**
   * 检查随机事件
   */
  checkRandomEvents() {
    const locationId = this.gameState.get('player.location');
    const scene = this.getSceneData(locationId);

    // 非危险场景不触发
    if (!scene?.dangerous) return;

    // 获取当前场景的随机事件
    const locationEvents = this.randomEvents.filter(event =>
      event.locations && event.locations.includes(locationId)
    );

    if (locationEvents.length === 0) return;

    // 随机选择事件触发
    const triggerChance = 0.3; // 30%概率触发
    if (Math.random() < triggerChance) {
      const event = locationEvents[Math.floor(Math.random() * locationEvents.length)];
      this.triggerRandomEvent(event);
    }
  }

  /**
   * 触发随机事件
   */
  triggerRandomEvent(event) {
    // 检查触发条件
    if (!this.checkConditions(event.conditions)) return;

    // 检查事件是否已触发过
    const triggeredEvents = this.gameState.get('world.triggeredEvents') || [];
    if (event.once && triggeredEvents.includes(event.id)) return;

    console.log(`触发随机事件: ${event.id} - ${event.title}`);

    // 标记为已触发
    if (event.once) {
      triggeredEvents.push(event.id);
      this.gameState.set('world.triggeredEvents', triggeredEvents);
    }

    // 应用事件效果
    if (event.effects) {
      this.applyEffects(event.effects);
    }

    // 显示决策对话框
    if (event.options && event.options.length > 0) {
      this.showDecisionDialog(event);
    } else if (event.message) {
      // 直接显示消息
      this.eventSystem.emit('feedback:show', {
        message: event.message,
        type: event.eventType || 'warning',
      });
    }
  }

  /**
   * 显示决策对话框
   */
  showDecisionDialog(event) {
    this.pause(); // 暂停其他检查

    this.currentDecision = {
      eventId: event.id,
      title: event.title,
      description: event.description,
      message: event.message,
      options: event.options,
      timeLimit: event.timeLimit || 30,
      onSelect: (option) => this.handleDecisionSelection(event, option),
      onTimeout: () => this.handleDecisionTimeout(event),
    };

    // 发送决策事件到UI
    this.eventSystem.emit('decision:show', this.currentDecision);

    // 启动倒计时
    if (this.currentDecision.timeLimit > 0) {
      this.decisionTimer = setTimeout(() => {
        this.handleDecisionTimeout(event);
      }, this.currentDecision.timeLimit * 1000);
    }
  }

  /**
   * 处理决策选择
   */
  handleDecisionSelection(event, option) {
    // 清除倒计时
    if (this.decisionTimer) {
      clearTimeout(this.decisionTimer);
      this.decisionTimer = null;
    }

    console.log(`决策选择: ${option.text}`);

    // 应用选项效果
    if (option.effects) {
      this.applyEffects(option.effects);
    }

    // 添加物品
    if (option.addItems) {
      option.addItems.forEach(itemId => {
        this.gameState.addItem(itemId);
      });
    }

    // 记录决策
    const decision = {
      timestamp: new Date().toISOString(),
      eventId: event.id,
      choice: option.id,
      outcome: option.effects ? 'success' : 'neutral',
    };

    const decisions = this.gameState.get('world.decisions') || [];
    decisions.push(decision);
    this.gameState.set('world.decisions', decisions);

    // 显示结果消息
    if (option.resultMessage) {
      this.eventSystem.emit('feedback:show', {
        message: option.resultMessage,
        type: option.success ? 'success' : 'info',
      });
    }

    // 恢复监控
    this.currentDecision = null;
    this.resume();

    // 发送决策完成事件
    this.eventSystem.emit('decision:completed', {
      eventId: event.id,
      optionId: option.id,
    });
  }

  /**
   * 处理决策超时
   */
  handleDecisionTimeout(event) {
    if (this.decisionTimer) {
      clearTimeout(this.decisionTimer);
      this.decisionTimer = null;
    }

    console.log(`决策超时: ${event.id}`);

    // 应用超时效果
    if (event.timeoutEffects) {
      this.applyEffects(event.timeoutEffects);
    }

    // 显示超时消息
    this.eventSystem.emit('feedback:show', {
      message: event.timeoutMessage || '你犹豫不决，错失了机会...',
      type: 'warning',
    });

    this.currentDecision = null;
    this.resume();
  }

  /**
   * 检查条件
   */
  checkConditions(conditions) {
    if (!conditions) return true;

    for (const [key, value] of Object.entries(conditions)) {
      switch (key) {
        case 'sanity':
          if (this.gameState.get('status.sanity.current') < value) return false;
          break;
        case 'stamina':
          if (this.gameState.get('status.stamina.current') < value) return false;
          break;
        case 'temperature':
          if (this.gameState.get('status.temperature.current') < value) return false;
          break;
        case 'hasItem':
          if (!this.gameState.hasItem(value)) return false;
          break;
        case 'hasClue':
          if (!this.gameState.hasClue(value)) return false;
          break;
        case 'questActive':
          const activeQuests = this.gameState.get('quests.active') || [];
          if (!activeQuests.includes(value)) return false;
          break;
        case 'questCompleted':
          const completedQuests = this.gameState.get('quests.completed') || [];
          if (!completedQuests.includes(value)) return false;
          break;
        case 'flag':
          const flags = this.gameState.get('world.flags') || {};
          if (!flags[value]) return false;
          break;
        case 'visited':
          const visited = this.gameState.get('world.visitedLocations') || [];
          if (!visited.includes(value)) return false;
          break;
        case 'time':
          const hour = this.gameState.get('world.time.hour');
          if (value === 'night' && (hour < 18 && hour > 6)) return false;
          if (value === 'day' && (hour >= 18 || hour <= 6)) return false;
          break;
      }
    }

    return true;
  }

  /**
   * 应用效果
   */
  applyEffects(effects) {
    if (!effects) return;

    // 状态变化
    if (effects.status) {
      Object.entries(effects.status).forEach(([status, delta]) => {
        this.gameState.modifyStatus(status, delta);
      });
    }

    // 设置标志
    if (effects.flags) {
      const flags = this.gameState.get('world.flags') || {};
      Object.entries(effects.flags).forEach(([key, value]) => {
        flags[key] = value;
      });
      this.gameState.set('world.flags', flags);
    }

    // 改变场景
    if (effects.changeLocation) {
      setTimeout(() => {
        this.eventSystem.emit('location:change', {
          locationId: effects.changeLocation,
        });
      }, effects.delay || 1000);
    }

    // 触发事件
    if (effects.triggerEvent) {
      this.eventSystem.emit('event:trigger', {
        eventId: effects.triggerEvent,
      });
    }
  }

  /**
   * 获取场景数据
   */
  getSceneData(locationId) {
    return this.gameEngine?.sceneManager?.scenes?.get(locationId);
  }

  /**
   * 销毁
   */
  destroy() {
    this.stopMonitoring();
    if (this.decisionTimer) {
      clearTimeout(this.decisionTimer);
    }
  }
}
