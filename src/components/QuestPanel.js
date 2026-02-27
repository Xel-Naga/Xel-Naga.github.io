/**
 * 任务状态面板组件
 * 显示任务列表和进度
 */

export class QuestPanel {
  constructor(eventSystem, gameEngine) {
    this.eventSystem = eventSystem;
    this.gameEngine = gameEngine;
    this.isVisible = false;
    this.panel = null;
    
    this.bindEvents();
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 监听任务事件
    this.eventSystem.on('quest:activated', () => this.refresh());
    this.eventSystem.on('quest:progress', () => this.refresh());
    this.eventSystem.on('quest:completed', () => this.refresh());
    
    // 监听快捷键
    document.addEventListener('keydown', (e) => {
      if (e.key === 'q' || e.key === 'Q') {
        this.toggle();
      }
    });
  }

  /**
   * 切换显示
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * 显示面板
   */
  show() {
    if (!this.panel) {
      this.createPanel();
    }
    
    this.panel.classList.add('show');
    this.isVisible = true;
    this.render();
  }

  /**
   * 隐藏面板
   */
  hide() {
    if (this.panel) {
      this.panel.classList.remove('show');
      this.isVisible = false;
    }
  }

  /**
   * 创建面板
   */
  createPanel() {
    const panelHTML = `
      <div class="quest-panel-overlay" id="quest-panel">
        <div class="quest-panel">
          <div class="panel-header">
            <h3 class="panel-title">📜 任务日志</h3>
            <button class="close-btn" aria-label="关闭">&times;</button>
          </div>
          <div class="panel-body" id="quest-list">
            <!-- 任务列表将在这里渲染 -->
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', panelHTML);
    this.panel = document.getElementById('quest-panel');
    
    // 绑定关闭事件
    const closeBtn = this.panel.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }
    
    // 点击背景关闭
    this.panel.addEventListener('click', (e) => {
      if (e.target === this.panel) {
        this.hide();
      }
    });
  }

  /**
   * 渲染任务列表
   */
  render() {
    const listContainer = this.panel?.querySelector('#quest-list');
    if (!listContainer) return;

    const activeQuests = this.gameEngine.state.get('quests.active') || [];
    const completedQuests = this.gameEngine.state.get('quests.completed') || [];
    const questData = this.gameEngine.currentChapter?.quests || [];

    let html = '';

    // 活跃任务
    if (activeQuests.length > 0) {
      html += '<div class="quest-section">';
      html += '<div class="section-title">进行中</div>';
      
      activeQuests.forEach(questId => {
        const quest = questData.find(q => q.id === questId);
        if (quest) {
          html += this.renderQuestItem(quest, 'active');
        }
      });
      
      html += '</div>';
    }

    // 已完成任务
    if (completedQuests.length > 0) {
      html += '<div class="quest-section">';
      html += '<div class="section-title">已完成</div>';
      
      completedQuests.forEach(questId => {
        const quest = questData.find(q => q.id === questId);
        if (quest) {
          html += this.renderQuestItem(quest, 'completed');
        }
      });
      
      html += '</div>';
    }

    // 没有任务
    if (activeQuests.length === 0 && completedQuests.length === 0) {
      html = `
        <div class="empty-state">
          <div class="empty-icon">📜</div>
          <div class="empty-text">暂无任务</div>
          <div class="empty-hint">探索场景以发现新任务</div>
        </div>
      `;
    }

    listContainer.innerHTML = html;
  }

  /**
   * 渲染单个任务
   */
  renderQuestItem(quest, status) {
    const progress = this.gameEngine.state.getQuestProgress(quest.id);
    const totalSteps = quest.steps?.length || 0;
    const completedSteps = progress?.completedSteps?.length || 0;
    const progressPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    let stepsHtml = '';
    if (quest.steps && status === 'active') {
      stepsHtml = '<div class="quest-steps">';
      quest.steps.forEach(step => {
        const isCompleted = progress?.completedSteps?.includes(step.id);
        const stepClass = isCompleted ? 'completed' : 'pending';
        const stepIcon = isCompleted ? '✓' : '○';
        stepsHtml += `
          <div class="quest-step ${stepClass}">
            <span class="step-icon">${stepIcon}</span>
            <span class="step-text">${step.description}</span>
          </div>
        `;
      });
      stepsHtml += '</div>';
    }

    const statusClass = status === 'active' ? 'quest-active' : 'quest-completed';
    const typeLabel = quest.type === 'main' ? '主线' : '支线';
    const typeClass = quest.type === 'main' ? 'type-main' : 'type-side';

    return `
      <div class="quest-item ${statusClass}">
        <div class="quest-header">
          <div class="quest-info">
            <span class="quest-type ${typeClass}">${typeLabel}</span>
            <h4 class="quest-name">${quest.name}</h4>
          </div>
          ${status === 'active' ? `
            <div class="quest-progress">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${progressPercent}%"></div>
              </div>
              <span class="progress-text">${completedSteps}/${totalSteps}</span>
            </div>
          ` : '<span class="completed-badge">✓ 完成</span>'}
        </div>
        <p class="quest-description">${quest.description}</p>
        ${stepsHtml}
      </div>
    `;
  }

  /**
   * 刷新面板
   */
  refresh() {
    if (this.isVisible) {
      this.render();
    }
  }

  /**
   * 激活任务
   * @param {string} questId - 任务ID
   */
  activateQuest(questId) {
    this.gameEngine.state.activateQuest(questId);
    
    // 显示提示
    const quest = this.gameEngine.currentChapter?.quests?.find(q => q.id === questId);
    if (quest) {
      this.eventSystem.emit('feedback:show', {
        message: `新任务: ${quest.name}`,
        type: 'quest',
      });
    }
  }

  /**
   * 更新任务进度
   * @param {string} questId - 任务ID
   * @param {string} stepId - 步骤ID
   */
  updateQuestProgress(questId, stepId) {
    this.gameEngine.state.updateQuestProgress(questId, stepId);
  }

  /**
   * 完成任务
   * @param {string} questId - 任务ID
   */
  completeQuest(questId) {
    this.gameEngine.state.completeQuest(questId);
    
    // 显示提示
    const quest = this.gameEngine.currentChapter?.quests?.find(q => q.id === questId);
    if (quest) {
      this.eventSystem.emit('feedback:show', {
        message: `任务完成: ${quest.name}`,
        type: 'success',
      });
    }
  }
}
