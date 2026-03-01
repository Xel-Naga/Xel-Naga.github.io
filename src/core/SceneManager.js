/**
 * 场景管理器
 * 管理场景数据和动态描述生成
 */

export class SceneManager {
  constructor(state, eventSystem) {
    this.state = state;
    this.eventSystem = eventSystem;
    this.chapterData = null;
    this.scenes = new Map();
  }

  /**
   * 设置章节数据
   * @param {Object} data - 章节数据
   */
  setChapterData(data) {
    this.chapterData = data;
    this.scenes.clear();
    
    // 将场景数据加载到Map中
    if (data.scenes) {
      Object.entries(data.scenes).forEach(([id, scene]) => {
        this.scenes.set(id, scene);
      });
    }
    
    console.log(`已加载 ${this.scenes.size} 个场景`);
  }

  /**
   * 加载场景
   * @param {string} sceneId - 场景ID
   * @returns {Object} 场景数据
   */
  loadScene(sceneId) {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      console.error(`场景不存在: ${sceneId}`);
      return this.getDefaultScene();
    }

    // 执行场景进入钩子
    this.executeOnEnter(scene);

    // 生成动态描述
    const dynamicDescription = this.generateDescription(scene);
    
    // 处理交互元素（包含检查次数的动态描述）
    const interactives = this.processInteractives(scene.interactives || []);
    
    // 处理出口（检查任务条件）
    const exits = this.processExits(scene.exits || []);
    
