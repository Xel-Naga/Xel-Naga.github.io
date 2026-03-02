/**
 * 烟雾效果系统
 * 支持多种渲染方案：Canvas粒子、SVG滤镜等
 */

/**
 * 烟雾效果基类
 * 定义所有烟雾渲染器的接口
 */
class SmokeEffectBase {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      particleCount: 40,      // 粒子数量
      baseColor: { r: 40, g: 5, b: 5 },  // 基础颜色（黑红）
      minOpacity: 0.1,        // 最小透明度
      maxOpacity: 0.5,        // 最大透明度
      minSize: 30,            // 最小粒子大小
      maxSize: 100,           // 最大粒子大小
      minSpeedY: -2,         // 最小向上速度
      maxSpeedY: -0.5,       // 最大向上速度
      minSpeedX: -0.8,       // 最小水平摆动
      maxSpeedX: 0.8,        // 最大水平摆动
      turbulence: 0.3,        // 湍流强度
      ...options
    };
    this.isRunning = false;
    this.animationId = null;
  }

  /**
   * 初始化
   */
  init() {
    throw new Error('init() must be implemented');
  }

  /**
   * 开始动画
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.animate();
  }

  /**
   * 停止动画
   */
  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * 动画循环
   */
  animate() {
    throw new Error('animate() must be implemented');
  }

  /**
   * 销毁
   */
  destroy() {
    this.stop();
    throw new Error('destroy() must be implemented');
  }

  /**
   * 调整大小
   */
  resize() {
    throw new Error('resize() must be implemented');
  }

  /**
   * 更新选项
   */
  setOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
  }
}

/**
 * Canvas 粒子渲染方案
 */
class CanvasSmokeEffect extends SmokeEffectBase {
  init() {
    // 创建 Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'smoke-canvas';
    this.ctx = this.canvas.getContext('2d');

    // 设置样式 - 烟雾在背景后面，按钮前面
    Object.assign(this.canvas.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '1'
    });

    // 把烟雾插入到容器的第一个子元素之前，确保在内容下面
    if (this.container.firstChild) {
      this.container.insertBefore(this.canvas, this.container.firstChild);
    } else {
      this.container.appendChild(this.canvas);
    }

    // 初始化粒子
    this.particles = [];
    this.initParticles();

    // 监听窗口大小
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  initParticles() {
    this.particles = [];
    const { particleCount, minSize, maxSize, minOpacity, maxOpacity, minSpeedY, maxSpeedY, minSpeedX, maxSpeedX } = this.options;

    for (let i = 0; i < particleCount; i++) {
      this.particles.push(this.createParticle(true));
    }
  }

