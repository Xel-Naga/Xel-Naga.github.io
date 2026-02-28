/**
 * 交互详情弹窗组件
 * 显示交互对象的详细信息、执行动作
 */

export class InteractionModal {
  constructor(eventSystem, gameEngine) {
    this.eventSystem = eventSystem;
    this.gameEngine = gameEngine;
    this.modal = null;
  }

  /**
   * 显示交互弹窗
   * @param {Object} interactive - 交互对象数据
   * @param {string} elementId - 元素ID
   */
  show(interactive, elementId) {
    console.log(`InteractionModal.show:`, interactive.name, 'type:', interactive.type, 'id:', elementId);
    
    // 对于NPC类型，从chapter.npcs获取完整数据
    let displayData = interactive;
    if (interactive.type === 'npc' && interactive.npcId) {
      const npcData = this.gameEngine.currentChapter?.npcs?.[interactive.npcId];
      if (npcData) {
        displayData = {
          ...interactive,
          name: npcData.name || interactive.name,
          description: npcData.description || interactive.description,
          avatar: npcData.avatar,
        };
      }
    }
    
    this.createModal(displayData, elementId);
    this.bindEvents(displayData, elementId);
    console.log(`InteractionModal: 弹窗已创建并绑定事件`);
  }

  /**
   * 创建弹窗HTML
   */
  createModal(interactive, elementId) {
    // 移除已存在的弹窗
    this.close();

    const typeName = this.getTypeName(interactive.type);
    const typeClass = `type-${interactive.type}`;
    
    // 构建动作按钮
    const actionButtons = this.buildActionButtons(interactive, elementId);
    
    // 获取已检查次数
    const examineCount = this.gameEngine.state.getEventCount(`examine_${elementId}`);
    const examinedBadge = examineCount > 0 ? `<span class="examined-badge">已检查 ${examineCount} 次</span>` : '';

    const modalHTML = `
      <div class="interaction-modal-overlay" id="interaction-modal">
        <div class="interaction-modal">
          <div class="modal-header ${typeClass}">
            <div class="header-content">
              <span class="type-icon">${this.getTypeIcon(interactive.type)}</span>
              <h3 class="modal-title">${interactive.name}</h3>
              ${examinedBadge}
            </div>
            <button class="close-btn" aria-label="关闭">&times;</button>
          </div>
          
          <div class="modal-body">
            ${interactive.avatar ? `
            <div class="npc-avatar-section">
              <div class="npc-avatar-large">${interactive.avatar}</div>
            </div>` : ''}
            <div class="description-section">
              <p class="description-text">${interactive.description || '暂无描述'}</p>
            </div>
            
            ${this.buildEffectsSection(interactive.effects)}
            ${this.buildClueSection(interactive.clueId)}
            ${this.buildItemSection(interactive.itemId)}
            
            <div class="actions-section">
              <div class="actions-label">可执行动作:</div>
              <div class="actions-list">
                ${actionButtons}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('interaction-modal');
    
    // 显示动画
    requestAnimationFrame(() => {
      this.modal.classList.add('show');
    });
  }

  /**
   * 构建效果提示区域
   */
  buildEffectsSection(effects) {
    if (!effects || Object.keys(effects).length === 0) return '';
    
    const effectTexts = [];
    if (effects.sanity) effectTexts.push(`理智 ${effects.sanity > 0 ? '+' : ''}${effects.sanity}`);
    if (effects.stamina) effectTexts.push(`体力 ${effects.stamina > 0 ? '+' : ''}${effects.stamina}`);
    if (effects.temperature) effectTexts.push(`体温 ${effects.temperature > 0 ? '+' : ''}${effects.temperature}`);
    if (effects.intuition) effectTexts.push(`直觉 ${effects.intuition > 0 ? '+' : ''}${effects.intuition}`);

    return `
      <div class="effects-section">
        <span class="effects-label">可能影响:</span>
        <span class="effects-list">${effectTexts.join(', ')}</span>
      </div>
    `;
  }

  /**
   * 构建线索提示区域
   */
  buildClueSection(clueId) {
    if (!clueId) return '';
    
    const hasClue = this.gameEngine.state.get('player.clues').includes(clueId);
    if (hasClue) {
      const clue = this.gameEngine.getClueData(clueId);
      return `
        <div class="clue-section obtained">
          <span class="clue-icon">✓</span>
          <span class="clue-text">已获得线索: ${clue ? clue.name : clueId}</span>
        </div>
      `;
    }
    
    return `
      <div class="clue-section hint">
        <span class="clue-icon">💡</span>
        <span class="clue-text">可能发现线索</span>
      </div>
    `;
  }

  /**
   * 构建道具提示区域
   */
  buildItemSection(itemId) {
    if (!itemId) return '';
    
    const hasItem = this.gameEngine.state.get('player.inventory').includes(itemId);
    const item = this.gameEngine.getItemData(itemId);
    
    if (hasItem) {
      return `
        <div class="item-section obtained">
          <span class="item-icon">✓</span>
          <span class="item-text">已获得: ${item ? item.name : itemId}</span>
        </div>
      `;
    }
    
    return `
      <div class="item-section hint">
        <span class="item-icon">🎒</span>
        <span class="item-text">可获得: ${item ? item.name : itemId}</span>
      </div>
    `;
  }

  /**
   * 构建动作按钮
   */
  buildActionButtons(interactive, elementId) {
    const buttons = [];
    
    switch (interactive.type) {
      case 'examine':
        buttons.push(`<button class="action-btn-primary" data-action="examine" data-id="${elementId}">🔍 详细检查</button>`);
        break;
      case 'collect':
        const hasItem = this.gameEngine.state.get('player.inventory').includes(interactive.itemId);
        if (hasItem) {
          buttons.push(`<button class="action-btn-disabled" disabled>✓ 已获得</button>`);
        } else {
          buttons.push(`<button class="action-btn-primary" data-action="collect" data-id="${elementId}">📦 收集物品</button>`);
        }
        break;
      case 'clue':
        const hasClue = this.gameEngine.state.get('player.clues').includes(interactive.clueId);
        if (hasClue) {
          buttons.push(`<button class="action-btn-disabled" disabled>✓ 已记录</button>`);
        } else {
          buttons.push(`<button class="action-btn-primary" data-action="clue" data-id="${elementId}">📝 记录线索</button>`);
        }
        break;
      case 'danger':
        buttons.push(`<button class="action-btn-danger" data-action="danger" data-id="${elementId}">⚠️ 调查危险</button>`);
        break;
      case 'npc':
        buttons.push(`<button class="action-btn-primary" data-action="npc" data-id="${elementId}">💬 开始对话</button>`);
        break;
      case 'device':
        buttons.push(`<button class="action-btn-primary" data-action="device" data-id="${elementId}">🔧 操作设备</button>`);
        break;
    }
    
    return buttons.join('');
  }

  /**
   * 绑定事件
   */
  bindEvents(interactive, elementId) {
    if (!this.modal) return;

    // 关闭按钮
    const closeBtn = this.modal.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // 点击背景关闭
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    // 动作按钮
    const actionBtns = this.modal.querySelectorAll('[data-action]');
    console.log(`绑定动作按钮:`, actionBtns.length);
    actionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        const id = e.currentTarget.dataset.id;
        console.log(`点击动作按钮: action=${action}, id=${id}`);
        
        // 先执行交互
        const result = this.gameEngine.handleInteraction(id, action);
        console.log(`交互结果:`, result);
        
        // 触发事件
        if (result.success) {
          this.eventSystem.emit('interaction:completed', {
            elementId: id,
            action: action,
            result: result,
          });
          
          // 对于检查和设备操作，在弹窗内显示结果
          if (action === 'examine' || action === 'device') {
            this.showResult(result, interactive, id);
            return;
          }
        }
        
        // 其他情况直接关闭弹窗
        this.close();
      });
    });

    // ESC键关闭
    this.escHandler = (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
    };
    document.addEventListener('keydown', this.escHandler);
  }

  /**
   * 关闭弹窗
   */
  close() {
    if (this.modal) {
      const modalToClose = this.modal; // 保存当前modal引用
      modalToClose.classList.remove('show');
      setTimeout(() => {
        // 只移除保存的引用，而不是当前的 this.modal
        if (modalToClose && modalToClose.parentNode) {
          modalToClose.parentNode.removeChild(modalToClose);
        }
        // 只有 this.modal 仍然指向同一个元素时才设为 null
        if (this.modal === modalToClose) {
          this.modal = null;
        }
      }, 200);
    }
    
    if (this.escHandler) {
      document.removeEventListener('keydown', this.escHandler);
      this.escHandler = null;
    }
  }

  /**
   * 在弹窗内显示操作结果
   * @param {Object} result - 交互结果
   * @param {Object} interactive - 交互对象数据
   * @param {string} elementId - 元素ID
   */
  showResult(result, interactive, elementId) {
    if (!this.modal) return;
    
    const body = this.modal.querySelector('.modal-body');
    if (!body) return;
    
    // 获取已检查次数（用于examine类型）
    const examineCount = result.count || this.gameEngine.state.getEventCount(`examine_${elementId}`);
    const examinedBadge = examineCount > 0 ? `<span class="examined-badge">已检查 ${examineCount} 次</span>` : '';
    
    // 构建结果内容
    let resultHTML = `
      <div class="result-section">
        <div class="result-header">
          <span class="result-icon">✓</span>
          <span class="result-title">检查完成</span>
          ${examinedBadge}
        </div>
        <div class="result-message">${result.message || '你完成了检查。'}</div>
      </div>
    `;
    
    // 如果有线索获得，显示线索信息
    if (result.clueId || interactive.clueId) {
      const clueId = result.clueId || interactive.clueId;
      const clue = this.gameEngine.getClueData?.(clueId);
      resultHTML += `
        <div class="result-clue">
          <div class="result-clue-title">🔍 发现线索</div>
          <div class="result-clue-name">${clue ? clue.name : '未知线索'}</div>
        </div>
      `;
    }
    
    // 更新弹窗内容
    body.innerHTML = resultHTML + `
      <div class="actions-section">
        <button class="action-btn-primary" id="result-close-btn">关闭</button>
      </div>
    `;
    
    // 绑定关闭按钮
    const closeBtn = body.querySelector('#result-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }
  }

  /**
   * 获取类型名称
   */
  getTypeName(type) {
    const names = {
      'examine': '可检查',
      'collect': '可收集',
      'clue': '线索',
      'danger': '危险',
      'npc': '人物',
      'device': '设备',
    };
    return names[type] || '未知';
  }

  /**
   * 获取类型图标
   */
  getTypeIcon(type) {
    const icons = {
      'examine': '🔍',
      'collect': '📦',
      'clue': '💡',
      'danger': '⚠️',
      'npc': '👤',
      'device': '🔧',
    };
    return icons[type] || '❓';
  }
}
