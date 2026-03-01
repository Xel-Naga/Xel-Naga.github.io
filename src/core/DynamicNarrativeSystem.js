/**
 * 动态叙事系统
 * 处理场景描述变体、决策影响、天气影响、NPC关系等
 */

export class DynamicNarrativeSystem {
  constructor(gameState, eventSystem) {
    this.gameState = gameState;
    this.eventSystem = eventSystem;

    // 场景变体缓存
    this.variantCache = new Map();

    // 初始化天气系统
    this.initWeatherSystem();

    // 绑定事件
    this.bindEvents();
  }

  /**
   * 绑定事件监听
   */
  bindEvents() {
    // 监听状态变化，刷新场景描述
    this.eventSystem.on('status:changed', () => {
      this.variantCache.clear(); // 清除缓存
    });

    // 监听时间变化
    this.eventSystem.on('state:changed:world.time', () => {
      this.variantCache.clear();
    });

    // 监听天气变化
    this.eventSystem.on('weather:changed', (data) => {
      this.handleWeatherChange(data);
    });

    // 监听决策记录
    this.eventSystem.on('decision:made', (data) => {
      this.recordDecision(data);
    });

    // 监听NPC互动
    this.eventSystem.on('npc:interacted', (data) => {
      this.handleNpcInteraction(data);
    });
  }

  /**
   * 初始化天气系统
   */
  initWeatherSystem() {
    this.weatherTypes = {
      clear: {
        name: '晴朗',
        effects: { temperature: 3, sanity: 2 },
        description: '天空湛蓝，阳光明媚',
      },
      cloudy: {
        name: '多云',
        effects: { temperature: 0, sanity: 0 },
        description: '云层厚重，阳光时隐时现',
      },
      fog: {
        name: '大雾',
        effects: { temperature: -1, sanity: -3 },
        description: '浓雾弥漫，能见度极低',
        modifier: this.getFogModifier.bind(this),
      },
      rain: {
        name: '下雨',
        effects: { temperature: -2, sanity: -1 },
        description: '雨水淅沥，路面湿滑',
        modifier: this.getRainModifier.bind(this),
      },
      blizzard: {
        name: '暴雪',
        effects: { temperature: -5, sanity: -3 },
        description: '风雪交加，寒风刺骨',
        modifier: this.getBlizzardModifier.bind(this),
      },
      storm: {
        name: '雷暴',
        effects: { temperature: -1, sanity: -5 },
        description: '电闪雷鸣，暴雨倾盆',
        modifier: this.getStormModifier.bind(this),
      },
      night: {
        name: '夜晚',
        effects: { temperature: -2, sanity: -2 },
        description: '夜色深沉，万籁俱寂',
        isTimeBased: true,
      },
    };

    // 当前天气
    this.currentWeather = 'blizzard';
  }

  /**
   * 获取天气修饰符
   */
  getFogModifier() {
    return {
      visibility: 'low',
      movementSpeed: 0.8,
      examineBonus: 0,
    };
  }

  getRainModifier() {
    return {
      visibility: 'medium',
      movementSpeed: 0.9,
      examineBonus: 0,
    };
  }

  getBlizzardModifier() {
    return {
      visibility: 'very_low',
      movementSpeed: 0.5,
      examineBonus: -10,
    };
  }

  getStormModifier() {
    return {
      visibility: 'low',
      movementSpeed: 0.6,
      examineBonus: -5,
    };
  }

  /**
   * 改变天气
   */
  changeWeather(weatherType) {
    if (!this.weatherTypes[weatherType]) {
      console.warn(`未知天气类型: ${weatherType}`);
      return;
    }

    const oldWeather = this.currentWeather;
    this.currentWeather = weatherType;

    // 更新游戏状态
    this.gameState.set('world.weather', weatherType);

    // 应用天气效果
    const weather = this.weatherTypes[weatherType];
    if (weather.effects) {
      Object.entries(weather.effects).forEach(([status, delta]) => {
        if (status !== 'sanity') { // 理智效果单独处理
          this.gameState.modifyStatus(status, delta);
        }
      });
    }

    // 触发天气变化事件
    this.eventSystem.emit('weather:changed', {
      oldWeather,
      newWeather: weatherType,
      description: weather.description,
    });

    return {
      success: true,
      weather: weatherType,
      description: weather.description,
    };
  }

