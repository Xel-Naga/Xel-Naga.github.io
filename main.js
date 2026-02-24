/**
 * 《悬观谜案：百年轮回》文字交互式解密游戏
 * 主入口文件 - ES6模块化版本
 * 版本: 2.0
 * 创建时间: 2026年2月24日
 */

// 全局错误处理
window.addEventListener('error', function(event) {
    console.error('🆘 全局错误捕获:', event.error);
    console.error('🔍 错误堆栈:', event.error?.stack);
    event.preventDefault();
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('🆘 未处理的Promise拒绝:', event.reason);
    console.error('🔍 拒绝原因:', event.reason?.stack || event.reason);
    event.preventDefault();
});

// 导入核心模块
import { AdventureGame } from './modules/core/AdventureGame.js';

// 游戏全局实例
let game = null;

console.log('main.js开始执行，检查文档状态...');
console.log('📄 document.readyState:', document.readyState);

// 页面加载完成后初始化游戏
async function initGame() {
    console.log('🎮 开始游戏初始化...');
    console.log('📁 当前URL:', window.location.href);
    console.log('🔧 脚本类型: ES6模块');

    try {
        console.log('🔄 导入AdventureGame模块...');
        // 创建游戏实例
        game = new AdventureGame();
        console.log('✅ AdventureGame实例创建成功');

        console.log('🔄 开始初始化游戏...');
        console.log('🔍 开始调用game.init()...');
        console.time('game.init()执行时间');
        // 初始化游戏
        await game.init();
        console.timeEnd('game.init()执行时间');

        console.log('🎉 游戏初始化完成！');

        // 隐藏加载遮罩
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            console.log('👁️ 隐藏加载遮罩');
            loadingOverlay.style.display = 'none';
        } else {
            console.warn('⚠️ 未找到加载遮罩元素');
        }

    } catch (error) {
        console.error('❌ 游戏初始化失败:', error);
        console.error('🔍 错误堆栈:', error.stack);

        // 显示错误信息
        const feedbackContent = document.getElementById('feedback-content');
        if (feedbackContent) {
            const errorItem = document.createElement('div');
            errorItem.className = 'feedback-item error';
            errorItem.innerHTML = `<strong>系统错误:</strong> 游戏初始化失败: ${error.message}`;
            feedbackContent.appendChild(errorItem);
            console.log('📝 错误信息已显示到反馈区域');
        } else {
            console.warn('⚠️ 未找到反馈区域元素');
        }

        // 隐藏加载遮罩
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            console.log('👁️ 错误时隐藏加载遮罩');
            loadingOverlay.style.display = 'none';
        }
    }
}

// 根据文档状态决定如何初始化
if (document.readyState === 'loading') {
    console.log('📄 文档仍在加载中，等待DOMContentLoaded事件...');
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    console.log('📄 文档已加载完成，立即初始化游戏...');
    initGame();
}

// 全局导出游戏实例（用于调试）
window.game = game;