/**
 * 《悬观谜案：百年轮回》游戏主入口
 * 第一阶段原型：核心系统初始化
 */

import { GameEngine } from './core/GameEngine.js';
import { UIRenderer } from './core/UIRenderer.js';
import { EventSystem } from './core/EventSystem.js';

// 游戏配置
const GAME_CONFIG = {
  version: '0.1.0-prototype',
  chapter: 1,
  debug: true,
  autoSaveInterval: 30000, // 30秒自动保存
};

// 游戏主类
class AdventureGame {
  constructor() {
    this.config = GAME_CONFIG;
    this.engine = null;
    this.ui = null;
    this.eventSystem = null;
    this.isInitialized = false;
  }

  /**
   * 初始化游戏
   */
  async init() {
    console.log(`🎮 悬观谜案：百年轮回 v${this.config.version}`);
    console.log('正在初始化游戏系统...');

    try {
      // 初始化事件系统
      this.eventSystem = new EventSystem();
      
      // 初始化游戏引擎
      this.engine = new GameEngine(this.eventSystem);
      await this.engine.init();
      
      // 初始化UI渲染器
      this.ui = new UIRenderer(this.engine, this.eventSystem);
      this.ui.init();
      
      // 绑定全局事件
      this.bindGlobalEvents();
      
      this.isInitialized = true;
      
      // 隐藏加载遮罩
      this.hideLoadingOverlay();
      
      console.log('✅ 游戏初始化完成');
      
      // 开始游戏
      this.start();
      
    } catch (error) {
      console.error('❌ 游戏初始化失败:', error);
      this.showError('游戏加载失败，请刷新页面重试');
    }
  }

  /**
   * 绑定全局事件
   */
  bindGlobalEvents() {
    // 监听游戏结束事件
    this.eventSystem.on('game:over', (data) => {
      this.handleGameOver(data);
    });

    // 自动保存
    setInterval(() => {
      this.autoSave();
    }, this.config.autoSaveInterval);

    // 页面可见性变化（切换标签页）
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.autoSave();
      }
    });

    // 窗口关闭前保存
    window.addEventListener('beforeunload', (e) => {
      this.autoSave();
    });
  }

  /**
   * 处理游戏结束
   * @param {Object} data - 游戏结束数据
   */
  handleGameOver(data) {
    console.log('游戏结束:', data);

    // 创建游戏结束面板
    const overlay = document.createElement('div');
    overlay.id = 'game-over-overlay';
    overlay.className = 'game-over-overlay';
    overlay.innerHTML = `
      <div class="game-over-content">
        <h1 class="game-over-title">${data.title || '游戏结束'}</h1>
        <p class="game-over-description">${data.description || ''}</p>
        <p class="game-over-hint">${data.hint || ''}</p>
        <div class="game-over-buttons">
          <button class="game-over-btn" id="btn-new-game">全新开始</button>
          <button class="game-over-btn btn-continue" id="btn-continue">继续游戏</button>
        </div>
      </div>
    `;

    // 绑定全新开始按钮
    setTimeout(() => {
      const newGameBtn = document.getElementById('btn-new-game');
      const continueBtn = document.getElementById('btn-continue');

      if (newGameBtn) {
        newGameBtn.addEventListener('click', () => {
          // 清除存档
          localStorage.removeItem('xuan_guan_mystery_save');
          // 重新加载页面（不带存档）
          location.href = location.pathname + location.search;
        });
      }

      if (continueBtn) {
        continueBtn.addEventListener('click', () => {
          // 关闭遮罩，继续当前游戏
          overlay.remove();
          style.remove();
        });
      }
    }, 100);

    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
      .game-over-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
      }
      .game-over-content {
        text-align: center;
        color: #e0e0e0;
        max-width: 600px;
        padding: 40px;
      }
      .game-over-title {
        font-size: 48px;
        color: #4a9eff;
        margin-bottom: 30px;
        text-shadow: 0 0 20px rgba(74, 158, 255, 0.5);
      }
      .game-over-description {
        font-size: 18px;
        line-height: 1.8;
        margin-bottom: 20px;
        color: #b0b0b0;
      }
      .game-over-hint {
        font-size: 14px;
        color: #808080;
        font-style: italic;
        margin-bottom: 40px;
      }
      .game-over-buttons {
        display: flex;
        gap: 20px;
        justify-content: center;
        margin-top: 20px;
      }
      .game-over-btn {
        padding: 15px 40px;
        font-size: 18px;
        background: #4a9eff;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.3s;
      }
      .game-over-btn:hover {
        background: #6bb3ff;
        transform: scale(1.05);
      }
      .game-over-btn.btn-continue {
        background: #44a855;
      }
      .game-over-btn.btn-continue:hover {
        background: #5bc467;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(overlay);
  }

  /**
   * 开始游戏
   */
  start() {
    console.log('🎬 开始游戏');
    this.engine.startChapter(this.config.chapter);
  }

  /**
   * 自动保存
   */
  autoSave() {
    if (this.engine && this.isInitialized) {
      this.engine.saveGame();
      console.log('💾 游戏已自动保存');
    }
  }

  /**
   * 隐藏加载遮罩
   */
  hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 500);
    }
  }

  /**
   * 显示错误信息
   */
  showError(message) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.innerHTML = `
        <div class="loading-content">
          <p class="loading-text" style="color: var(--color-danger);">⚠️ ${message}</p>
        </div>
      `;
    }
  }
}

// 创建游戏实例并启动
const game = new AdventureGame();

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM加载完成，开始初始化游戏...');
  game.init().catch(err => {
    console.error('游戏初始化异常:', err);
  });
});

// 导出游戏实例供调试使用
window.game = game;
