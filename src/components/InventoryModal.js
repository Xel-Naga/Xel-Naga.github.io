/**
 * 道具面板组件
 * 显示背包中的道具，支持使用、组合、丢弃等操作
 */

import { ConfirmModal } from './ConfirmModal.js';

export class InventoryModal {
  constructor(eventSystem, engine) {
    this.eventSystem = eventSystem;
    this.engine = engine;
    this.container = null;
    this.selectedItem = null;
    this.currentFilter = 'all'; // all, tool, consumable, document, key, gear, book
    this.items = [];
    this.confirmModal = new ConfirmModal();

    // 绑定事件
    this.bindEvents();
  }

  /**
   * 绑定游戏事件
   */
  bindEvents() {
    // 道具获取时刷新
    this.eventSystem.on('item:acquired', () => {
      if (this.container && !this.container.classList.contains('hidden')) {
        this.refreshInventory();
      }
    });

    // 道具移除时刷新
    this.eventSystem.on('item:removed', () => {
      if (this.container && !this.container.classList.contains('hidden')) {
        this.refreshInventory();
      }
    });

    // 背包更新时刷新
    this.eventSystem.on('inventory:updated', () => {
      if (this.container && !this.container.classList.contains('hidden')) {
        this.refreshInventory();
      }
    });
  }

  /**
   * 显示道具面板
   */
  show() {
    // 获取或创建容器
    this.container = document.getElementById('inventory-modal');

    if (!this.container) {
      this.createContainer();
    }

    // 确保父容器可见
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) {
      modalContainer.classList.remove('hidden');
    }

    // 刷新道具列表（只在首次显示或道具变化时重新渲染）
    this.refreshInventory();

    // 显示面板
    this.container.classList.remove('hidden');

