/**
 * 决策对话框组件
 * 显示危险场景中的随机事件和决策选项
 */

export class DecisionModal {
  constructor(eventSystem, uiRenderer) {
    this.eventSystem = eventSystem;
    this.uiRenderer = uiRenderer;
    this.modal = null;
    this.timerDisplay = null;
    this.countdownInterval = null;

    // 绑定事件
    this.bindEvents();
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    this.eventSystem.on('decision:show', (decision) => {
      this.show(decision);
    });

    this.eventSystem.on('decision:completed', () => {
      this.hide();
    });
  }

  /**
   * 显示决策对话框
   */
  show(decision) {
    this.createModal(decision);
    this.startCountdown(decision.timeLimit);
  }

  /**
   * 创建模态框
   */
  createModal(decision) {
    // 移除已存在的模态框
    this.hide();

    // 创建模态框容器
    this.modal = document.createElement('div');
    this.modal.className = 'decision-modal-overlay';

    // 创建内容
    const content = document.createElement('div');
    content.className = 'decision-modal';

    // 标题
    const title = document.createElement('h2');
    title.className = 'decision-title';
    title.innerHTML = `⚠️ ${decision.title}`;

    // 描述
    const desc = document.createElement('div');
    desc.className = 'decision-description';
    desc.innerHTML = decision.description || decision.message || '';

    // 倒计时显示
    this.timerDisplay = document.createElement('div');
    this.timerDisplay.className = 'decision-timer';

    // 选项列表
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'decision-options';

    decision.options.forEach((option, index) => {
      const optionBtn = document.createElement('button');
      optionBtn.className = 'decision-option';
      optionBtn.innerHTML = `
        <span class="option-text">${option.text}</span>
        ${option.requirements ? `<span class="option-requirements">${this.formatRequirements(option.requirements)}</span>` : ''}
        ${option.description ? `<span class="option-description">${option.description}</span>` : ''}
      `;

      // 检查是否可用
      if (!this.checkOptionRequirements(option.requirements)) {
        optionBtn.classList.add('disabled');
        optionBtn.disabled = true;
      } else {
        optionBtn.addEventListener('click', () => {
          this.selectOption(decision, option);
        });
      }

      optionsContainer.appendChild(optionBtn);
    });

    // 组装内容
    content.appendChild(title);
    content.appendChild(desc);
    content.appendChild(optionsContainer);
    content.appendChild(this.timerDisplay);

    this.modal.appendChild(content);
    document.body.appendChild(this.modal);
  }

  /**
   * 格式化需求显示
   */
  formatRequirements(requirements) {
    const parts = [];
    if (requirements.attributes) {
      Object.entries(requirements.attributes).forEach(([attr, value]) => {
        parts.push(`${attr}: ${value}+`);
      });
    }
    if (requirements.items) {
      parts.push(`需要: ${requirements.items.join(', ')}`);
    }
    if (requirements.flags) {
      parts.push(`需要: ${requirements.flags.join(', ')}`);
    }
    return parts.join(' | ');
  }

  /**
   * 检查选项需求
   */
  checkOptionRequirements(requirements) {
    if (!requirements) return true;

    // TODO: 关联游戏状态检查
    return true;
  }

  /**
   * 选择选项
   */
  selectOption(decision, option) {
    this.stopCountdown();
    this.hide();

    // 发送选择事件
    this.eventSystem.emit('decision:select', {
      eventId: decision.eventId,
      optionId: option.id,
      option: option,
    });
  }

  /**
   * 开始倒计时
   */
  startCountdown(seconds) {
    if (seconds <= 0) return;

    let remaining = seconds;
    this.updateTimerDisplay(remaining);

    this.countdownInterval = setInterval(() => {
      remaining--;
      this.updateTimerDisplay(remaining);

      if (remaining <= 0) {
        this.stopCountdown();
      }
    }, 1000);
  }

  /**
   * 更新倒计时显示
   */
  updateTimerDisplay(seconds) {
    if (!this.timerDisplay) return;

    const percentage = (seconds / this.currentDecision?.timeLimit || 1) * 100;
    this.timerDisplay.innerHTML = `
      <span class="timer-text">剩余时间: ${seconds}秒</span>
      <div class="timer-bar">
        <div class="timer-fill" style="width: ${percentage}%"></div>
      </div>
    `;
  }

  /**
   * 停止倒计时
   */
  stopCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  /**
   * 隐藏模态框
   */
  hide() {
    this.stopCountdown();
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }
}
