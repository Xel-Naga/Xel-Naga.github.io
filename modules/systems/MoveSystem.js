/**
 * 移动系统
 * 负责处理玩家位置移动和导航
 */

import { DEFAULT_CONFIG } from '../utils/Constants.js';

export class MoveSystem {
    constructor(game) {
        this.game = game;
    }

    /**
     * 初始化移动系统
     */
    init() {
        console.log('初始化移动系统...');
        this.setupNavigationEventListeners();
    }

    /**
     * 设置导航事件监听器
     */
    setupNavigationEventListeners() {
        // 标准方向按钮
        const directions = ['north', 'south', 'east', 'west'];
        directions.forEach(direction => {
            const button = document.getElementById(`btn-${direction}`);
            if (button) {
                button.addEventListener('click', () => this.move(direction));
            }
        });

        // 特殊方向按钮（通过事件委托）
        const specialNavButtons = document.getElementById('special-nav-buttons');
        if (specialNavButtons) {
            specialNavButtons.addEventListener('click', (e) => {
                const button = e.target.closest('.special-nav-btn');
                if (button && !button.disabled) {
                    const direction = button.dataset.direction;
                    this.move(direction);
                }
            });
        }
    }

    /**
     * 移动到指定方向
     * @param {string} direction - 移动方向
     * @returns {boolean} 是否移动成功
     */
    move(direction) {
        console.log(`尝试移动方向: ${direction}`);

        // 检查是否可以移动
        if (!this.canMove()) {
            this.game.uiRenderer.addFeedback('系统', '体力不足，无法移动', 'error');
            return false;
        }

        // 获取当前位置
        const currentLocationId = this.game.gameState.getPlayerLocation();
        const currentLocation = this.game.dataLoader.getLocation(currentLocationId);

        if (!currentLocation) {
            console.error(`当前位置不存在: ${currentLocationId}`);
            return false;
        }

        // 查找出口
        const exit = currentLocation.exits?.find(e => e.direction === direction);
        if (!exit) {
            this.game.uiRenderer.addFeedback('系统', `无法向${direction}移动`, 'error');
            return false;
        }

        // 检查是否锁定
        if (exit.locked) {
            this.game.uiRenderer.addFeedback('系统', exit.locked_message || '道路被封锁，无法通过', 'warning');
            return false;
        }

        // 消耗体力和时间
        this.game.statusManager.consumeStamina(DEFAULT_CONFIG.MOVE_STAMINA_COST, '移动');
        this.game.timeSystem.advanceTime(DEFAULT_CONFIG.MOVE_TIME_COST);

        // 更新玩家位置
        this.game.gameState.setPlayerLocation(exit.target);

        // 更新地图数据
        if (this.game.mapManager) {
            this.game.mapManager.updateMapData();
        }

        // 更新UI
        this.game.uiRenderer.updateSceneUI();
        this.game.uiRenderer.updateGameInfo();

        // 显示移动反馈
        const targetLocation = this.game.dataLoader.getLocation(exit.target);
        if (targetLocation) {
            this.game.uiRenderer.addFeedback('系统', `你移动到了${targetLocation.name}`, 'location');
        }

        // 触发事件
        this.game.eventSystem.emit('player:moved', {
            from: currentLocationId,
            to: exit.target,
            direction: direction,
            location: targetLocation
        });

        return true;
    }

    /**
     * 检查是否可以移动
     * @returns {boolean} 是否可以移动
     */
    canMove() {
        return this.game.statusManager.canMove();
    }

    /**
     * 直接移动到指定位置（用于特殊事件）
     * @param {string} locationId - 位置ID
     * @param {string} reason - 移动原因
     * @returns {boolean} 是否移动成功
     */
    teleport(locationId, reason = '未知') {
        const location = this.game.dataLoader.getLocation(locationId);
        if (!location) {
            console.error(`目标位置不存在: ${locationId}`);
            return false;
        }

        const currentLocationId = this.game.gameState.getPlayerLocation();

        // 更新玩家位置
        this.game.gameState.setPlayerLocation(locationId);

        // 更新地图数据
        if (this.game.mapManager) {
            this.game.mapManager.updateMapData();
        }

        // 更新UI
        this.game.uiRenderer.updateSceneUI();
        this.game.uiRenderer.updateGameInfo();

        // 显示移动反馈
        this.game.uiRenderer.addFeedback('系统', `你${reason}到了${location.name}`, 'location');

        // 触发事件
        this.game.eventSystem.emit('player:teleported', {
            from: currentLocationId,
            to: locationId,
            reason: reason,
            location: location
        });

        return true;
    }

    /**
     * 获取当前位置的可用出口
     * @returns {Array} 可用出口列表
     */
    getAvailableExits() {
        const currentLocationId = this.game.gameState.getPlayerLocation();
        const currentLocation = this.game.dataLoader.getLocation(currentLocationId);

        if (!currentLocation || !currentLocation.exits) {
            return [];
        }

        return currentLocation.exits.filter(exit => !exit.locked);
    }

    /**
     * 检查位置是否已探索
     * @param {string} locationId - 位置ID
     * @returns {boolean} 是否已探索
     */
    isLocationDiscovered(locationId) {
        const player = this.game.gameState.getPlayerState();
        return player.discoveredLocations.has(locationId);
    }

    /**
     * 获取已探索的位置列表
     * @returns {Array} 已探索位置ID列表
     */
    getDiscoveredLocations() {
        const player = this.game.gameState.getPlayerState();
        return Array.from(player.discoveredLocations);
    }

    /**
     * 获取位置连接图（用于地图显示）
     * @returns {Object} 位置连接图
     */
    getLocationGraph() {
        const locations = this.game.dataLoader.getLocations();
        const graph = {};

        // 初始化所有位置
        for (const [locationId, location] of locations) {
            graph[locationId] = {
                id: locationId,
                name: location.name,
                connections: [],
                discovered: this.isLocationDiscovered(locationId),
                current: locationId === this.game.gameState.getPlayerLocation()
            };
        }

        // 添加连接关系
        for (const [locationId, location] of locations) {
            if (location.exits) {
                location.exits.forEach(exit => {
                    if (graph[locationId] && graph[exit.target]) {
                        graph[locationId].connections.push({
                            target: exit.target,
                            direction: exit.direction,
                            description: exit.description,
                            locked: exit.locked
                        });
                    }
                });
            }
        }

        return graph;
    }

    /**
     * 获取当前位置的坐标（用于地图显示）
     * @returns {Object|null} 坐标对象
     */
    getCurrentLocationCoordinates() {
        // TODO: 实现坐标系统
        // 这里返回一个简单的坐标，实际项目中应该从数据中读取
        const currentLocationId = this.game.gameState.getPlayerLocation();

        // 简单的位置映射
        const coordinateMap = {
            'college_dorm': { x: 50, y: 90, name: '大学宿舍' },
            'subway_station': { x: 50, y: 80, name: '地铁站' },
            'bus_station': { x: 50, y: 70, name: '公交车站' },
            'mountain_foot': { x: 50, y: 60, name: '山脚下' },
            'mountain_gate': { x: 50, y: 50, name: '山门' },
            'front_yard': { x: 50, y: 40, name: '前院' },
            'sanqing_hall': { x: 50, y: 30, name: '三清殿' }
        };

        return coordinateMap[currentLocationId] || { x: 50, y: 50, name: '未知位置' };
    }
}