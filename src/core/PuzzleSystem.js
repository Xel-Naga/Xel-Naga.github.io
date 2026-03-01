/**
 * 谜题机关系统
 * 处理各种谜题类型、机关解锁、验证逻辑等
 */

export class PuzzleSystem {
  constructor(gameState, eventSystem) {
    this.gameState = gameState;
    this.eventSystem = eventSystem;

    // 注册的谜题定义
    this.puzzles = new Map();

    // 机关交互处理器
    this.mechanismHandlers = new Map();

    // 初始化默认处理器
    this.initDefaultHandlers();
  }

  /**
   * 初始化默认处理器
   */
  initDefaultHandlers() {
    // 密码输入处理器
    this.registerMechanismHandler('password', this.handlePasswordInput.bind(this));

    // 顺序点击处理器
    this.registerMechanismHandler('sequence', this.handleSequenceInput.bind(this));

    // 物品放置处理器
    this.registerMechanismHandler('placement', this.handlePlacementInput.bind(this));

    // 交互触发处理器
    this.registerMechanismHandler('trigger', this.handleTriggerInput.bind(this));
  }

  /**
   * 注册机关交互处理器
   */
  registerMechanismHandler(type, handler) {
    this.mechanismHandlers.set(type, handler);
  }

  /**
   * 注册谜题定义
   */
  registerPuzzle(puzzleId, puzzleData) {
    this.puzzles.set(puzzleId, puzzleData);
  }

  /**
   * 批量注册谜题
   */
  registerPuzzles(puzzlesArray) {
    puzzlesArray.forEach(puzzle => {
      if (puzzle.id) {
        this.registerPuzzle(puzzle.id, puzzle);
      }
    });
  }

  /**
   * 获取谜题数据
   */
  getPuzzle(puzzleId) {
    return this.puzzles.get(puzzleId);
  }

  /**
   * 检查谜题是否可用
   */
  isPuzzleAvailable(puzzleId) {
    const puzzle = this.puzzles.get(puzzleId);
    if (!puzzle) return false;

    // 检查前置条件
    if (puzzle.conditions) {
      return this.checkConditions(puzzle.conditions);
    }

    return true;
  }

  /**
   * 检查条件
   */
  checkConditions(conditions) {
    // 检查任务完成
    if (conditions.requiredQuest) {
      if (!this.gameState.isQuestCompleted(conditions.requiredQuest)) {
        return false;
      }
    }

    // 检查任务进行中
    if (conditions.requiredQuestActive) {
      if (!this.gameState.isQuestActive(conditions.requiredQuestActive)) {
        return false;
      }
    }

    // 检查道具
    if (conditions.requiredItem) {
      if (!this.gameState.hasItem(conditions.requiredItem)) {
        return false;
      }
    }

    // 检查线索
    if (conditions.requiredClue) {
      const clues = this.gameState.get('player.clues') || [];
      if (!clues.includes(conditions.requiredClue)) {
        return false;
      }
    }

    // 检查状态
    if (conditions.requiredStatus) {
      for (const [status, value] of Object.entries(conditions.requiredStatus)) {
        const current = this.gameState.get(`status.${status}.current`);
        if (value.min && current < value.min) return false;
        if (value.max && current > value.max) return false;
      }
    }

    // 检查机关状态
    if (conditions.requiredPuzzle) {
      if (!this.gameState.isPuzzleSolved(conditions.requiredPuzzle)) {
        return false;
      }
    }

    // 检查分支选择
    if (conditions.requiredChoice) {
      const { branchId, choiceId } = conditions.requiredChoice;
      if (!this.gameState.hasChosen(branchId, choiceId)) {
        return false;
      }
    }

    // 检查世界标志
    if (conditions.requiredFlag) {
      for (const [flag, value] of Object.entries(conditions.requiredFlag)) {
        const flagValue = this.gameState.get(`world.flags.${flag}`);
        if (value === true && !flagValue) return false;
        if (value === false && flagValue) return false;
        if (typeof value === 'string' && flagValue !== value) return false;
      }
    }

    return true;
  }

