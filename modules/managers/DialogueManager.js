/**
 * 对话管理器
 * 负责管理NPC对话系统
 */

export class DialogueManager {
    constructor(game) {
        this.game = game;
        this.activeDialogue = null;
        this.currentBranch = null;
        this.currentNPC = null;
    }

    /**
     * 初始化对话管理器
     */
    init() {
        console.log('初始化对话管理器...');
    }

    /**
     * 开始对话
     * @param {string} dialogueId - 对话ID
     * @param {string} npcId - NPC ID
     * @returns {boolean} 是否开始成功
     */
    startDialogue(dialogueId, npcId = null) {
        const dialogue = this.game.dataLoader.getDialogue(dialogueId);
        if (!dialogue) {
            console.warn(`对话不存在: ${dialogueId}`);
            return false;
        }

        this.activeDialogue = dialogue;
        this.currentNPC = npcId;

        // 获取初始分支
        // initial_branches可能是对象数组（有id属性）或字符串数组
        const firstInitialBranch = dialogue.initial_branches?.[0];
        if (firstInitialBranch) {
            if (typeof firstInitialBranch === 'string') {
                // 如果是字符串，从branches中获取分支对象
                this.currentBranch = dialogue.branches?.[firstInitialBranch] || null;
            } else if (firstInitialBranch.id) {
                // 如果是对象且有id属性，直接使用该对象
                this.currentBranch = firstInitialBranch;
            } else {
                this.currentBranch = null;
            }
        } else {
            this.currentBranch = null;
        }

        // 显示对话对话框
        this.showDialogueDialog();

        // 触发事件
        this.game.eventSystem.emit('dialogue:started', {
            dialogueId,
            npcId,
            dialogue
        });

        return true;
    }

    /**
     * 显示对话对话框
     */
    showDialogueDialog() {
        const modal = document.getElementById('dialog-modal');
        const npcName = document.getElementById('dialog-npc-name');
        const content = document.getElementById('dialog-content');
        const optionsContainer = document.getElementById('dialog-options');

        if (!modal || !npcName || !content || !optionsContainer) {
            console.error('对话对话框元素不存在');
            return;
        }

        // 设置NPC名称
        if (this.currentNPC) {
            const npc = this.game.dataLoader.getNPC(this.currentNPC);
            npcName.textContent = npc ? npc.name : '未知角色';
        } else {
            npcName.textContent = this.activeDialogue.npc_name || '对话';
        }

        // 显示对话框
        modal.style.display = 'flex';

        // 绑定关闭按钮事件
        const closeBtn = document.getElementById('close-dialog');
        if (closeBtn) {
            closeBtn.onclick = () => this.endDialogue();
        }

        // 显示当前分支内容
        if (this.currentBranch) {
            this.showDialogueBranch(this.currentBranch);
        } else {
            this.showDialogueOptions();
        }
    }

    /**
     * 显示对话分支
     * @param {Object} branch - 对话分支
     */
    showDialogueBranch(branch) {
        const content = document.getElementById('dialog-content');
        const optionsContainer = document.getElementById('dialog-options');

        if (!content || !optionsContainer) return;

        // 显示分支内容
        content.innerHTML = `
            <div class="dialogue-message npc">
                <div class="dialogue-speaker">${this.activeDialogue.npc_name || 'NPC'}</div>
                <div class="dialogue-text">${branch.npc_response}</div>
            </div>
        `;

        // 生成选项
        this.generateDialogueOptions(branch);

        // 标记为已读
        this.markDialogueAsRead(branch.id);
    }

    /**
     * 生成对话选项
     * @param {Object} branch - 当前分支
     */
    generateDialogueOptions(branch) {
        const optionsContainer = document.getElementById('dialog-options');
        if (!optionsContainer) return;

        optionsContainer.innerHTML = '';

        if (!branch.next_branches || branch.next_branches.length === 0) {
            // 没有后续分支，显示结束按钮
            const endButton = document.createElement('button');
            endButton.className = 'dialog-option';
            endButton.textContent = '结束对话';
            endButton.addEventListener('click', () => this.endDialogue());
            optionsContainer.appendChild(endButton);
            return;
        }

        // 生成选项按钮
        branch.next_branches.forEach(nextBranchId => {
            const nextBranch = this.activeDialogue.branches?.[nextBranchId];
            if (!nextBranch) return;

            const optionButton = this.createDialogueOptionButton(nextBranch);
            optionsContainer.appendChild(optionButton);
        });
    }

