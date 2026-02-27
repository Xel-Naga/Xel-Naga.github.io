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
    this.createModal(interactive, elementId);
    this.bindEvents(interactive, elementId);
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
    actionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        const id = e.target.dataset.id;
        
        // 关闭弹窗
        this.close();
        
        // 执行交互
        const result = this.gameEngine.handleInteraction(id, action);
        
        // 触发事件
        if (result.success) {
          this.eventSystem.emit('interaction:completed', {
            elementId: id,
            action: action,
            result: result,
          });
        }
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
      this.modal.classList.remove('show');
      setTimeout(() => {
        if (this.modal && this.modal.parentNode) {
          this.modal.parentNode.removeChild(this.modal);
        }
        this.modal = null;
      }, 200);
    }
    
    if (this.escHandler) {
      document.removeEventListener('keydown', this.escHandler);
      this.escHandler = null;
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