    return {
      id: sceneId,
      name: scene.name,
      description: dynamicDescription,
      interactives: interactives,
      exits: exits,
      ambience: scene.ambience || '',
      events: scene.events || {},
    };
  }

  /**
   * 生成动态场景描述
   * @param {Object} scene - 场景数据
   * @returns {string} 动态描述
   */
  generateDescription(scene) {
    // 基础描述
    let description = scene.description || '';

    // 获取当前状态
    const sanity = this.state.get('status.sanity.current');
    const temperature = this.state.get('status.temperature.current');
    const time = this.state.get('world.time.hour');
    const visited = this.state.get('world.visitedLocations') || [];
    const isFirstVisit = !visited.includes(scene.id);

    // 处理数组形式的场景变体（带条件）
    if (Array.isArray(scene.variants)) {
      const matchingVariant = this.findMatchingVariant(scene.variants);
      if (matchingVariant) {
        description = matchingVariant.description || description;
      }
    } else {
      // 原有逻辑：时间变体
      if (scene.variants?.time) {
        const timeVariant = this.getTimeVariant(scene.variants.time, time);
        if (timeVariant) {
          description = timeVariant.description || description;
        }
      }

      // 理智状态变体
      if (scene.variants?.sanity) {
        const sanityVariant = this.getSanityVariant(scene.variants.sanity, sanity);
        if (sanityVariant) {
          description = this.mergeDescription(description, sanityVariant.addition);
        }
      }

      // 重复访问变体
      if (!isFirstVisit && scene.variants?.revisit) {
        description = this.mergeDescription(description, scene.variants.revisit.addition);
      }
    }

    // 状态修饰（温度、理智等）
    description = this.applyStatusModifiers(description);

    return description;
  }

  /**
   * 查找匹配的场景变体
   * @param {Array} variants - 变体数组
   * @returns {Object|null} 匹配的变体
   */
  findMatchingVariant(variants) {
    let bestMatch = null;
    let bestPriority = -1;

    for (const variant of variants) {
      if (this.checkVariantConditions(variant.conditions)) {
        if (!bestMatch || (variant.priority || 0) > bestPriority) {
          bestMatch = variant;
          bestPriority = variant.priority || 0;
        }
      }
    }

    return bestMatch;
  }

  /**
   * 检查变体条件
   * @param {Object} conditions - 条件对象
   * @returns {boolean} 是否匹配
   */
  checkVariantConditions(conditions) {
    if (!conditions) return true;

    // 时间段条件
    if (conditions.timePhases) {
      const currentPhase = this.state.get('world.time.timePhase');
      if (!conditions.timePhases.includes(currentPhase)) {
        return false;
      }
    }

    // 天气条件
    if (conditions.weathers) {
      const currentWeather = this.state.get('world.weather');
      if (!conditions.weathers.includes(currentWeather)) {
        return false;
      }
    }

    // 理智条件
    if (conditions.sanity) {
      const sanity = this.state.get('status.sanity.current');
      if (conditions.sanity.min !== undefined && sanity < conditions.sanity.min) {
        return false;
      }
      if (conditions.sanity.max !== undefined && sanity > conditions.sanity.max) {
        return false;
      }
    }

    // 线索条件
    if (conditions.hasClue) {
      if (!this.state.hasClue(conditions.hasClue)) {
        return false;
      }
    }

    // 标志条件（支持 '!' 前缀表示取反）
    if (conditions.flags) {
      for (const flag of conditions.flags) {
        const isNegated = flag.startsWith('!');
        const flagName = isNegated ? flag.slice(1) : flag;
        const hasFlag = this.state.get(`world.flags.${flagName}`);
        if (isNegated ? hasFlag : !hasFlag) {
          return false;
        }
      }
    }

    // 任务条件
    if (conditions.questCompleted) {
      if (!this.state.isQuestCompleted(conditions.questCompleted)) {
        return false;
      }
    }

    if (conditions.questActive) {
      if (!this.state.isQuestActive(conditions.questActive)) {
        return false;
      }
    }

    // 道具条件
    if (conditions.hasItem) {
      if (!this.state.hasItem(conditions.hasItem)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 获取时间变体
   */
  getTimeVariant(timeVariants, hour) {
    let period = 'day';
    if (hour >= 5 && hour < 12) period = 'morning';
    else if (hour >= 12 && hour < 17) period = 'afternoon';
    else if (hour >= 17 && hour < 20) period = 'evening';
    else period = 'night';
    
    return timeVariants[period];
  }

  /**
   * 获取理智变体
   */
  getSanityVariant(sanityVariants, sanity) {
    if (sanity <= 20) return sanityVariants.critical;
    if (sanity <= 40) return sanityVariants.low;
    if (sanity <= 70) return sanityVariants.medium;
    return sanityVariants.high;
  }

  /**
   * 合并描述
   */
  mergeDescription(base, addition) {
    if (!addition) return base;
    return base + ' ' + addition;
  }

  /**
   * 应用状态修饰
   */
  applyStatusModifiers(description) {
    const sanity = this.state.get('status.sanity.current');
    const temperature = this.state.get('status.temperature.current');
    
    // 低理智时添加幻觉描述
    if (sanity < 30) {
      const hallucinations = [
        '你似乎看到角落有东西在移动。',
        '耳边传来低语声，但听不清内容。',
        '空气中的阴影似乎在扭曲变形。',
      ];
      if (Math.random() < 0.3) {
        const random = hallucinations[Math.floor(Math.random() * hallucinations.length)];
        description += ` <span class="hallucination">${random}</span>`;
      }
    }
    
    // 低温时添加寒冷描述
    if (temperature < 35) {
      description = '刺骨的寒冷让你颤抖不已。' + description;
    }
    
    return description;
  }

  /**
   * 处理交互元素
   * @param {Array} interactives - 交互元素数组
   * @returns {Array} 处理后的交互元素
   */
  processInteractives(interactives) {
    return interactives
      .filter(item => this.checkItemConditions(item.conditions))
      .map(item => {
        const processed = { ...item };

        // 获取检查次数（即使没有检查过也获取，用于显示首次描述）
        const examineCount = this.state.getEventCount(`examine_${item.id}`);

        // 检查是否已检查过
        if (item.id && this.state.hasExamined(item.id)) {
          processed.examined = true;
        }

        // 应用重复检查的描述（根据检查次数动态调整）
        if (item.repeatDescriptions) {
          const repeatDesc = this.getRepeatDescription(item.repeatDescriptions, examineCount);
          if (repeatDesc) {
            processed.description = repeatDesc;
          }
        }

        return processed;
      });
  }

  /**
   * 检查交互元素的条件
   * @param {Object} conditions - 条件对象
   * @returns {boolean} 是否满足条件
   */
  checkItemConditions(conditions) {
    if (!conditions) return true;
    return this.checkVariantConditions(conditions);
  }

  /**
   * 获取重复描述
   */
  getRepeatDescription(repeatDescriptions, count) {
    // count 是已触发的次数，0表示从未检查
    // 显示描述时，0次显示原始描述，1次显示first（已检查1次）
    if (count === 0) return null; // 返回null表示使用原始description
    if (count === 1) return repeatDescriptions.first;
    if (count === 2) return repeatDescriptions.second;
    if (count === 3) return repeatDescriptions.third;
    if (count >= 4) return repeatDescriptions.subsequent;
    return null;
  }

  /**
   * 处理出口（检查任务条件）
   * @param {Array} exits - 出口数组
   * @returns {Array} 处理后的出口
   */
  processExits(exits) {
    return exits.map(exit => {
      const processed = { ...exit };
      
      // 检查是否需要任务条件
      if (exit.requireQuest) {
        const completedQuests = this.state.get('quests.completed') || [];
        const questProgress = this.state.getQuestProgress(exit.requireQuest);
        const quest = this.chapterData?.quests?.find(q => q.id === exit.requireQuest);
        
        // 检查任务是否完成
        if (!completedQuests.includes(exit.requireQuest)) {
          processed.locked = true;
          processed.lockReason = exit.requireQuestText || `需要完成: ${quest?.name || '前置任务'}`;
        }
      }
      
      // 检查是否需要特定步骤
      if (exit.requireQuestStep) {
        const [questId, stepId] = exit.requireQuestStep.split(':');
        const progress = this.state.getQuestProgress(questId);
        
        if (!progress?.completedSteps?.includes(stepId)) {
          processed.locked = true;
          const quest = this.chapterData?.quests?.find(q => q.id === questId);
          const step = quest?.steps?.find(s => s.id === stepId);
          processed.lockReason = step?.description || '前置步骤未完成';
        }
      }
      
      return processed;
    });
  }

  /**
   * 获取默认场景
   */
  getDefaultScene() {
    return {
      id: 'unknown',
      name: '未知区域',
      description: '这里是一片虚无...',
      interactives: [],
      exits: [],
    };
  }

  /**
   * 获取可移动方向
   * @param {string} sceneId - 当前场景ID
   * @returns {Array} 可移动方向
   */
  getAvailableExits(sceneId) {
    const scene = this.scenes.get(sceneId);
    if (!scene || !scene.exits) return [];
    
    return this.processExits(scene.exits);
  }

  /**
   * 检查是否可以移动
   * @param {string} from - 当前场景
   * @param {string} direction - 方向
   * @returns {Object|null} 目标场景信息
   */
  canMove(from, direction) {
    const scene = this.scenes.get(from);
    if (!scene || !scene.exits) return null;
    
    const exit = scene.exits.find(e => e.direction === direction);
    if (!exit) return null;
    
    // 处理出口条件检查
    const processedExits = this.processExits([exit]);
    const processedExit = processedExits[0];
    
    if (processedExit.locked) {
      return { locked: true, reason: processedExit.lockReason };
    }
    
    return { target: exit.target };
  }

  /**
   * 执行场景进入钩子
   * @param {Object} scene - 场景数据
   */
  executeOnEnter(scene) {
    if (!scene.onEnter) return;

    // 初始化状态
    if (scene.onEnter.initStatus) {
      Object.entries(scene.onEnter.initStatus).forEach(([key, value]) => {
        this.state.set(`status.${key}.current`, value, true);
      });
    }

    // 添加道具
    if (scene.onEnter.addItems) {
      scene.onEnter.addItems.forEach(itemId => {
        this.state.addItem(itemId);
      });
    }

    // 应用效果
    if (scene.onEnter.effects) {
      Object.entries(scene.onEnter.effects).forEach(([status, delta]) => {
        this.state.modifyStatus(status, delta);
      });
    }

    // 触发事件
    if (scene.onEnter.triggerEvent) {
      this.eventSystem.emit('event:trigger', { eventId: scene.onEnter.triggerEvent });
    }

    // 触发场景进入事件（用于任务检查）
    this.eventSystem.emit('scene:entered', { sceneId: scene.id, sceneName: scene.name });
  }
}
