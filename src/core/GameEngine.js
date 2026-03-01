/**
 * 游戏引擎
 * 核心游戏逻辑控制器
 */

import { GameState } from './GameState.js';
import { SceneManager } from './SceneManager.js';
import { InteractionSystem } from './InteractionSystem.js';
import { DynamicNarrativeSystem } from './DynamicNarrativeSystem.js';
import { PuzzleSystem } from './PuzzleSystem.js';
import { BranchSystem } from './BranchSystem.js';
import chapter1Data from '../data/chapter1.js';

export class GameEngine {
  constructor(eventSystem) {
    this.eventSystem = eventSystem;
    this.state = null;
    this.sceneManager = null;
    this.interactionSystem = null;
    this.narrativeSystem = null;
    this.puzzleSystem = null;
    this.branchSystem = null;
    this.currentChapter = null;
  }

  /**
   * 初始化引擎
   */
  async init() {
    console.log('初始化游戏引擎...');

    // 初始化状态管理器
    this.state = new GameState(this.eventSystem);
    this.state.init();

    // 初始化场景管理器
    this.sceneManager = new SceneManager(this.state, this.eventSystem);

    // 初始化交互系统
    this.interactionSystem = new InteractionSystem(this.state, this.eventSystem, this);

    // 初始化动态叙事系统
    this.narrativeSystem = new DynamicNarrativeSystem(this.state, this.eventSystem);

    // 初始化谜题系统
    this.puzzleSystem = new PuzzleSystem(this.state, this.eventSystem);

    // 初始化分支系统
    this.branchSystem = new BranchSystem(this.state, this.eventSystem);

    // 绑定事件监听
    this.bindEvents();

    // 绑定新系统事件
    this.bindNewSystemEvents();

    console.log('✅ 游戏引擎初始化完成');
  }

  /**
   * 绑定事件监听
   */
  bindEvents() {
    // 监听状态阈值事件
    this.eventSystem.on('status:threshold', (data) => {
      this.handleStatusThreshold(data);
    });
    
    // 监听位置变化
    this.eventSystem.on('location:changed', (data) => {
      this.handleLocationChange(data);
    });
    
    // 监听事件触发
    this.eventSystem.on('event:trigger', (data) => {
      this.handleEventTrigger(data);
      this.checkQuestProgress('event', data.eventId);
    });
    
    // 监听添加初始道具
    this.eventSystem.on('inventory:add_initial', () => {
      this.addInitialItems();
    });
    
    // 监听场景进入（任务检查）
    this.eventSystem.on('scene:entered', (data) => {
      this.checkQuestProgress('location', data.sceneId);
    });
    
    // 监听线索发现（任务检查）
    this.eventSystem.on('clue:discovered', (data) => {
      this.checkQuestProgress('clue', data.clueId);
    });
    
    // 监听交互完成（任务检查）
    this.eventSystem.on('interaction:completed', (data) => {
      this.checkQuestProgress('interaction', data.elementId);
    });
  }

  /**
   * 添加初始道具
   */
  addInitialItems() {
    const initialItems = ['item_level', 'item_notebook', 'item_keychain', 'item_tape_measure'];
    initialItems.forEach(itemId => {
      this.state.addItem(itemId);
    });
  }

  /**
   * 处理事件触发
   */
  handleEventTrigger(data) {
    const eventId = data.eventId;
    
    // 从当前章节数据查找事件
    const event = this.currentChapter?.events?.[eventId];
    if (!event) {
      console.warn(`事件未找到: ${eventId}`);
      return;
    }

    // 检查是否一次性事件
    if (event.once) {
      const triggered = this.state.get(`world.triggeredEvents`) || [];
      if (triggered.includes(eventId)) {
        return; // 已触发过
      }
      triggered.push(eventId);
      this.state.set('world.triggeredEvents', triggered, true);
    }

    // 应用事件效果
    if (event.effects) {
      Object.entries(event.effects).forEach(([status, delta]) => {
        this.state.modifyStatus(status, delta);
      });
    }

    // 添加线索
    if (event.clueId) {
      this.state.addClue(event.clueId);
    }

    // 显示事件描述
    if (event.description) {
      this.eventSystem.emit('feedback:show', {
        message: event.description,
        type: event.type === 'supernatural' ? 'danger' : 'info',
      });
    }

    console.log(`事件触发: ${event.name}`);
  }

