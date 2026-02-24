/**
 * 地图管理器
 * 负责管理地图数据和位置导航
 */

export class MapManager {
    constructor(game) {
        this.game = game;
        this.mapData = null;
    }

    /**
     * 初始化地图管理器
     */
    init() {
        console.log('初始化地图管理器...');
        this.loadMapData();
        this.debugMapData();
    }

    /**
     * 加载地图数据
     */
    loadMapData() {
        // 从游戏数据中提取地图信息
        this.mapData = this.extractMapData();
    }

    /**
     * 调试地图数据
     */
    debugMapData() {
        if (!this.mapData) {
            console.log('地图数据未加载');
            return;
        }

        console.log('地图数据调试信息:');
        console.log(`- 节点数量: ${Object.keys(this.mapData.nodes).length}`);
        console.log(`- 连接数量: ${this.mapData.connections.length}`);
        console.log(`- 边界: ${JSON.stringify(this.mapData.bounds)}`);

        // 显示已发现的位置
        const discovered = Object.values(this.mapData.nodes).filter(node => node.discovered);
        console.log(`- 已发现位置: ${discovered.length}`);
        discovered.forEach(node => {
            console.log(`  - ${node.name} (${node.id}): 当前位置=${node.current}`);
        });

        // 显示未发现的位置
        const undiscovered = Object.values(this.mapData.nodes).filter(node => !node.discovered);
        console.log(`- 未发现位置: ${undiscovered.length}`);
        undiscovered.forEach(node => {
            console.log(`  - ${node.name} (${node.id})`);
        });
    }

    /**
     * 提取地图数据
     * @returns {Object} 地图数据
     */
    extractMapData() {
        const locations = this.game.dataLoader.getLocations();
        const map = {
            nodes: {},
            connections: [],
            bounds: this.calculateMapBounds() // 动态计算边界
        };

        // 创建节点
        for (const [locationId, location] of locations) {
            map.nodes[locationId] = {
                id: locationId,
                name: location.name,
                coordinates: this.getLocationCoordinates(locationId),
                discovered: this.game.gameState.getPlayerState().discoveredLocations.has(locationId),
                current: locationId === this.game.gameState.getPlayerLocation()
            };
        }

        // 创建连接
        for (const [locationId, location] of locations) {
            if (location.exits) {
                location.exits.forEach(exit => {
                    if (map.nodes[exit.target]) {
                        map.connections.push({
                            from: locationId,
                            to: exit.target,
                            direction: exit.direction,
                            description: exit.description,
                            locked: exit.locked
                        });
                    }
                });
            }
        }

        return map;
    }

    /**
     * 获取位置坐标
     * @param {string} locationId - 位置ID
     * @returns {Object} 坐标对象
     */
    getLocationCoordinates(locationId) {
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

        return coordinateMap[locationId] || { x: 50, y: 50, name: '未知位置' };
    }

    /**
     * 获取地图数据
     * @returns {Object} 地图数据
     */
    getMapData() {
        return this.mapData;
    }

    /**
     * 获取当前位置
     * @returns {Object} 当前位置节点
     */
    getCurrentLocation() {
        const currentLocationId = this.game.gameState.getPlayerLocation();
        return this.mapData?.nodes[currentLocationId] || null;
    }

    /**
     * 获取已探索的位置
     * @returns {Array} 已探索位置节点列表
     */
    getDiscoveredLocations() {
        if (!this.mapData) return [];

        return Object.values(this.mapData.nodes).filter(node => node.discovered);
    }

    /**
     * 获取未探索的位置
     * @returns {Array} 未探索位置节点列表
     */
    getUndiscoveredLocations() {
        if (!this.mapData) return [];

        return Object.values(this.mapData.nodes).filter(node => !node.discovered);
    }

    /**
     * 获取位置之间的连接
     * @param {string} locationId - 位置ID
     * @returns {Array} 连接列表
     */
    getLocationConnections(locationId) {
        if (!this.mapData) return [];

        return this.mapData.connections.filter(conn =>
            conn.from === locationId || conn.to === locationId
        );
    }

