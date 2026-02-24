/**
 * 道具管理器
 * 负责管理道具库存和使用
 */

import { DEFAULT_CONFIG } from '../utils/Constants.js';

export class InventoryManager {
    constructor(game) {
        this.game = game;
        this.selectedItem = null;
        this.combinationMode = false;
        this.firstCombineItem = null;
    }

    /**
     * 初始化道具管理器
     */
    init() {
        console.log('初始化道具管理器...');
        this.setupInventoryEventListeners();
    }

    /**
     * 设置库存事件监听器
     */
    setupInventoryEventListeners() {
        // 道具操作按钮事件
        const useBtn = document.getElementById('use-item');
        const examineBtn = document.getElementById('examine-item');
        const dropBtn = document.getElementById('drop-item');
        const combineBtn = document.getElementById('combine-item');

        if (useBtn) {
            useBtn.addEventListener('click', () => this.useSelectedItem());
        }

        if (examineBtn) {
            examineBtn.addEventListener('click', () => this.examineSelectedItem());
        }

        if (dropBtn) {
            dropBtn.addEventListener('click', () => this.dropSelectedItem());
        }

        if (combineBtn) {
            combineBtn.addEventListener('click', () => this.startCombineMode());
        }
    }

    /**
     * 获取玩家库存
     * @returns {Array} 道具列表
     */
    getInventory() {
        return this.game.gameState.getPlayerInventory();
    }

    /**
     * 获取库存数量
     * @returns {number} 道具数量
     */
    getInventoryCount() {
        return this.game.gameState.getInventoryCount();
    }

    /**
     * 检查库存是否已满
     * @returns {boolean} 是否已满
     */
    isInventoryFull() {
        return this.getInventoryCount() >= DEFAULT_CONFIG.MAX_INVENTORY_SLOTS;
    }

    /**
     * 添加道具到库存
     * @param {string} itemId - 道具ID
     * @returns {boolean} 是否添加成功
     */
    addItem(itemId) {
        const item = this.game.dataLoader.getItem(itemId);
        if (!item) {
            console.warn(`道具不存在: ${itemId}`);
            return false;
        }

        const success = this.game.gameState.addItemToInventory(item);
        if (success) {
            // 更新UI
            this.game.uiRenderer.updateInventoryUI();
            this.game.uiRenderer.updateGameInfo();

            // 触发事件
            this.game.eventSystem.emit('player:item:added', {
                itemId,
                item,
                inventoryCount: this.getInventoryCount()
            });
        }

        return success;
    }

    /**
     * 从库存移除道具
     * @param {string} itemId - 道具ID
     * @returns {Object|null} 被移除的道具
     */
    removeItem(itemId) {
        const removedItem = this.game.gameState.removeItemFromInventory(itemId);
        if (removedItem) {
            // 更新UI
            this.game.uiRenderer.updateInventoryUI();
            this.game.uiRenderer.updateGameInfo();

            // 触发事件
            this.game.eventSystem.emit('player:item:removed', {
                itemId,
                item: removedItem,
                inventoryCount: this.getInventoryCount()
            });
        }

        return removedItem;
    }

    /**
     * 检查库存是否包含道具
     * @param {string} itemId - 道具ID
     * @returns {boolean} 是否包含
     */
    hasItem(itemId) {
        return this.game.gameState.hasItemInInventory(itemId);
    }

    /**
     * 获取道具
     * @param {string} itemId - 道具ID
     * @returns {Object|null} 道具对象
     */
    getItem(itemId) {
        return this.game.gameState.getItemFromInventory(itemId);
    }

    /**
     * 使用选中的道具
     */
    useSelectedItem() {
        if (!this.selectedItem) {
            this.game.uiRenderer.addFeedback('系统', '请先选择道具', 'error');
            return;
        }

        const item = this.game.dataLoader.getItem(this.selectedItem);
        if (!item) {
            this.game.uiRenderer.addFeedback('系统', '道具不存在', 'error');
            return;
        }

        if (!item.usable) {
            this.game.uiRenderer.addFeedback('系统', '该道具无法使用', 'warning');
            return;
        }

        // 显示使用目标选择
        this.showUseTargetSelection(item);
    }

