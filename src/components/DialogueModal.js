/**
 * 对话弹窗组件
 * 处理NPC对话显示和交互
 */

export class DialogueModal {
  constructor(eventSystem, gameEngine) {
    this.eventSystem = eventSystem;
    this.gameEngine = gameEngine;
    this.modal = null;
    this.currentNPC = null;
    this.dialogueHistory = [];
    this.currentDialogues = [];
    // 存储所有NPC的对话历史，按场景隔离
    this.npcDialogueHistory = new Map();
    this.currentSceneId = null;
    
    // 监听场景切换事件，清空历史
    this.eventSystem.on('scene:changed', (data) => {
      this.handleSceneChange(data);
    });
    
    // 监听场景更新事件，用于初始化场景ID
    this.eventSystem.on('scene:updated', (sceneData) => {
      if (sceneData?.id && !this.currentSceneId) {
        this.currentSceneId = sceneData.id;
      }
    });
  }

  /**
   * 显示对话弹窗
   * @param {string} npcId - NPC ID
   */
  show(npcId) {
    console.log(`打开对话: ${npcId}`);
    
    const npc = this.gameEngine.currentChapter?.npcs?.[npcId];
    if (!npc) {
      console.warn(`NPC未找到: ${npcId}`);
      return;
    }

    console.log(`找到NPC:`, npc.name, 'dialogues:', npc.dialogues?.length || 0);

    // 关闭旧弹窗但不保存历史（已经实时保存了）
    if (this.modal) {
      this.close();
    }
    
    // 检查是否是同一个NPC
    const isSameNPC = this.currentNPC?.id === npcId;
    
    this.currentNPC = npc;
    
    // 如果不是同一个NPC，从历史记录加载或创建新的
    if (!isSameNPC) {
      this.dialogueHistory = this.npcDialogueHistory.get(npcId) || [];
    }
    
    // 获取可用对话选项
    this.currentDialogues = this.getAvailableDialogues(npc);
    console.log(`可用对话选项:`, this.currentDialogues.length);
    
    this.createModal(npc);
    this.renderDialogue();
  }

  /**
   * 获取可用对话选项
   */
  getAvailableDialogues(npc) {
    if (!npc.dialogues) return [];
    
    return npc.dialogues.filter(d => {
      // 检查是否已说过（隐藏已选择的对话）
      const spoken = this.gameEngine.state.get(`npcs.${npc.id}.spokenDialogues`) || [];
      if (spoken.includes(d.id)) return false;
      
      // 检查前置条件
      if (d.requireClue) {
        const clues = this.gameEngine.state.get('player.clues');
        if (!clues.includes(d.requireClue)) return false;
      }
      
      if (d.requireQuest) {
        const completed = this.gameEngine.state.get('quests.completed');
        if (!completed.includes(d.requireQuest)) return false;
      }
      
      return true;
    });
  }

