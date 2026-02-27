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
  }

  /**
   * 显示对话弹窗
   * @param {string} npcId - NPC ID
   */
  show(npcId) {
    const npc = this.gameEngine.currentChapter?.npcs?.[npcId];
    if (!npc) {
      console.warn(`NPC未找到: ${npcId}`);
      return;
    }

    this.currentNPC = npc;
    this.dialogueHistory = [];
    
    // 获取可用对话选项
    this.currentDialogues = this.getAvailableDialogues(npc);
    
    this.createModal(npc);
    this.renderDialogue();
  }

  /**
   * 获取可用对话选项
   */
  getAvailableDialogues(npc) {
    if (!npc.dialogues) return [];
    
    return npc.dialogues.filter(d => {
      // 检查是否已说过（一次性对话）
      if (d.once) {
        const spoken = this.gameEngine.state.get(`npcs.${npc.id}.spokenDialogues`) || [];
        if (spoken.includes(d.id)) return false;
      }
      
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
    this.close();

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
    
    requestAnimationFrame(() => {
      this.modal.classList.add('show');
    });

    this.bindEvents();
  }

  /**
   * 渲染对话内容
   */
  renderDialogue() {
    const historyContainer = this.modal?.querySelector('#dialogue-history');
    const optionsContainer = this.modal?.querySelector('#dialogue-options');
    
    if (!historyContainer || !optionsContainer) return;

    // 渲染历史记录
    if (this.dialogueHistory.length > 0) {
      historyContainer.innerHTML = this.dialogueHistory.map(h => `
        <div class="dialogue-entry ${h.type}">
          <div class="speaker">${h.speaker}</div>
          <div class="message">${h.text}</div>
        </div>
      `).join('');
      
      // 滚动到底部
      historyContainer.scrollTop = historyContainer.scrollHeight;
    } else {
      // 显示初始对话
      historyContainer.innerHTML = `
        <div class="dialogue-entry npc">
          <div class="speaker">${this.currentNPC.name}</div>
          <div class="message">${this.currentNPC.initialDialogue || '...'}</div>
        </div>
      `;
    }

    // 渲染选项
    if (this.currentDialogues.length > 0) {
      optionsContainer.innerHTML = this.currentDialogues.map((d, index) => `
        <button class="dialogue-option" data-index="${index}">
          <span class="option-text">${d.text}</span>
          ${d.clueId ? '<span class="option-hint">💡</span>' : ''}
        </button>
      `).join('');
    } else {
      optionsContainer.innerHTML = `
        <button class="dialogue-option end-dialogue">
          <span class="option-text">结束对话</span>
        </button>
      `;
    }

    this.bindOptionEvents();
  }

  /**
   * 选择对话选项
   */
  selectOption(index) {
    const dialogue = this.currentDialogues[index];
    if (!dialogue) {
      this.close();
      return;
    }

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

    // 标记为已说过
    if (dialogue.once) {
      const spokenKey = `npcs.${this.currentNPC.id}.spokenDialogues`;
      const spoken = this.gameEngine.state.get(spokenKey) || [];
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

    this.currentNPC = null;
  }
}
