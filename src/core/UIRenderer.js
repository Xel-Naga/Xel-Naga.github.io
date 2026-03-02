/**
 * UI渲染器
 * 处理界面渲染和用户交互
 */

import { InteractionModal } from '../components/InteractionModal.js';
import { QuestPanel } from '../components/QuestPanel.js';
import { DialogueModal } from '../components/DialogueModal.js';
import { InventoryModal } from '../components/InventoryModal.js';
import { DecisionModal } from '../components/DecisionModal.js';
import { ItemSelectorModal } from '../components/ItemSelectorModal.js';
import { ConfirmModal } from '../components/ConfirmModal.js';

export class UIRenderer {
  constructor(engine, eventSystem) {
    this.engine = engine;
    this.eventSystem = eventSystem;
    this.elements = {};
    this.currentScene = null;
    this.interactionModal = null;
    this.questPanel = null;
    this.inventoryModal = null;
  }

  /**
   * 初始化UI
   */
  init() {
    console.log('初始化UI渲染器...');
    
    // 缓存DOM元素引用
    this.cacheElements();
    
    // 初始化子组件
    this.interactionModal = new InteractionModal(this.eventSystem, this.engine);
    this.questPanel = new QuestPanel(this.eventSystem, this.engine);
    this.dialogueModal = new DialogueModal(this.eventSystem, this.engine);
    this.inventoryModal = new InventoryModal(this.eventSystem, this.engine);
    this.decisionModal = new DecisionModal(this.eventSystem, this);
    this.itemSelectorModal = new ItemSelectorModal(this.eventSystem, this.engine);
    this.confirmModal = new ConfirmModal();
    
    // 绑定UI事件
    this.bindEvents();
    
    // 绑定游戏事件
    this.bindGameEvents();
    
    // 初始化状态显示
    this.updateStatusPanel();
    this.updateEnvironmentInfo();
    
    console.log('✅ UI渲染器初始化完成');
  }

  /**
   * 缓存DOM元素
   */
  cacheElements() {
    this.elements = {
      // 场景相关
      currentLocation: document.getElementById('current-location'),
      sceneDescription: document.getElementById('scene-description'),

      // 反馈区域
      feedbackLog: document.getElementById('feedback-log'),

      // 用户信息面板 - 状态显示
      staminaValue: document.getElementById('stamina-value'),
      sanityValue: document.getElementById('sanity-value'),
      temperatureValue: document.getElementById('temperature-value'),

      // 动作按钮
      actionButtons: document.querySelectorAll('.action-btn'),
      
      // 模态框
      modalContainer: document.getElementById('modal-container'),
    };
  }