  /**
   * 创建弹窗HTML
   */
  createModal(npc) {
    console.log('DialogueModal.createModal: 创建弹窗');

    const modalHTML = `
      <div class="dialogue-modal-overlay" id="dialogue-modal">
        <div class="dialogue-modal">
          <div class="dialogue-header">
            <div class="npc-info">
              <div class="npc-avatar">${npc.avatar || '👤'}</div>
              <div class="npc-details">
                <h3 class="npc-name">${npc.name}</h3>
                <p class="npc-description">${npc.description || ''}</p>
              </div>
            </div>
            <button class="close-btn" aria-label="关闭">&times;</button>
          </div>
          
          <div class="dialogue-body">
            <div class="dialogue-history" id="dialogue-history"></div>
            
            <div class="dialogue-options" id="dialogue-options"></div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('dialogue-modal');
    console.log('DialogueModal: 弹窗DOM已创建', this.modal ? '成功' : '失败');
    
    requestAnimationFrame(() => {
      if (this.modal) {
        this.modal.classList.add('show');
        console.log('DialogueModal: 弹窗已显示');
      }
    });

    this.bindEvents();
  }

  /**
   * 渲染对话内容
   */
  renderDialogue() {
    console.log('DialogueModal.renderDialogue: 渲染对话内容');
    const historyContainer = this.modal?.querySelector('#dialogue-history');
    const optionsContainer = this.modal?.querySelector('#dialogue-options');
    
    if (!historyContainer || !optionsContainer) {
      console.warn('DialogueModal: 未找到容器元素');
      return;
    }

    // 渲染历史记录
    if (this.dialogueHistory.length === 0) {
      historyContainer.innerHTML = `
        <div class="dialogue-entry npc">
          <div class="speaker">${this.currentNPC.name}</div>
          <div class="message">${this.currentNPC.initialDialogue || '...'}</div>
        </div>
      `;
    } else {
      historyContainer.innerHTML = this.dialogueHistory.map(entry => `
        <div class="dialogue-entry ${entry.type}">
          <div class="speaker">${entry.speaker}</div>
          <div class="message">${entry.text}</div>
        </div>
      `).join('');
    }

    // 渲染选项
    if (this.currentDialogues.length === 0) {
      optionsContainer.innerHTML = `
        <button class="dialogue-option end" data-action="end">结束对话</button>
      `;
    } else {
      optionsContainer.innerHTML = this.currentDialogues.map((dialogue, index) => `
        <button class="dialogue-option" data-index="${index}">
          ${dialogue.text}
        </button>
      `).join('');
    }

    // 滚动到底部
    historyContainer.scrollTop = historyContainer.scrollHeight;
    
    // 绑定选项事件
    this.bindOptionEvents();
  }

  /**
   * 选择对话选项
   * @param {number} index - 选项索引
   */
  selectOption(index) {
    const dialogue = this.currentDialogues[index];
    if (!dialogue) return;

    // 记录玩家说的话
    this.dialogueHistory.push({
      type: 'player',
      speaker: '林墨',
      text: dialogue.text,
    });

    // 记录NPC的回应
    this.dialogueHistory.push({
      type: 'npc',
      speaker: this.currentNPC.name,
      text: dialogue.response,
    });

    // 实时保存对话历史
    this.npcDialogueHistory.set(this.currentNPC.id, this.dialogueHistory);

    // 标记为已说过（所有对话都记录，不只是 once 的）
    const spokenKey = `npcs.${this.currentNPC.id}.spokenDialogues`;
    const spoken = this.gameEngine.state.get(spokenKey) || [];
    if (!spoken.includes(dialogue.id)) {
      spoken.push(dialogue.id);
      this.gameEngine.state.set(spokenKey, spoken, true);
    }

    // 应用效果
    if (dialogue.effects) {
      Object.entries(dialogue.effects).forEach(([status, delta]) => {
        this.gameEngine.state.modifyStatus(status, delta);
      });
    }

    // 添加线索
    if (dialogue.clueId) {
      this.gameEngine.state.addClue(dialogue.clueId);
      // 显示线索发现反馈
      const clueData = this.gameEngine.getClueData(dialogue.clueId);
      const clueName = clueData?.name || dialogue.clueId;
      this.eventSystem.emit('feedback:show', {
        message: `已记录线索：${clueName}`,
        type: 'clue',
      });
    }

    // 添加道具
    if (dialogue.addItems) {
      dialogue.addItems.forEach(itemId => {
        this.gameEngine.state.addItem(itemId);
      });
    }

    // 更新NPC关系
    if (dialogue.relationship) {
      const relKey = `npcs.${this.currentNPC.id}.relationship`;
      const current = this.gameEngine.state.get(relKey) || 0;
      this.gameEngine.state.set(relKey, current + dialogue.relationship, true);
    }

    // 刷新可用对话
    this.currentDialogues = this.getAvailableDialogues(this.currentNPC);
    
    // 如果有next，展开后续对话
    if (dialogue.next) {
      this.currentDialogues = this.currentDialogues.filter(d => 
        dialogue.next.includes(d.id)
      );
    }

    this.renderDialogue();
  }

  /**
   * 绑定事件
   */
  bindEvents() {
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

    // ESC键关闭
    this.escHandler = (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
    };
    document.addEventListener('keydown', this.escHandler);
  }

  /**
   * 绑定选项事件
   */
  bindOptionEvents() {
    if (!this.modal) return;

    const options = this.modal.querySelectorAll('.dialogue-option');
    options.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = e.currentTarget.dataset.index;
        if (index !== undefined) {
          this.selectOption(parseInt(index));
        } else {
          // 结束对话
          this.close();
        }
      });
    });
  }

  /**
   * 关闭弹窗
   */
  close() {
    // 保存当前NPC ID用于事件触发
    const finishedNPCId = this.currentNPC?.id;

    if (this.modal) {
      const modalToClose = this.modal; // 保存当前modal引用
      modalToClose.classList.remove('show');
      setTimeout(() => {
        // 只移除保存的引用
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

    // 关闭时保存当前NPC的对话历史
    if (this.currentNPC && this.dialogueHistory.length > 0) {
      this.npcDialogueHistory.set(this.currentNPC.id, this.dialogueHistory);
    }

    // 触发交互完成事件（用于任务检查）
    if (finishedNPCId) {
      this.eventSystem.emit('interaction:completed', {
        elementId: finishedNPCId,
        action: 'npc',
      });
    }

    this.currentNPC = null;
  }

  /**
   * 处理场景切换
   * 切换场景时清空所有NPC对话历史
   */
  handleSceneChange(data) {
    const newSceneId = data?.scene?.id;
    
    // 如果场景变化了，清空所有对话历史
    if (newSceneId && newSceneId !== this.currentSceneId) {
      console.log(`DialogueModal: 场景切换 ${this.currentSceneId} -> ${newSceneId}，清空对话历史`);
      this.npcDialogueHistory.clear();
      this.currentSceneId = newSceneId;
      
      // 如果当前有打开的对话框，关闭它
      if (this.modal) {
        this.close();
      }
    }
  }
}