    /**
     * 显示使用目标选择
     * @param {Object} item - 道具对象
     */
    showUseTargetSelection(item) {
        // TODO: 实现使用目标选择界面
        // 暂时简单处理
        this.game.uiRenderer.addFeedback('系统', `使用了${item.name}，但需要指定使用目标`, 'warning');
    }

    /**
     * 检查选中的道具
     */
    examineSelectedItem() {
        if (!this.selectedItem) {
            this.game.uiRenderer.addFeedback('系统', '请先选择道具', 'error');
            return;
        }

        const item = this.game.dataLoader.getItem(this.selectedItem);
        if (!item) {
            this.game.uiRenderer.addFeedback('系统', '道具不存在', 'error');
            return;
        }

        // 显示道具详情
        this.showItemDetails(item);
    }

    /**
     * 显示道具详情
     * @param {Object} item - 道具对象
     */
    showItemDetails(item) {
        const modal = document.getElementById('item-modal');
        const title = document.getElementById('item-modal-title');
        const content = document.getElementById('item-modal-content');

        if (!modal || !title || !content) {
            console.error('道具详情模态框元素不存在');
            return;
        }

        // 设置标题和内容
        title.textContent = item.name;

        let detailsHTML = `
            <div class="item-modal-header">
                <i class="item-modal-icon ${item.icon || 'fas fa-question'}"></i>
                <div>
                    <h4 class="item-modal-title">${item.name}</h4>
                    <span class="item-modal-type">${item.type}</span>
                </div>
            </div>
            <div class="item-modal-body">
                <p class="item-description">${item.description}</p>
        `;

        if (item.detailed_description) {
            detailsHTML += `<p class="item-detailed">${item.detailed_description}</p>`;
        }

        detailsHTML += `
                <div class="item-properties">
                    <div class="property"><strong>稀有度:</strong> ${item.rarity || '普通'}</div>
                    <div class="property"><strong>可用:</strong> ${item.usable ? '是' : '否'}</div>
                    <div class="property"><strong>可组合:</strong> ${item.combinable ? '是' : '否'}</div>
                    <div class="property"><strong>可丢弃:</strong> ${item.droppable ? '是' : '否'}</div>
        `;

        if (item.use_effect) {
            detailsHTML += `<div class="property"><strong>使用效果:</strong> ${item.use_effect}</div>`;
        }

        if (item.use_scenes && item.use_scenes.length > 0) {
            detailsHTML += `<div class="property"><strong>使用场景:</strong> ${item.use_scenes.join('、')}</div>`;
        }

        if (item.combine_with && item.combine_with.length > 0) {
            const combineItems = item.combine_with.map(itemId => {
                const combineItem = this.game.dataLoader.getItem(itemId);
                return combineItem ? combineItem.name : itemId;
            });
            detailsHTML += `<div class="property"><strong>可组合道具:</strong> ${combineItems.join('、')}</div>`;
        }

        detailsHTML += `
                </div>
            </div>
        `;

        content.innerHTML = detailsHTML;

        // 显示模态框
        modal.style.display = 'flex';

        // 绑定关闭按钮事件
        const closeBtn = document.getElementById('close-item-modal');
        if (closeBtn) {
            closeBtn.onclick = () => this.closeItemModal();
        }
    }

    /**
     * 丢弃选中的道具
     */
    dropSelectedItem() {
        if (!this.selectedItem) {
            this.game.uiRenderer.addFeedback('系统', '请先选择道具', 'error');
            return;
        }

        const item = this.game.dataLoader.getItem(this.selectedItem);
        if (!item) {
            this.game.uiRenderer.addFeedback('系统', '道具不存在', 'error');
            return;
        }

        if (!item.droppable) {
            this.game.uiRenderer.addFeedback('系统', '该道具无法丢弃', 'warning');
            return;
        }

        // 确认丢弃
        if (confirm(`确定要丢弃${item.name}吗？`)) {
            this.removeItem(this.selectedItem);
            this.game.uiRenderer.addFeedback('系统', `丢弃了${item.name}`, 'normal');
            this.selectedItem = null;
        }
    }