    /**
     * 创建对话选项按钮
     * @param {Object} branch - 对话分支
     * @returns {HTMLElement} 选项按钮
     */
    createDialogueOptionButton(branch) {
        const button = document.createElement('button');
        button.className = 'dialog-option';

        // 检查是否已读
        if (this.isDialogueRead(branch.id)) {
            button.classList.add('read');
        }

        // 检查要求是否满足
        const requirementsMet = this.checkDialogueRequirements(branch);

        if (requirementsMet) {
            button.textContent = branch.player_text;
            button.addEventListener('click', () => this.selectDialogueOption(branch));
        } else {
            button.textContent = '???';
            button.disabled = true;
            button.title = '条件未满足';
        }

        return button;
    }

    /**
     * 检查对话要求
     * @param {Object} branch - 对话分支
     * @returns {boolean} 是否满足要求
     */
    checkDialogueRequirements(branch) {
        if (!branch.requirements) return true;

        // 检查任务要求
        if (branch.requirements.quest_completed) {
            const questStatus = this.game.gameState.getQuestStatus(branch.requirements.quest_completed);
            if (questStatus !== 'completed') {
                return false;
            }
        }

        // 检查标志要求
        if (branch.requirements.flags) {
            for (const flag of branch.requirements.flags) {
                if (!this.game.gameState.hasFlag(flag)) {
                    return false;
                }
            }
        }

        // 检查关系要求
        if (branch.requirements.relationship_min && this.currentNPC) {
            const relationship = this.game.gameState.getRelationship(this.currentNPC);
            if (relationship < branch.requirements.relationship_min) {
                return false;
            }
        }

        // 检查道具要求
        if (branch.requirements.items) {
            for (const itemId of branch.requirements.items) {
                if (!this.game.gameState.hasItemInInventory(itemId)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * 选择对话选项
     * @param {Object} branch - 选择的对话分支
     */
    selectDialogueOption(branch) {
        // 应用对话结果
        this.applyDialogueResult(branch);

        // 更新当前分支
        this.currentBranch = branch;

        // 显示分支内容
        this.showDialogueBranch(branch);

        // 触发事件
        this.game.eventSystem.emit('dialogue:choice:made', {
            dialogueId: this.activeDialogue.id,
            branchId: branch.id,
            branch: branch,
            npcId: this.currentNPC
        });
    }

    /**
     * 应用对话结果
     * @param {Object} branch - 对话分支
     */
    applyDialogueResult(branch) {
        if (!branch.result) return;

        // 获得线索
        if (branch.result.clue) {
            const clue = this.game.dataLoader.getClue(branch.result.clue);
            if (clue) {
                this.game.gameState.addClue(clue);
                this.game.uiRenderer.addFeedback('系统', `获得线索: ${clue.title}`, 'clue');
                this.game.uiRenderer.updateNotebookUI();
            }
        }

        // 解锁对话
        if (branch.result.unlock) {
            branch.result.unlock.forEach(unlockId => {
                this.game.gameState.setFlag(`dialogue_unlocked_${unlockId}`, true);
            });
        }

        // 关系变化
        if (branch.result.relationship && this.currentNPC) {
            this.game.gameState.modifyRelationship(this.currentNPC, branch.result.relationship);
        }

        // 获得道具
        if (branch.result.item) {
            const item = this.game.dataLoader.getItem(branch.result.item);
            if (item) {
                const success = this.game.gameState.addItemToInventory(item);
                if (success) {
                    this.game.uiRenderer.addFeedback('系统', `获得道具: ${item.name}`, 'success');
                    this.game.uiRenderer.updateInventoryUI();
                }
            }
        }

        // 触发任务
        if (branch.result.quest) {
            this.game.gameState.startQuest(branch.result.quest);
            this.game.uiRenderer.addFeedback('系统', `新任务: ${branch.result.quest}`, 'quest');
            this.game.uiRenderer.updateTasksUI();
        }
    }

    /**
     * 标记对话为已读
     * @param {string} dialogueId - 对话ID
     */
    markDialogueAsRead(dialogueId) {
        this.game.gameState.recordDialogueHistory(dialogueId);
    }

    /**
     * 检查对话是否已读
     * @param {string} dialogueId - 对话ID
     * @returns {boolean} 是否已读
     */
    isDialogueRead(dialogueId) {
        return this.game.gameState.isDialogueRead(dialogueId);
    }

    /**
     * 显示对话选项（无当前分支时）
     */
    showDialogueOptions() {
        const content = document.getElementById('dialog-content');
        const optionsContainer = document.getElementById('dialog-options');

        if (!content || !optionsContainer) return;

        content.innerHTML = '<p>请选择对话主题...</p>';
        optionsContainer.innerHTML = '';

        // 显示所有可用分支
        if (this.activeDialogue.initial_branches) {
            this.activeDialogue.initial_branches.forEach(branchItem => {
                let branch;
                if (typeof branchItem === 'string') {
                    // 如果是字符串，从branches中获取分支对象
                    branch = this.activeDialogue.branches?.[branchItem];
                } else if (branchItem.id) {
                    // 如果是对象且有id属性，直接使用该对象
                    branch = branchItem;
                }

                if (!branch) return;

                const optionButton = this.createDialogueOptionButton(branch);
                optionsContainer.appendChild(optionButton);
            });
        }
    }

    /**
     * 结束对话
     */
    endDialogue() {
        const modal = document.getElementById('dialog-modal');
        if (modal) {
            modal.style.display = 'none';
        }

        // 触发事件
        this.game.eventSystem.emit('dialogue:ended', {
            dialogueId: this.activeDialogue?.id,
            npcId: this.currentNPC
        });

        // 重置状态
        this.activeDialogue = null;
        this.currentBranch = null;
        this.currentNPC = null;
    }

    /**
     * 获取NPC关系值
     * @param {string} npcId - NPC ID
     * @returns {number} 关系值
     */
    getNPCRelationship(npcId) {
        return this.game.gameState.getRelationship(npcId);
    }

    /**
     * 设置NPC关系值
     * @param {string} npcId - NPC ID
     * @param {number} value - 关系值
     */
    setNPCRelationship(npcId, value) {
        this.game.gameState.setRelationship(npcId, value);
    }

    /**
     * 修改NPC关系值
     * @param {string} npcId - NPC ID
     * @param {number} delta - 变化量
     */
    modifyNPCRelationship(npcId, delta) {
        this.game.gameState.modifyRelationship(npcId, delta);
    }

    /**
     * 检查是否可以与NPC对话
     * @param {string} npcId - NPC ID
     * @returns {boolean} 是否可以对话
     */
    canTalkToNPC(npcId) {
        // 检查NPC是否存在
        const npc = this.game.dataLoader.getNPC(npcId);
        if (!npc) return false;

        // 检查NPC是否在当前位置
        const currentLocation = this.game.dataLoader.getLocation(this.game.gameState.getPlayerLocation());
        if (!currentLocation || !currentLocation.characters) return false;

        return currentLocation.characters.includes(npcId);
    }

    /**
     * 获取NPC的可用对话
     * @param {string} npcId - NPC ID
     * @returns {Array} 可用对话列表
     */
    getAvailableDialoguesForNPC(npcId) {
        const npc = this.game.dataLoader.getNPC(npcId);
        if (!npc || !npc.dialogues) return [];

        return npc.dialogues.filter(dialogueId => {
            const dialogue = this.game.dataLoader.getDialogue(dialogueId);
            if (!dialogue) return false;

            // 检查对话要求
            return this.checkDialogueAvailability(dialogue);
        });
    }

    /**
     * 检查对话是否可用
     * @param {Object} dialogue - 对话对象
     * @returns {boolean} 是否可用
     */
    checkDialogueAvailability(dialogue) {
        if (!dialogue.requirements) return true;

        // 检查任务要求
        if (dialogue.requirements.quest_completed) {
            const questStatus = this.game.gameState.getQuestStatus(dialogue.requirements.quest_completed);
            if (questStatus !== 'completed') {
                return false;
            }
        }

        // 检查标志要求
        if (dialogue.requirements.flags) {
            for (const flag of dialogue.requirements.flags) {
                if (!this.game.gameState.hasFlag(flag)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * 测试对话（用于调试）
     * @param {string} dialogueId - 对话ID
     */
    testDialogue(dialogueId = 'dialogue_suxiaoyu_subway') {
        console.log(`测试对话: ${dialogueId}`);

        // 尝试从数据加载器中获取对话
        const dialogue = this.game.dataLoader.getDialogue(dialogueId);
        if (dialogue) {
            console.log('找到对话数据，开始对话:', dialogue);
            this.startDialogue(dialogueId, 'su_xiaoyu');
        } else {
            console.warn(`对话不存在: ${dialogueId}，使用测试对话`);
            const testDialogue = {
                id: dialogueId,
                npc_name: '测试NPC',
                initial_branches: ['greeting'],
                branches: {
                    greeting: {
                        id: 'greeting',
                        player_text: '你好',
                        npc_response: '你好，我是测试NPC。',
                        next_branches: ['ask_name', 'ask_purpose']
                    },
                    ask_name: {
                        id: 'ask_name',
                        player_text: '你叫什么名字？',
                        npc_response: '我叫测试NPC，专门用于测试对话系统。',
                        next_branches: []
                    },
                    ask_purpose: {
                        id: 'ask_purpose',
                        player_text: '你有什么目的？',
                        npc_response: '我的目的是帮助你测试对话系统的功能。',
                        result: {
                            clue: 'test_clue',
                            relationship: 10
                        },
                        next_branches: []
                    }
                }
            };

            this.activeDialogue = testDialogue;
            this.currentBranch = testDialogue.branches.greeting;
            this.showDialogueDialog();
        }
    }
}