  /**
   * 检查任务进度
   */
  checkQuestProgress(triggerType, triggerId) {
    const activeQuests = this.state.get('quests.active') || [];
    const completedQuests = this.state.get('quests.completed') || [];
    console.log(`checkQuestProgress: type=${triggerType}, id=${triggerId}, active=${activeQuests}, completed=${completedQuests}`);

    activeQuests.forEach(questId => {
      const quest = this.currentChapter?.quests?.find(q => q.id === questId);
      if (!quest || !quest.steps) return;

      quest.steps.forEach(step => {
        if (step.trigger && !step.completed) {
          // 检查是否匹配触发条件
          const [type, id] = step.trigger.split(':');
          console.log(`检查步骤: ${step.id}, trigger=${step.trigger}, type=${type}, id=${id}, 匹配=${type === triggerType && id === triggerId}`);
          if (type === triggerType && id === triggerId) {
            // 更新任务进度
            this.state.updateQuestProgress(questId, step.id);
            step.completed = true;
            
            // 显示进度提示
            this.eventSystem.emit('feedback:show', {
              message: `任务进度: ${step.description}`,
              type: 'quest',
            });
            
            // 检查是否完成所有步骤
            const completedCount = quest.steps.filter(s => s.completed).length;
            if (completedCount >= quest.steps.length) {
              this.completeQuest(questId);
            }
          }
        }
      });
    });
  }

  /**
   * 完成任务
   * @param {string} questId - 任务ID
   */
  completeQuest(questId) {
    const quest = this.currentChapter?.quests?.find(q => q.id === questId);
    if (!quest) {
      console.log(`completeQuest: 任务未找到 ${questId}`);
      return;
    }

    console.log(`completeQuest: 完成任务 ${questId}`);
    // 完成任务
    this.state.completeQuest(questId);
    console.log(`completeQuest: 完成后 quests.completed = ${this.state.get('quests.completed')}`);

    // 发放奖励
    if (quest.rewards) {
      if (quest.rewards.items) {
        quest.rewards.items.forEach(itemId => {
          this.state.addItem(itemId);
        });
      }
    }

    // 触发任务完成事件（用于刷新UI）
    this.eventSystem.emit('quest:completed', { questId });

    // 激活下一个主线任务
    if (quest.type === 'main') {
      this.activateNextQuest(quest);
    }
  }

  /**
   * 激活下一个任务
   */
  activateNextQuest(completedQuest) {
    if (!this.currentChapter?.quests) return;
    
    // 按顺序查找下一个主线任务
    const mainQuests = this.currentChapter.quests.filter(q => q.type === 'main');
    const currentIndex = mainQuests.findIndex(q => q.id === completedQuest.id);
    
    if (currentIndex >= 0 && currentIndex < mainQuests.length - 1) {
      const nextQuest = mainQuests[currentIndex + 1];
      // 检查是否已激活或已完成
      const active = this.state.get('quests.active') || [];
      const completed = this.state.get('quests.completed') || [];
      
      if (!active.includes(nextQuest.id) && !completed.includes(nextQuest.id)) {
        this.state.activateQuest(nextQuest.id);
      }
    }
  }

  /**
   * 开始章节
   * @param {number} chapterNumber - 章节号
   */
  startChapter(chapterNumber) {
    console.log(`开始第 ${chapterNumber} 章`);

    // 加载章节数据
    switch (chapterNumber) {
      case 1:
        this.currentChapter = chapter1Data;
        break;
      default:
        console.error(`未知的章节: ${chapterNumber}`);
        return;
    }

    // 设置章节数据
    this.sceneManager.setChapterData(this.currentChapter);

    // 注册章节谜题机关
    this.registerChapterPuzzles();

    // 注册章节分支
    this.registerChapterBranches();

    // 激活初始任务
    this.activateInitialQuests();

    // 设置初始位置
    const startLocation = this.currentChapter.startLocation || 'gate';
    this.state.moveTo(startLocation);

    // 触发章节开始事件
    this.eventSystem.emit('chapter:started', {
      chapter: chapterNumber,
      location: startLocation,
    });
  }

  /**
   * 激活初始任务
   */
  activateInitialQuests() {
    if (!this.currentChapter?.quests) return;
    
    // 激活第一个主线任务
    const initialQuest = this.currentChapter.quests.find(q => q.id === 'quest_preparation');
    if (initialQuest) {
      const active = this.state.get('quests.active') || [];
      const completed = this.state.get('quests.completed') || [];
      
      // 只有未激活且未完成时才激活
      if (!active.includes(initialQuest.id) && !completed.includes(initialQuest.id)) {
        this.state.activateQuest(initialQuest.id);
        console.log(`任务已激活: ${initialQuest.name}`);
      }
    }
  }

