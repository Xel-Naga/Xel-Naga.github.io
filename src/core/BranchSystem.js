/**
 * 剧情分支系统
 * 处理分支选择、分支后果跟踪、多结局支持
 */

export class BranchSystem {
  constructor(gameState, eventSystem) {
    this.gameState = gameState;
    this.eventSystem = eventSystem;

    // 注册的分支定义
    this.branches = new Map();

    // 当前活跃的分支
    this.activeBranch = null;
  }

  /**
   * 注册分支定义
   */
  registerBranch(branchId, branchData) {
    this.branches.set(branchId, branchData);
  }

  /**
   * 批量注册分支
   */
  registerBranches(branchesArray) {
    branchesArray.forEach(branch => {
      if (branch.id) {
        this.registerBranch(branch.id, branch);
      }
    });
  }

  /**
   * 获取分支数据
   */
  getBranch(branchId) {
    return this.branches.get(branchId);
  }

  /**
   * 检查分支是否可用
   */
  isBranchAvailable(branchId) {
    const branch = this.branches.get(branchId);
    if (!branch) return false;

    // 检查前置条件
    if (branch.conditions) {
      return this.checkConditions(branch.conditions);
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

    // 检查世界标志
    if (conditions.requiredFlag) {
      for (const [flag, value] of Object.entries(conditions.requiredFlag)) {
        const flagValue = this.gameState.get(`world.flags.${flag}`);
        if (value === true && !flagValue) return false;
        if (value === false && flagValue) return false;
      }
    }

    // 检查决策历史
    if (conditions.requiredDecision) {
      for (const decision of conditions.requiredDecision) {
        if (!this.gameState.hasMadeDecision(decision.id, decision.choice)) {
          return false;
        }
      }
    }

    // 检查分支选择
    if (conditions.requiredChoice) {
      const { branchId, choiceId } = conditions.requiredChoice;
      if (!this.gameState.hasChosen(branchId, choiceId)) {
        return false;
      }
    }

    // 检查NPC关系
    if (conditions.requiredNpcRelationship) {
      for (const [npcId, minValue] of Object.entries(conditions.requiredNpcRelationship)) {
        const npcState = this.gameState.get(`npcs.${npcId}`) || { relationship: 50 };
        if (npcState.relationship < minValue) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 触发分支选择点
   */
  triggerBranchPoint(branchId) {
    const branch = this.branches.get(branchId);

    if (!branch) {
      console.warn(`分支未定义: ${branchId}`);
      return { success: false, message: '未找到该分支。' };
    }

    // 检查是否可用
    if (!this.isBranchAvailable(branchId)) {
      return {
        success: false,
        message: branch.lockedMessage || '当前无法进行这个选择。',
        reason: 'locked',
      };
    }

    // 检查是否已经完成
    if (this.gameState.isBranchComplete(branchId)) {
      return {
        success: false,
        message: '这个选择已经完成。',
        reason: 'completed',
      };
    }

    // 设置活跃分支
    this.activeBranch = branchId;

    // 返回分支选择数据
    const choices = this.getBranchChoices(branchId);

    return {
      success: true,
      branchId,
      title: branch.title,
      description: branch.description,
      choices: choices,
      isFinal: branch.isFinal || false,
    };
  }

  /**
   * 获取分支的可用选项
   */
  getBranchChoices(branchId) {
    const branch = this.branches.get(branchId);
    if (!branch || !branch.choices) return [];

    return branch.choices.filter(choice => {
      // 检查选项条件
      if (choice.conditions) {
        return this.checkConditions(choice.conditions);
      }
      return true;
    }).map(choice => ({
      id: choice.id,
      text: choice.text,
      description: choice.description,
      effects: choice.effects,
    }));
  }

  /**
   * 进行分支选择
   */
  makeChoice(branchId, choiceId) {
    const branch = this.branches.get(branchId);
    if (!branch) {
      return { success: false, message: '分支不存在。' };
    }

    // 验证选择
    const choice = branch.choices?.find(c => c.id === choiceId);
    if (!choice) {
      return { success: false, message: '无效的选择。' };
    }

    // 检查选择条件
    if (choice.conditions && !this.checkConditions(choice.conditions)) {
      return {
        success: false,
        message: '当前无法进行这个选择。',
        reason: 'conditions_not_met',
      };
    }

    // 记录选择
    this.gameState.recordBranchChoice(branchId, choiceId, {
      choiceText: choice.text,
    });

    // 应用选择效果
    const effects = this.applyChoiceEffects(choice);

    // 检查是否是最终选择
    if (branch.isFinal || choice.isFinal) {
      this.gameState.completeBranch(branchId);
    }

    // 清空活跃分支
    this.activeBranch = null;

    // 触发分支完成事件
    this.eventSystem.emit('branch:choiceMade', {
      branchId,
      choiceId,
      choice: choice,
      effects: effects,
    });

    return {
      success: true,
      message: choice.resultMessage || effects.message || '选择已确认。',
      effects: effects,
      isFinal: branch.isFinal || choice.isFinal,
    };
  }

  /**
   * 应用选择效果
   */
  applyChoiceEffects(choice) {
    const effects = {
      flags: [],
      statusChanges: [],
      items: [],
      clues: [],
      quests: [],
      events: [],
      narrative: [],
    };

    // 应用标志设置
    if (choice.setFlags) {
      Object.entries(choice.setFlags).forEach(([flag, value]) => {
        this.gameState.set(`world.flags.${flag}`, value);
        effects.flags.push({ flag, value });
      });
    }

    // 应用状态变化
    if (choice.statusChanges) {
      Object.entries(choice.statusChanges).forEach(([status, delta]) => {
        this.gameState.modifyStatus(status, delta);
        effects.statusChanges.push({ status, delta });
      });
    }

    // 添加道具
    if (choice.addItems) {
      choice.addItems.forEach(itemId => {
        this.gameState.addItem(itemId);
        effects.items.push(itemId);
      });
    }

    // 添加线索
    if (choice.addClues) {
      choice.addClues.forEach(clueId => {
        this.gameState.addClue(clueId);
        effects.clues.push(clueId);
      });
    }

    // 激活任务
    if (choice.activateQuest) {
      this.gameState.activateQuest(choice.activateQuest);
      effects.quests.push({ type: 'activate', id: choice.activateQuest });
    }

    // 完成任务
    if (choice.completeQuest) {
      this.gameState.completeQuest(choice.completeQuest);
      effects.quests.push({ type: 'complete', id: choice.completeQuest });
    }

    // 触发事件
    if (choice.triggerEvent) {
      this.eventSystem.emit('event:trigger', { eventId: choice.triggerEvent });
      effects.events.push(choice.triggerEvent);
    }

    // 记录决策（如果有）
    if (choice.decisionId) {
      this.gameState.recordDecision(choice.decisionId, choiceId, effects);
    }

    // 记录重要信息到记忆
    if (choice.remember) {
      Object.entries(choice.remember).forEach(([key, value]) => {
        this.gameState.remember(key, value);
      });
    }

    // 返回叙事文本
    if (choice.narrative) {
      effects.message = choice.narrative;
    }

    return effects;
  }

  // ========== 多结局系统 ==========

  /**
   * 检查结局条件
   */
  checkEndingConditions(endingId) {
    const ending = this.getEnding(endingId);
    if (!ending) return false;

    return this.checkConditions(ending.conditions);
  }

  /**
   * 获取可用的结局
   */
  getAvailableEndings() {
    const available = [];

    this.branches.forEach((branch, id) => {
      if (branch.isEnding && this.isBranchAvailable(id)) {
        // 检查结局条件
        if (this.checkEndingConditions(id)) {
          available.push({
            id,
            ...branch,
          });
        }
      }
    });

    return available;
  }

  /**
   * 触发结局
   */
  triggerEnding(endingId) {
    const ending = this.getBranch(endingId);

    if (!ending || !ending.isEnding) {
      return { success: false, message: '这不是一个有效的结局。' };
    }

    // 检查结局条件
    if (!this.checkEndingConditions(endingId)) {
      return {
        success: false,
        message: ending.lockedMessage || '当前无法达成这个结局。',
        reason: 'conditions_not_met',
      };
    }

    // 记录结局
    this.gameState.recordDecision('ending', endingId);

    // 应用结局效果
    if (ending.effects) {
      this.applyChoiceEffects(ending.effects);
    }

    // 触发游戏结束
    this.eventSystem.emit('game:ending', {
      endingId,
      title: ending.title,
      description: ending.description,
      type: ending.type || 'normal',
    });

    return {
      success: true,
      endingId,
      title: ending.title,
      description: ending.description,
      type: ending.type || 'normal',
    };
  }

  /**
   * 获取分支定义中的结局数据
   */
  getEnding(endingId) {
    const branch = this.branches.get(endingId);
    if (branch && branch.isEnding) {
      return branch;
    }
    return null;
  }

  // ========== 分支状态查询 ==========

  /**
   * 获取分支当前状态
   */
  getBranchState(branchId) {
    const branch = this.branches.get(branchId);
    if (!branch) return null;

    const choices = this.gameState.getBranchChoices(branchId);
    const latestChoice = this.gameState.getLatestChoice(branchId);
    const isComplete = this.gameState.isBranchComplete(branchId);

    return {
      branchId,
      isAvailable: this.isBranchAvailable(branchId),
      choicesMade: choices.length,
      latestChoice: latestChoice,
      isComplete: isComplete,
    };
  }

  /**
   * 获取所有分支状态
   */
  getAllBranchStates() {
    const states = [];

    this.branches.forEach((branch, id) => {
      states.push(this.getBranchState(id));
    });

    return states;
  }

  /**
   * 获取可用的分支
   */
  getAvailableBranches(sceneId = null) {
    const available = [];

    this.branches.forEach((branch, id) => {
      if (branch.isEnding) return; // 排除结局
      if (sceneId && branch.sceneId !== sceneId) return;
      if (this.isBranchAvailable(id) && !this.gameState.isBranchComplete(id)) {
        available.push({
          id,
          title: branch.title,
          description: branch.description,
        });
      }
    });

    return available;
  }

  // ========== 辅助方法 ==========

  /**
   * 获取分支选择的后果预览
   */
  previewChoiceEffects(branchId, choiceId) {
    const branch = this.branches.get(branchId);
    if (!branch) return null;

    const choice = branch.choices?.find(c => c.id === choiceId);
    if (!choice) return null;

    const preview = {
      flags: [],
      status: [],
      items: [],
      clues: [],
    };

    if (choice.setFlags) {
      Object.entries(choice.setFlags).forEach(([flag, value]) => {
        preview.flags.push(`${flag}: ${value}`);
      });
    }

    if (choice.statusChanges) {
      Object.entries(choice.statusChanges).forEach(([status, delta]) => {
        const sign = delta > 0 ? '+' : '';
        preview.status.push(`${status}: ${sign}${delta}`);
      });
    }

    if (choice.addItems) {
      preview.items.push(...choice.addItems);
    }

    if (choice.addClues) {
      preview.clues.push(...choice.addClues);
    }

    return preview;
  }

  /**
   * 检查是否做过特定选择序列
   */
  hasChoiceSequence(branchId, choiceIds) {
    const choices = this.gameState.getBranchChoices(branchId);
    const madeIds = choices.map(c => c.choiceId);

    return choiceIds.every(id => madeIds.includes(id));
  }
}
