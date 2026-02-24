/**
 * 交互系统
 * 负责处理点击交互和动作执行
 */

import {
    INTERACTIVE_TYPES,
    ACTION_TYPES,
    COLOR_CLASSES,
    COLOR_MAPPING,
    DEFAULT_CONFIG
} from '../utils/Constants.js';

export class InteractionSystem {
    constructor(game) {
        this.game = game;
        this.selectedInteractive = null;
    }

    /**
     * 初始化交互系统
     */
    init() {
        console.log('初始化交互系统...');
        this.setupEventListeners();
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 场景描述点击事件
        const sceneDescription = document.getElementById('scene-description');
        if (sceneDescription) {
            sceneDescription.addEventListener('click', (e) => this.handleSceneClick(e));
        }

        // 命令输入事件
        const commandInput = document.getElementById('command-input');
        const sendCommandBtn = document.getElementById('send-command');

        if (commandInput) {
            commandInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleCommand();
                }
            });
        }

        if (sendCommandBtn) {
            sendCommandBtn.addEventListener('click', () => this.handleCommand());
        }
    }

    /**
     * 处理场景点击
     * @param {Event} e - 点击事件
     */
    handleSceneClick(e) {
        const target = e.target;

        if (target.classList.contains('interactable')) {
            this.handleInteractiveClick(target);
        }
    }

    /**
     * 处理交互对象点击
     * @param {HTMLElement} element - 交互元素
     */
    handleInteractiveClick(element) {
        const interactiveId = element.dataset.id;
        const interactiveType = element.dataset.type;
        const interactiveName = element.dataset.name;

        console.log(`点击交互对象: ${interactiveName} (ID: ${interactiveId}, 类型: ${interactiveType})`);

        // 获取交互对象数据
        const location = this.game.dataLoader.getLocation(this.game.gameState.getPlayerLocation());
        if (!location) return;

        const interactive = location.interactives?.find(i => i.id === interactiveId);
        if (!interactive) {
            console.warn(`交互对象不存在: ${interactiveId}`);
            return;
        }

        this.selectedInteractive = interactive;

        // 获取可用操作
        const availableActions = interactive.actions || [];
        const isNPC = interactiveType === INTERACTIVE_TYPES.NPC;

        // NPC总是显示对话菜单
        if (isNPC) {
            this.showInteractiveModal(interactive, interactiveType);
            return;
        }

        // 所有对象点击都显示模态框（显示描述信息）
        this.showInteractiveModal(interactive, interactiveType);

        // 如果对象有检查操作，处理检查结果（查看描述即视为检查）
        const hasExamine = availableActions.includes(ACTION_TYPES.EXAMINE) ||
                          availableActions.includes('examine_item');

        if (hasExamine) {
            // 处理检查结果（添加线索、反馈等）
            this.processInteractiveResult(interactive, interactiveType, ACTION_TYPES.EXAMINE);
        }
    }

    /**
     * 显示交互模态框
     * @param {Object} interactive - 交互对象
     * @param {string} type - 交互类型
     */
    showInteractiveModal(interactive, type) {
        const modal = document.getElementById('interactive-modal');
        const title = document.getElementById('interactive-modal-title');
        const content = document.getElementById('interactive-modal-content');
        const actions = document.getElementById('interactive-modal-actions');

        if (!modal || !title || !content || !actions) {
            console.error('交互模态框元素不存在');
            return;
        }

        // 设置标题和内容
        title.textContent = interactive.name;
        content.textContent = interactive.description || '暂无描述';

        // 生成操作按钮
        actions.innerHTML = '';
        this.generateInteractiveActions(interactive, type, actions);

        // 显示模态框
        modal.style.display = 'flex';

        // 绑定关闭按钮事件
        const closeBtn = document.getElementById('close-interactive');
        if (closeBtn) {
            closeBtn.onclick = () => this.closeInteractiveModal();
        }
    }

    /**
     * 生成交互操作按钮
     * @param {Object} interactive - 交互对象
     * @param {string} type - 交互类型
     * @param {HTMLElement} container - 按钮容器
     */
    generateInteractiveActions(interactive, type, container) {
        // 获取可用操作
        const availableActions = this.getAvailableActions(interactive, type);

        // 如果没有可用操作，只显示关闭按钮
        if (availableActions.length === 0) {
            const noActionBtn = document.createElement('button');
            noActionBtn.className = 'interactive-action-btn';
            noActionBtn.textContent = '关闭';
            noActionBtn.addEventListener('click', () => this.closeInteractiveModal());
            container.appendChild(noActionBtn);
            return;
        }

        // 生成操作按钮
        availableActions.forEach(action => {
            if (!action) return; // 跳过null值

            const button = document.createElement('button');
            button.className = 'interactive-action-btn';
            button.innerHTML = `<i class="${action.icon}"></i> ${action.label}`;
            button.title = action.description;
            button.addEventListener('click', () => {
                this.executeInteraction(interactive, type, action.type);
            });
            container.appendChild(button);
        });

        // 添加关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.className = 'interactive-action-btn close';
        closeBtn.innerHTML = '<i class="fas fa-times"></i> 关闭';
        closeBtn.addEventListener('click', () => this.closeInteractiveModal());
        container.appendChild(closeBtn);
    }

    /**
     * 获取可用操作
     * @param {Object} interactive - 交互对象
     * @param {string} type - 交互类型
     * @returns {Array} 可用操作列表
     */
    getAvailableActions(interactive, type) {
        const actions = [];

        // 检查交互对象定义的操作
        if (interactive.actions && Array.isArray(interactive.actions)) {
            interactive.actions.forEach(actionType => {
                const action = this.getActionDefinition(actionType, type);
                if (action) {
                    actions.push(action);
                }
            });
        }

        // 根据类型添加默认操作
        const defaultActions = this.getDefaultActions(type);
        defaultActions.forEach(defaultAction => {
            if (!actions.some(a => a.type === defaultAction.type)) {
                actions.push(defaultAction);
            }
        });

        return actions;
    }

    /**
     * 获取操作定义
     * @param {string} actionType - 操作类型
     * @param {string} interactiveType - 交互类型
     * @returns {Object|null} 操作定义
     */
    getActionDefinition(actionType, interactiveType) {
        const actionDefinitions = {
            [ACTION_TYPES.EXAMINE]: {
                type: ACTION_TYPES.EXAMINE,
                label: '检查',
                icon: 'fas fa-search',
                description: '仔细检查对象'
            },
            [ACTION_TYPES.TAKE_ITEM]: {
                type: ACTION_TYPES.TAKE_ITEM,
                label: '拾取',
                icon: 'fas fa-hand-paper',
                description: '拾取物品'
            },
            [ACTION_TYPES.READ_MESSAGE]: {
                type: ACTION_TYPES.READ_MESSAGE,
                label: '阅读',
                icon: 'fas fa-book-open',
                description: '阅读内容'
            },
            [ACTION_TYPES.TALK]: {
                type: ACTION_TYPES.TALK,
                label: '交谈',
                icon: 'fas fa-comment',
                description: '与角色交谈'
            },
            [ACTION_TYPES.USE]: {
                type: ACTION_TYPES.USE,
                label: '使用',
                icon: 'fas fa-hand-pointer',
                description: '使用物品'
            },
            [ACTION_TYPES.COMBINE]: {
                type: ACTION_TYPES.COMBINE,
                label: '组合',
                icon: 'fas fa-puzzle-piece',
                description: '组合物品'
            },
            [ACTION_TYPES.DROP]: {
                type: ACTION_TYPES.DROP,
                label: '丢弃',
                icon: 'fas fa-trash',
                description: '丢弃物品'
            },
            // 处理数据文件中可能出现的其他操作类型
            'record': {
                type: 'record',
                label: '记录',
                icon: 'fas fa-camera',
                description: '记录线索'
            },
            'examine_item': {
                type: ACTION_TYPES.EXAMINE,
                label: '检查',
                icon: 'fas fa-search',
                description: '仔细检查对象'
            }
        };

        // 首先检查精确匹配
        if (actionDefinitions[actionType]) {
            return actionDefinitions[actionType];
        }

        // 如果没有找到，尝试查找可能的变体
        for (const [key, definition] of Object.entries(actionDefinitions)) {
            if (key.includes(actionType) || actionType.includes(key)) {
                return definition;
            }
        }

        return null;
    }

    /**
     * 获取默认操作
     * @param {string} interactiveType - 交互类型
     * @returns {Array} 默认操作列表
     */
    getDefaultActions(interactiveType) {
        const defaultActions = {
            [INTERACTIVE_TYPES.EXAMINE]: [
                this.getActionDefinition(ACTION_TYPES.EXAMINE, interactiveType)
            ],
            [INTERACTIVE_TYPES.COLLECT]: [
                this.getActionDefinition(ACTION_TYPES.TAKE_ITEM, interactiveType)
            ],
            [INTERACTIVE_TYPES.NPC]: [
                this.getActionDefinition(ACTION_TYPES.TALK, interactiveType)
            ],
            [INTERACTIVE_TYPES.CLUE]: [
                this.getActionDefinition(ACTION_TYPES.EXAMINE, interactiveType)
            ],
            [INTERACTIVE_TYPES.DANGER]: [
                this.getActionDefinition(ACTION_TYPES.EXAMINE, interactiveType)
            ],
            [INTERACTIVE_TYPES.INTERACT]: [
                this.getActionDefinition(ACTION_TYPES.USE, interactiveType)
            ],
            [INTERACTIVE_TYPES.LOCATION]: [
                this.getActionDefinition(ACTION_TYPES.EXAMINE, interactiveType)
            ]
        };

        const actions = defaultActions[interactiveType] || [];
        // 过滤掉null值
        return actions.filter(action => action !== null);
    }

    /**
     * 执行交互
     * @param {Object} interactive - 交互对象
     * @param {string} elementType - 元素类型
     * @param {string} actionType - 操作类型
     */
    executeInteraction(interactive, elementType, actionType) {
        console.log(`执行交互: ${interactive.name}, 类型: ${elementType}, 操作: ${actionType}`);

        // 检查是否可以交互
        if (!this.game.statusManager.canInteract()) {
            this.game.uiRenderer.addFeedback('系统', '体力不足，无法进行交互', 'error');
            return;
        }

        // 消耗体力和时间
        this.game.statusManager.consumeStamina(DEFAULT_CONFIG.INTERACTION_STAMINA_COST, '交互');
        this.game.timeSystem.advanceTime(DEFAULT_CONFIG.INTERACTION_TIME_COST);

        // 处理交互结果
        this.processInteractiveResult(interactive, elementType, actionType);

        // 关闭模态框
        this.closeInteractiveModal();

        // 触发事件
        this.game.eventSystem.emit('player:interacted', {
            interactiveId: interactive.id,
            interactiveName: interactive.name,
            type: elementType,
            action: actionType
        });
    }

    /**
     * 处理交互结果
     * @param {Object} interactive - 交互对象
     * @param {string} elementType - 元素类型
     * @param {string} actionType - 操作类型
     */
    processInteractiveResult(interactive, elementType, actionType) {
        const result = interactive.result;
        if (!result) {
            this.game.uiRenderer.addFeedback('系统', `你${this.getActionName(actionType)}了${interactive.name}`, 'normal');
            return;
        }

        // 处理不同结果类型
        if (result.item && actionType === ACTION_TYPES.TAKE_ITEM) {
            this.handleItemResult(interactive, result);
        } else if (result.clue && (actionType === ACTION_TYPES.EXAMINE || actionType === ACTION_TYPES.READ_MESSAGE || actionType === 'record')) {
            this.handleClueResult(interactive, result);
        } else if (result.dialogue && actionType === ACTION_TYPES.TALK) {
            this.handleDialogueResult(interactive, result);
        } else if (result.feedback) {
            this.game.uiRenderer.addFeedback('系统', result.feedback, 'normal');
        } else {
            this.game.uiRenderer.addFeedback('系统', `你${this.getActionName(actionType)}了${interactive.name}`, 'normal');
        }

        // 处理阅读操作 - 显示阅读内容窗口
        if (actionType === ACTION_TYPES.READ_MESSAGE) {
            this.showReadContent(interactive, elementType);
        }
    }

    /**
     * 处理道具结果
     * @param {Object} interactive - 交互对象
     * @param {Object} result - 结果对象
     */
    handleItemResult(interactive, result) {
        const itemId = result.item;
        const item = this.game.dataLoader.getItem(itemId);

        if (!item) {
            console.warn(`道具不存在: ${itemId}`);
            this.game.uiRenderer.addFeedback('系统', '无法获得道具：道具数据不存在', 'error');
            return;
        }

        // 添加到库存
        const success = this.game.gameState.addItemToInventory(item);
        if (success) {
            this.game.uiRenderer.addFeedback('系统', `你获得了：${item.name}`, 'success');

            // 更新库存UI
            this.game.uiRenderer.updateInventoryUI();
        } else {
            this.game.uiRenderer.addFeedback('系统', '库存已满，无法获得道具', 'warning');
        }
    }

    /**
     * 处理线索结果
     * @param {Object} interactive - 交互对象
     * @param {Object} result - 结果对象
     */
    handleClueResult(interactive, result) {
        const clueId = result.clue;
        const clue = this.game.dataLoader.getClue(clueId);

        if (!clue) {
            console.warn(`线索不存在: ${clueId}`);
            return;
        }

        // 添加到线索列表
        this.game.gameState.addClue(clue);

        // 显示反馈
        if (result.feedback) {
            this.game.uiRenderer.addFeedback('系统', result.feedback, 'clue');
        } else {
            this.game.uiRenderer.addFeedback('系统', `你发现了线索：${clue.title}`, 'clue');
        }

        // 更新笔记UI
        this.game.uiRenderer.updateNotebookUI();
    }

    /**
     * 处理对话结果
     * @param {Object} interactive - 交互对象
     * @param {Object} result - 结果对象
     */
    handleDialogueResult(interactive, result) {
        const dialogueId = result.dialogue;

        // 显示对话
        this.game.dialogueManager.startDialogue(dialogueId, interactive.id);
    }

    /**
     * 显示阅读内容窗口
     * @param {Object} interactive - 交互对象
     * @param {string} type - 交互类型
     */
    showReadContent(interactive, type) {
        console.log(`显示阅读内容: ${interactive.name}`);

        // 使用item-modal作为阅读窗口
        const modal = document.getElementById('item-modal');
        const title = document.getElementById('item-modal-title');
        const content = document.getElementById('item-modal-content');

        if (!modal || !title || !content) {
            console.error('阅读窗口元素不存在');
            return;
        }

        // 设置标题
        title.textContent = `阅读: ${interactive.name}`;

        // 准备阅读内容 - 优先使用read_content属性，没有则使用description
        let readContent = interactive.read_content || interactive.description || '没有可阅读的内容。';

        // 可以添加格式化的阅读内容
        const formattedContent = `
            <div class="read-content">
                <div class="read-header">
                    <i class="fas fa-book-reader"></i>
                    <h4>${interactive.name}</h4>
                </div>
                <div class="read-body">
                    <p>${readContent}</p>
                </div>
                <div class="read-footer">
                    <button class="btn btn-secondary" onclick="document.getElementById('item-modal').style.display='none'">
                        <i class="fas fa-times"></i> 关闭
                    </button>
                </div>
            </div>
        `;

        content.innerHTML = formattedContent;
        modal.style.display = 'flex';

        // 绑定关闭按钮事件
        const closeBtn = modal.querySelector('.btn-secondary');
        if (closeBtn) {
            closeBtn.onclick = () => {
                modal.style.display = 'none';
            };
        }
    }

    /**
     * 获取操作名称
     * @param {string} actionType - 操作类型
     * @returns {string} 操作名称
     */
    getActionName(actionType) {
        const actionNames = {
            [ACTION_TYPES.EXAMINE]: '检查',
            [ACTION_TYPES.TAKE_ITEM]: '拾取',
            [ACTION_TYPES.READ_MESSAGE]: '阅读',
            [ACTION_TYPES.TALK]: '交谈',
            [ACTION_TYPES.USE]: '使用',
            [ACTION_TYPES.COMBINE]: '组合',
            [ACTION_TYPES.DROP]: '丢弃',
            'record': '记录'
        };

        return actionNames[actionType] || '操作';
    }

    /**
     * 获取反馈类型
     * @param {string} interactionType - 交互类型
     * @returns {string} 反馈类型
     */
    getFeedbackTypeForInteraction(interactionType) {
        const feedbackTypes = {
            [INTERACTIVE_TYPES.EXAMINE]: 'normal',
            [INTERACTIVE_TYPES.COLLECT]: 'success',
            [INTERACTIVE_TYPES.CLUE]: 'clue',
            [INTERACTIVE_TYPES.DANGER]: 'danger',
            [INTERACTIVE_TYPES.NPC]: 'dialogue',
            [INTERACTIVE_TYPES.INTERACT]: 'normal',
            [INTERACTIVE_TYPES.LOCATION]: 'location'
        };

        return feedbackTypes[interactionType] || 'normal';
    }

    /**
     * 关闭交互模态框
     */
    closeInteractiveModal() {
        this.selectedInteractive = null;

        const modal = document.getElementById('interactive-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * 处理命令输入
     */
    handleCommand() {
        const commandInput = document.getElementById('command-input');
        if (!commandInput) return;

        const command = commandInput.value.trim();
        if (!command) return;

        // 清空输入框
        commandInput.value = '';

        // 解析和执行命令
        this.parseAndExecuteCommand(command);
    }

    /**
     * 解析和执行命令
     * @param {string} command - 命令字符串
     */
    parseAndExecuteCommand(command) {
        console.log(`执行命令: ${command}`);

        // 简单命令解析
        const parts = command.toLowerCase().split(' ');
        const action = parts[0];
        const target = parts.slice(1).join(' ');

        // 处理不同命令
        switch (action) {
            case '查看':
            case '检查':
                this.handleExamineCommand(target);
                break;
            case '前往':
            case '去':
                this.handleGoCommand(target);
                break;
            case '使用':
                this.handleUseCommand(target);
                break;
            case '交谈':
            case '对话':
                this.handleTalkCommand(target);
                break;
            case '拾取':
            case '拿取':
                this.handleTakeCommand(target);
                break;
            case '测试决策':
                this.game.decisionManager.testDecision();
                break;
            case '帮助':
            case 'help':
                this.showHelp();
                break;
            default:
                this.game.uiRenderer.addFeedback('系统', `未知命令: ${command}。输入"帮助"查看可用命令。`, 'error');
        }
    }

    /**
     * 处理检查命令
     * @param {string} target - 检查目标
     */
    handleExamineCommand(target) {
        if (!target) {
            this.game.uiRenderer.addFeedback('系统', '请指定要检查的对象，如：查看 石狮', 'error');
            return;
        }

        // 在当前场景中查找匹配的交互对象
        const location = this.game.dataLoader.getLocation(this.game.gameState.getPlayerLocation());
        if (!location || !location.interactives) {
            this.game.uiRenderer.addFeedback('系统', '当前场景没有可检查的对象', 'warning');
            return;
        }

        const interactive = location.interactives.find(i =>
            i.name.includes(target) || target.includes(i.name)
        );

        if (interactive) {
            this.executeInteraction(interactive, INTERACTIVE_TYPES.EXAMINE, ACTION_TYPES.EXAMINE);
        } else {
            this.game.uiRenderer.addFeedback('系统', `未找到"${target}"`, 'error');
        }
    }

    /**
     * 处理前往命令
     * @param {string} target - 目的地
     */
    handleGoCommand(target) {
        if (!target) {
            this.game.uiRenderer.addFeedback('系统', '请指定要前往的地点，如：前往 三清殿', 'error');
            return;
        }

        // 查找匹配的出口
        const location = this.game.dataLoader.getLocation(this.game.gameState.getPlayerLocation());
        if (!location || !location.exits) {
            this.game.uiRenderer.addFeedback('系统', '当前位置没有可前往的地点', 'warning');
            return;
        }

        // 简单匹配逻辑
        for (const exit of location.exits) {
            if (exit.description.includes(target) || target.includes(exit.description)) {
                this.game.moveSystem.move(exit.direction);
                return;
            }
        }

        this.game.uiRenderer.addFeedback('系统', `无法前往"${target}"`, 'error');
    }

    /**
     * 处理使用命令
     * @param {string} target - 使用目标
     */
    handleUseCommand(target) {
        if (!target) {
            this.game.uiRenderer.addFeedback('系统', '请指定要使用的道具，如：使用 钥匙', 'error');
            return;
        }

        // 查找道具
        const inventory = this.game.gameState.getPlayerInventory();
        const item = inventory.find(i => i.name.includes(target) || target.includes(i.name));

        if (item) {
            this.game.uiRenderer.addFeedback('系统', `使用了${item.name}，但需要指定使用目标`, 'warning');
            // TODO: 实现道具使用目标选择
        } else {
            this.game.uiRenderer.addFeedback('系统', `未找到道具"${target}"`, 'error');
        }
    }

    /**
     * 处理交谈命令
     * @param {string} target - 交谈目标
     */
    handleTalkCommand(target) {
        if (!target) {
            this.game.uiRenderer.addFeedback('系统', '请指定要交谈的角色，如：交谈 道长', 'error');
            return;
        }

        // 在当前场景中查找NPC
        const location = this.game.dataLoader.getLocation(this.game.gameState.getPlayerLocation());
        if (!location || !location.interactives) {
            this.game.uiRenderer.addFeedback('系统', '当前场景没有可交谈的角色', 'warning');
            return;
        }

        const npcInteractive = location.interactives.find(i =>
            i.type === INTERACTIVE_TYPES.NPC &&
            (i.name.includes(target) || target.includes(i.name))
        );

        if (npcInteractive) {
            this.executeInteraction(npcInteractive, INTERACTIVE_TYPES.NPC, ACTION_TYPES.TALK);
        } else {
            this.game.uiRenderer.addFeedback('系统', `未找到角色"${target}"`, 'error');
        }
    }

    /**
     * 处理拾取命令
     * @param {string} target - 拾取目标
     */
    handleTakeCommand(target) {
        if (!target) {
            this.game.uiRenderer.addFeedback('系统', '请指定要拾取的物品，如：拾取 钥匙', 'error');
            return;
        }

        // 在当前场景中查找可收集物品
        const location = this.game.dataLoader.getLocation(this.game.gameState.getPlayerLocation());
        if (!location || !location.interactives) {
            this.game.uiRenderer.addFeedback('系统', '当前场景没有可拾取的物品', 'warning');
            return;
        }

        const collectible = location.interactives.find(i =>
            i.type === INTERACTIVE_TYPES.COLLECT &&
            (i.name.includes(target) || target.includes(i.name))
        );

        if (collectible) {
            this.executeInteraction(collectible, INTERACTIVE_TYPES.COLLECT, ACTION_TYPES.TAKE_ITEM);
        } else {
            this.game.uiRenderer.addFeedback('系统', `未找到可拾取的物品"${target}"`, 'error');
        }
    }

    /**
     * 显示帮助信息
     */
    showHelp() {
        const helpText = `
可用命令：
- 查看/检查 [对象] - 检查场景中的对象
- 前往/去 [地点] - 移动到指定地点
- 使用 [道具] - 使用道具
- 交谈/对话 [角色] - 与角色对话
- 拾取/拿取 [物品] - 拾取物品
- 测试决策 - 测试决策系统
- 帮助/help - 显示此帮助信息

也可以直接点击场景中的高亮文字进行交互。
        `.trim();

        this.game.uiRenderer.addFeedback('系统', helpText, 'info');
    }
}