  /**
   * 处理状态阈值事件
   */
  handleStatusThreshold(data) {
    console.log(`状态阈值事件: ${data.status} ${data.type} ${data.threshold}`);

    // 处理重度失温导致的游戏结束
    if (data.status === 'temperature' && data.threshold === 28 && data.type === 'below') {
      this.triggerGameOver('frozen_death');
      return;
    }

    // 根据状态和阈值生成反馈
    const feedback = this.generateThresholdFeedback(data);
    if (feedback) {
      this.eventSystem.emit('feedback:show', { message: feedback, type: 'status' });
    }
  }

  /**
   * 触发游戏结束
   * @param {string} endingId - 结局ID
   */
  triggerGameOver(endingId) {
    console.log(`游戏结束: ${endingId}`);

    // 显示游戏结束界面
    this.eventSystem.emit('game:over', {
      endingId: endingId,
      title: '冻死',
      description: '刺骨的寒意终于战胜了你的意志。在失去意识前，你仿佛看到了那座道观中闪烁着诡异的火光...',
      hint: '在寒冷的天气中，请务必注意保暖，及时寻找温暖的环境。'
    });
  }

  /**
   * 生成状态阈值反馈文本
   */
  generateThresholdFeedback(data) {
    const feedbacks = {
      sanity: {
        70: {
          above: '你的思维恢复清晰，能够冷静分析眼前的情况。',
          below: '你感到思维不再如之前清晰，隐隐的不安在心头蔓延。',
        },
        40: {
          below: '幻觉开始出现。眼角余光看到阴影移动，风声像是低语。',
        },
        20: {
          below: '现实开始扭曲。时间忽快忽慢，空间伸缩变形。难以区分真实与想象。',
        },
        10: {
          below: '你处于理智崩溃的边缘。世界失去了真实感。',
        },
      },
      stamina: {
        30: {
          below: '你感到体力不支，行动变得迟缓。',
        },
        10: {
          below: '极度疲惫袭来，你几乎站立不稳。',
        },
      },
      temperature: {
        35: {
          below: '你开始发抖，手指麻木。轻度失温让你感到寒冷刺骨。',
        },
        32: {
          below: '剧烈颤抖无法控制。思维迟钝，说话困难。中度失温影响了你的行动。',
        },
        28: {
          below: '颤抖停止了——这是危险信号。意识模糊，产生温暖幻觉。你的生命受到威胁！',
        },
      },
    };

    const statusFeedback = feedbacks[data.status];
    if (statusFeedback && statusFeedback[data.threshold]) {
      return statusFeedback[data.threshold][data.type];
    }
    return null;
  }

  /**
   * 处理位置变化
   */
  handleLocationChange(data) {
    console.log(`位置变化: ${data.from} -> ${data.to}`);

    // 场景管理器加载新场景
    const sceneData = this.sceneManager.loadScene(data.to);

    // 添加中文名称到事件数据中
    data.toName = sceneData?.name || data.to;

    // 触发场景显示事件
    this.eventSystem.emit('scene:updated', sceneData);

    // 触发场景切换事件（用于清理对话历史等）
    this.eventSystem.emit('scene:changed', {
      scene: sceneData,
      from: data.from,
      to: data.to
    });
  }

  /**
   * 处理交互
   * @param {string} elementId - 交互元素ID
   * @param {string} action - 交互动作
   */
  handleInteraction(elementId, action) {
    return this.interactionSystem.handle(elementId, action);
  }

  /**
   * 保存游戏
   */
  saveGame() {
    return this.state.saveToStorage();
  }

  /**
   * 加载游戏
   */
  loadGame() {
    return this.state.loadFromStorage();
  }

  /**
   * 获取当前场景数据
   */
  getCurrentScene() {
    const locationId = this.state.get('player.location');
    return this.sceneManager.loadScene(locationId);
  }

  /**
   * 获取玩家状态
   */
  getPlayerStatus() {
    return this.state.get('status');
  }

  /**
   * 获取背包道具
   */
  getInventory() {
    const itemIds = this.state.get('player.inventory');
    return itemIds.map(id => this.getItemData(id)).filter(Boolean);
  }

  /**
   * 获取道具数据
   */
  getItemData(itemId) {
    if (!this.currentChapter || !this.currentChapter.items) return null;
    return this.currentChapter.items[itemId];
  }