    /**
     * 开始组合模式
     */
    startCombineMode() {
        if (!this.selectedItem) {
            this.game.uiRenderer.addFeedback('系统', '请先选择要组合的道具', 'error');
            return;
        }

        const item = this.game.dataLoader.getItem(this.selectedItem);
        if (!item) {
            this.game.uiRenderer.addFeedback('系统', '道具不存在', 'error');
            return;
        }

        if (!item.combinable) {
            this.game.uiRenderer.addFeedback('系统', '该道具无法组合', 'warning');
            return;
        }

        this.combinationMode = true;
        this.firstCombineItem = this.selectedItem;

        this.game.uiRenderer.addFeedback('系统', `组合模式：已选择${item.name}，请选择第二个道具`, 'info');
    }

    /**
     * 组合两个道具
     * @param {string} secondItemId - 第二个道具ID
     */
    combineItems(secondItemId) {
        if (!this.firstCombineItem) {
            this.game.uiRenderer.addFeedback('系统', '请先选择第一个道具', 'error');
            return;
        }

        const firstItem = this.game.dataLoader.getItem(this.firstCombineItem);
        const secondItem = this.game.dataLoader.getItem(secondItemId);

        if (!firstItem || !secondItem) {
            this.game.uiRenderer.addFeedback('系统', '道具不存在', 'error');
            this.resetCombineMode();
            return;
        }

        // 检查是否可以组合
        if (!this.canCombineItems(firstItem, secondItem)) {
            this.game.uiRenderer.addFeedback('系统', `${firstItem.name}和${secondItem.name}无法组合`, 'warning');
            this.resetCombineMode();
            return;
        }

        // 执行组合
        this.executeCombination(firstItem, secondItem);
    }

    /**
     * 检查是否可以组合道具
     * @param {Object} firstItem - 第一个道具
     * @param {Object} secondItem - 第二个道具
     * @returns {boolean} 是否可以组合
     */
    canCombineItems(firstItem, secondItem) {
        // 检查第一个道具的可组合列表
        if (firstItem.combine_with && firstItem.combine_with.includes(secondItem.id)) {
            return true;
        }

        // 检查第二个道具的可组合列表
        if (secondItem.combine_with && secondItem.combine_with.includes(firstItem.id)) {
            return true;
        }

        return false;
    }

    /**
     * 执行组合
     * @param {Object} firstItem - 第一个道具
     * @param {Object} secondItem - 第二个道具
     */
    executeCombination(firstItem, secondItem) {
        // 查找组合结果
        const combination = this.findCombinationResult(firstItem.id, secondItem.id);
        if (!combination) {
            this.game.uiRenderer.addFeedback('系统', '组合失败', 'error');
            this.resetCombineMode();
            return;
        }

        // 移除原道具
        this.removeItem(firstItem.id);
        this.removeItem(secondItem.id);

        // 添加新道具
        const newItem = this.game.dataLoader.getItem(combination.result);
        if (newItem) {
            this.addItem(newItem.id);
            this.game.uiRenderer.addFeedback('系统', `组合成功！获得了${newItem.name}`, 'success');
        }

        this.resetCombineMode();
    }

    /**
     * 查找组合结果
     * @param {string} firstItemId - 第一个道具ID
     * @param {string} secondItemId - 第二个道具ID
     * @returns {Object|null} 组合结果
     */
    findCombinationResult(firstItemId, secondItemId) {
        // TODO: 从数据中查找组合配方
        // 暂时返回一个简单的组合结果
        const combinations = {
            'item_fragment_a+item_fragment_b': { result: 'item_complete' },
            'item_fragment_b+item_fragment_a': { result: 'item_complete' }
        };

        const key1 = `${firstItemId}+${secondItemId}`;
        const key2 = `${secondItemId}+${firstItemId}`;

        return combinations[key1] || combinations[key2] || null;
    }