    // 绑定关闭事件（在渲染之后绑定）
    this.bindCloseEvents();
  }

  /**
   * 隐藏道具面板
   */
  hide() {
    if (this.container) {
      this.container.classList.add('hidden');
    }
    // 如果没有其他显示的模态框，则隐藏父容器
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) {
      const visibleModals = modalContainer.querySelectorAll('.inventory-modal:not(.hidden)');
      if (visibleModals.length === 0) {
        modalContainer.classList.add('hidden');
      }
    }
    this.selectedItem = null;
  }

  /**
   * 创建容器元素
   */
  createContainer() {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) {
      console.warn('未找到 modal-container 元素');
      return;
    }

    // 移除父容器的隐藏状态
    modalContainer.classList.remove('hidden');

    this.container = document.createElement('div');
    this.container.id = 'inventory-modal';
    this.container.className = 'inventory-modal';
    modalContainer.appendChild(this.container);
  }

  /**
   * 刷新道具列表
   */
  refreshInventory() {
    if (!this.container) return;

    // 获取所有道具
    this.items = this.engine.getInventory();

    // 渲染界面
    this.render();

    // 重新绑定关闭事件（因为render会重新创建DOM元素）
    this.bindCloseEvents();
  }

  /**
   * 渲染界面
   */
  render() {
    const filteredItems = this.getFilteredItems();

    this.container.innerHTML = `
      <div class="inventory-content">
        <div class="inventory-header">
          <h2 class="inventory-title">背包</h2>
          <button class="inventory-close" id="inventory-close-btn">&times;</button>
        </div>

        <div class="inventory-filters">
          <button class="filter-btn ${this.currentFilter === 'all' ? 'active' : ''}" data-filter="all">全部</button>
          <button class="filter-btn ${this.currentFilter === 'tool' ? 'active' : ''}" data-filter="tool">工具</button>
          <button class="filter-btn ${this.currentFilter === 'consumable' ? 'active' : ''}" data-filter="consumable">消耗品</button>
          <button class="filter-btn ${this.currentFilter === 'document' ? 'active' : ''}" data-filter="document">文件</button>
          <button class="filter-btn ${this.currentFilter === 'key' ? 'active' : ''}" data-filter="key">钥匙</button>
          <button class="filter-btn ${this.currentFilter === 'gear' ? 'active' : ''}" data-filter="gear">装备</button>
          <button class="filter-btn ${this.currentFilter === 'book' ? 'active' : ''}" data-filter="book">书籍</button>
        </div>

        <div class="inventory-body">
          <div class="inventory-grid" id="inventory-grid">
            ${this.renderItemGrid(filteredItems)}
          </div>

          <div class="inventory-details" id="inventory-details">
            ${this.renderDetailsPanel()}
          </div>
        </div>
      </div>
    `;

    // 绑定分类按钮事件
    this.bindFilterEvents();

    // 绑定道具点击事件
    this.bindItemClickEvents();

    // 绑定操作按钮事件
    this.bindActionEvents();
  }

  /**
   * 获取过滤后的道具
   */
  getFilteredItems() {
    if (this.currentFilter === 'all') {
      return this.items;
    }
    return this.items.filter(item => item.type === this.currentFilter);
  }

  /**
   * 渲染道具格子
   */
  renderItemGrid(items) {
    if (items.length === 0) {
      return '<div class="inventory-empty">背包中没有道具</div>';
    }

    let html = '';
    items.forEach(item => {
      const isSelected = this.selectedItem && this.selectedItem.id === item.id;
      html += `
        <div class="inventory-slot ${isSelected ? 'selected' : ''}" data-item-id="${item.id}">
          <span class="item-icon">${item.icon || '📦'}</span>
          <span class="item-name">${item.name}</span>
        </div>
      `;
    });

    return html;
  }

  /**
   * 渲染详情面板
   */
  renderDetailsPanel() {
    if (!this.selectedItem) {
      return '<div class="details-empty">选择一个道具查看详情</div>';
    }

    const item = this.selectedItem;

    // 构建效果描述
    let effectsText = '无特殊效果';
    if (item.effects) {
      const effectParts = [];
      if (item.effects.stamina) effectParts.push(`体力 ${item.effects.stamina > 0 ? '+' : ''}${item.effects.stamina}`);
      if (item.effects.sanity) effectParts.push(`理智 ${item.effects.sanity > 0 ? '+' : ''}${item.effects.sanity}`);
      if (item.effects.temperature) effectParts.push(`体温 ${item.effects.temperature > 0 ? '+' : ''}${item.effects.temperature}°C`);
      if (item.effects.intuition) effectParts.push(`直觉 +${item.effects.intuition}`);
      if (effectParts.length > 0) {
        effectsText = effectParts.join('，');
      }
    }

    // 判断是否可以使用
    const canUse = item.usable === true;
    const canCombine = this.checkCanCombine(item);

    return `
      <div class="details-header">
        <span class="details-icon">${item.icon || '📦'}</span>
        <span class="details-name">${item.name}</span>
      </div>
      <div class="details-description">
        <p>${item.description || '没有描述'}</p>
      </div>
      <div class="details-effects">
        <span class="effects-label">效果:</span>
        <span class="effects-value">${effectsText}</span>
      </div>
      <div class="details-type">
        <span class="type-label">类型:</span>
        <span class="type-value">${this.getTypeName(item.type)}</span>
      </div>
      <div class="details-actions">
        <button class="action-btn use-btn ${!canUse ? 'disabled' : ''}" id="item-use-btn" ${!canUse ? 'disabled' : ''}>
          使用
        </button>
        <button class="action-btn combine-btn ${!canCombine ? 'disabled' : ''}" id="item-combine-btn" ${!canCombine ? 'disabled' : ''}>
          组合
        </button>
        <button class="action-btn discard-btn" id="item-discard-btn">
          丢弃
        </button>
      </div>
      ${canCombine ? this.renderCombineHint() : ''}
    `;
  }

  /**
   * 渲染组合提示
   */
  renderCombineHint() {
    const combineResult = this.getCombineResult(this.selectedItem);
    if (!combineResult) return '';

    return `
      <div class="combine-hint">
        <span>可与 "${combineResult.ingredientName}" 组合成 "${combineResult.resultName}"</span>
      </div>
    `;
  }

  /**
   * 获取类型名称
   */
  getTypeName(type) {
    const typeNames = {
      'tool': '工具',
      'consumable': '消耗品',
      'document': '文件',
      'key': '钥匙',
      'gear': '装备',
      'book': '书籍',
    };
    return typeNames[type] || '其他';
  }

  /**
   * 检查是否可以组合
   */
  checkCanCombine(item) {
    if (!item.combinable) return false;
    return this.getCombineResult(item) !== null;
  }

  /**
   * 获取组合结果
   */
  getCombineResult(item) {
    if (!item || !item.combinable) return null;

    const recipes = this.engine.getItemRecipes();
    const inventoryIds = this.engine.state.getInventoryIds();

    for (const recipe of recipes) {
      if (recipe.ingredients.includes(item.id)) {
        // 检查是否有另一个素材在背包中
        const otherIngredient = recipe.ingredients.find(id => id !== item.id);
        if (otherIngredient && inventoryIds.includes(otherIngredient)) {
          const ingredientItem = this.engine.getItemData(otherIngredient);
          return {
            recipe: recipe,
            ingredientId: otherIngredient,
            ingredientName: ingredientItem ? ingredientItem.name : otherIngredient,
            resultName: recipe.resultName || recipe.resultId,
          };
        }
      }
    }

    return null;
  }

  /**
   * 绑定关闭事件
   */
  bindCloseEvents() {
    // 先移除之前的绑定，避免重复
    const oldCloseBtn = document.getElementById('inventory-close-btn');
    if (oldCloseBtn) {
      const newCloseBtn = oldCloseBtn.cloneNode(true);
      oldCloseBtn.parentNode.replaceChild(newCloseBtn, oldCloseBtn);
      newCloseBtn.addEventListener('click', () => this.hide());
    }

    // 点击背景关闭
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) {
      // 移除旧的点击事件
      modalContainer.onclick = null;
      modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) {
          this.hide();
        }
      });
    }
  }

  /**
   * 绑定分类按钮事件
   */
  bindFilterEvents() {
    const filterBtns = this.container.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentFilter = btn.dataset.filter;
        // 更新道具格子
        const grid = this.container.querySelector('#inventory-grid');
        if (grid) {
          const filteredItems = this.getFilteredItems();
          grid.innerHTML = this.renderItemGrid(filteredItems);
          this.bindItemClickEvents();
        }
      });
    });
  }

  /**
   * 绑定道具点击事件
   */
  bindItemClickEvents() {
    const slots = this.container.querySelectorAll('.inventory-slot[data-item-id]');
    slots.forEach(slot => {
      slot.addEventListener('click', () => {
        const itemId = slot.dataset.itemId;
        this.selectedItem = this.items.find(item => item.id === itemId);
        // 更新详情面板
        const details = this.container.querySelector('#inventory-details');
        if (details) {
          details.innerHTML = this.renderDetailsPanel();
          this.bindActionEvents();
        }
      });
    });
  }

  /**
   * 绑定操作按钮事件
   */
  bindActionEvents() {
    // 使用按钮
    const useBtn = document.getElementById('item-use-btn');
    if (useBtn) {
      useBtn.addEventListener('click', () => {
        if (this.selectedItem && this.selectedItem.usable) {
          this.useItem(this.selectedItem);
        }
      });
    }

    // 组合按钮
    const combineBtn = document.getElementById('item-combine-btn');
    if (combineBtn) {
      combineBtn.addEventListener('click', () => {
        if (this.selectedItem) {
          this.combineItem(this.selectedItem);
        }
      });
    }

    // 丢弃按钮
    const discardBtn = document.getElementById('item-discard-btn');
    if (discardBtn) {
      discardBtn.addEventListener('click', () => {
        if (this.selectedItem) {
          this.discardItem(this.selectedItem);
        }
      });
    }
  }

  /**
   * 使用道具
   */
  useItem(item) {
    const result = this.engine.useItem(item.id);

    if (result.success) {
      // 显示使用成功消息
      this.eventSystem.emit('feedback:show', {
        message: result.message || `使用了 ${item.name}`,
        type: 'success',
      });

      // 如果是消耗品，移除后刷新
      if (item.type === 'consumable') {
        this.selectedItem = null;
        this.refreshInventory();
      } else {
        this.refreshInventory();
      }

      // 触发道具使用事件
      this.eventSystem.emit('item:used', { itemId: item.id, result });
    } else {
      // 显示错误消息
      this.eventSystem.emit('feedback:show', {
        message: result.message || '无法使用此道具',
        type: 'danger',
      });
    }
  }

  /**
   * 组合道具
   */
  async combineItem(item) {
    const combineResult = this.getCombineResult(item);
    if (!combineResult) {
      this.eventSystem.emit('feedback:show', {
        message: '无法组合此道具',
        type: 'danger',
      });
      return;
    }

    // 确认组合
    const confirmed = await this.confirmModal.confirm('组合道具', `将 "${item.name}" 和 "${combineResult.ingredientName}" 组合成 "${combineResult.resultName}"？`, 'warning');
    if (confirmed) {
      const result = this.engine.combineItems(item.id, combineResult.ingredientId);

      if (result.success) {
        this.eventSystem.emit('feedback:show', {
          message: result.message || `组合成功: ${combineResult.resultName}`,
          type: 'success',
        });

        // 刷新背包
        this.selectedItem = null;
        this.refreshInventory();

        // 触发道具组合事件
        this.eventSystem.emit('item:combined', {
          itemId: item.id,
          ingredientId: combineResult.ingredientId,
          resultId: combineResult.recipe.resultId,
        });
      } else {
        this.eventSystem.emit('feedback:show', {
          message: result.message || '组合失败',
          type: 'danger',
        });
      }
    }
  }

  /**
   * 丢弃道具
   */
  async discardItem(item) {
    // 确认丢弃
    const confirmed = await this.confirmModal.confirm('丢弃道具', `确定要丢弃 "${item.name}" 吗？丢弃后无法找回。`, 'danger');
    if (confirmed) {
      const result = this.engine.discardItem(item.id);

      if (result.success) {
        this.eventSystem.emit('feedback:show', {
          message: `已丢弃 ${item.name}`,
          type: 'info',
        });

        // 刷新背包
        this.selectedItem = null;
        this.refreshInventory();

        // 触发道具丢弃事件
        this.eventSystem.emit('item:discarded', { itemId: item.id });
      } else {
        this.eventSystem.emit('feedback:show', {
          message: result.message || '丢弃失败',
          type: 'danger',
        });
      }
    }
  }
}