  /**
   * 处理天气变化
   */
  handleWeatherChange(data) {
    const { newWeather, description } = data;
    console.log(`天气变化: ${data.oldWeather} -> ${newWeather}: ${description}`);

    // 刷新场景描述
    this.variantCache.clear();
  }

  /**
   * 获取当前天气信息
   */
  getCurrentWeather() {
    return {
      type: this.currentWeather,
      ...this.weatherTypes[this.currentWeather],
    };
  }

  /**
   * 获取场景描述变体
   * @param {Object} sceneData - 场景数据
   * @returns {string} 渲染后的描述
   */
  getSceneDescription(sceneData) {
    if (!sceneData || !sceneData.description) {
      return '';
    }

    // 检查是否有变体定义
    if (!sceneData.variants) {
      return sceneData.description;
    }

    // 生成变体键
    const variantKey = this.generateVariantKey(sceneData.id);

    // 检查缓存
    if (this.variantCache.has(variantKey)) {
      return this.variantCache.get(variantKey);
    }

    // 获取匹配的变体
    const variant = this.selectVariant(sceneData.variants);

    // 渲染变体描述
    let description = variant || sceneData.description;
    description = this.applyModifiers(description);

    // 缓存结果
    this.variantCache.set(variantKey, description);

    return description;
  }

  /**
   * 生成变体键
   */
  generateVariantKey(sceneId) {
    const time = this.gameState.get('world.timePhase');
    const weather = this.gameState.get('world.weather');
    const sanity = this.gameState.get('status.sanity.current');
    const temperature = this.gameState.get('status.temperature.current');
    const stamina = this.gameState.get('status.stamina.current');

    // 获取关键事件进度
    const progressFlags = this.getProgressFlags();

    return `${sceneId}_${time}_${weather}_${this.getStatusLevel(sanity, 'sanity')}_${this.getStatusLevel(temperature, 'temperature')}_${progressFlags}`;
  }

  /**
   * 获取进度标志
   */
  getProgressFlags() {
    const clues = this.gameState.get('player.clues') || [];
    const completedQuests = this.gameState.get('quests.completed') || [];
    const flags = [];

    // 根据线索数量分级
    if (clues.length >= 10) flags.push('major_revelation');
    else if (clues.length >= 5) flags.push('some_clues');
    else if (clues.length >= 1) flags.push('few_clues');

    // 根据任务完成度
    if (completedQuests.length >= 5) flags.push('major_progress');
    else if (completedQuests.length >= 2) flags.push('some_progress');

    return flags.join('_') || 'initial';
  }

  /**
   * 获取状态等级
   */
  getStatusLevel(value, type) {
    if (type === 'temperature') {
      if (value >= 36) return 'normal';
      if (value >= 34) return 'cool';
      if (value >= 32) return 'cold';
      return 'freezing';
    }

    // 其他0-100状态
    if (value >= 70) return 'high';
    if (value >= 40) return 'normal';
    if (value >= 20) return 'low';
    return 'critical';
  }

  /**
   * 选择最佳变体
   */
  selectVariant(variants) {
    if (!variants || !Array.isArray(variants)) {
      return null;
    }

    // 排序变体优先级
    const sorted = [...variants].sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const variant of sorted) {
      if (this.checkVariantConditions(variant.conditions)) {
        return variant.description;
      }
    }