    /**
     * 检查位置是否可达
     * @param {string} fromLocationId - 起始位置ID
     * @param {string} toLocationId - 目标位置ID
     * @returns {boolean} 是否可达
     */
    isLocationReachable(fromLocationId, toLocationId) {
        if (!this.mapData) return false;

        // 直接连接检查
        const directConnection = this.mapData.connections.find(conn =>
            (conn.from === fromLocationId && conn.to === toLocationId) ||
            (conn.from === toLocationId && conn.to === fromLocationId)
        );

        if (directConnection) {
            return !directConnection.locked;
        }

        // BFS搜索路径
        return this.findPath(fromLocationId, toLocationId) !== null;
    }

    /**
     * 查找路径
     * @param {string} startId - 起始位置ID
     * @param {string} endId - 目标位置ID
     * @returns {Array|null} 路径数组
     */
    findPath(startId, endId) {
        if (!this.mapData || !this.mapData.nodes[startId] || !this.mapData.nodes[endId]) {
            return null;
        }

        // 简单BFS实现
        const queue = [[startId]];
        const visited = new Set([startId]);

        while (queue.length > 0) {
            const path = queue.shift();
            const node = path[path.length - 1];

            if (node === endId) {
                return path;
            }

            // 获取相邻节点
            const neighbors = this.getNeighbors(node);
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push([...path, neighbor]);
                }
            }
        }

        return null;
    }

    /**
     * 获取相邻节点
     * @param {string} locationId - 位置ID
     * @returns {Array} 相邻节点ID列表
     */
    getNeighbors(locationId) {
        if (!this.mapData) return [];

        const neighbors = [];
        this.mapData.connections.forEach(conn => {
            if (conn.from === locationId && !conn.locked) {
                neighbors.push(conn.to);
            } else if (conn.to === locationId && !conn.locked) {
                neighbors.push(conn.from);
            }
        });

        return neighbors;
    }

    /**
     * 获取地图HTML
     * @returns {string} 地图HTML
     */
    getMapHTML() {
        if (!this.mapData) {
            return '<div class="map-error">地图数据加载失败</div>';
        }

        const nodes = this.mapData.nodes;
        const connections = this.mapData.connections;
        const bounds = this.mapData.bounds;

        // 计算缩放比例
        const width = bounds.maxX - bounds.minX;
        const height = bounds.maxY - bounds.minY;
        const scale = Math.min(90 / width, 90 / height); // 90% 容器大小

        let html = '<div class="map-container">';

        // 绘制连接线
        connections.forEach(conn => {
            const fromNode = nodes[conn.from];
            const toNode = nodes[conn.to];

            if (fromNode && toNode && fromNode.discovered && toNode.discovered) {
                const fromX = (fromNode.coordinates.x - bounds.minX) * scale + 5;
                const fromY = (fromNode.coordinates.y - bounds.minY) * scale + 5;
                const toX = (toNode.coordinates.x - bounds.minX) * scale + 5;
                const toY = (toNode.coordinates.y - bounds.minY) * scale + 5;

                html += `
                    <svg class="map-connection" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">
                        <line x1="${fromX}%" y1="${fromY}%" x2="${toX}%" y2="${toY}%"
                              class="map-connection-line ${conn.locked ? 'locked' : ''}" />
                        <text x="${(fromX + toX) / 2}%" y="${(fromY + toY) / 2}%"
                              class="map-direction">${this.getDirectionDisplay(conn.direction)}</text>
                    </svg>
                `;
            }
        });

        // 绘制节点
        Object.values(nodes).forEach(node => {
            if (node.discovered) {
                const x = (node.coordinates.x - bounds.minX) * scale + 5;
                const y = (node.coordinates.y - bounds.minY) * scale + 5;

                html += `
                    <div class="map-node ${node.current ? 'current' : 'visited'}"
                         style="left: ${x}%; top: ${y}%;"
                         title="${node.name}"
                         data-location-id="${node.id}">
                        <div class="map-node-icon">
                            <i class="fas fa-${node.current ? 'map-marker-alt' : 'map-marker'}"></i>
                        </div>
                        <div class="map-node-label">${node.name}</div>
                    </div>
                `;
            }
        });

        html += '</div>';

        return html;
    }

    /**
     * 获取方向显示文本
     * @param {string} direction - 方向
     * @returns {string} 方向显示文本
     */
    getDirectionDisplay(direction) {
        const directionMap = {
            'north': '北',
            'south': '南',
            'east': '东',
            'west': '西',
            'up': '上',
            'down': '下',
            'in': '进',
            'out': '出',
            'leave': '离',
            'enter': '入'
        };

        return directionMap[direction] || direction;
    }

    /**
     * 更新地图数据
     */
    updateMapData() {
        this.mapData = this.extractMapData();
    }

    /**
     * 标记位置为已探索
     * @param {string} locationId - 位置ID
     */
    markLocationDiscovered(locationId) {
        if (this.mapData && this.mapData.nodes[locationId]) {
            this.mapData.nodes[locationId].discovered = true;
        }
    }

    /**
     * 获取位置详情
     * @param {string} locationId - 位置ID
     * @returns {Object|null} 位置详情
     */
    getLocationDetails(locationId) {
        const location = this.game.dataLoader.getLocation(locationId);
        if (!location) return null;

        const connections = this.getLocationConnections(locationId);
        const node = this.mapData?.nodes[locationId];

        return {
            id: locationId,
            name: location.name,
            description: location.description,
            coordinates: node?.coordinates || { x: 0, y: 0 },
            discovered: node?.discovered || false,
            current: node?.current || false,
            connections: connections.map(conn => ({
                direction: conn.direction,
                target: conn.from === locationId ? conn.to : conn.from,
                description: conn.description,
                locked: conn.locked
            }))
        };
    }

    /**
     * 获取最短路径
     * @param {string} startId - 起始位置ID
     * @param {string} endId - 目标位置ID
     * @returns {Array|null} 最短路径
     */
    getShortestPath(startId, endId) {
        return this.findPath(startId, endId);
    }

    /**
     * 获取路径距离
     * @param {Array} path - 路径数组
     * @returns {number} 路径距离
     */
    getPathDistance(path) {
        if (!path || path.length < 2) return 0;

        let distance = 0;
        for (let i = 0; i < path.length - 1; i++) {
            const from = path[i];
            const to = path[i + 1];

            const fromNode = this.mapData?.nodes[from];
            const toNode = this.mapData?.nodes[to];

            if (fromNode && toNode) {
                const dx = fromNode.coordinates.x - toNode.coordinates.x;
                const dy = fromNode.coordinates.y - toNode.coordinates.y;
                distance += Math.sqrt(dx * dx + dy * dy);
            }
        }

        return distance;
    }

    /**
     * 计算地图边界（基于所有位置，不仅仅是已发现的）
     * @returns {Object} 地图边界
     */
    calculateMapBounds() {
        const locations = this.game.dataLoader.getLocations();
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

        // 遍历所有位置获取坐标范围
        for (const [locationId, _] of locations) {
            const coordinates = this.getLocationCoordinates(locationId);
            minX = Math.min(minX, coordinates.x);
            maxX = Math.max(maxX, coordinates.x);
            minY = Math.min(minY, coordinates.y);
            maxY = Math.max(maxY, coordinates.y);
        }

        // 如果所有坐标都相同或无效，使用默认值
        if (minX === Infinity || maxX === -Infinity || minY === Infinity || maxY === -Infinity) {
            return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
        }

        // 添加一些边距
        const padding = 10;
        return {
            minX: minX - padding,
            maxX: maxX + padding,
            minY: minY - padding,
            maxY: maxY + padding
        };
    }

    /**
     * 获取地图边界（基于已发现的位置）
     * @returns {Object} 地图边界
     */
    getMapBounds() {
        if (!this.mapData) return { minX: 0, maxX: 100, minY: 0, maxY: 100 };

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

        Object.values(this.mapData.nodes).forEach(node => {
            if (node.discovered) {
                minX = Math.min(minX, node.coordinates.x);
                maxX = Math.max(maxX, node.coordinates.x);
                minY = Math.min(minY, node.coordinates.y);
                maxY = Math.max(maxY, node.coordinates.y);
            }
        });

        // 添加一些边距
        const padding = 10;
        return {
            minX: minX - padding,
            maxX: maxX + padding,
            minY: minY - padding,
            maxY: maxY + padding
        };
    }

    /**
     * 重置地图
     */
    resetMap() {
        this.mapData = this.extractMapData();
    }

    /**
     * 导出地图数据（用于保存）
     * @returns {Object} 地图数据
     */
    exportMapData() {
        return this.mapData;
    }

    /**
     * 导入地图数据（用于加载）
     * @param {Object} data - 地图数据
     */
    importMapData(data) {
        this.mapData = data;
    }
}