    /**
     * 重置组合模式
     */
    resetCombineMode() {
        this.combinationMode = false;
        this.firstCombineItem = null;
    }

    /**
     * 关闭道具详情模态框
     */
    closeItemModal() {
        const modal = document.getElementById('item-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * 选择道具
     * @param {string} itemId - 道具ID
     */
    selectItem(itemId) {
        this.selectedItem = itemId;

        // 如果处于组合模式，尝试组合道具
        if (this.combinationMode && this.firstCombineItem && this.firstCombineItem !== itemId) {
            this.combineItems(itemId);
        }
    }

    /**
     * 使用道具对目标
     * @param {string} itemId - 道具ID
     * @param {string} targetId - 目标ID
     * @returns {boolean} 是否使用成功
     */
    useItemOnTarget(itemId, targetId) {
        const item = this.game.dataLoader.getItem(itemId);
        if (!item) {
            this.game.uiRenderer.addFeedback('系统', '道具不存在', 'error');
            return false;
        }

        if (!item.usable) {
            this.game.uiRenderer.addFeedback('系统', '该道具无法使用', 'warning');
            return false;
        }

        // 检查使用条件
        if (!this.checkItemUseConditions(item, targetId)) {
            return false;
        }

        // 执行使用效果
        const success = this.executeItemUse(item, targetId);
        if (success) {
            // 触发事件
            this.game.eventSystem.emit('player:item:used', {
                itemId,
                item,
                targetId,
                success
            });

            // 如果是消耗品，从库存移除
            if (item.disposable) {
                this.removeItem(itemId);
            }
        }

        return success;
    }

    /**
     * 检查道具使用条件
     * @param {Object} item - 道具对象
     * @param {string} targetId - 目标ID
     * @returns {boolean} 是否满足条件
     */
    checkItemUseConditions(item, targetId) {
        // 检查使用场景
        if (item.use_scenes && item.use_scenes.length > 0) {
            const currentLocation = this.game.gameState.getPlayerLocation();
            if (!item.use_scenes.includes(currentLocation)) {
                this.game.uiRenderer.addFeedback('系统', '无法在此场景使用该道具', 'warning');
                return false;
            }
        }

        // 检查目标是否有效
        // TODO: 实现目标检查逻辑
        return true;
    }

    /**
     * 执行道具使用
     * @param {Object} item - 道具对象
     * @param {string} targetId - 目标ID
     * @returns {boolean} 是否使用成功
     */
    executeItemUse(item, targetId) {
        // TODO: 实现具体的使用效果
        // 暂时简单处理
        this.game.uiRenderer.addFeedback('系统', `对${targetId}使用了${item.name}`, 'normal');

        if (item.use_effect) {
            this.game.uiRenderer.addFeedback('系统', item.use_effect, 'info');
        }

        return true;
    }

    /**
     * 获取道具使用提示
     * @param {string} itemId - 道具ID
     * @returns {string} 使用提示
     */
    getItemUseHint(itemId) {
        const item = this.game.dataLoader.getItem(itemId);
        if (!item) return '';

        if (item.use_scenes && item.use_scenes.length > 0) {
            return `可在以下场景使用：${item.use_scenes.join('、')}`;
        }

        if (item.use_effect) {
            return `效果：${item.use_effect}`;
        }

        return '暂无使用信息';
    }

    /**
     * 获取道具组合提示
     * @param {string} itemId - 道具ID
     * @returns {string} 组合提示
     */
    getItemCombineHint(itemId) {
        const item = this.game.dataLoader.getItem(itemId);
        if (!item || !item.combine_with || item.combine_with.length === 0) {
            return '';
        }

        const combineItems = item.combine_with.map(otherItemId => {
            const otherItem = this.game.dataLoader.getItem(otherItemId);
            return otherItem ? otherItem.name : otherItemId;
        });

        return `可与以下道具组合：${combineItems.join('、')}`;
    }
}