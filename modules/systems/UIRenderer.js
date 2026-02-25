/**
 * UI渲染器
 * 负责统一管理所有UI渲染和更新
 */

import {
    INTERACTIVE_TYPES,
    COLOR_CLASSES,
    COLOR_MAPPING,
    DIRECTIONS,
    DIRECTION_DISPLAY_NAMES
} from '../utils/Constants.js';
import { formatTime } from '../utils/Helpers.js';

export class UIRenderer {
    constructor(game) {
        this.game = game;
    }

    /**
     * 初始化UI渲染器
     */
    init() {
        console.log('初始化UI渲染器...');
        this.setupUIEventListeners();
        this.updateAllUI();
    }

    /**
     * 设置UI事件监听器
     */
    setupUIEventListeners() {
        // 快捷按钮事件
        this.setupQuickButtonListeners();

        // 面板关闭按钮事件
        this.setupPanelCloseListeners();

        // 模态框关闭按钮事件
        this.setupModalCloseListeners();

        // 清空反馈按钮事件
        const clearFeedbackBtn = document.getElementById('clear-feedback');
        if (clearFeedbackBtn) {
            clearFeedbackBtn.addEventListener('click', () => this.clearFeedback());
        }
    }

    /**
     * 设置快捷按钮事件监听器
     */
    setupQuickButtonListeners() {
        const buttonIds = [
            'btn-inventory',
            'btn-map',
            'btn-notebook',
            'btn-tasks',
            'btn-save',
            'btn-load',
            'btn-settings',
            'btn-status',
            'btn-help'
        ];

        buttonIds.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => this.handleQuickButtonClick(buttonId));
            }
        });
    }

    /**
     * 设置面板关闭按钮事件监听器
     */
    setupPanelCloseListeners() {
        const closeButtons = [
            'close-inventory',
            'close-map',
            'close-notebook',
            'close-tasks',
            'close-status'
        ];

        closeButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => this.closePanel(buttonId.replace('close-', '')));
            }
        });
    }

    /**
     * 设置模态框关闭按钮事件监听器
     */
    setupModalCloseListeners() {
        const modalCloseButtons = [
            'close-dialog',
            'close-hint',
            'close-item-modal',
            'close-interactive'
        ];

        modalCloseButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                const modalType = buttonId.replace('close-', '');
                button.addEventListener('click', () => this.closeModal(modalType));
            }
        });
    }

    /**
     * 处理快捷按钮点击
     * @param {string} buttonId - 按钮ID
     */
    handleQuickButtonClick(buttonId) {
        switch (buttonId) {
            case 'btn-inventory':
                this.togglePanel('inventory');
                break;
            case 'btn-map':
                this.togglePanel('map');
                break;
            case 'btn-notebook':
                this.togglePanel('notebook');
                break;
            case 'btn-tasks':
                this.togglePanel('tasks');
                break;
            case 'btn-status':
                this.togglePanel('status');
                break;
            case 'btn-save':
                this.saveGame();
                break;
            case 'btn-load':
                this.loadGame();
                break;
            case 'btn-settings':
                this.showSettings();
                break;
            case 'btn-help':
                this.showHelp();
                break;
        }
    }

    /**
     * 切换面板显示
     * @param {string} panelType - 面板类型
     */
    togglePanel(panelType) {
        const panelId = `${panelType}-panel`;
        const panel = document.getElementById(panelId);

        if (!panel) return;

        // 隐藏所有其他面板
        this.hideAllPanels();

        // 切换当前面板
        if (panel.style.display === 'block') {
            panel.style.display = 'none';
        } else {
            panel.style.display = 'block';
            this.updatePanelContent(panelType);
        }
    }

    /**
     * 隐藏所有面板
     */
    hideAllPanels() {
        const panels = [
            'inventory-panel',
            'map-panel',
            'notebook-panel',
            'tasks-panel',
            'status-panel'
        ];

        panels.forEach(panelId => {
            const panel = document.getElementById(panelId);
            if (panel) {
                panel.style.display = 'none';
            }
        });
    }

    /**
     * 关闭面板
     * @param {string} panelType - 面板类型
     */
    closePanel(panelType) {
        const panel = document.getElementById(`${panelType}-panel`);
        if (panel) {
            panel.style.display = 'none';
        }
    }

    /**
     * 关闭模态框
     * @param {string} modalType - 模态框类型
     */
    closeModal(modalType) {
        const modal = document.getElementById(`${modalType}-modal`);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * 更新面板内容
     * @param {string} panelType - 面板类型
     */
    updatePanelContent(panelType) {
        switch (panelType) {
            case 'inventory':
                this.updateInventoryUI();
                break;
            case 'map':
                this.updateMapUI();
                break;
            case 'notebook':
                this.updateNotebookUI();
                break;
            case 'tasks':
                this.updateTasksUI();
                break;
            case 'status':
                this.updateStatusUI();
                break;
        }
    }

    /**
     * 更新所有UI
     */
    updateAllUI() {
        this.updateGameInfo();
        this.updateSceneUI();
        this.updateInventoryUI();
        this.updateMapUI();
        this.updateNotebookUI();
        this.updateTasksUI();
        this.updateStatusUI();
    }

    /**
     * 更新游戏信息
     */
    updateGameInfo() {
        // 更新时间显示
        const timeDisplay = document.getElementById('game-time');
        if (timeDisplay) {
            const worldState = this.game.gameState.getWorldState();
            timeDisplay.textContent = `${worldState.date} ${formatTime(worldState.time)}`;
        }

        // 更新天气显示
        const weatherDisplay = document.getElementById('game-weather');
        if (weatherDisplay) {
            const worldState = this.game.gameState.getWorldState();
            weatherDisplay.textContent = worldState.weather || '未知';
        }

        // 更新状态显示
        this.updateStatusDisplay();
    }

    /**
     * 更新状态显示
     */
    updateStatusDisplay() {
        const player = this.game.gameState.getPlayerState();

        // 体力显示
        const staminaValue = document.getElementById('stamina-value');
        if (staminaValue) {
            staminaValue.textContent = `${player.stamina.current}/${player.stamina.max}`;
        }

        // 体温显示
        const temperatureValue = document.getElementById('temperature-value');
        if (temperatureValue) {
            temperatureValue.textContent = player.body_temperature.current.toFixed(1);
        }

        // 理智显示
        const sanityValue = document.getElementById('sanity-value');
        if (sanityValue) {
            sanityValue.textContent = `${player.sanity.current}/${player.sanity.max}`;
        }

        // 库存数量显示
        const inventoryCount = document.getElementById('inventory-count');
        if (inventoryCount) {
            const count = this.game.gameState.getInventoryCount();
            inventoryCount.textContent = `${count}/12`;
        }

        // 线索数量显示
        const clueCount = document.getElementById('clue-count');
        if (clueCount) {
            const clues = this.game.gameState.getClues();
            clueCount.textContent = clues.length;
        }

        // 任务数量显示
        const taskCount = document.getElementById('task-count');
        if (taskCount) {
            const quests = this.game.gameState.getQuests();
            const activeCount = quests.active.length;
            taskCount.textContent = activeCount;
        }
    }

    /**
     * 更新场景UI
     */
    updateSceneUI() {
        const locationId = this.game.gameState.getPlayerLocation();
        const location = this.game.dataLoader.getLocation(locationId);

        if (!location) {
            console.error(`位置不存在: ${locationId}`);
            return;
        }

        // 更新位置名称
        const locationName = document.getElementById('location-name');
        if (locationName) {
            locationName.textContent = location.name;
        }

        // 更新位置路径
        const locationPath = document.getElementById('location-path');
        if (locationPath) {
            // TODO: 实现位置路径显示
            locationPath.textContent = location.name;
        }

        // 更新场景描述
        this.updateSceneDescription(location);

        // 更新场景图片
        this.updateSceneImage(locationId);

        // 更新导航按钮
        this.updateNavigationButtons(location);

        // 如果地图面板是打开的，更新地图显示
        const mapPanel = document.getElementById('map-panel');
        if (mapPanel && mapPanel.style.display === 'block') {
            this.updateMapUI();
        }
    }

    /**
     * 更新场景描述
     * @param {Object} location - 位置数据
     */
    updateSceneDescription(location) {
        const sceneDescription = document.getElementById('scene-description');
        if (!sceneDescription) return;

        let description = location.description || '暂无描述';

        // 处理交互对象高亮
        if (location.interactives && location.interactives.length > 0) {
            description = this.processDescriptionWithHighlights(description, location.interactives);
        }

        sceneDescription.innerHTML = description;
    }

    /**
     * 处理带高亮的描述
     * @param {string} description - 原始描述
     * @param {Array} interactives - 交互对象列表
     * @returns {string} 处理后的描述
     */
    processDescriptionWithHighlights(description, interactives) {
        // 没有交互元素，只处理换行
        if (!interactives || interactives.length === 0) {
            return description.replace(/\n/g, '<br>');
        }

        // 类型到CSS类的映射（对应CSS中的颜色高亮类）
        const typeToClass = {
            [INTERACTIVE_TYPES.EXAMINE]: 'blue-highlight',
            [INTERACTIVE_TYPES.COLLECT]: 'green-highlight',
            [INTERACTIVE_TYPES.CLUE]: 'yellow-highlight',
            [INTERACTIVE_TYPES.DANGER]: 'red-highlight',
            [INTERACTIVE_TYPES.NPC]: 'purple-highlight',
            [INTERACTIVE_TYPES.INTERACT]: 'orange-highlight',
            [INTERACTIVE_TYPES.LOCATION]: 'blue-highlight'
        };

        // 按照名称长度降序排序，避免较短名称匹配较长名称的一部分
        const sortedInteractives = [...interactives].sort((a, b) => b.name.length - a.name.length);

        let processedDescription = description;

        // 对每个交互元素，在描述中查找名称并替换为高亮元素
        sortedInteractives.forEach(interactive => {
            const className = typeToClass[interactive.type] || 'blue-highlight';

            // 转义正则表达式特殊字符
            const escapedName = interactive.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedName, 'g');

            // 检查是否有匹配
            const matches = processedDescription.match(regex);
            if (matches) {
                console.log(`找到匹配: ${interactive.name} (类型: ${interactive.type}, 类: ${className}, 匹配次数: ${matches.length})`);

                // 替换为带高亮样式的元素
                const replacement = `<span class="${className} interactable" data-id="${interactive.id}" data-type="${interactive.type}" data-name="${interactive.name}" title="点击${interactive.name}">${interactive.name}</span>`;
                processedDescription = processedDescription.replace(regex, replacement);
            } else {
                console.log(`未找到匹配: ${interactive.name} 在描述中`);
            }
        });

        // 处理换行符
        processedDescription = processedDescription.replace(/\n/g, '<br>');

        return processedDescription;
    }

    /**
     * 更新导航按钮
     * @param {Object} location - 位置数据
     */
    updateNavigationButtons(location) {
        // 重置标准方向按钮
        const standardDirections = [DIRECTIONS.NORTH, DIRECTIONS.SOUTH, DIRECTIONS.EAST, DIRECTIONS.WEST];
        standardDirections.forEach(direction => {
            const button = document.getElementById(`btn-${direction}`);
            if (button) {
                button.disabled = true;
                button.style.display = 'none';
            }
        });

        // 清空特殊方向按钮
        const specialNavButtons = document.getElementById('special-nav-buttons');
        if (specialNavButtons) {
            specialNavButtons.innerHTML = '';
        }

        // 更新可用出口
        if (location.exits && location.exits.length > 0) {
            location.exits.forEach(exit => {
                this.createNavigationButton(exit);
            });
        }
    }

    /**
     * 创建导航按钮
     * @param {Object} exit - 出口数据
     */
    createNavigationButton(exit) {
        const direction = exit.direction;
        const displayName = DIRECTION_DISPLAY_NAMES[direction] || direction;

        // 检查是否为标准方向
        const standardButton = document.getElementById(`btn-${direction}`);
        if (standardButton) {
            standardButton.disabled = exit.locked || false;
            standardButton.style.display = 'block';
            standardButton.dataset.target = exit.target;
            return;
        }

        // 创建特殊方向按钮
        const specialNavButtons = document.getElementById('special-nav-buttons');
        if (!specialNavButtons) return;

        const btn = document.createElement('button');
        btn.className = 'special-nav-btn';
        btn.dataset.direction = direction;
        btn.dataset.target = exit.target;
        btn.innerHTML = `<i class="fas fa-arrow-right"></i> ${displayName}`;
        btn.title = `前往: ${exit.description}`;
        btn.disabled = exit.locked || false;

        btn.addEventListener('click', () => {
            this.game.moveSystem.move(direction);
        });

        specialNavButtons.appendChild(btn);
    }

    /**
     * 更新库存UI
     */
    updateInventoryUI() {
        const inventoryGrid = document.getElementById('inventory-grid');
        const selectedItemInfo = document.getElementById('selected-item-info');
        const itemActions = document.getElementById('item-actions');

        if (!inventoryGrid || !selectedItemInfo || !itemActions) return;

        // 清空库存网格
        inventoryGrid.innerHTML = '';

        // 获取玩家库存
        const inventory = this.game.gameState.getPlayerInventory();

        // 创建道具槽位
        for (let i = 0; i < 12; i++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            slot.dataset.slotIndex = i;

            if (i < inventory.length) {
                const item = inventory[i];
                slot.classList.add('filled');
                slot.dataset.itemId = item.id;
                slot.title = item.name;

                // 添加道具图标
                const icon = document.createElement('i');
                icon.className = `item-icon ${item.icon || 'fas fa-question'}`;
                slot.appendChild(icon);

                // 添加点击事件
                slot.addEventListener('click', () => this.selectInventoryItem(item.id));
            }

            inventoryGrid.appendChild(slot);
        }

        // 重置选中道具信息
        selectedItemInfo.innerHTML = '<p>点击道具查看详细信息</p>';

        // 禁用所有道具操作按钮
        const actionButtons = itemActions.querySelectorAll('.action-btn');
        actionButtons.forEach(button => {
            button.disabled = true;
        });
    }

    /**
     * 选中库存道具
     * @param {string} itemId - 道具ID
     */
    selectInventoryItem(itemId) {
        const item = this.game.dataLoader.getItem(itemId);
        if (!item) return;

        // 更新选中道具信息
        const selectedItemInfo = document.getElementById('selected-item-info');
        if (selectedItemInfo) {
            selectedItemInfo.innerHTML = `
                <h4>${item.name}</h4>
                <p class="item-type">类型: ${item.type}</p>
                <p class="item-description">${item.description}</p>
            `;
        }

        // 启用道具操作按钮
        const useBtn = document.getElementById('use-item');
        const examineBtn = document.getElementById('examine-item');
        const dropBtn = document.getElementById('drop-item');
        const combineBtn = document.getElementById('combine-item');

        if (useBtn) useBtn.disabled = !item.usable;
        if (examineBtn) examineBtn.disabled = false;
        if (dropBtn) dropBtn.disabled = !item.droppable;
        if (combineBtn) combineBtn.disabled = !item.combinable;

        // 存储当前选中的道具
        this.game.selectedItem = item;
    }

    /**
     * 更新地图UI
     */
    updateMapUI() {
        const mapDisplay = document.getElementById('map-display');
        if (!mapDisplay) return;

        // 使用MapManager生成地图HTML
        if (this.game.mapManager) {
            const mapHTML = this.game.mapManager.getMapHTML();
            mapDisplay.innerHTML = mapHTML;

            // 绑定地图节点点击事件
            this.bindMapNodeEvents();
        } else {
            mapDisplay.innerHTML = '<div class="map-error">地图管理器未初始化</div>';
        }
    }

    /**
     * 更新笔记UI
     */
    updateNotebookUI() {
        const cluesList = document.getElementById('clues-list');
        if (!cluesList) return;

        const clues = this.game.gameState.getClues();

        if (clues.length === 0) {
            cluesList.innerHTML = '<div class="empty-message">尚未发现任何线索</div>';
            return;
        }

        // 按类别分组线索
        const cluesByCategory = {};
        clues.forEach(clue => {
            const category = clue.category || '其他';
            if (!cluesByCategory[category]) {
                cluesByCategory[category] = [];
            }
            cluesByCategory[category].push(clue);
        });

        // 生成HTML
        let html = '';
        for (const [category, categoryClues] of Object.entries(cluesByCategory)) {
            html += `
                <div class="clue-category">
                    <h4>${category}</h4>
            `;

            categoryClues.forEach(clue => {
                html += `
                    <div class="clue-item">
                        <div class="clue-title">${clue.title}</div>
                        <div class="clue-content">${clue.content}</div>
                    </div>
                `;
            });

            html += `</div>`;
        }

        cluesList.innerHTML = html;
    }

    /**
     * 更新任务UI
     */
    updateTasksUI() {
        console.log('🔄 更新任务UI...');
        const tasksList = document.getElementById('tasks-list');
        if (!tasksList) {
            console.warn('⚠️ 未找到任务列表元素');
            return;
        }

        const quests = this.game.gameState.getQuests();
        const activeQuests = quests.active;
        const completedQuests = quests.completed;

        console.log(`📊 任务状态: 进行中 ${activeQuests.length} 个, 已完成 ${completedQuests.length} 个`);

        if (activeQuests.length === 0 && completedQuests.length === 0) {
            tasksList.innerHTML = '<div class="empty-message">暂无任务</div>';
            console.log('📝 显示"暂无任务"');
            return;
        }

        let html = '';

        // 进行中的任务
        if (activeQuests.length > 0) {
            html += '<div class="task-category"><h4>进行中的任务</h4>';
            activeQuests.forEach(questId => {
                const quest = this.game.dataLoader.getQuest(questId);
                if (quest) {
                    console.log(`📋 添加进行中任务: ${quest.name} (${questId})`);
                    html += this.createTaskHTML(quest, false);
                } else {
                    console.warn(`⚠️ 未找到任务数据: ${questId}`);
                }
            });
            html += '</div>';
        }

        // 已完成的任务
        if (completedQuests.length > 0) {
            html += '<div class="task-category"><h4>已完成的任务</h4>';
            completedQuests.forEach(questId => {
                const quest = this.game.dataLoader.getQuest(questId);
                if (quest) {
                    console.log(`✅ 添加已完成任务: ${quest.name} (${questId})`);
                    html += this.createTaskHTML(quest, true);
                } else {
                    console.warn(`⚠️ 未找到任务数据: ${questId}`);
                }
            });
            html += '</div>';
        }

        tasksList.innerHTML = html;
        console.log('✅ 任务UI更新完成');
    }

    /**
     * 绑定地图节点点击事件
     */
    bindMapNodeEvents() {
        const mapNodes = document.querySelectorAll('.map-node');
        mapNodes.forEach(node => {
            node.addEventListener('click', (e) => {
                const locationId = e.currentTarget.dataset.locationId;
                if (locationId) {
                    this.handleMapNodeClick(locationId);
                }
            });
        });
    }

    /**
     * 处理地图节点点击
     * @param {string} locationId - 位置ID
     */
    handleMapNodeClick(locationId) {
        // 检查是否可以移动到该位置
        const currentLocation = this.game.gameState.getPlayerLocation();
        if (currentLocation === locationId) {
            this.addFeedback('系统', '你已经在当前位置', 'info');
            return;
        }

        // 检查位置是否可达
        if (this.game.mapManager && this.game.mapManager.isLocationReachable(currentLocation, locationId)) {
            // 获取连接信息
            const connections = this.game.mapManager.getLocationConnections(currentLocation);
            const connection = connections.find(conn =>
                conn.from === locationId || conn.to === locationId
            );

            if (connection) {
                // 移动到该位置
                const direction = connection.from === currentLocation ? connection.direction :
                                 this.getReverseDirection(connection.direction);
                this.game.moveSystem.move(direction);
            } else {
                this.addFeedback('系统', '无法直接移动到该位置', 'warning');
            }
        } else {
            this.addFeedback('系统', '该位置不可达或尚未探索', 'warning');
        }
    }

    /**
     * 获取反向方向
     * @param {string} direction - 原始方向
     * @returns {string} 反向方向
     */
    getReverseDirection(direction) {
        const reverseMap = {
            'north': 'south',
            'south': 'north',
            'east': 'west',
            'west': 'east',
            'northeast': 'southwest',
            'northwest': 'southeast',
            'southeast': 'northwest',
            'southwest': 'northeast',
            'up': 'down',
            'down': 'up',
            'in': 'out',
            'out': 'in',
            'enter': 'leave',
            'leave': 'enter'
        };
        return reverseMap[direction] || direction;
    }

    /**
     * 创建任务HTML
     * @param {Object} quest - 任务数据
     * @param {boolean} completed - 是否已完成
     * @returns {string} 任务HTML
     */
    createTaskHTML(quest, completed) {
        let stepsHtml = '';

        if (quest.steps && Array.isArray(quest.steps)) {
            quest.steps.forEach(step => {
                stepsHtml += `
                    <div class="task-step ${completed ? 'completed' : ''}">
                        <i class="fas fa-${completed ? 'check' : 'circle'}"></i>
                        ${step.description}
                    </div>
                `;
            });
        }

        return `
            <div class="task-item ${completed ? 'completed' : ''}">
                <div class="task-header">
                    <i class="fas fa-${completed ? 'check-circle' : 'circle'}"></i>
                    ${quest.name}
                </div>
                <div class="task-description">${quest.description}</div>
                <div class="task-steps">${stepsHtml}</div>
            </div>
        `;
    }

    /**
     * 更新状态UI
     */
    updateStatusUI() {
        const statusDisplay = document.getElementById('status-display');
        if (!statusDisplay) return;

        const statusHTML = this.game.statusManager.getStatusHTML();
        statusDisplay.innerHTML = statusHTML;

        // 绑定状态动作按钮事件
        this.bindStatusActionButtons();
    }

    /**
     * 绑定状态动作按钮事件
     */
    bindStatusActionButtons() {
        const restBtn = document.getElementById('rest-btn');
        const warmUpBtn = document.getElementById('warm-up-btn');
        const calmBtn = document.getElementById('calm-btn');
        const statusDetailsBtn = document.getElementById('status-details-btn');

        if (restBtn) {
            restBtn.addEventListener('click', () => this.game.statusManager.rest());
        }

        if (warmUpBtn) {
            warmUpBtn.addEventListener('click', () => this.game.statusManager.warmUp());
        }

        if (calmBtn) {
            calmBtn.addEventListener('click', () => this.game.statusManager.calmDown());
        }

        if (statusDetailsBtn) {
            statusDetailsBtn.addEventListener('click', () => this.showStatusDetails());
        }
    }

    /**
     * 显示状态详情
     */
    showStatusDetails() {
        const statusInfo = this.game.statusManager.getAllStatusInfo();
        let detailsHTML = `
            <h4>状态详情</h4>
            <div class="status-details">
                <div class="detail-item">
                    <strong>体力:</strong> ${statusInfo.stamina.current}/${statusInfo.stamina.max} (${statusInfo.stamina.percentage.toFixed(1)}%)
                    <br><small>${statusInfo.stamina.effect}</small>
                </div>
                <div class="detail-item">
                    <strong>理智:</strong> ${statusInfo.sanity.current}/${statusInfo.sanity.max} (${statusInfo.sanity.percentage.toFixed(1)}%)
                    <br><small>${statusInfo.sanity.effect}</small>
                </div>
                <div class="detail-item">
                    <strong>体温:</strong> ${statusInfo.temperature.current.toFixed(1)}°C (正常范围: ${statusInfo.temperature.normal_range[0]}-${statusInfo.temperature.normal_range[1]}°C)
                    <br><small>${statusInfo.temperature.effect}</small>
                </div>
                <div class="detail-item">
                    <strong>隐藏状态:</strong>
                    <br>直觉: ${statusInfo.hidden_states.intuition}%
                    <br>疑心: ${statusInfo.hidden_states.suspicion}%
                    <br>运气: ${statusInfo.hidden_states.luck}%
                    <br>创伤等级: ${statusInfo.hidden_states.trauma_level}%
                </div>
            </div>
        `;

        this.addFeedback('系统', detailsHTML, 'info');
    }

    /**
     * 添加反馈信息
     * @param {string} sender - 发送者
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型
     */
    addFeedback(sender, message, type = 'normal') {
        const feedbackContent = document.getElementById('feedback-content');
        if (!feedbackContent) return;

        const feedbackItem = document.createElement('div');
        feedbackItem.className = `feedback-item ${type}`;
        feedbackItem.innerHTML = `<strong>${sender}:</strong> ${message}`;

        feedbackContent.appendChild(feedbackItem);

        // 自动滚动到底部
        feedbackContent.scrollTop = feedbackContent.scrollHeight;
    }

    /**
     * 清空反馈信息
     */
    clearFeedback() {
        const feedbackContent = document.getElementById('feedback-content');
        if (feedbackContent) {
            feedbackContent.innerHTML = '<div class="feedback-item system">系统：游戏开始。欢迎来到《悬观谜案：百年轮回》。</div>';
        }
    }

    /**
     * 保存游戏
     */
    saveGame() {
        const success = this.game.gameState.saveToLocalStorage();
        if (success) {
            this.addFeedback('系统', '游戏已保存', 'success');
        } else {
            this.addFeedback('系统', '保存游戏失败', 'error');
        }
    }

    /**
     * 加载游戏
     */
    loadGame() {
        const success = this.game.gameState.loadFromLocalStorage();
        if (success) {
            this.addFeedback('系统', '游戏已加载好', 'success');
            this.updateAllUI();
        } else {
            this.addFeedback('系统', '加载游戏失败', 'error');
        }
    }

    /**
     * 显示设置
     */
    showSettings() {
        this.addFeedback('系统', '设置功能开发中...', 'info');
    }

    /**
     * 更新场景图片
     * @param {string} locationId - 位置ID
     */
    updateSceneImage(locationId) {
        // 场景图片映射表
        const sceneImageMap = {
            // 第一章已定义的位置
            'college_dorm': 'college_dorm.png',
            'subway_station': 'subway_station.png',
            'train_station': 'train_station.png',
            'mountain_bus': 'mountain_bus.png',
            'county_station': 'county_station.png',
            'mountain_road': 'mountain_road.png',

            // 后续章节可能的位置（占位符）
            'stone_gate': 'stone_gate.png',
            'courtyard': 'courtyard.png',
            'main_hall': 'main_hall.png'
            // 添加更多场景的图片映射
        };

        // 实际存在的图片文件列表（根据assets/scenes目录中的文件）
        const existingImages = {
            'college_dorm.png': true,
            // 以下图片文件目前不存在，但允许尝试加载（加载失败会显示占位符）
            'subway_station.png': true,
            'train_station.png': true,
            'mountain_bus.png': true,
            'county_station.png': true,
            'mountain_road.png': true,
            'stone_gate.png': true,
            'courtyard.png': true,
            'main_hall.png': true
        };

        const imageContainer = document.getElementById('scene-image-container');

        // 检查是否有映射的图片文件
        if (sceneImageMap[locationId]) {
            const imageFileName = sceneImageMap[locationId];
            const imageUrl = `assets/scenes/${imageFileName}`;

            // 检查图片文件是否实际存在
            if (existingImages[imageFileName]) {
                // 图片文件存在，尝试加载
                const img = new Image();
                img.src = imageUrl;
                img.alt = `场景：${locationId}`;
                img.onload = () => {
                    // 图片加载成功，替换占位符
                    imageContainer.innerHTML = '';
                    imageContainer.appendChild(img);
                    // 添加淡入效果
                    setTimeout(() => {
                        img.classList.add('loaded');
                    }, 10);
                    console.log(`场景图片加载成功: ${imageUrl}`);
                };
                img.onerror = () => {
                    // 图片加载失败，显示占位符
                    console.warn(`场景图片加载失败: ${imageUrl}`);
                    this.showSceneImagePlaceholder(imageContainer, locationId);
                };
            } else {
                // 图片文件不存在，直接显示占位符
                console.log(`场景图片文件不存在: ${imageFileName}，显示占位符`);
                this.showSceneImagePlaceholder(imageContainer, locationId);
            }
        } else {
            // 没有映射的图片，显示占位符
            console.log(`没有场景图片映射: ${locationId}，显示占位符`);
            this.showSceneImagePlaceholder(imageContainer, locationId);
        }
    }

    /**
     * 显示场景图片占位符
     * @param {HTMLElement} container - 容器元素
     * @param {string} locationId - 位置ID
     */
    showSceneImagePlaceholder(container, locationId) {
        // 场景描述映射，用于占位符文本
        const sceneDescriptions = {
            // 第一章已定义的位置
            'college_dorm': '大学宿舍 - 城市冬日的暮色',
            'subway_station': '地铁站 - 晚高峰的人群',
            'train_station': '火车站候车厅 - 电子显示屏闪烁',
            'mountain_bus': '山区巴士 - 前往悬云山的交通工具',
            'county_station': '县城车站 - 偏远山区的交通枢纽',
            'mountain_road': '山路 - 暴雪中的蜿蜒道路',

            // 后续章节可能的位置描述
            'stone_gate': '山门 - 悬云观的入口',
            'courtyard': '前院 - 道观的前庭',
            'main_hall': '主殿 - 道观的核心建筑'
            // 添加更多场景描述
        };

        const description = sceneDescriptions[locationId] || '场景图片';

        container.innerHTML = `
            <div class="scene-image-placeholder">
                <i class="fas fa-image"></i>
                <span>${description}</span>
                <span style="font-size: 12px; margin-top: 5px; color: var(--color-text-muted);">(场景图片待添加)</span>
                <div style="font-size: 11px; margin-top: 3px; color: var(--color-text-muted); opacity: 0.7;">
                    位置ID: ${locationId}
                </div>
            </div>
        `;
    }

    /**
     * 显示帮助
     */
    showHelp() {
        const helpText = `
游戏帮助：
- 点击场景中的高亮文字进行交互
- 使用右侧面板管理道具、查看任务、地图等
- 注意体力、理智、体温等状态变化
- 关键时刻需要做出决策，选择会影响剧情发展

输入命令示例：
- 查看 石狮
- 前往 三清殿
- 使用 钥匙
- 交谈 道长
        `.trim();

        this.addFeedback('系统', helpText, 'info');
    }
}