  /**
   * 尝试解锁机关
   */
  tryUnlock(puzzleId, attempt) {
    const puzzle = this.puzzles.get(puzzleId);

    if (!puzzle) {
      return { success: false, message: '未找到该谜题。' };
    }

    // 检查是否已解锁/解决
    if (this.gameState.isPuzzleSolved(puzzleId)) {
      return { success: false, message: '这个机关已经被解决了。' };
    }

    // 检查前置条件
    if (puzzle.conditions && !this.checkConditions(puzzle.conditions)) {
      return { success: false, message: '当前无法触发这个机关。', reason: 'conditions_not_met' };
    }

    // 使用GameState的attemptPuzzle方法
    return this.gameState.attemptPuzzle(puzzleId, attempt, puzzle);
  }

  /**
   * 处理机关交互
   */
  handleMechanismInteraction(elementId, action, context = {}) {
    const puzzle = this.puzzles.get(elementId);

    if (!puzzle) {
      // 尝试从场景数据获取
      return this.handleScenePuzzle(elementId, action, context);
    }

    // 检查是否可用
    if (!this.isPuzzleAvailable(elementId)) {
      return {
        success: false,
        message: puzzle.lockedMessage || '这个机关目前无法使用。',
        reason: 'locked',
      };
    }

    // 获取处理器
    const handler = this.mechanismHandlers.get(puzzle.type);
    if (handler) {
      return handler(puzzle, action, context);
    }

    // 默认处理
    return this.defaultMechanismHandler(puzzle, action, context);
  }

  /**
   * 处理场景中的谜题
   */
  handleScenePuzzle(elementId, action, context) {
    // 这是一个备用方法，由场景数据直接定义
    return { success: false, reason: 'not_found' };
  }

  // ========== 处理器实现 ==========

  /**
   * 处理密码输入
   */
  handlePasswordInput(puzzle, action, context) {
    const input = context.input || '';

    // 如果只是查询状态，返回提示
    if (action === 'query') {
      return {
        success: true,
        type: 'password',
        prompt: puzzle.prompt || '请输入密码：',
        hint: puzzle.hint,
        maxLength: puzzle.maxLength || 20,
        attempts: this.gameState.getPuzzleState(puzzle.id).attempts || 0,
      };
    }

    // 验证密码
    return this.tryUnlock(puzzle.id, input);
  }

  /**
   * 处理顺序输入
   */
  handleSequenceInput(puzzle, action, context) {
    // 获取当前已输入的序列
    const state = this.gameState.getPuzzleState(puzzle.id);
    let currentSequence = state.sequence || [];

    if (action === 'add') {
      const item = context.item;
      currentSequence.push(item);

      // 检查是否完成
      if (currentSequence.length >= puzzle.solution.length) {
        return this.tryUnlock(puzzle.id, currentSequence);
      }

      // 保存当前序列
      this.gameState.set(`world.puzzleStates.${puzzle.id}.sequence`, currentSequence);

      return {
        success: true,
        type: 'sequence',
        currentSequence: currentSequence,
        requiredLength: puzzle.solution.length,
        message: puzzle.progressMessage || `已输入 ${currentSequence.length}/${puzzle.solution.length}`,
      };
    }

    if (action === 'reset') {
      this.gameState.set(`world.puzzleStates.${puzzle.id}.sequence`, []);
      return {
        success: true,
        type: 'sequence',
        message: '序列已重置。',
      };
    }

    return {
      success: true,
      type: 'sequence',
      currentSequence: currentSequence,
      requiredLength: puzzle.solution.length,
    };
  }

  /**
   * 处理物品放置
   */
  handlePlacementInput(puzzle, action, context) {
    const placedItem = context.itemId;

    // 检查是否有所需道具
    if (puzzle.requiredItem && placedItem !== puzzle.requiredItem) {
      return {
        success: false,
        message: `这个位置需要放置 ${puzzle.requiredItemName || puzzle.requiredItem}。`,
        requiredItem: puzzle.requiredItem,
      };
    }

    // 检查是否有所需道具（多个）
    if (puzzle.requiredItems && Array.isArray(puzzle.requiredItems)) {
      const state = this.gameState.getPuzzleState(puzzle.id);
      const placed = state.placedItems || [];

      if (!placed.includes(placedItem)) {
        placed.push(placedItem);
        this.gameState.set(`world.puzzleStates.${puzzle.id}.placedItems`, placed);
      }

      // 检查是否全部放置
      const allPlaced = puzzle.requiredItems.every(item => placed.includes(item));

      if (allPlaced) {
        return this.tryUnlock(puzzle.id, placed);
      }

      const remaining = puzzle.requiredItems.filter(item => !placed.includes(item));
      return {
        success: true,
        type: 'placement',
        placedItems: placed,
        remainingItems: remaining,
        message: `已放置物品，还需要：${remaining.join(', ')}`,
      };
    }

    return this.tryUnlock(puzzle.id, placedItem);
  }