    return null;
  }

  /**
   * 检查变体条件
   */
  checkVariantConditions(conditions) {
    if (!conditions) return true;

    const time = this.gameState.get('world.timePhase');
    const weather = this.gameState.get('world.weather');
    const sanity = this.gameState.get('status.sanity.current');
    const temperature = this.gameState.get('status.temperature.current');
    const stamina = this.gameState.get('status.stamina.current');

    // 时间条件
    if (conditions.timePhases && !conditions.timePhases.includes(time)) {
      return false;
    }

    // 天气条件
    if (conditions.weathers && !conditions.weathers.includes(weather)) {
      return false;
    }

    // 理智条件
    if (conditions.sanity !== undefined) {
      if (conditions.sanity.min && sanity < conditions.sanity.min) return false;
      if (conditions.sanity.max && sanity > conditions.sanity.max) return false;
    }

    // 体温条件
    if (conditions.temperature !== undefined) {
      if (conditions.temperature.min && temperature < conditions.temperature.min) return false;
      if (conditions.temperature.max && temperature > conditions.temperature.max) return false;
    }

    // 体力条件
    if (conditions.stamina !== undefined) {
      if (conditions.stamina.min && stamina < conditions.stamina.min) return false;
      if (conditions.stamina.max && stamina > conditions.stamina.max) return false;
    }

    // 进度条件
    if (conditions.flags) {
      for (const flag of conditions.flags) {
        if (flag.startsWith('!')) {
          // 反向条件
          if (this.gameState.get(`world.flags.${flag.slice(1)}`)) return false;
        } else {
          if (!this.gameState.get(`world.flags.${flag}`)) return false;
        }
      }
    }

    // 线索条件
    if (conditions.clues) {
      const playerClues = this.gameState.get('player.clues') || [];
      for (const clue of conditions.clues) {
        if (clue.startsWith('!')) {
          if (playerClues.includes(clue.slice(1))) return false;
        } else if (!playerClues.includes(clue)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 应用修饰器到描述
   */
  applyModifiers(description) {
    const weather = this.weatherTypes[this.currentWeather];

    // 应用天气修饰器
    if (weather && weather.modifier) {
      const modifier = weather.modifier();
      description = this.addWeatherFlavor(description, modifier);
    }

    // 应用理智修饰
    const sanity = this.gameState.get('status.sanity.current');
    if (sanity < 40) {
      description = this.addSanityFlavor(description, sanity);
    }

    // 应用体温修饰
    const temperature = this.gameState.get('status.temperature.current');
    if (temperature < 32) {
      description = this.addTemperatureFlavor(description, temperature);
    }

    return description;
  }

  /**
   * 添加天气风味描述
   */
  addWeatherFlavor(description, modifier) {
    // 根据可见度添加描述
    if (modifier.visibility === 'very_low') {
      description += ' 暴雪使得能见度极低，几乎看不清前方的路。';
    } else if (modifier.visibility === 'low') {
      description += ' 雾气或雨雪使得视野模糊。';
    }

    return description;
  }

  /**
   * 添加理智风味描述
   */
  addSanityFlavor(description, sanity) {
    if (sanity < 20) {
      description += ' 你的视线开始模糊，意识有些不清晰。';
    } else if (sanity < 40) {
      description += ' 你感到精神有些恍惚。';
    }
    return description;
  }

  /**
   * 添加体温风味描述
   */
  addTemperatureFlavor(description, temperature) {
    if (temperature < 28) {
      description += ' 严重失温让你几乎无法思考。';
    } else if (temperature < 32) {
      description += ' 刺骨的寒意让你的动作变得迟缓。';
    }
    return description;
  }

  // ========== 决策影响系统 ==========

  /**
   * 记录决策
   */
  recordDecision(decision) {
    const decisions = this.gameState.get('world.decisions') || [];
    decisions.push({
      id: decision.id,
      choice: decision.choice,
      timestamp: Date.now(),
      scene: decision.sceneId,
    });

    this.gameState.set('world.decisions', decisions);

    // 应用决策效果
    if (decision.effects) {
      Object.entries(decision.effects).forEach(([key, value]) => {
        if (key.startsWith('flag:')) {
          // 设置标志
          this.gameState.set(`world.flags.${key.slice(5)}`, value);
        } else if (key.startsWith('npc:')) {
          // NPC关系
          const npcId = key.slice(4);
          const npcState = this.gameState.get(`npcs.${npcId}`) || { relationship: 50, trust: 50 };
          npcState.relationship = Math.max(0, Math.min(100, npcState.relationship + value));
          this.gameState.set(`npcs.${npcId}`, npcState);
        } else if (key.startsWith('status:')) {
          // 状态修改
          this.gameState.modifyStatus(key.slice(7), value);
        }
      });
    }

    // 触发决策事件
    this.eventSystem.emit('decision:recorded', decision);
  }

  /**
   * 获取决策影响
   */
  getDecisionImpact(decisionId) {
    const decisions = this.gameState.get('world.decisions') || [];
    return decisions.filter(d => d.id === decisionId);
  }

  /**
   * 检查是否做过特定决策
   */
  hasMadeDecision(decisionId, choice = null) {
    const decisions = this.gameState.get('world.decisions') || [];
    return decisions.some(d => {
      if (d.id !== decisionId) return false;
      if (choice === null) return true;
      return d.choice === choice;
    });
  }

  // ========== NPC关系影响 ==========

  /**
   * 处理NPC互动
   */
  handleNpcInteraction(data) {
    const { npcId, interactionType } = data;
    const npcState = this.gameState.get(`npcs.${npcId}`) || { relationship: 50, trust: 50, knownInfo: [] };

    // 根据互动类型调整关系
    const adjustments = {
      dialogue: { relationship: 2, trust: 1 },
      gift: { relationship: 10, trust: 5 },
      help: { relationship: 8, trust: 8 },
      save: { relationship: 15, trust: 15 },
      betray: { relationship: -20, trust: -15 },
      ignore: { relationship: -2, trust: 0 },
      aggressive: { relationship: -10, trust: -5 },
    };

    const adjustment = adjustments[interactionType] || { relationship: 1, trust: 1 };
    npcState.relationship = Math.max(0, Math.min(100, npcState.relationship + adjustment.relationship));
    npcState.trust = Math.max(0, Math.min(100, npcState.trust + adjustment.trust));

    this.gameState.set(`npcs.${npcId}`, npcState);
  }

  /**
   * 获取NPC态度
   */
  getNpcAttitude(npcId) {
    const npcState = this.gameState.get(`npcs.${npcId}`) || { relationship: 50, trust: 50 };
    const { relationship, trust } = npcState;

    const avg = (relationship + trust) / 2;

    if (avg >= 80) return 'friendly';
    if (avg >= 60) return 'warm';
    if (avg >= 40) return 'neutral';
    if (avg >= 20) return 'cold';
    return 'hostile';
  }

  /**
   * 根据NPC态度调整对话
   */
  adjustDialogueByAttitude(dialogueData, npcId) {
    const attitude = this.getNpcAttitude(npcId);

    // 冷淡/敌对时添加额外对话
    if (attitude === 'cold' || attitude === 'hostile') {
      if (dialogueData.hostileResponse) {
        return dialogueData.hostileResponse;
      }
    }

    return dialogueData;
  }

  // ========== 记忆系统 ==========

  /**
   * 记录重要信息到记忆
   */
  remember(key, value) {
    const memory = this.gameState.get('world.memory') || {};
    memory[key] = {
      value,
      timestamp: Date.now(),
    };
    this.gameState.set('world.memory', memory);
  }

  /**
   * 回忆重要信息
   */
  recall(key) {
    const memory = this.gameState.get('world.memory') || {};
    return memory[key]?.value;
  }

  /**
   * 检查是否记得某事
   */
  remembers(key) {
    const memory = this.gameState.get('world.memory') || {};
    return !!memory[key];
  }

  // ========== 场景元素动态生成 ==========

  /**
   * 生成动态交互元素
   */
  generateDynamicInteractives(sceneId, baseInteractives) {
    if (!baseInteractives) return [];

    return baseInteractives.filter(interactive => {
      // 检查显示条件
      if (interactive.showConditions) {
        return this.checkVariantConditions(interactive.showConditions);
      }
      return true;
    });
  }

  /**
   * 生成动态出口
   */
  generateDynamicExits(sceneId, baseExits) {
    if (!baseExits) return [];

    return baseExits.filter(exit => {
      // 检查解锁条件
      if (exit.conditions) {
        return this.checkVariantConditions(exit.conditions);
      }
      return true;
    });
  }

  /**
   * 生成时间推进效果
   */
  generateTimePassageEffects(hours) {
    const effects = [];

    // 理智随时间自然恢复/下降
    const timeOfDay = this.gameState.get('world.time.hour');
    if (timeOfDay >= 22 || timeOfDay < 6) {
      // 深夜理智下降
      effects.push({ status: 'sanity', delta: -hours * 2 });
    } else if (timeOfDay >= 8 && timeOfDay < 18) {
      // 白天理智恢复
      effects.push({ status: 'sanity', delta: hours });
    }

    // 体温随天气变化
    const weather = this.currentWeather;
    if (weather === 'blizzard') {
      effects.push({ status: 'temperature', delta: -hours * 2 });
    } else if (weather === 'clear') {
      effects.push({ status: 'temperature', delta: hours });
    }

    return effects;
  }
}