  /**
   * 获取线索列表
   */
  getClues() {
    const clueIds = this.state.get('player.clues');
    return clueIds.map(id => this.getClueData(id)).filter(Boolean);
  }

  /**
   * 获取线索数据
   */
  getClueData(clueId) {
    if (!this.currentChapter || !this.currentChapter.clues) return null;
    return this.currentChapter.clues[clueId];
  }

  // ========== 道具系统方法 ==========

  /**
   * 使用道具
   * @param {string} itemId - 道具ID
   * @returns {Object} 使用结果
   */
  useItem(itemId) {
    // 检查道具是否存在
    const item = this.getItemData(itemId);
    if (!item) {
      return { success: false, message: '道具不存在' };
    }

    // 检查是否可使用
    if (!item.usable) {
      return { success: false, message: '此道具无法使用' };
    }

    // 检查使用条件
    const canUse = this.checkItemUseCondition(item);
    if (!canUse.success) {
      return canUse;
    }

    // 应用效果
    if (item.effects) {
      const effects = item.effects;
      let message = '';

      if (effects.stamina) {
        this.state.modifyStatus('stamina', effects.stamina);
        message += effects.stamina > 0 ? `体力+${effects.stamina}，` : `体力${effects.stamina}，`;
      }
      if (effects.sanity) {
        this.state.modifyStatus('sanity', effects.sanity);
        message += effects.sanity > 0 ? `理智+${effects.sanity}，` : `理智${effects.sanity}，`;
      }
      if (effects.temperature) {
        this.state.modifyStatus('temperature', effects.temperature);
        message += effects.temperature > 0 ? `体温+${effects.temperature}°C，` : `体温${effects.temperature}°C，`;
      }
      if (effects.intuition) {
        this.state.modifyStatus('intuition', effects.intuition);
        message += `直觉+${effects.intuition}，`;
      }

      // 移除消耗品
      if (item.type === 'consumable') {
        this.state.removeItem(itemId);
      }

      return {
        success: true,
        message: message.slice(0, -1) || `使用了 ${item.name}`,
        effects: effects,
      };
    }

    return { success: true, message: `使用了 ${item.name}` };
  }

  /**
   * 检查道具使用条件
   * @param {Object} item - 道具数据
   * @returns {Object} 检查结果
   */
  checkItemUseCondition(item) {
    // 检查体力条件
    if (item.requiredStamina && item.requiredStamina.min) {
      const stamina = this.state.get('status.stamina.current');
      if (stamina < item.requiredStamina.min) {
        return { success: false, message: `体力不足，需要至少${item.requiredStamina.min}点体力` };
      }
    }

    // 检查理智条件
    if (item.requiredSanity && item.requiredSanity.min) {
      const sanity = this.state.get('status.sanity.current');
      if (sanity < item.requiredSanity.min) {
        return { success: false, message: `理智不足，需要至少${item.requiredSanity.min}点理智` };
      }
    }

    // 检查体温条件
    if (item.requiredTemperature && item.requiredTemperature.min) {
      const temperature = this.state.get('status.temperature.current');
      if (temperature < item.requiredTemperature.min) {
        return { success: false, message: `体温过低，无法使用此道具` };
      }
    }

    return { success: true };
  }

  /**
   * 组合道具
   * @param {string} itemId1 - 道具1 ID
   * @param {string} itemId2 - 道具2 ID
   * @returns {Object} 组合结果
   */
  combineItems(itemId1, itemId2) {
    // 检查两个道具是否都在背包中
    const inventory = this.state.getInventoryIds();
    if (!inventory.includes(itemId1) || !inventory.includes(itemId2)) {
      return { success: false, message: '背包中缺少必要的道具' };
    }

    // 查找组合配方
    const recipes = this.getItemRecipes();
    const recipe = recipes.find(r =>
      r.ingredients.includes(itemId1) && r.ingredients.includes(itemId2)
    );

    if (!recipe) {
      return { success: false, message: '这两个道具无法组合' };
    }

    // 移除原道具
    this.state.removeItem(itemId1);
    this.state.removeItem(itemId2);

    // 添加新道具
    this.state.addItem(recipe.resultId);

    return {
      success: true,
      message: `组合成功: ${recipe.resultName}`,
      resultId: recipe.resultId,
      resultName: recipe.resultName,
    };
  }

