/**
 * 游戏引擎
 * 核心游戏逻辑控制器
 */

import { GameState } from './GameState.js';
import { SceneManager } from './SceneManager.js';
import { InteractionSystem } from './InteractionSystem.js';
import chapter1Data from '../data/chapter1.js';

export class GameEngine {
  constructor(eventSystem) {
    this.eventSystem = eventSystem;
    this.state = null;
    this.sceneManager = null;
    this.interactionSystem = null;
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
    
    // 绑定事件监听
    this.bindEvents();
    
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
    
    activeQuests.forEach(questId => {
      const quest = this.currentChapter?.quests?.find(q => q.id === questId);
      if (!quest || !quest.steps) return;
      
      quest.steps.forEach(step => {
        if (step.trigger && !step.completed) {
          // 检查是否匹配触发条件
          const [type, id] = step.trigger.split(':');
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
    if (!quest) return;
    
    // 完成任务
    this.state.completeQuest(questId);
    
    // 发放奖励
    if (quest.rewards) {
      if (quest.rewards.items) {
        quest.rewards.items.forEach(itemId => {
          this.state.addItem(itemId);
        });
      }
    }
    
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
    
    // 根据状态和阈值生成反馈
    const feedback = this.generateThresholdFeedback(data);
    if (feedback) {
      this.eventSystem.emit('feedback:show', { message: feedback, type: 'status' });
    }
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
}
