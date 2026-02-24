/**
 * 游戏数据加载器
 * 负责加载和管理JSON格式的游戏数据
 */

export class DataLoader {
    constructor(game) {
        this.game = game;
        this.data = {
            locations: new Map(),
            items: new Map(),
            npcs: new Map(),
            quests: new Map(),
            dialogues: new Map(),
            puzzles: new Map(),
            decisions: new Map()
        };
    }

    /**
     * 加载游戏数据
     * @returns {Promise<boolean>} 是否加载成功
     */
    async loadGameData() {
        console.log('📂 开始加载游戏数据...');

        try {
            // 加载第一章数据
            console.log('📖 加载第1章数据...');
            await this.loadChapterData(1);

            console.log('✅ 游戏数据加载完成');
            return true;
        } catch (error) {
            console.error('❌ 加载游戏数据失败:', error);
            console.error('🔍 错误堆栈:', error.stack);
            throw error;
        }
    }

    /**
     * 加载章节数据
     * @param {number} chapter - 章节编号
     * @returns {Promise<boolean>} 是否加载成功
     */
    async loadChapterData(chapter) {
        console.log(`加载第${chapter}章数据...`);

        try {
            // 清除现有数据
            this.clearChapterData();

            // 加载章节JSON文件
            const chapterData = await this.loadJSON(`data/chapter${chapter}.json`);

            if (!chapterData) {
                throw new Error(`第${chapter}章数据文件不存在或格式错误`);
            }

            // 处理章节数据
            await this.processChapterData(chapterData);

            console.log(`第${chapter}章数据加载完成`);
            return true;
        } catch (error) {
            console.error(`加载第${chapter}章数据失败:`, error);
            throw error;
        }
    }

    /**
     * 处理章节数据
     * @param {Object} chapterData - 章节数据
     */
    async processChapterData(chapterData) {
        // 存储章节元数据
        this.data.chapter = chapterData.chapter;
        this.data.title = chapterData.title;
        this.data.description = chapterData.description;

        // 处理位置数据
        if (chapterData.locations && Array.isArray(chapterData.locations)) {
            for (const location of chapterData.locations) {
                this.data.locations.set(location.id, location);
            }
        }

        // 处理道具数据
        if (chapterData.items && Array.isArray(chapterData.items)) {
            for (const item of chapterData.items) {
                this.data.items.set(item.id, item);
            }
        }

        // 处理NPC数据
        if (chapterData.npcs && Array.isArray(chapterData.npcs)) {
            for (const npc of chapterData.npcs) {
                this.data.npcs.set(npc.id, npc);
            }
        }

        // 处理任务数据
        if (chapterData.quests && Array.isArray(chapterData.quests)) {
            for (const quest of chapterData.quests) {
                this.data.quests.set(quest.id, quest);
            }
        }

        // 处理对话数据
        if (chapterData.dialogues && Array.isArray(chapterData.dialogues)) {
            for (const dialogue of chapterData.dialogues) {
                this.data.dialogues.set(dialogue.id, dialogue);
            }
        }

        // 处理谜题数据
        if (chapterData.puzzles && Array.isArray(chapterData.puzzles)) {
            for (const puzzle of chapterData.puzzles) {
                this.data.puzzles.set(puzzle.id, puzzle);
            }
        }

        // 处理决策数据
        if (chapterData.decisions && Array.isArray(chapterData.decisions)) {
            for (const decision of chapterData.decisions) {
                this.data.decisions.set(decision.id, decision);
            }
        }

        // 处理线索数据
        if (chapterData.clues && Array.isArray(chapterData.clues)) {
            this.data.clues = chapterData.clues;
        }

        // 处理事件数据
        if (chapterData.events && Array.isArray(chapterData.events)) {
            this.data.events = chapterData.events;
        }

        // 存储完整的章节数据
        this.data.chapterData = chapterData;
    }

    /**
     * 清除章节数据
     */
    clearChapterData() {
        this.data.locations.clear();
        this.data.items.clear();
        this.data.npcs.clear();
        this.data.quests.clear();
        this.data.dialogues.clear();
        this.data.puzzles.clear();
        this.data.decisions.clear();
        this.data.clues = null;
        this.data.events = null;
        this.data.chapterData = null;
    }