  /**
   * 获取道具组合配方
   * @returns {Array} 配方数组
   */
  getItemRecipes() {
    // 可以从章节数据或单独的配置中读取配方
    // 这里使用简单的示例配方
    const recipes = [
      // 示例：安眠药 + 某种道具 = 强化安眠药（暂时为空）
    ];

    // 如果章节数据中有配方，也添加进去
    if (this.currentChapter && this.currentChapter.itemRecipes) {
      return [...this.currentChapter.itemRecipes, ...recipes];
    }

    return recipes;
  }

  /**
   * 丢弃道具
   * @param {string} itemId - 道具ID
   * @returns {Object} 丢弃结果
   */
  discardItem(itemId) {
    // 检查道具是否存在
    const item = this.getItemData(itemId);
    if (!item) {
      return { success: false, message: '道具不存在' };
    }

    // 检查是否可丢弃
    if (item.cannotDiscard) {
      return { success: false, message: '此道具无法丢弃' };
    }

    // 移除道具
    this.state.removeItem(itemId);

    return {
      success: true,
      message: `已丢弃 ${item.name}`,
    };
  }

  // ========== 场景切换任务依赖检查 ==========

  /**
   * 检查是否可以移动到目标位置
   * @param {string} targetLocation - 目标位置ID
   * @returns {Object} 检查结果
   */
  canMoveTo(targetLocation) {
    // 获取当前场景数据
    const currentLocation = this.state.get('player.location');
    const currentScene = this.sceneManager.loadScene(currentLocation);

    // 查找对应的出口
    const exit = currentScene?.exits?.find(e => e.target === targetLocation);
    if (!exit) {
      return { success: false, reason: 'no_exit', message: '无法前往该位置' };
    }

    // 检查是否锁定
    if (exit.locked) {
      return { success: false, reason: 'locked', message: exit.lockReason || '道路被封锁' };
    }

    // 检查任务依赖
    if (exit.requiredQuest) {
      const questCompleted = this.state.isQuestCompleted(exit.requiredQuest);
      if (!questCompleted) {
        const quest = this.getQuestData(exit.requiredQuest);
        const questName = quest ? quest.name : exit.requiredQuest;
        return {
          success: false,
          reason: 'quest_required',
          message: `需要完成任务「${questName}」才能前往`,
          requiredQuest: exit.requiredQuest,
        };
      }
    }

    // 检查是否需要道具
    if (exit.requiredItem) {
      const hasItem = this.state.hasItem(exit.requiredItem);
      if (!hasItem) {
        const item = this.getItemData(exit.requiredItem);
        const itemName = item ? item.name : exit.requiredItem;
        return {
          success: false,
          reason: 'item_required',
          message: `需要道具「${itemName}」才能前往`,
          requiredItem: exit.requiredItem,
        };
      }
    }

    return { success: true };
  }

  /**
   * 获取任务数据
   * @param {string} questId - 任务ID
   * @returns {Object|null}
   */
  getQuestData(questId) {
    if (!this.currentChapter || !this.currentChapter.quests) return null;
    return this.currentChapter.quests.find(q => q.id === questId);
  }

  // ========== 新系统集成方法 ==========

  /**
   * 绑定新系统事件
   */
  bindNewSystemEvents() {
    // 监听谜题解决事件
    this.eventSystem.on('puzzle:solved', (data) => {
      const puzzle = this.puzzleSystem.getPuzzle(data.puzzleId);
      if (puzzle && puzzle.effects) {
        this.applyPuzzleEffects(puzzle);
      }
    });

    // 监听分支选择事件
    this.eventSystem.on('branch:choiceMade', (data) => {
      console.log(`分支选择: ${data.branchId} -> ${data.choiceId}`);
    });

    // 监听游戏结束事件
    this.eventSystem.on('game:ending', (data) => {
      this.handleGameEnding(data);
    });
  }

  /**
   * 应用谜题效果
   */
  applyPuzzleEffects(puzzle) {
    const effects = puzzle.effects;

    // 添加道具
    if (effects.addItem) {
      this.state.addItem(effects.addItem);
      const itemData = this.getItemData(effects.addItem);
      const itemName = itemData?.name || effects.addItem;
      this.eventSystem.emit('item:acquired', { itemId: effects.addItem, itemName });
    }

    // 添加线索
    if (effects.addClue) {
      this.state.addClue(effects.addClue);
      const clueData = this.getClueData(effects.addClue);
      const clueName = clueData?.name || effects.addClue;
      this.eventSystem.emit('clue:discovered', { clueId: effects.addClue, clueName });
    }

    // 设置标志
    if (effects.setFlag) {
      this.state.set(`world.flags.${effects.setFlag}`, true);
    }

    // 激活任务
    if (effects.activateQuest) {
      this.state.activateQuest(effects.activateQuest);
    }

    // 触发事件
    if (effects.triggerEvent) {
      this.eventSystem.emit('event:trigger', { eventId: effects.triggerEvent });
    }

    // 应用状态变化
    if (effects.statusChanges) {
      Object.entries(effects.statusChanges).forEach(([status, delta]) => {
        this.state.modifyStatus(status, delta);
      });
    }
  }