  /**
   * 处理触发器
   */
  handleTriggerInput(puzzle, action, context) {
    // 检查是否满足触发条件
    if (puzzle.conditions && !this.checkConditions(puzzle.conditions)) {
      return {
        success: false,
        message: puzzle.lockedMessage || '这个机关目前无法触发。',
        reason: 'conditions_not_met',
      };
    }

    // 直接解锁
    return this.tryUnlock(puzzle.id, true);
  }

  /**
   * 默认处理器
   */
  defaultMechanismHandler(puzzle, action, context) {
    return this.tryUnlock(puzzle.id, context.input);
  }

  // ========== 机关效果应用 ==========

  /**
   * 应用谜题解决效果
   */
  applyPuzzleEffects(puzzleId) {
    const puzzle = this.puzzles.get(puzzleId);
    if (!puzzle || !puzzle.effects) return;

    // 应用效果
    Object.entries(puzzle.effects).forEach(([key, value]) => {
      if (key === 'addItem') {
        this.gameState.addItem(value);
      } else if (key === 'addClue') {
        this.gameState.addClue(value);
      } else if (key === 'setFlag') {
        this.gameState.set(`world.flags.${value.flag}`, value.value);
      } else if (key === 'activateQuest') {
        this.gameState.activateQuest(value);
      } else if (key === 'completeQuest') {
        this.gameState.completeQuest(value);
      } else if (key === 'triggerEvent') {
        this.eventSystem.emit('event:trigger', { eventId: value });
      } else if (key === 'unlockExit') {
        // 解锁出口
        this.eventSystem.emit('exit:unlock', { exitId: value });
      } else if (key.startsWith('status:')) {
        const status = key.slice(7);
        this.gameState.modifyStatus(status, value);
      }
    });

    // 触发机关解决事件
    this.eventSystem.emit('puzzle:effectsApplied', { puzzleId, effects: puzzle.effects });
  }

  // ========== 机关状态查询 ==========

  /**
   * 获取所有可用的机关
   */
  getAvailablePuzzles(sceneId = null) {
    const available = [];

    this.puzzles.forEach((puzzle, id) => {
      if (sceneId && puzzle.sceneId !== sceneId) return;
      if (this.isPuzzleAvailable(id)) {
        available.push({
          id,
          ...puzzle,
          state: this.gameState.getPuzzleState(id),
        });
      }
    });

    return available;
  }

  /**
   * 获取机关状态摘要
   */
  getPuzzleStatus(puzzleId) {
    const puzzle = this.puzzles.get(puzzleId);
    const state = this.gameState.getPuzzleState(puzzleId);

    if (!puzzle) {
      return { exists: false };
    }

    return {
      exists: true,
      ...puzzle,
      state: state.state,
      attempts: state.attempts,
      solved: state.state === 'solved',
    };
  }

  // ========== 机关提示系统 ==========

  /**
   * 获取谜题提示
   */
  getPuzzleHint(puzzleId) {
    const puzzle = this.puzzles.get(puzzleId);
    if (!puzzle) return null;

    const state = this.gameState.getPuzzleState(puzzleId);
    const attempts = state.attempts || 0;

    // 根据尝试次数提供不同提示
    if (attempts >= (puzzle.hints?.length || 0)) {
      return puzzle.hints?.[puzzle.hints.length - 1] || '我也不知道答案...';
    }

    return puzzle.hints?.[attempts] || puzzle.hint || '仔细观察周围的环境。';
  }

  // ========== 特殊谜题类型工厂 ==========

  /**
   * 创建密码谜题
   */
  static createPasswordPuzzle(config) {
    return {
      type: 'password',
      ...config,
    };
  }

  /**
   * 创建顺序谜题
   */
  static createSequencePuzzle(config) {
    return {
      type: 'sequence',
      ...config,
    };
  }

  /**
   * 创建物品放置谜题
   */
  static createPlacementPuzzle(config) {
    return {
      type: 'placement',
      ...config,
    };
  }

  /**
   * 创建组合谜题
   */
  static createCombinationPuzzle(config) {
    return {
      type: 'combination',
      ...config,
    };
  }

  /**
   * 创建图案谜题
   */
  static createPatternPuzzle(config) {
    return {
      type: 'pattern',
      ...config,
    };
  }
}