    /**
     * 加载JSON文件
     * @param {string} url - JSON文件URL
     * @returns {Promise<Object>} JSON数据
     */
    async loadJSON(url) {
        console.log(`📄 加载JSON文件: ${url}`);
        console.log(`📄 当前页面URL: ${window.location.href}`);
        console.log(`📄 完整请求URL: ${new URL(url, window.location.href).href}`);
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'json';

            xhr.onreadystatechange = () => {
                console.log(`📄 ${url} readyState: ${xhr.readyState}`);
                if (xhr.readyState === 4) {
                    console.log(`📄 ${url} 请求完成，状态: ${xhr.status} ${xhr.statusText}`);
                }
            };

            xhr.onload = () => {
                console.log(`📄 ${url} 响应状态: ${xhr.status} ${xhr.statusText}`);
                console.log(`📄 响应头: ${xhr.getAllResponseHeaders()}`);
                console.log(`📄 响应类型: ${xhr.responseType}, 响应:`, xhr.response);
                if (xhr.status === 200) {
                    console.log(`✅ ${url} 加载成功`);
                    // 如果response为null但responseText存在，尝试解析JSON
                    if (xhr.response === null && xhr.responseText) {
                        console.log(`📄 response为null，尝试解析responseText`);
                        try {
                            const parsed = JSON.parse(xhr.responseText);
                            resolve(parsed);
                        } catch (parseError) {
                            console.error(`❌ 解析JSON失败:`, parseError);
                            reject(new Error(`解析JSON失败: ${parseError.message}`));
                        }
                    } else {
                        resolve(xhr.response);
                    }
                } else {
                    console.error(`❌ ${url} 加载失败: ${xhr.status} ${xhr.statusText}`);
                    reject(new Error(`加载JSON失败: ${xhr.status} ${xhr.statusText}`));
                }
            };

            xhr.onerror = () => {
                console.error(`❌ ${url} 网络错误`);
                reject(new Error(`网络错误: 无法加载 ${url}`));
            };

            xhr.ontimeout = () => {
                console.error(`❌ ${url} 请求超时`);
                reject(new Error(`请求超时: ${url}`));
            };

            xhr.timeout = 10000; // 10秒超时
            console.log(`📤 发送请求: ${url}`);
            xhr.send();
        });
    }

    /**
     * 获取位置数据
     * @param {string} locationId - 位置ID
     * @returns {Object|null} 位置数据
     */
    getLocation(locationId) {
        return this.data.locations.get(locationId) || null;
    }

    /**
     * 获取所有位置数据
     * @returns {Map} 位置数据Map
     */
    getLocations() {
        return this.data.locations;
    }

    /**
     * 获取道具数据
     * @param {string} itemId - 道具ID
     * @returns {Object|null} 道具数据
     */
    getItem(itemId) {
        return this.data.items.get(itemId) || null;
    }

    /**
     * 获取所有道具数据
     * @returns {Map} 道具数据Map
     */
    getItems() {
        return this.data.items;
    }

    /**
     * 获取NPC数据
     * @param {string} npcId - NPC ID
     * @returns {Object|null} NPC数据
     */
    getNPC(npcId) {
        return this.data.npcs.get(npcId) || null;
    }

    /**
     * 获取所有NPC数据
     * @returns {Map} NPC数据Map
     */
    getNPCs() {
        return this.data.npcs;
    }

    /**
     * 获取任务数据
     * @param {string} questId - 任务ID
     * @returns {Object|null} 任务数据
     */
    getQuest(questId) {
        return this.data.quests.get(questId) || null;
    }

    /**
     * 获取所有任务数据
     * @returns {Map} 任务数据Map
     */
    getQuests() {
        return this.data.quests;
    }

    /**
     * 获取对话数据
     * @param {string} dialogueId - 对话ID
     * @returns {Object|null} 对话数据
     */
    getDialogue(dialogueId) {
        return this.data.dialogues.get(dialogueId) || null;
    }

    /**
     * 获取所有对话数据
     * @returns {Map} 对话数据Map
     */
    getDialogues() {
        return this.data.dialogues;
    }

    /**
     * 获取谜题数据
     * @param {string} puzzleId - 谜题ID
     * @returns {Object|null} 谜题数据
     */
    getPuzzle(puzzleId) {
        return this.data.puzzles.get(puzzleId) || null;
    }

    /**
     * 获取所有谜题数据
     * @returns {Map} 谜题数据Map
     */
    getPuzzles() {
        return this.data.puzzles;
    }

    /**
     * 获取决策数据
     * @param {string} decisionId - 决策ID
     * @returns {Object|null} 决策数据
     */
    getDecision(decisionId) {
        return this.data.decisions.get(decisionId) || null;
    }

    /**
     * 获取所有决策数据
     * @returns {Map} 决策数据Map
     */
    getDecisions() {
        return this.data.decisions;
    }

    /**
     * 获取线索数据
     * @param {string} clueId - 线索ID
     * @returns {Object|null} 线索数据
     */
    getClue(clueId) {
        if (!this.data.clues) return null;
        return this.data.clues.find(clue => clue.id === clueId) || null;
    }

    /**
     * 获取所有线索数据
     * @returns {Array|null} 线索数据数组
     */
    getClues() {
        return this.data.clues;
    }

    /**
     * 获取事件数据
     * @param {string} eventId - 事件ID
     * @returns {Object|null} 事件数据
     */
    getEvent(eventId) {
        if (!this.data.events) return null;
        return this.data.events.find(event => event.id === eventId) || null;
    }

    /**
     * 获取所有事件数据
     * @returns {Array|null} 事件数据数组
     */
    getEvents() {
        return this.data.events;
    }

    /**
     * 获取章节元数据
     * @returns {Object|null} 章节元数据
     */
    getChapterData() {
        return this.data.chapterData;
    }

    /**
     * 获取当前章节
     * @returns {number} 章节编号
     */
    getCurrentChapter() {
        return this.data.chapter || 1;
    }

    /**
     * 获取章节标题
     * @returns {string} 章节标题
     */
    getChapterTitle() {
        return this.data.title || '未知章节';
    }

    /**
     * 获取章节描述
     * @returns {string} 章节描述
     */
    getChapterDescription() {
        return this.data.description || '';
    }

    /**
     * 获取完整数据
     * @returns {Object} 完整游戏数据
     */
    getData() {
        return this.data;
    }
}