  /**
   * 处理游戏结束
   */
  handleGameEnding(data) {
    console.log(`游戏结局: ${data.endingId} - ${data.title}`);

    // 显示结局界面
    this.eventSystem.emit('game:over', {
      endingId: data.endingId,
      title: data.title,
      description: data.description,
      type: data.type,
    });
  }

  // ========== 动态叙事方法 ==========

  /**
   * 获取动态场景描述
   */
  getDynamicSceneDescription(sceneData) {
    if (!this.narrativeSystem) return sceneData.description;
    return this.narrativeSystem.getSceneDescription(sceneData);
  }

  /**
   * 改变天气
   */
  changeWeather(weatherType) {
    if (!this.narrativeSystem) return { success: false };
    return this.narrativeSystem.changeWeather(weatherType);
  }

  /**
   * 获取当前天气
   */
  getCurrentWeather() {
    if (!this.narrativeSystem) return null;
    return this.narrativeSystem.getCurrentWeather();
  }

  /**
   * 记录决策
   */
  recordDecision(decisionId, choice, effects = {}) {
    return this.narrativeSystem.recordDecision({ id: decisionId, choice, effects });
  }

  // ========== 谜题机关方法 ==========

  /**
   * 注册章节谜题
   */
  registerChapterPuzzles() {
    if (!this.currentChapter || !this.currentChapter.puzzles) return;

    this.puzzleSystem.registerPuzzles(this.currentChapter.puzzles);
    console.log(`已注册 ${this.currentChapter.puzzles.length} 个谜题机关`);
  }

  /**
   * 尝试解决谜题
   */
  trySolvePuzzle(puzzleId, attempt) {
    const result = this.puzzleSystem.tryUnlock(puzzleId, attempt);

    if (result.success && result.effects) {
      this.applyPuzzleEffects(result);
    }

    return result;
  }

  /**
   * 获取谜题提示
   */
  getPuzzleHint(puzzleId) {
    return this.puzzleSystem.getPuzzleHint(puzzleId);
  }

  /**
   * 检查机关是否可交互
   */
  isMechanismAvailable(puzzleId) {
    return this.puzzleSystem.isPuzzleAvailable(puzzleId);
  }

  // ========== 分支系统方法 ==========

  /**
   * 注册章节分支
   */
  registerChapterBranches() {
    if (!this.currentChapter || !this.currentChapter.branches) return;

    this.branchSystem.registerBranches(this.currentChapter.branches);
    console.log(`已注册 ${this.currentChapter.branches.length} 个剧情分支`);
  }

  /**
   * 触发分支选择点
   */
  triggerBranch(branchId) {
    return this.branchSystem.triggerBranchPoint(branchId);
  }

  /**
   * 进行分支选择
   */
  makeBranchChoice(branchId, choiceId) {
    return this.branchSystem.makeChoice(branchId, choiceId);
  }

  /**
   * 获取可用分支
   */
  getAvailableBranches(sceneId = null) {
    return this.branchSystem.getAvailableBranches(sceneId);
  }

  /**
   * 检查结局条件
   */
  checkEnding(endingId) {
    return this.branchSystem.checkEndingConditions(endingId);
  }

  /**
   * 触发结局
   */
  triggerEnding(endingId) {
    return this.branchSystem.triggerEnding(endingId);
  }

  /**
   * 获取所有可用的结局
   */
  getAvailableEndings() {
    return this.branchSystem.getAvailableEndings();
  }

  // ========== 记忆系统方法 ==========

  /**
   * 记录重要信息
   */
  remember(key, value) {
    return this.state.remember(key, value);
  }

  /**
   * 回忆信息
   */
  recall(key) {
    return this.state.recall(key);
  }

  /**
   * 检查是否记得
   */
  remembers(key) {
    return this.state.remembers(key);
  }
}
