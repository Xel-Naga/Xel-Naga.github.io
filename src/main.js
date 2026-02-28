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
