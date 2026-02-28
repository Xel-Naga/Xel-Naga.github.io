/**
 * UI渲染器
 * 处理界面渲染和用户交互
 */

import { InteractionModal } from '../components/InteractionModal.js';
import { QuestPanel } from '../components/QuestPanel.js';
import { DialogueModal } from '../components/DialogueModal.js';

export class UIRenderer {
  constructor(engine, eventSystem) {
    this.engine = engine;
    this.eventSystem = eventSystem;
    this.elements = {};
    this.currentScene = null;
    this.interactionModal = null;
    this.questPanel = null;
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
      
      // 用户信息面板 - 状态条
      staminaFill: document.getElementById('stamina-fill'),
      sanityFill: document.getElementById('sanity-fill'),
      temperatureFill: document.getElementById('temperature-fill'),
      
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
      btn.addEventListener('click', (e) => {
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
      this.addFeedback(`获得道具: ${data.itemId}`, 'success');
    });

    // 线索发现
    this.eventSystem.on('clue:discovered', (data) => {
      this.addFeedback(`发现线索: ${data.clueId}`, 'clue');
    });

    // 位置变化
    this.eventSystem.on('location:changed', (data) => {
      this.addFeedback(`移动到: ${data.to}`, 'move');
    });

    // 交互完成
    this.eventSystem.on('interaction:completed', (data) => {
      if (data.result && data.result.message) {
        this.addFeedback(data.result.message, data.result.type);
      }
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
    const result = this.engine.handleInteraction(exitData, 'move');
    
    if (result.success) {
      this.addFeedback(`前往: ${result.target}`, 'move');
    }
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
          this.addFeedback(`无法前往: ${exit.lockReason || '道路被封锁'}`, 'danger');
        }
      });
    });
  }

  /**
   * 更新状态面板
   */
  updateStatusPanel() {
    const status = this.engine.getPlayerStatus();
    if (!status) return;

    // 体力
    if (this.elements.staminaFill) {
      const staminaPercent = (status.stamina.current / status.stamina.max) * 100;
      this.elements.staminaFill.style.width = `${staminaPercent}%`;
    }

    // 理智
    if (this.elements.sanityFill) {
      const sanityPercent = (status.sanity.current / status.sanity.max) * 100;
      this.elements.sanityFill.style.width = `${sanityPercent}%`;
    }

    // 体温
    if (this.elements.temperatureFill) {
      const temp = status.temperature.current;
      // 体温条显示范围 28-40°C
      const tempPercent = ((temp - 28) / (40 - 28)) * 100;
      this.elements.temperatureFill.style.width = `${Math.max(0, Math.min(100, tempPercent))}%`;
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
   * 添加反馈信息
   * @param {string} message - 消息内容
   * @param {string} type - 消息类型
   */
  addFeedback(message, type = 'info') {
    if (!this.elements.feedbackLog) return;

    const item = document.createElement('div');
    item.className = 'feedback-item';
    item.textContent = message;

    // 根据类型设置样式
    const colors = {
      'success': '#5B8B5B',
      'clue': '#B8A85B',
      'danger': '#B85B5B',
      'status': '#8B5BB8',
      'move': '#5B8DB8',
    };
    
    if (colors[type]) {
      item.style.borderLeftColor = colors[type];
    }

    this.elements.feedbackLog.appendChild(item);

    // 自动滚动到底部
    this.elements.feedbackLog.scrollTop = this.elements.feedbackLog.scrollHeight;

    // 限制反馈数量
    while (this.elements.feedbackLog.children.length > 20) {
      this.elements.feedbackLog.removeChild(this.elements.feedbackLog.firstChild);
    }
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

    let content = '<div style="padding: 20px;">';
    content += '<p style="color: var(--color-bone-white-dark); margin-bottom: 15px;">已探索区域:</p>';
    content += '<ul style="list-style: none; padding: 0;">';
    
    visited.forEach(loc => {
      const isCurrent = loc === current;
      content += `<li style="padding: 8px; ${isCurrent ? 'background: rgba(139, 58, 58, 0.2); border-left: 3px solid var(--color-faded-red);' : ''}">${loc} ${isCurrent ? '(当前)' : ''}</li>`;
    });
    
    content += '</ul>';
    content += '</div>';

    this.showModal('地图', content);
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
        resetBtn.addEventListener('click', () => {
          if (confirm('确定要重新开始游戏吗？当前进度将丢失。')) {
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