  createParticle(randomY = false) {
    const { minSize, maxSize, minOpacity, maxOpacity, minSpeedY, maxSpeedY, minSpeedX, maxSpeedX } = this.options;

    // 确保尺寸在有效范围内
    const size = minSize + Math.random() * (maxSize - minSize);

    return {
      // 位置 - 在底部随机分布
      x: Math.random() * this.width,
      y: randomY ? Math.random() * this.height : this.height + Math.random() * 100,

      // 速度
      vx: minSpeedX + Math.random() * (maxSpeedX - minSpeedX),
      vy: minSpeedY + Math.random() * (maxSpeedY - minSpeedY),

      // 外观
      size: size,
      opacity: minOpacity + Math.random() * (maxOpacity - minOpacity),

      // 形状变化
      distortion: Math.random() * 0.5 + 0.5,  // 0.5-1.0
      rotation: Math.random() * Math.PI * 2,

      // 动画偏移
      offset: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 0.5
    };
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    // 使用容器尺寸，如果太小则使用window尺寸
    this.width = rect.width > 0 ? rect.width : window.innerWidth;
    this.height = rect.height > 0 ? rect.height : window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  animate() {
    if (!this.isRunning) return;

    const { turbulence, baseColor } = this.options;

    // 清除画布
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 更新和绘制每个粒子
    this.particles.forEach((particle, index) => {
      // 预防性检查：确保粒子数据有效，无效则重置
      if (!isFinite(particle.x) || !isFinite(particle.y) || !isFinite(particle.size) ||
          !isFinite(particle.opacity) || particle.size <= 0 || particle.opacity <= 0) {
        this.particles[index] = this.createParticle(false);
        return;
      }

      // 更新位置
      // 水平摆动 - 使用正弦波模拟湍流
      const turbulenceX = Math.sin(Date.now() * 0.001 * particle.speed + particle.offset) * turbulence;
      particle.x += particle.vx + turbulenceX;

      // 向上运动
      particle.y += particle.vy;

      // 尺寸逐渐变大（烟雾扩散），限制最大尺寸
      particle.size = Math.min(particle.size + 0.3, 300);

      // 透明度逐渐降低（烟雾消散）
      const progress = (this.height - particle.y) / this.height;
      particle.opacity = Math.max(0, particle.opacity * 0.998);

      // 如果粒子超出顶部、尺寸无效或完全透明，重置到底部
      if (particle.y < -particle.size || !isFinite(particle.size) || particle.opacity < 0.05) {
        this.particles[index] = this.createParticle(false);
        return;
      }

      // 绘制粒子，如果返回 true 表示需要重置
      const needsReset = this.drawParticle(particle, baseColor, progress);
      if (needsReset) {
        this.particles[index] = this.createParticle(false);
        return;
      }
    });

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  drawParticle(particle, baseColor, progress) {
    const { ctx, width, height } = this;
    const { x, y, size, opacity, distortion, rotation } = particle;

    // 验证所有数值有效性，防止非有限值错误，无效则返回需要重置
    if (!isFinite(x) || !isFinite(y) || !isFinite(size) || size <= 0 ||
        !isFinite(opacity) || opacity <= 0 || !isFinite(distortion)) {
      return true; // 返回 true 表示需要重置粒子
    }

    // 限制所有值在合理范围内
    const validSize = Math.min(Math.max(size, 1), 500);
    const validX = isFinite(x) ? x : 0;
    const validY = isFinite(y) ? y : 0;
    const validOpacity = Math.min(Math.max(opacity, 0), 1);

    ctx.save();

    // 创建径向渐变 - 模拟烟雾中心浓边缘淡
    const gradient = ctx.createRadialGradient(validX, validY, 0, validX, validY, validSize);

    // 颜色随高度变化 - 底部偏深色，顶部偏淡
    const colorFade = Math.min(1, progress * 1.5);
    const r = Math.floor(baseColor.r * (1 - colorFade * 0.5));
    const g = Math.floor(baseColor.g * (1 - colorFade * 0.3));
    const b = Math.floor(baseColor.b * (1 - colorFade * 0.3));

    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${validOpacity})`);
    gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${validOpacity * 0.6})`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    // 绘制不规则形状
    ctx.translate(validX, validY);
    ctx.rotate(rotation);
    ctx.scale(distortion, 1);

    ctx.beginPath();
    ctx.arc(0, 0, validSize, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // 绘制第二层，增加细节
    ctx.beginPath();
    ctx.arc(validSize * 0.3, -validSize * 0.2, validSize * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${validOpacity * 0.3})`;
    ctx.fill();

    ctx.restore();

    return false; // 绘制成功，不需要重置
  }

  destroy() {
    this.stop();
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    window.removeEventListener('resize', () => this.resize());
  }
}

/**
 * SVG 滤镜渲染方案（预留接口）
 */
class SVGSmokeEffect extends SmokeEffectBase {
  init() {
    // 创建 SVG 容器
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'smoke-svg');
    Object.assign(this.svg.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '1'
    });

    // 添加滤镜定义
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <filter id="smoke-filter" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="30" result="blur"/>
        <feColorMatrix in="blur" type="matrix"
          values="1 0 0 0 0
                  0 1 0 0 0
                  0 0 1 0 0
                  0 0 0 0.5 0"/>
      </filter>
    `;
    this.svg.appendChild(defs);

    // 创建烟雾元素容器
    this.smokeContainer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.smokeContainer.setAttribute('filter', 'url(#smoke-filter)');
    this.svg.appendChild(this.smokeContainer);

    this.container.appendChild(this.svg);

    // 初始化烟雾团
    this.smokeElements = [];
    this.initSmokeElements();

    // 监听窗口大小
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  initSmokeElements() {
    const { particleCount, minSize, maxSize, minOpacity, maxOpacity } = this.options;

    for (let i = 0; i < particleCount; i++) {
      const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      const size = minSize + Math.random() * (maxSize - minSize);
      const opacity = minOpacity + Math.random() * (maxOpacity - minOpacity);

      ellipse.setAttribute('rx', size);
      ellipse.setAttribute('ry', size * 0.7);
      ellipse.setAttribute('fill', `rgb(40, 5, 5)`);
      ellipse.setAttribute('opacity', opacity);
      ellipse.setAttribute('cx', Math.random() * 100 + '%');
      ellipse.setAttribute('cy', '100%');

      // 添加动画
      const duration = 10 + Math.random() * 10;
      const delay = Math.random() * 5;

      ellipse.style.animation = `smoke-rise-${i} ${duration}s ease-out ${delay}s infinite`;

      // 创建关键帧动画
      const keyframes = `
        @keyframes smoke-rise-${i} {
          0% { transform: translateY(0) scale(1); opacity: ${opacity}; }
          50% { transform: translateY(-30vh) scale(1.5) rotate(${Math.random() * 30 - 15}deg); opacity: ${opacity * 0.6}; }
          100% { transform: translateY(-100vh) scale(2) rotate(${Math.random() * 60 - 30}deg); opacity: 0; }
        }
      `;

      // 添加动画样式
      let style = document.getElementById('smoke-animations');
      if (!style) {
        style = document.createElement('style');
        style.id = 'smoke-animations';
        document.head.appendChild(style);
      }
      style.textContent += keyframes;

      this.smokeContainer.appendChild(ellipse);
      this.smokeElements.push(ellipse);
    }
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
  }

  animate() {
    // SVG 版本使用 CSS 动画，无需 JS 动画循环
  }

  destroy() {
    this.stop();
    if (this.svg && this.svg.parentNode) {
      this.svg.parentNode.removeChild(this.svg);
    }
    window.removeEventListener('resize', () => this.resize());
  }
}

/**
 * 烟雾效果管理器
 * 统一管理不同渲染方案
 */
class SmokeEffectManager {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.effect = null;
  }

  /**
   * 创建指定类型的烟雾效果
   * @param {string} type - 'canvas' | 'svg'
   */
  create(type = 'canvas') {
    switch (type) {
      case 'canvas':
        this.effect = new CanvasSmokeEffect(this.container, this.options);
        break;
      case 'svg':
        this.effect = new SVGSmokeEffect(this.container, this.options);
        break;
      default:
        console.warn(`Unknown smoke effect type: ${type}, using canvas`);
        this.effect = new CanvasSmokeEffect(this.container, this.options);
    }

    this.effect.init();
    return this;
  }

  /**
   * 切换渲染方案
   * @param {string} type - 'canvas' | 'svg'
   */
  switchTo(type) {
    if (this.effect) {
      this.effect.destroy();
    }
    this.create(type);
    this.effect.start();
    return this;
  }

  /**
   * 开始动画
   */
  start() {
    if (this.effect) {
      this.effect.start();
    }
    return this;
  }

  /**
   * 停止动画
   */
  stop() {
    if (this.effect) {
      this.effect.stop();
    }
    return this;
  }

  /**
   * 更新选项
   */
  setOptions(newOptions) {
    if (this.effect) {
      this.effect.setOptions(newOptions);
    }
    return this;
  }

  /**
   * 销毁
   */
  destroy() {
    if (this.effect) {
      this.effect.destroy();
      this.effect = null;
    }
  }
}

// 导出
export { SmokeEffectManager, CanvasSmokeEffect, SVGSmokeEffect, SmokeEffectBase };