  /**
   * 绑定UI事件
   */
  bindEvents() {
    // 动作按钮
    this.elements.actionButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        this.handleActionButton(action);
      });
    });

    // 场景描述点击事件（委托）
    if (this.elements.sceneDescription) {
      console.log('UIRenderer: 绑定场景描述点击事件');
      this.elements.sceneDescription.addEventListener('click', (e) => {
        console.log('场景描述被点击', e.target);
        const target = e.target.closest('.highlight');
        if (target) {
          console.log('点击了高亮元素:', target.dataset.id, target.dataset.type);
          const elementId = target.dataset.id;
          const action = target.dataset.type;
          this.handleHighlightClick(elementId, action, target);
        } else {
          console.log('点击的不是高亮元素');
        }
      });
    } else {
      console.warn('UIRenderer: 未找到场景描述元素');
    }
  }

  /**
   * 绑定游戏事件
   */
  bindGameEvents() {
    // 场景更新
    this.eventSystem.on('scene:updated', (sceneData) => {
      this.renderScene(sceneData);
    });

    // 状态变化
    this.eventSystem.on('state:changed', (changes) => {
      if (changes['status.stamina.current'] || 
          changes['status.sanity.current'] || 
          changes['status.temperature.current']) {
        this.updateStatusPanel();
      }
    });

    // 反馈显示
    this.eventSystem.on('feedback:show', (data) => {
      this.addFeedback(data.message, data.type);
    });

    // 道具获取
    this.eventSystem.on('item:acquired', (data) => {
      // 优先使用传入的中文名称，否则从数据中获取
      const itemName = data.itemName || this.engine.getItemData(data.itemId)?.name || data.itemId;
      this.addFeedback(`获得道具: ${itemName}`, 'success');
    });

    // 线索发现
    this.eventSystem.on('clue:discovered', (data) => {
      // 优先使用传入的中文名称，否则从数据中获取
      const clueName = data.clueName || this.engine.getClueData(data.clueId)?.name || data.clueId;
      this.addFeedback(`发现线索: ${clueName}`, 'clue');
      // 刷新场景（可能触发新的场景变体）
      setTimeout(() => {
        const sceneData = this.engine.getCurrentScene();
        this.renderScene(sceneData);
      }, 100);
    });

    // 位置变化
    this.eventSystem.on('location:changed', (data) => {
      const locationName = data.toName || data.to;
      this.addFeedback(`移动到: ${locationName}`, 'move');
    });

    // 对话开始
    this.eventSystem.on('dialogue:start', (data) => {
      console.log('UIRenderer收到dialogue:start事件:', data);
      if (this.dialogueModal) {
        this.dialogueModal.show(data.npcId);
      } else {
        console.warn('dialogueModal未初始化');
      }
    });

    // 任务完成 - 刷新场景以更新出口状态
    this.eventSystem.on('quest:completed', () => {
      const sceneData = this.engine.getCurrentScene();
      this.renderScene(sceneData);
    });

    // 交互完成 - 刷新场景（动态叙事）
    this.eventSystem.on('interaction:completed', () => {
      const sceneData = this.engine.getCurrentScene();
      this.renderScene(sceneData);
    });

    // 场景刷新事件（由DecisionSystem触发）
    this.eventSystem.on('scene:refresh', (data) => {
      const sceneData = this.engine.getCurrentScene();
      this.renderScene(sceneData);
    });
  }

  /**
   * 渲染场景
   * @param {Object} sceneData - 场景数据
   */
  renderScene(sceneData) {
    this.currentScene = sceneData;

    // 更新位置标签
    if (this.elements.currentLocation) {
      this.elements.currentLocation.textContent = sceneData.name;
    }

    // 更新环境信息
    this.updateEnvironmentInfo();

    // 渲染场景描述
    if (this.elements.sceneDescription) {
      let html = this.parseDescription(sceneData.description, sceneData.interactives);
      
      // 添加出口按钮
      if (sceneData.exits && sceneData.exits.length > 0) {
        html += this.renderExits(sceneData.exits);
      }
      
      this.elements.sceneDescription.innerHTML = html;
      
      // 绑定出口点击事件
      this.bindExitEvents();
    }
  }

  /**
   * 解析描述文本，生成交互高亮HTML
   * @param {string} description - 原始描述
   * @param {Array} interactives - 交互元素数组
   * @returns {string} HTML
   */
  parseDescription(description, interactives) {
    if (!interactives || interactives.length === 0) {
      return description;
    }

    let html = description;

    // 为每个交互元素创建高亮
    // 按名称长度降序排序，避免短名称替换长名称的一部分
    const sortedInteractives = [...interactives].sort((a, b) => {
      const lenA = (a.name || '').length;
      const lenB = (b.name || '').length;
      return lenB - lenA;
    });

    sortedInteractives.forEach(item => {
      if (!item.name || !item.id) return;

      // 检查是否已检查过
      const examined = item.examined;
      const examinedClass = examined ? 'examined' : '';

      // 根据类型选择CSS类
      const typeClass = this.getHighlightClass(item.type);

      // 创建高亮HTML
      const highlightHtml = `<span 
        class="highlight ${typeClass} ${examinedClass}" 
        data-id="${item.id}" 
        data-type="${item.type}"
        title="点击${this.getActionName(item.type)}"
      >${item.name}</span>`;

      // 使用更精确的正则替换 - 匹配完整名称，避免部分匹配
      // 使用非贪婪匹配和边界检查
      const escapedName = item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // 使用正向否定查找确保不在HTML标签内匹配
      const regex = new RegExp(`(?<![\\w])${escapedName}(?![\\w])`, 'g');
      
      // 替换前检查是否已经被替换过（简单检查：是否已包含highlight类）
      if (!html.includes(`data-id="${item.id}"`)) {
        html = html.replace(regex, highlightHtml);
      }
    });

    return html;
  }

  /**
   * 获取高亮CSS类
   */
  getHighlightClass(type) {
    const classMap = {
      'examine': 'highlight-examine',
      'collect': 'highlight-collect',
      'clue': 'highlight-clue',
      'danger': 'highlight-danger',
      'npc': 'highlight-npc',
      'device': 'highlight-device',
    };
    return classMap[type] || 'highlight-examine';
  }

  /**
   * 获取动作名称
   */
  getActionName(type) {
    const nameMap = {
      'examine': '检查',
      'collect': '收集',
      'clue': '查看线索',
      'danger': '调查危险',
      'npc': '对话',
      'device': '操作',
    };
    return nameMap[type] || '检查';
  }

  /**
   * 检查交互对象是否只有一个可执行动作
   * @param {Object} interactive - 交互对象
   * @returns {boolean}
   */
  hasOnlyOneAction(interactive) {
    // 计算动作数量
    let actionCount = 0;
    
    // NPC对话算一个动作
    if (interactive.type === 'npc' || interactive.npcId) {
      actionCount++;
    }
    
    // 收集、检查、设备等各算一个动作
    if (['collect', 'examine', 'device'].includes(interactive.type)) {
      actionCount++;
    }
    
    // 如果有clue类型，也单独处理
    if (interactive.type === 'clue') {
      actionCount++;
    }
    
    return actionCount === 1;
  }

  /**
   * 处理高亮文字点击
   */
  handleHighlightClick(elementId, action, element) {
    console.log(`UIRenderer.handleHighlightClick: elementId=${elementId}, action=${action}`);

    // 添加点击动画效果
    if (element && element.style) {
      element.style.transform = 'scale(0.95)';
      setTimeout(() => {
        element.style.transform = '';
      }, 100);
    }

    // 获取当前场景数据
    const sceneData = this.currentScene || this.engine.getCurrentScene();
    console.log(`UIRenderer: 场景数据`, sceneData?.id, 'interactives:', sceneData?.interactives?.length);
    
    // 如果是出口，直接执行移动
    if (action === 'move') {
      this.executeMove(elementId);
      return;
    }

    // 查找交互元素数据
    const interactive = sceneData?.interactives?.find(i => i.id === elementId);
    console.log(`UIRenderer: 找到交互对象`, interactive ? interactive.name : '未找到');
    
    if (interactive) {
      // 检查是否是NPC且只有一个动作（直接进对话）
      if (interactive.type === 'npc' && this.hasOnlyOneAction(interactive)) {
        console.log(`UIRenderer: NPC只有一个动作，直接进入对话`);
        const npcId = interactive.npcId || elementId;
        this.eventSystem.emit('dialogue:start', { npcId });
        return;
      }
      
      // 显示交互弹窗
      console.log(`UIRenderer: 调用interactionModal.show`);
      this.interactionModal.show(interactive, elementId);
    } else {
      // 直接执行交互
      console.log(`UIRenderer: 直接执行交互`);
      this.executeInteraction(elementId, action);
    }
  }

  /**
   * 执行移动
   */
  executeMove(exitData) {
    // 移动反馈由 location:changed 事件统一处理
    this.engine.handleInteraction(exitData, 'move');
  }

  /**
   * 执行交互
   */
  executeInteraction(elementId, action) {
    const result = this.engine.handleInteraction(elementId, action);

    // 如果交互成功且有消息，显示反馈
    if (result.success && result.message) {
      this.addFeedback(result.message, result.type);
    }

    // 如果交互成功，刷新场景显示（可能有状态变化）
    if (result.success) {
      setTimeout(() => {
        const sceneData = this.engine.getCurrentScene();
        this.renderScene(sceneData);
      }, 100);
    }

    return result;
  }

  /**
   * 渲染出口按钮
   * @param {Array} exits - 出口数组
   * @returns {string} HTML
   */
  renderExits(exits) {
    let html = '<div class="scene-exits">';
    html += '<div class="exits-label">可前往:</div>';
    html += '<div class="exits-list">';
    
    exits.forEach(exit => {
      const lockedClass = exit.locked ? 'locked' : '';
      const triggerText = exit.trigger ? ` (${exit.trigger})` : '';
      const lockReason = exit.locked ? ` title="${exit.lockReason}"` : '';
      html += `<button class="exit-btn ${lockedClass}" data-target="${exit.target}" data-direction="${exit.direction}"${lockReason}>${exit.name}${triggerText}</button>`;
    });
    
    html += '</div></div>';
    return html;
  }

  /**
   * 绑定出口点击事件
   */
  bindExitEvents() {
    const exitButtons = this.elements.sceneDescription.querySelectorAll('.exit-btn');
    exitButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target.dataset.target;
        const exit = this.currentScene.exits.find(e => e.target === target);
        
        if (exit && !exit.locked) {
          // 查找对应的 exit 对象
          this.handleHighlightClick(exit, 'move');
        } else if (exit?.locked) {
          // 任务条件不满足时，显示神秘氛围提示
          if (exit.requireQuest) {
            this.addFeedback('冥冥中似有什么不祥，你还不能离开...', 'danger');
          } else {
            this.addFeedback(`无法前往: ${exit.lockReason || '道路被封锁'}`, 'danger');
          }
        }
      });
    });
  }

  /**
   * 获取状态颜色类
   * @param {number} percent - 当前值百分比
   * @returns {string} 颜色类名
   */
  getStatusColorClass(percent) {
    if (percent >= 60) return 'normal';
    if (percent >= 30) return 'warning';
    return 'danger';
  }

  /**
   * 获取体温颜色类（特殊阈值）
   * @param {number} temp - 体温值
   * @returns {string} 颜色类名
   */
  getTemperatureColorClass(temp) {
    if (temp >= 36) return 'normal';
    if (temp >= 34) return 'warning';
    return 'danger';
  }

  /**
   * 获取体力状态描述
   * @param {number} current - 当前体力
   * @param {number} max - 最大体力
   * @returns {string} 描述文本
   */
  getStaminaDesc(current, max) {
    const percent = (current / max) * 100;
    if (percent >= 80) return '状态良好';
    if (percent >= 60) return '轻微疲劳';
    if (percent >= 40) return '中度疲劳';
    if (percent >= 20) return '严重疲劳';
    return '体力耗尽，行动受限';
  }

  /**
   * 获取理智状态描述
   * @param {number} current - 当前理智
   * @param {number} max - 最大理智
   * @returns {string} 描述文本
   */
  getSanityDesc(current, max) {
    const percent = (current / max) * 100;
    if (percent >= 80) return '状态稳定';
    if (percent >= 60) return '略有不安';
    if (percent >= 40) return '心神不宁';
    if (percent >= 20) return '意识模糊';
    return '理智崩溃，危险';
  }

  /**
   * 获取体温状态描述
   * @param {number} temp - 体温值
   * @returns {string} 描述文本
   */
  getTemperatureDesc(temp) {
    if (temp >= 37) return '体温正常';
    if (temp >= 36) return '轻微失温';
    if (temp >= 35) return '轻度失温';
    if (temp >= 34) return '中度失温';
    if (temp >= 32) return '重度失温';
    return '极度危险，危及生命';
  }

  /**
   * 更新状态面板
   */
  updateStatusPanel() {
    const status = this.engine.getPlayerStatus();
    if (!status) return;

    // 体力
    if (this.elements.staminaValue) {
      const staminaPercent = (status.stamina.current / status.stamina.max) * 100;
      this.elements.staminaValue.textContent = `${status.stamina.current}/${status.stamina.max}`;
      this.elements.staminaValue.className = `status-value ${this.getStatusColorClass(staminaPercent)}`;
    }

    // 理智
    if (this.elements.sanityValue) {
      const sanityPercent = (status.sanity.current / status.sanity.max) * 100;
      this.elements.sanityValue.textContent = `${status.sanity.current}/${status.sanity.max}`;
      this.elements.sanityValue.className = `status-value ${this.getStatusColorClass(sanityPercent)}`;
    }

    // 体温
    if (this.elements.temperatureValue) {
      const temp = status.temperature.current;
      this.elements.temperatureValue.textContent = `${temp.toFixed(1)}°C`;
      this.elements.temperatureValue.className = `status-value ${this.getTemperatureColorClass(temp)}`;
    }
  }

  /**
   * 更新环境信息（日期、时间、天气、温度）
   */
  updateEnvironmentInfo() {
    const world = this.engine.state.get('world');
    if (!world) return;

    // 更新日期显示（年月日 + 农历）
    const dateEl = document.getElementById('env-date');
    if (dateEl && world.date) {
      const dateStr = `${world.date.month}月${world.date.day}日`;
      const lunarStr = world.lunarYear || '';
      dateEl.querySelector('.env-value').textContent = `${dateStr} ${lunarStr}`;
    }

    // 更新模糊时间段
    const timeEl = document.getElementById('env-time');
    if (timeEl) {
      const timePhase = world.timePhase || '黄昏';
      timeEl.querySelector('.env-value').textContent = timePhase;
    }

    // 天气
    const weatherEl = document.getElementById('env-weather');
    if (weatherEl && world.weather) {
      const weatherMap = {
        'blizzard': '暴雪',
        'snow': '下雪',
        'cloudy': '多云',
        'clear': '晴朗',
        'fog': '大雾',
      };
      const weatherIconMap = {
        'blizzard': '🌨️',
        'snow': '❄️',
        'cloudy': '☁️',
        'clear': '☀️',
        'fog': '🌫️',
      };
      weatherEl.querySelector('.env-value').textContent = weatherMap[world.weather] || world.weather;
      weatherEl.querySelector('.env-icon').textContent = weatherIconMap[world.weather] || '🌡️';
    }

    // 环境温度
    const tempEl = document.getElementById('env-temp');
    if (tempEl && world.temperature !== undefined) {
      tempEl.querySelector('.env-value').textContent = `${world.temperature}°C`;
    }
  }

  /**
   * 添加反馈信息（Toast提示条）
   * @param {string} message - 消息内容
   * @param {string} type - 消息类型
   */
  addFeedback(message, type = 'info') {
    if (!this.elements.feedbackLog) return;

    const item = document.createElement('div');
    item.className = `feedback-item ${type}`;
    item.textContent = message;

    // 获取现有提示条数量
    const existingItems = this.elements.feedbackLog.querySelectorAll('.feedback-item');
    const maxToasts = 5;

    // 如果已有太多提示条，移除最老的
    if (existingItems.length >= maxToasts) {
      const oldest = existingItems[0];
      if (oldest && oldest.parentNode) {
        oldest.parentNode.removeChild(oldest);
      }
    }

    this.elements.feedbackLog.appendChild(item);

    // 5秒后自动消失
    setTimeout(() => {
      if (item.parentNode) {
        item.classList.add('toast-out');
        // 动画结束后移除元素
        setTimeout(() => {
          if (item.parentNode) {
            item.parentNode.removeChild(item);
          }
        }, 500);
      }
    }, 5000);
  }

  /**
   * 处理动作按钮点击
   * @param {string} action - 动作名称
   */
  handleActionButton(action) {
    console.log(`动作按钮: ${action}`);

    switch (action) {
      case 'inventory':
        this.showInventoryModal();
        break;
      case 'quest':
        if (this.questPanel) {
          this.questPanel.toggle();
        }
        break;
      case 'notes':
        this.showNotesModal();
        break;
      case 'map':
        this.showMapModal();
        break;
      case 'save':
        this.saveGame();
        break;
      case 'newgame':
        this.startNewGame();
        break;
      case 'settings':
        this.showSettingsModal();
        break;
      default:
        console.warn(`未知的动作: ${action}`);
    }
  }

  /**
   * 显示道具栏模态框
   */
  showInventoryModal() {
    // 使用 InventoryModal 组件显示背包
    if (this.inventoryModal) {
      this.inventoryModal.show();
    } else {
      // 降级方案：使用旧的简单显示
      this.showInventoryModalLegacy();
    }
  }

  /**
   * 旧版道具栏显示（降级方案）
   */
  showInventoryModalLegacy() {
    const items = this.engine.getInventory();

    let content = '<div class="inventory-grid">';

    // 生成道具格子
    for (let i = 0; i < 12; i++) {
      const item = items[i];
      if (item) {
        content += `<div class="inventory-slot" data-item="${item.id}" title="${item.description || item.name}">${item.icon || '📦'}</div>`;
      } else {
        content += '<div class="inventory-slot empty"></div>';
      }
    }

    content += '</div>';
    content += `<p style="margin-top: 15px; text-align: center; color: var(--color-bone-white-dark);">已使用: ${items.length} / 12</p>`;

    this.showModal('道具栏', content);
  }

  /**
   * 显示笔记模态框
   */
  showNotesModal() {
    const clues = this.engine.getClues();
    
    let content = '<div class="notes-list">';
    
    if (clues.length === 0) {
      content += '<p style="color: var(--color-bone-white-dark); text-align: center;">暂无记录线索</p>';
    } else {
      clues.forEach(clue => {
        content += `
          <div class="note-item">
            <div class="note-title">${clue.name}</div>
            <div class="note-content">${clue.description}</div>
          </div>
        `;
      });
    }
    
    content += '</div>';

    this.showModal('调查笔记', content);
  }

  /**
   * 显示地图模态框
   */
  showMapModal() {
    const visited = this.engine.state.get('world.visitedLocations') || [];
    const current = this.engine.state.get('player.location');
    const chapterData = this.engine.currentChapter;

    // 场景名称映射（英文ID -> 中文名称）
    const sceneNames = this.getSceneNames();

    let content = '<div class="map-container">';

    // 地图关系图
    content += '<div class="map-visual">';
    content += this.renderMapVisual(visited, current, sceneNames);
    content += '</div>';

    // 已访问列表
    content += '<div class="map-list">';
    content += '<h3 style="color: var(--color-bone-white); margin-bottom: 10px; font-size: 1em;">📍 已探索区域</h3>';

    if (visited.length === 0) {
      content += '<p style="color: var(--color-bone-white-dark);">尚未探索任何区域</p>';
    } else {
      content += '<ul style="list-style: none; padding: 0; margin: 0;">';

      visited.forEach(loc => {
        const isCurrent = loc === current;
        const sceneName = sceneNames[loc] || loc;
        content += `
          <li class="map-location-item ${isCurrent ? 'current' : ''}" data-location="${loc}">
            <span class="location-icon">${isCurrent ? '📍' : '⭕'}</span>
            <span class="location-name">${sceneName}</span>
            ${isCurrent ? '<span class="current-badge">(当前)</span>' : ''}
          </li>`;
      });

      content += '</ul>';
    }
    content += '</div>';
    content += '</div>';

    // 添加样式
    this.addMapStyles();

    this.showModal('🗺️ 地图', content);
  }

  /**
   * 获取场景名称映射
   */
  getSceneNames() {
    const sceneNames = {};
    const scenes = this.engine.sceneManager?.scenes;
    if (scenes) {
      scenes.forEach((scene, id) => {
        sceneNames[id] = scene.name || id;
      });
    }
    return sceneNames;
  }

  /**
   * 渲染地图可视化
   */
  renderMapVisual(visited, current, sceneNames) {
    // 简单的关系图
    const mapData = this.getMapStructure();

    let html = '<div class="map-connections">';

    // 渲染主要路线
    mapData.locations.forEach(loc => {
      const isVisited = visited.includes(loc.id);
      const isCurrent = loc.id === current;
      const isUnlocked = isVisited || loc.connections?.some(c => visited.includes(c));

      html += `
        <div class="map-node ${isVisited ? 'visited' : ''} ${isCurrent ? 'current' : ''} ${!isUnlocked ? 'locked' : ''}"
             style="left: ${loc.x}%; top: ${loc.y}%;">
          <div class="node-icon">${isCurrent ? '📍' : (isVisited ? '✓' : '?')}</div>
          <div class="node-name">${sceneNames[loc.id] || loc.id}</div>
        </div>
      `;

      // 渲染连接线
      loc.connections?.forEach(connId => {
        const conn = mapData.locations.find(l => l.id === connId);
        if (conn && (visited.includes(loc.id) || visited.includes(connId))) {
          html += `
            <div class="map-line" style="
              left: ${Math.min(loc.x, conn.x)}%;
              top: ${Math.min(loc.y, conn.y)}%;
              width: ${Math.abs(conn.x - loc.x)}%;
              height: ${Math.abs(conn.y - loc.y)}%;
            "></div>
          `;
        }
      });
    });

    html += '</div>';
    return html;
  }

  /**
   * 获取地图结构
   */
  getMapStructure() {
    return {
      locations: [
        { id: 'dorm', x: 10, y: 50, connections: ['subway'] },
        { id: 'subway', x: 30, y: 50, connections: ['dorm', 'train_station'] },
        { id: 'train_station', x: 50, y: 50, connections: ['subway', 'bus'] },
        { id: 'bus', x: 70, y: 50, connections: ['train_station', 'gate'] },
        { id: 'gate', x: 85, y: 30, connections: ['bus', 'courtyard'] },
        { id: 'courtyard', x: 70, y: 30, connections: ['gate', 'main_hall', 'temple_view'] },
        { id: 'main_hall', x: 60, y: 20, connections: ['courtyard', 'scripture_library'] },
        { id: 'temple_view', x: 85, y: 15, connections: ['courtyard'] },
        { id: 'scripture_library', x: 50, y: 15, connections: ['main_hall'] },
      ],
    };
  }

  /**
   * 添加地图样式
   */
  addMapStyles() {
    // 检查是否已添加
    if (document.getElementById('map-styles')) return;

    const style = document.createElement('style');
    style.id = 'map-styles';
    style.textContent = `
      .map-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .map-visual {
        position: relative;
        height: 200px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        overflow: hidden;
      }
      .map-connections {
        position: relative;
        width: 100%;
        height: 100%;
      }
      .map-line {
        position: absolute;
        background: rgba(255, 255, 255, 0.2);
        transform-origin: left top;
      }
      .map-node {
        position: absolute;
        transform: translate(-50%, -50%);
        text-align: center;
        z-index: 1;
      }
      .map-node .node-icon {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid rgba(255, 255, 255, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        margin: 0 auto 5px;
      }
      .map-node.visited .node-icon {
        background: rgba(91, 139, 91, 0.3);
        border-color: var(--color-collect);
      }
      .map-node.current .node-icon {
        background: rgba(139, 58, 58, 0.4);
        border-color: var(--color-faded-red);
        animation: pulse 1.5s infinite;
      }
      .map-node.locked .node-icon {
        opacity: 0.5;
      }
      .map-node .node-name {
        font-size: 10px;
        color: var(--color-bone-white-dark);
        white-space: nowrap;
      }
      .map-node.current .node-name {
        color: var(--color-faded-red);
        font-weight: bold;
      }
      .map-list {
        background: rgba(0, 0, 0, 0.2);
        padding: 15px;
        border-radius: 8px;
      }
      .map-location-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        margin-bottom: 5px;
        border-radius: 4px;
        transition: all 0.2s;
      }
      .map-location-item:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      .map-location-item.current {
        background: rgba(139, 58, 58, 0.2);
        border-left: 3px solid var(--color-faded-red);
      }
      .map-location-item .location-icon {
        font-size: 14px;
      }
      .map-location-item .location-name {
        flex: 1;
        color: var(--color-bone-white);
      }
      .map-location-item .current-badge {
        color: var(--color-faded-red);
        font-size: 12px;
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 显示设置模态框
   */
  showSettingsModal() {
    let content = '<div style="padding: 20px;">';
    
    content += '<div style="margin-bottom: 20px;">';
    content += '<label style="display: block; margin-bottom: 10px; color: var(--color-bone-white-dark);">文字速度</label>';
    content += '<select id="text-speed" style="width: 100%; padding: 8px; background: var(--color-ink-black-light); border: 1px solid var(--color-faded-red-dark); color: var(--color-bone-white);">';
    content += '<option value="slow">慢</option>';
    content += '<option value="normal" selected>正常</option>';
    content += '<option value="fast">快</option>';
    content += '</select>';
    content += '</div>';
    
    content += '<div style="margin-bottom: 20px;">';
    content += '<label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">';
    content += '<input type="checkbox" id="auto-save" checked style="accent-color: var(--color-faded-red);"> <span>自动保存</span>';
    content += '</label>';
    content += '</div>';
    
    content += '<button id="btn-reset-game" style="width: 100%; padding: 10px; background: var(--color-danger); border: none; color: white; border-radius: 4px; cursor: pointer;">重新开始游戏</button>';
    
    content += '</div>';

    this.showModal('设置', content);

    // 绑定设置事件
    setTimeout(() => {
      const resetBtn = document.getElementById('btn-reset-game');
      if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
          const confirmed = await this.confirmModal.confirm('重新开始', '确定要重新开始游戏吗？当前进度将丢失。', 'danger');
          if (confirmed) {
            this.engine.state.reset();
            location.reload();
          }
        });
      }
    }, 100);
  }

  /**
   * 保存游戏
   */
  saveGame() {
    const saved = this.engine.saveGame();
    if (saved) {
      this.addFeedback('游戏已保存', 'success');
    } else {
      this.addFeedback('保存失败', 'danger');
    }
  }

  /**
   * 开始新游戏
   */
  async startNewGame() {
    const confirmed = await this.confirmModal.confirm('开始新游戏', '确定要开始新游戏吗？当前进度将会丢失。', 'danger');
    if (confirmed) {
      // 清除存档
      localStorage.removeItem('xuan_guan_mystery_save');
      // 重新加载页面并强制新游戏
      window.location.href = window.location.pathname + '?new=1';
    }
  }

  /**
   * 显示模态框
   * @param {string} title - 标题
   * @param {string} content - 内容HTML
   */
  showModal(title, content) {
    if (!this.elements.modalContainer) return;

    this.elements.modalContainer.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
      </div>
    `;

    this.elements.modalContainer.classList.remove('hidden');

    // 绑定关闭事件
    const closeBtn = this.elements.modalContainer.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeModal();
      });
    }

    // 点击背景关闭
    this.elements.modalContainer.addEventListener('click', (e) => {
      if (e.target === this.elements.modalContainer) {
        this.closeModal();
      }
    });
  }

  /**
   * 关闭模态框
   */
  closeModal() {
    if (this.elements.modalContainer) {
      this.elements.modalContainer.classList.add('hidden');
      this.elements.modalContainer.innerHTML = '';
    }
  }
}
