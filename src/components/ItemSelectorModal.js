/**
 * 物品选择器组件
 * 在解谜时让用户选择要使用的物品
 */

export class ItemSelectorModal {
  constructor(eventSystem, gameEngine) {
    this.eventSystem = eventSystem;
    this.gameEngine = gameEngine;
    this.modal = null;
    this.currentPuzzle = null;
    this.requiredItems = [];

    this.bindEvents();
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 监听需要选择物品的事件
    this.eventSystem.on('item:select', (data) => {
      this.show(data);
    });
  }

  /**
   * 显示物品选择器
   */
  show(options) {
    this.currentPuzzle = options.puzzleId;
    this.requiredItems = options.requiredItems || [];
    this.onSelect = options.onSelect;
    this.onCancel = options.onCancel;

    this.createModal();
  }

  /**
   * 创建模态框
   */
  createModal() {
    // 移除已存在的模态框
    this.close();

    // 获取玩家物品
    const inventoryIds = this.gameEngine.state.get('player.inventory') || [];
    const items = inventoryIds.map(id => this.gameEngine.getItemData(id)).filter(Boolean);

    // 创建模态框
    this.modal = document.createElement('div');
    this.modal.className = 'item-selector-overlay';

    const content = document.createElement('div');
    content.className = 'item-selector-modal';

    // 标题
    const title = document.createElement('h2');
    title.className = 'item-selector-title';
    title.textContent = '选择物品';

    // 描述
    const desc = document.createElement('p');
    desc.className = 'item-selector-desc';
    if (this.requiredItems.length > 0) {
      const requiredNames = this.requiredItems
        .map(id => this.gameEngine.getItemData(id)?.name || id)
        .join('、');
      desc.textContent = `需要: ${requiredNames}`;
    } else {
      desc.textContent = '选择要使用的物品';
    }

    // 物品列表
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'item-selector-list';

    if (items.length === 0) {
      itemsContainer.innerHTML = '<p class="no-items">背包中没有物品</p>';
    } else {
      items.forEach(item => {
        const itemEl = this.createItemElement(item);
        itemsContainer.appendChild(itemEl);
      });
    }

    // 取消按钮
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'item-selector-cancel';
    cancelBtn.textContent = '取消';
    cancelBtn.addEventListener('click', () => {
      if (this.onCancel) this.onCancel();
      this.close();
    });

    // 组装
    content.appendChild(title);
    content.appendChild(desc);
    content.appendChild(itemsContainer);
    content.appendChild(cancelBtn);

    this.modal.appendChild(content);
    document.body.appendChild(this.modal);
  }

  /**
   * 创建物品元素
   */
  createItemElement(item) {
    const itemEl = document.createElement('div');
    itemEl.className = 'item-selector-item';

    // 检查是否需要此物品
    const isRequired = this.requiredItems.includes(item.id);
    if (isRequired) {
      itemEl.classList.add('required');
    }

    itemEl.innerHTML = `
      <div class="item-icon">${item.icon || '📦'}</div>
      <div class="item-info">
        <div class="item-name">${item.name}</div>
        <div class="item-desc">${item.description || ''}</div>
      </div>
      ${isRequired ? '<span class="required-badge">需要</span>' : ''}
    `;

    itemEl.addEventListener('click', () => {
      this.selectItem(item);
    });

    return itemEl;
  }

  /**
   * 选择物品
   */
  selectItem(item) {
    if (this.onSelect) {
      this.onSelect(item);
    }
    this.close();

    // 发送物品选择事件
    this.eventSystem.emit('item:used', {
      itemId: item.id,
      puzzleId: this.currentPuzzle,
    });
  }

  /**
   * 关闭
   */
  close() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }
}
