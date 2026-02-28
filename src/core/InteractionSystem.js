/**
 * 交互系统
 * 处理玩家与游戏世界的交互
 */

export class InteractionSystem {
  constructor(state, eventSystem, gameEngine = null) {
    this.state = state;
    this.eventSystem = eventSystem;
    this.gameEngine = gameEngine;
    this.handlers = new Map();
    
    // 注册默认交互处理器
    this.registerDefaultHandlers();
  }

  /**
   * 注册默认交互处理器
   */
  registerDefaultHandlers() {
    // 检查
    this.register('examine', this.handleExamine.bind(this));
    // 收集
    this.register('collect', this.handleCollect.bind(this));
    // 线索
    this.register('clue', this.handleClue.bind(this));
    // 危险
    this.register('danger', this.handleDanger.bind(this));
    // NPC对话
    this.register('npc', this.handleNPC.bind(this));
    // 设备交互
    this.register('device', this.handleDevice.bind(this));
    // 移动
    this.register('move', this.handleMove.bind(this));
  }

  /**
   * 注册交互处理器
   * @param {string} action - 动作类型
   * @param {Function} handler - 处理器函数
   */
  register(action, handler) {
    this.handlers.set(action, handler);
  }

  /**
   * 处理交互
   * @param {string} elementId - 元素ID
   * @param {string} action - 动作类型
   * @returns {Object} 处理结果
   */
  handle(elementId, action) {
    const handler = this.handlers.get(action);
    if (!handler) {
      console.warn(`未注册的交互类型: ${action}`);
      return { success: false, reason: 'unknown_action' };
    }

    try {
      const result = handler(elementId, action);
      
      // 触发交互事件
      this.eventSystem.emit('interaction:completed', {
        elementId,
        action,
        result,
      });
      
      return result;
    } catch (error) {
      console.error(`交互处理错误 [${action}:${elementId}]:`, error);
      return { success: false, reason: 'error' };
    }
  }

  /**
   * 处理检查动作
   */
  handleExamine(elementId, action) {
    // 记录检查次数
    const eventKey = `examine_${elementId}`;
    const count = this.state.recordEvent(eventKey);
    
    // 记录已检查
    this.state.recordExamined(elementId);
    
    // 获取交互元素数据
    const sceneData = this.getCurrentSceneData();
    const interactive = sceneData?.interactives?.find(i => i.id === elementId);
    
    if (!interactive) {
      return { success: false, reason: 'not_found' };
    }

    // 应用状态变化
    if (interactive.effects) {
      this.applyEffects(interactive.effects);
    }
    
    // 获取描述（支持重复描述变体）
    let message;
    if (interactive.repeatDescriptions) {
      message = this.getRepeatDescription(interactive.repeatDescriptions, count);
    } else {
      message = interactive.description || '你仔细检查了这里。';
    }
    
    // 第一次检查 - 可能有额外发现
    if (count === 1) {
      if (interactive.firstExamineBonus) {
        message += ' ' + interactive.firstExamineBonus;
      }
      // 添加线索
      if (interactive.clueId) {
        this.state.addClue(interactive.clueId);
      }
    }
    
    // 多次检查 - 理智低时可能产生幻觉
    if (count >= 4) {
      const sanity = this.state.get('status.sanity.current');
      if (sanity < 40 && Math.random() < 0.3) {
        this.state.modifyStatus('sanity', -3);
        message += ' 你越看越觉得诡异，心中不安...';
      }
    }

    return {
      success: true,
      type: 'examine',
      message: message,
      count: count,
    };
  }

  /**
   * 获取重复描述
   */
  getRepeatDescription(repeatDescriptions, count) {
    if (count === 1) return repeatDescriptions.first || repeatDescriptions.subsequent;
    if (count === 2) return repeatDescriptions.second || repeatDescriptions.subsequent;
    if (count === 3) return repeatDescriptions.third || repeatDescriptions.subsequent;
    return repeatDescriptions.subsequent || '你已经仔细检查过了。';
  }

  /**
   * 处理收集动作
   */
  handleCollect(elementId, action) {
    const sceneData = this.getCurrentSceneData();
    const interactive = sceneData?.interactives?.find(i => i.id === elementId);
    
    if (!interactive) {
      return { success: false, reason: 'not_found' };
    }

    // 检查是否已经收集
    const inventory = this.state.get('player.inventory');
    if (inventory.includes(interactive.itemId)) {
      return { success: false, reason: 'already_collected' };
    }

    // 添加道具到背包
    const added = this.state.addItem(interactive.itemId);
    
    if (added) {
      // 应用效果
      if (interactive.effects) {
        this.applyEffects(interactive.effects);
      }

      return {
        success: true,
        type: 'collect',
        message: `你获得了: ${interactive.name}`,
        itemId: interactive.itemId,
        itemName: interactive.name,
      };
    }

    return { success: false, reason: 'add_failed' };
  }

