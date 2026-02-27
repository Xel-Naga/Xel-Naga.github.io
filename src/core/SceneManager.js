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
    
    // 处理交互元素
    const interactives = this.processInteractives(scene.interactives || []);
    
    return {
      id: sceneId,
      name: scene.name,
      description: dynamicDescription,
      interactives: interactives,
      exits: scene.exits || [],
      ambience: scene.ambience || '',
      events: scene.events || {},
    };
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
    
    // 时间变体
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
    
    // 状态修饰（温度、理智等）
    description = this.applyStatusModifiers(description);
    
    return description;
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
    // 简单追加，实际可以更复杂
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
    return interactives.map(item => {
      const processed = { ...item };
      
      // 检查是否已检查过
      if (item.id && this.state.hasExamined(item.id)) {
        processed.examined = true;
        
        // 应用重复检查的描述
        if (item.repeatDescriptions) {
          const count = this.state.getEventCount(`examine_${item.id}`);
          const repeatDesc = this.getRepeatDescription(item.repeatDescriptions, count);
          if (repeatDesc) {
            processed.description = repeatDesc;
          }
        }
      }
      
      return processed;
    });
  }

  /**
   * 获取重复描述
   */
  getRepeatDescription(repeatDescriptions, count) {
    if (count === 1) return repeatDescriptions.first;
    if (count === 2) return repeatDescriptions.second;
    if (count === 3) return repeatDescriptions.third;
    if (count >= 4) return repeatDescriptions.subsequent;
    return null;
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
    
    return scene.exits.map(exit => ({
      direction: exit.direction,
      target: exit.target,
      name: exit.name || exit.target,
      locked: exit.locked || false,
    }));
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
    if (exit.locked) return { locked: true, reason: exit.lockReason };
    
    return { target: exit.target };
  }
}
