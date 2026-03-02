/**
 * 确认对话框组件
 * 替代系统 alert/confirm 弹窗
 */

export class ConfirmModal {
  constructor() {
    this.modal = null;
  }

  /**
   * 显示确认对话框
   * @param {Object} options - 配置选项
   * @param {string} options.title - 标题
   * @param {string} options.message - 消息内容
   * @param {string} options.confirmText - 确认按钮文字
   * @param {string} options.cancelText - 取消按钮文字
   * @param {string} options.type - 类型: 'info' | 'warning' | 'danger'
   * @returns {Promise<boolean>} 用户选择结果
   */
  show(options) {
    return new Promise((resolve) => {
      this.createModal(options, resolve);
    });
  }

  /**
   * 创建确认对话框
   */
  createModal(options, resolve) {
    // 移除已存在的弹窗
    this.close();

    const {
      title = '提示',
      message = '',
      confirmText = '确定',
      cancelText = '取消',
      type = 'info'
    } = options;

    // 创建遮罩
    this.modal = document.createElement('div');
    this.modal.className = 'confirm-modal-overlay';

    // 创建内容
    const content = document.createElement('div');
    content.className = `confirm-modal confirm-modal-${type}`;

    // 标题
    const titleEl = document.createElement('h2');
    titleEl.className = 'confirm-title';
    titleEl.textContent = title;

    // 消息
    const messageEl = document.createElement('div');
    messageEl.className = 'confirm-message';
    messageEl.innerHTML = message.replace(/\n/g, '<br>');

    // 按钮容器
    const btnContainer = document.createElement('div');
    btnContainer.className = 'confirm-buttons';

    // 取消按钮
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'confirm-btn confirm-btn-cancel';
    cancelBtn.textContent = cancelText;
    cancelBtn.addEventListener('click', () => {
      this.close();
      resolve(false);
    });

    // 确认按钮
    const confirmBtn = document.createElement('button');
    confirmBtn.className = `confirm-btn confirm-btn-confirm`;
    confirmBtn.textContent = confirmText;
    confirmBtn.addEventListener('click', () => {
      this.close();
      resolve(true);
    });

    btnContainer.appendChild(cancelBtn);
    btnContainer.appendChild(confirmBtn);

    // 组装
    content.appendChild(titleEl);
    content.appendChild(messageEl);
    content.appendChild(btnContainer);

    this.modal.appendChild(content);
    document.body.appendChild(this.modal);

    // ESC 键关闭
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.close();
        resolve(false);
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // 点击遮罩关闭（仅取消）
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
        resolve(false);
        document.removeEventListener('keydown', escHandler);
      }
    });
  }

  /**
   * 关闭对话框
   */
  close() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }

  /**
   * 简化版提示框（类似 alert）
   */
  alert(title, message, type = 'info') {
    return this.show({
      title,
      message,
      confirmText: '确定',
      cancelText: '',
      type
    });
  }

  /**
   * 简化版确认框（类似 confirm）
   */
  confirm(title, message, type = 'warning') {
    return this.show({
      title,
      message,
      confirmText: '确定',
      cancelText: '取消',
      type
    });
  }
}