  /**
   * 处理线索动作
   */
  handleClue(elementId, action) {
    const sceneData = this.getCurrentSceneData();
    const interactive = sceneData?.interactives?.find(i => i.id === elementId);
    
    if (!interactive) {
      return { success: false, reason: 'not_found' };
    }

    // 记录线索
    this.state.addClue(interactive.clueId);
    
    // 应用效果
    if (interactive.effects) {
      this.applyEffects(interactive.effects);
    }

    return {
      success: true,
      type: 'clue',
      message: `线索已记录: ${interactive.name}`,
      clueId: interactive.clueId,
      clueName: interactive.name,
      description: interactive.description,
    };
  }

  /**
   * 处理危险动作
   */
  handleDanger(elementId, action) {
    const sceneData = this.getCurrentSceneData();
    const interactive = sceneData?.interactives?.find(i => i.id === elementId);
    
    if (!interactive) {
      return { success: false, reason: 'not_found' };
    }

    // 危险交互通常需要确认
    if (interactive.warning) {
      return {
        success: true,
        type: 'danger_warning',
        message: interactive.warning,
        requireConfirm: true,
        elementId: elementId,
      };
    }

    // 应用危险效果
    if (interactive.effects) {
      this.applyEffects(interactive.effects);
    }

    return {
      success: true,
      type: 'danger',
      message: interactive.description || '危险！',
    };
  }

  /**
   * 处理NPC交互
   */
  handleNPC(elementId, action) {
    const sceneData = this.getCurrentSceneData();
    console.log('handleNPC sceneData:', sceneData?.id, 'interactives:', sceneData?.interactives?.length);
    
    const interactive = sceneData?.interactives?.find(i => i.id === elementId);
    
    if (!interactive) {
      console.warn(`交互对象未找到: ${elementId}`);
      return { success: false, reason: 'not_found' };
    }

    const npcId = interactive.npcId;
    console.log(`handleNPC: elementId=${elementId}, npcId=${npcId}`);
    
    // 触发对话事件
    this.eventSystem.emit('dialogue:start', {
      npcId: npcId,
    });

    return {
      success: true,
      type: 'npc',
      npcId: npcId,
    };
  }

  /**
   * 处理设备交互
   */
  handleDevice(elementId, action) {
    const sceneData = this.getCurrentSceneData();
    const interactive = sceneData?.interactives?.find(i => i.id === elementId);
    
    if (!interactive) {
      return { success: false, reason: 'not_found' };
    }

    // 检查是否需要道具
    if (interactive.requiredItem) {
      const inventory = this.state.get('player.inventory');
      if (!inventory.includes(interactive.requiredItem)) {
        return {
          success: false,
          reason: 'item_required',
          requiredItem: interactive.requiredItem,
          message: `需要道具: ${interactive.requiredItemName || interactive.requiredItem}`,
        };
      }
    }

    // 应用效果
    if (interactive.effects) {
      this.applyEffects(interactive.effects);
    }

    // 处理结果
    if (interactive.result) {
      // 添加初始道具
      if (interactive.result.addInitialItems) {
        this.eventSystem.emit('inventory:add_initial');
      }
    }

    // 触发事件
    if (interactive.triggerEvent) {
      this.eventSystem.emit('event:trigger', { eventId: interactive.triggerEvent });
    }

    return {
      success: true,
      type: 'device',
      message: interactive.resultMessage || interactive.description,
      result: interactive.result,
    };
  }

  /**
   * 处理移动
   */
  handleMove(exitData, action) {
    // exitData 可以是目标位置ID或exit对象
    const targetLocation = typeof exitData === 'string' ? exitData : exitData.target;
    
    // 检查exit是否有触发条件
    if (typeof exitData === 'object') {
      // 触发事件
      if (exitData.triggerEvent) {
        this.eventSystem.emit('event:trigger', { eventId: exitData.triggerEvent });
      }
      
      // 章节结束
      if (exitData.triggerChapterEnd) {
        this.eventSystem.emit('chapter:complete', { chapter: 1 });
      }
    }
    
    // 移动到新位置
    this.state.moveTo(targetLocation);

    return {
      success: true,
      type: 'move',
      target: targetLocation,
    };
  }

  /**
   * 应用效果
   * @param {Object} effects - 效果对象
   */
  applyEffects(effects) {
    if (effects.stamina) {
      this.state.modifyStatus('stamina', effects.stamina);
    }
    if (effects.sanity) {
      this.state.modifyStatus('sanity', effects.sanity);
    }
    if (effects.temperature) {
      this.state.modifyStatus('temperature', effects.temperature);
    }
    if (effects.intuition) {
      this.state.modifyStatus('intuition', effects.intuition);
    }
  }

  /**
   * 获取当前场景数据
   */
  getCurrentSceneData() {
    // 优先从gameEngine获取完整场景数据
    if (this.gameEngine) {
      const scene = this.gameEngine.getCurrentScene();
      console.log('getCurrentSceneData from gameEngine:', scene?.id, 'interactives:', scene?.interactives?.length);
      return scene;
    }
    // 降级方案：只返回位置ID
    const locationId = this.state.get('player.location');
    console.log('getCurrentSceneData fallback:', locationId);
    return { id: locationId, interactives: [] };
  }

  /**
   * 获取NPC数据
   */
  getNPCData(npcId) {
    // 从章节数据获取NPC信息
    return {
      id: npcId,
      name: npcId,
      initialDialogue: '',
    };
  }
}
