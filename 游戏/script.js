/**
 * 《悬观谜案：百年轮回》文字交互式解密游戏
 * 核心游戏逻辑脚本
 * 版本: 1.0
 * 创建时间: 2026年2月23日
 */

// ============================================
// 游戏核心类定义
// ============================================

/**
 * 游戏核心类
 */
class AdventureGame {
    constructor() {
        // 游戏状态
        this.state = {
            player: {
                name: "林墨",
                location: "college_dorm",
                inventory: [],
                clues: [],
                sanity: 100,
                health: 100,
                discoveredLocations: new Set(["college_dorm"]),
                currentQuest: null,
                quests: {
                    active: [],
                    completed: [],
                    failed: []
                },
                flags: new Map(),
                relationships: new Map()
            },
            world: {
                time: "15:00",
                date: "2025-01-15",
                weather: "snowstorm",
                chapter: 1,
                triggeredEvents: new Set(),
                clues: null,        // 线索定义数据，从JSON加载
                events: null,       // 事件定义数据，从JSON加载
                chapterData: null   // 章节元数据
            },
            gameData: null
        };

        // 游戏数据
        this.data = {
            locations: new Map(),
            items: new Map(),
            npcs: new Map(),
            quests: new Map(),
            dialogues: new Map(),
            puzzles: new Map()
        };

        // 当前选中的道具
        this.selectedItem = null;

        // 初始化
        this.init();
    }

    /**
     * 初始化游戏
     */
    async init() {
        console.log("初始化游戏...");

        // 显示加载遮罩
        this.showLoading(true);

        try {
            // 加载游戏数据
            await this.loadGameData();

            // 初始化UI事件
            this.initUIEvents();

            // 初始化游戏状态
            this.initGameState();

            // 渲染初始场景
            this.renderScene();

            // 隐藏加载遮罩
            setTimeout(() => {
                this.showLoading(false);
                this.addFeedback("系统", "游戏开始。欢迎来到《悬观谜案：百年轮回》。", "system");
                this.addFeedback("系统", "点击高亮文字进行互动，或使用命令输入框。", "system");
            }, 1000);

        } catch (error) {
            console.error("游戏初始化失败:", error);
            this.addFeedback("系统", "游戏数据加载失败，请刷新页面重试。", "danger");
            this.showLoading(false);
        }
    }

    /**
     * 加载游戏数据
     */
    async loadGameData() {
        const chapter = this.state.world.chapter;
        console.log(`加载第${chapter}章游戏数据...`);

        try {
            // 尝试从JSON文件加载数据
            await this.loadChapterData(chapter);
            console.log(`第${chapter}章数据加载完成`);
        } catch (error) {
            console.error(`加载第${chapter}章数据失败:`, error);

            // 如果是第一章，尝试使用硬编码数据
            if (chapter === 1) {
                console.warn("动态加载失败，使用硬编码的第一章数据");
                this.loadChapter1Data();
                this.addFeedback("系统", "使用内置游戏数据，部分功能可能与JSON数据有差异。", "warning");
                this.addFeedback("提示", "如需完整功能，请使用HTTP服务器运行游戏（如：python -m http.server）。", "info");
            } else {
                // 对于其他章节，显示错误信息
                this.addFeedback("系统", `无法加载第${chapter}章数据。`, "danger");
                this.addFeedback("提示", "请使用HTTP服务器运行游戏（如：python -m http.server）。", "info");
                this.addFeedback("提示", "错误信息：" + error.message, "warning");
                throw error;
            }
        }

        // 模拟网络延迟
        return new Promise(resolve => setTimeout(resolve, 300));
    }

    /**
     * 加载第一章数据
     */
    loadChapter1Data() {
        // 位置数据 - 更新为与JSON文件相同的描述
        this.data.locations.set("college_dorm", {
            id: "college_dorm",
            name: "大学宿舍",
            description: "透过窗户看到城市冬日的暮色，高楼灯火渐次亮起。宿舍书桌上摊开结构力学教材、工程计算器、画满公式的草稿纸。桌上的手机屏幕亮着，显示未读消息。一个半开的登山包放在地上，林墨正在往里装东西。",
            interactives: [
                {
                    id: "study_desk",
                    name: "书桌",
                    type: "examine",
                    description: "凌乱的书桌，上面有结构力学教材、工程计算器、草稿纸。草稿纸上画着复杂的力学分析图。",
                    actions: ["examine"],
                    result: {
                        clue: "clue_engineering_background",
                        feedback: "你检查了书桌，这些是你的学习用品，显示你土木工程专业背景。"
                    }
                },
                {
                    id: "backpack",
                    name: "登山包",
                    type: "examine",
                    description: "半开的登山包，里面已经装了一些工具：卷尺、激光测距仪、小型水平仪、结构力学笔记。",
                    actions: ["examine", "take_item"],
                    result: {
                        item: "item_tools",
                        feedback: "你检查了登山包，里面是你的工程测量工具。"
                    }
                },
                {
                    id: "phone",
                    name: "手机",
                    type: "examine",
                    description: "手机屏幕亮着，显示与陈青山的微信对话。最后一条消息是陈青山发来的：'墨哥，我在西南老家发现一座神奇道观，有你想不到的古代机关。寒假来玩？带上嫂子。'",
                    actions: ["examine", "read_message"],
                    result: {
                        clue: "clue_chen_invitation",
                        feedback: "你查看了手机消息，陈青山邀请你去西南山区参观一座有道观。"
                    }
                },
                {
                    id: "window",
                    name: "窗户",
                    type: "examine",
                    description: "窗外是城市夜景，冬日暮色中的高楼灯火。远处天际线隐没在薄雾中。",
                    actions: ["examine"],
                    result: {
                        feedback: "窗外是熟悉的城市夜景，但不知为何，你感到一丝不安。"
                    }
                }
            ],
            exits: [
                { direction: "leave", target: "subway_station", description: "离开宿舍前往地铁站" }
            ],
            characters: []
        });

        this.data.locations.set("subway_station", {
            id: "subway_station",
            name: "地铁站",
            description: "晚高峰的地铁站，人群如织，指示灯闪烁，广播报站声嘈杂。墙上的地铁指示牌显示着复杂的线路图。苏晓雨背着画板包，提着摄影器材箱，在闸机口张望。",
            interactives: [
                {
                    id: "su_xiaoyu",
                    name: "苏晓雨",
                    type: "npc",
                    description: "你的女朋友，美术学院视觉传达专业大二学生。背着画板包，提着摄影器材箱。",
                    actions: ["talk"],
                    result: {
                        dialogue: "dialogue_suxiaoyu_subway",
                        feedback: "你与苏晓雨交谈。"
                    }
                },
                {
                    id: "crowd",
                    name: "人群",
                    type: "examine",
                    description: "晚高峰的人群，行色匆匆。空气中弥漫着疲惫和匆忙的气息。每个人都专注于自己的路程。",
                    actions: ["examine"],
                    result: {
                        feedback: "地铁站人山人海，大家都在赶路回家。喧嚣中带着一种疏离感。"
                    }
                },
                {
                    id: "subway_sign",
                    name: "地铁指示牌",
                    type: "examine",
                    description: "地铁线路图，密密麻麻的线路交织。其中一个站名'悬云山'被圈出来，旁边手写标注'未开通'。",
                    actions: ["examine"],
                    result: {
                        clue: "clue_suspicious_subway_sign",
                        feedback: "你注意到地铁线路图上'悬云山'站标注着'未开通'，但陈青山说那里有道观。"
                    }
                }
            ],
            exits: [
                { direction: "north", target: "train_station", description: "前往火车站" },
                { direction: "back", target: "college_dorm", description: "返回宿舍" }
            ],
            characters: ["su_xiaoyu"]
        });

        this.data.locations.set("train_station", {
            id: "train_station",
            name: "火车站候车厅",
            description: "巨大的电子显示屏滚动着车次信息。旅客拖着行李匆匆走过，广播声、对话声、行李箱轮子声混杂。你和苏晓雨找到空位坐下，你拿出火车票再次核对时间。",
            interactives: [
                {
                    id: "electronic_display",
                    name: "电子显示屏",
                    type: "examine",
                    description: "显示车次信息的电子屏。突然，屏幕剧烈闪烁几下，所有屏幕同时变黑，然后显示出一行红色文字：'悬云观—未开通'。文字停留三秒后，屏幕恢复正常。",
                    actions: ["examine", "record"],
                    result: {
                        clue: "clue_suspicious_display",
                        feedback: "电子屏显示了诡异的信息'悬云观—未开通'，但周围旅客似乎都没注意到。"
                    }
                },
                {
                    id: "passengers",
                    name: "旅客",
                    type: "examine",
                    description: "候车的旅客，各自忙碌，似乎没人注意到刚才电子屏的异常。",
                    actions: ["examine"],
                    result: {
                        feedback: "旅客们都在忙自己的事，没人谈论刚才的屏幕异常。这让你感到更加不安。"
                    }
                },
                {
                    id: "train_ticket",
                    name: "火车票",
                    type: "examine",
                    description: "你的火车票：K447次，前往西南山区。发车时间19:30，到达时间次日6:00。",
                    actions: ["examine"],
                    result: {
                        feedback: "火车票显示你要去一个偏远山区，行程漫长。"
                    }
                }
            ],
            exits: [
                { direction: "board_train", target: "mountain_road", description: "登上火车" },
                { direction: "back", target: "subway_station", description: "返回地铁站" }
            ],
            characters: []
        });

        // 道具数据
        this.data.items.set("item_tools", {
            id: "item_tools",
            name: "工程工具套装",
            type: "tool",
            description: "你的工程测量工具，包括卷尺、激光测距仪、小型水平仪。",
            detailed_description: "专业工程测量工具：\n- 卷尺：5米钢卷尺，精度±1mm\n- 激光测距仪：最大测距50m，精度±2mm\n- 水平仪：气泡式水平仪，可测倾斜角度",
            usable: true,
            combinable: false,
            use_scenes: ["测量建筑结构"],
            use_effect: "用于测量距离、角度和水平度",
            disposable: false,
            droppable: false,
            weight: 2.5,
            value: "重要",
            acquired_from: "初始携带",
            icon: "fas fa-tools",
            color: "blue"
        });

        // NPC数据
        this.data.npcs.set("su_xiaoyu", {
            id: "su_xiaoyu",
            name: "苏晓雨",
            description: "你的女朋友，21岁，美术学院视觉传达专业大二学生。活泼开朗，观察力敏锐。",
            relationship: 80,
            known_info: []
        });

        // 对话数据
        this.data.dialogues.set("dialogue_suxiaoyu_subway", {
            npc_id: "su_xiaoyu",
            npc_name: "苏晓雨",
            initial_branches: [
                {
                    id: "greeting",
                    player_text: "晓雨，等久了吧？",
                    npc_response: "墨墨！这里人太多了，我差点被挤出去。",
                    next_branches: ["ask_preparation", "ask_feeling"],
                    result: {}
                }
            ],
            branches: {
                "ask_preparation": {
                    player_text: "你的东西都带齐了？山区可能条件不好。",
                    npc_response: "当然！相机、三脚架、素描本、颜料……青山说那座道观建筑风格很特别，我一定要记录下来。",
                    next_branches: ["ask_about_chen"],
                    result: {}
                },
                "ask_feeling": {
                    player_text: "你感觉怎么样？累不累？",
                    npc_response: "还好，就是人太多有点闷。对了，我看了青山的朋友圈。",
                    next_branches: ["ask_about_chen"],
                    result: {}
                },
                "ask_about_chen": {
                    player_text: "青山的朋友圈怎么了？",
                    npc_response: "最近三个月，他发的全是山区风景照——云雾、古树、悬崖，没有一张有人的。连自拍都没有。感觉……有点刻意。",
                    next_branches: ["respond_worry", "respond_dismiss"],
                    result: {
                        clue: "clue_chen_strange_photos"
                    }
                },
                "respond_worry": {
                    player_text: "确实有点奇怪……",
                    npc_response: "对吧？像在展示什么，又像在隐藏什么。我有点担心这次旅行。",
                    next_branches: ["reassure"],
                    result: {
                        relationship: 5
                    }
                },
                "respond_dismiss": {
                    player_text: "可能只是信号不好，没怎么拍人。",
                    npc_response: "希望是我想多了……",
                    next_branches: ["reassure"],
                    result: {
                        relationship: -2
                    }
                },
                "reassure": {
                    player_text: "别担心，就是去玩几天。",
                    npc_response: "嗯。车要开了，我们走吧。",
                    next_branches: [],
                    result: {
                        unlock_location: "train_station"
                    }
                }
            }
        });

        // 任务数据
        this.data.quests.set("quest_chapter1", {
            id: "quest_chapter1",
            chapter: 1,
            name: "前往悬云观",
            description: "接受陈青山的邀请，前往西南山区的悬云观。",
            type: "主线任务",
            steps: [
                {
                    id: "step1",
                    description: "在宿舍准备行李",
                    target: "college_dorm",
                    action: "explore",
                    required_item: null,
                    completed: false
                },
                {
                    id: "step2",
                    description: "与苏晓雨在地铁站会合",
                    target: "subway_station",
                    action: "arrive",
                    required_item: null,
                    completed: false
                },
                {
                    id: "step3",
                    description: "前往火车站",
                    target: "train_station",
                    action: "arrive",
                    required_item: null,
                    completed: false
                }
            ],
            prerequisites: [],
            rewards: {
                experience: 100,
                items: [],
                unlock: ["mountain_road"]
            },
            hidden: false
        });

        // 线索数据
        this.data.clues = {
            "clue_engineering_background": {
                id: "clue_engineering_background",
                title: "土木工程背景",
                content: "林墨是土木工程专业学生，擅长结构分析和工程测量，对建筑结构有专业眼光。",
                category: "人物背景",
                chapter: 1,
                importance: "低"
            },
            "clue_chen_invitation": {
                id: "clue_chen_invitation",
                title: "陈青山的邀请",
                content: "陈青山邀请林墨去西南山区参观一座有古代机关的道观——悬云观。声称有道观有'想不到的古代机关'。",
                category: "任务线索",
                chapter: 1,
                importance: "中"
            },
            "clue_chen_strange_photos": {
                id: "clue_chen_strange_photos",
                title: "陈青山的奇怪朋友圈",
                content: "陈青山最近三个月只发山区风景照，没有人物照片，行为异常。苏晓雨认为他'像在展示什么，又像在隐藏什么'。",
                category: "人物异常",
                chapter: 1,
                importance: "中"
            },
            "clue_suspicious_display": {
                id: "clue_suspicious_display",
                title: "诡异的电子屏信息",
                content: "火车站电子屏显示'悬云观—未开通'的红色文字，持续三秒后恢复正常。周围旅客似乎都没注意到这一异常。",
                category: "超常现象",
                chapter: 1,
                importance: "高"
            },
            "clue_suspicious_subway_sign": {
                id: "clue_suspicious_subway_sign",
                title: "地铁站异常标注",
                content: "地铁线路图上'悬云山'站被手写标注'未开通'，与陈青山的描述矛盾。",
                category: "环境异常",
                chapter: 1,
                importance: "中"
            }
        };

        // 同时存储到world.clues以便统一访问
        this.state.world.clues = this.data.clues;

        // 存储章节元数据
        this.state.world.chapterData = {
            title: "风雪赴约",
            description: "土木工程专业学生林墨接受发小陈青山的邀请，与女友苏晓雨前往西南山区参观悬云观。",
            chapter: 1
        };

        console.log("第一章数据加载完成");
    }

    /**
     * 清空章节数据
     */
    clearChapterData() {
        this.data.locations.clear();
        this.data.items.clear();
        this.data.npcs.clear();
        this.data.dialogues.clear();
        this.data.quests.clear();
        this.data.puzzles.clear();

        // 注意：不清理data.clues，因为它可能包含硬编码数据
        // 清理world中的章节相关数据
        this.state.world.clues = null;
        this.state.world.events = null;
        this.state.world.chapterData = null;

        console.log("章节数据已清空");
    }

    /**
     * 加载指定章节的游戏数据
     */
    async loadChapterData(chapter) {
        const url = `data/chapter${chapter}.json`;
        console.log(`从 ${url} 加载章节数据...`);

        try {
            let chapterData;

            // 尝试使用fetch加载（适用于HTTP服务器环境）
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                chapterData = await response.json();
            } catch (fetchError) {
                console.warn(`fetch加载失败: ${fetchError.message}，尝试使用XMLHttpRequest`);

                // 如果fetch失败，尝试使用XMLHttpRequest（适用于本地文件环境）
                chapterData = await this.loadJSONWithXHR(url);
            }

            // 验证章节号匹配
            if (chapterData.chapter !== chapter) {
                console.warn(`JSON文件中的章节号(${chapterData.chapter})与请求的章节(${chapter})不匹配`);
            }

            // 清空现有数据
            this.clearChapterData();

            // 加载位置数据
            if (chapterData.locations && Array.isArray(chapterData.locations)) {
                chapterData.locations.forEach(location => {
                    this.data.locations.set(location.id, location);
                });
                console.log(`加载了 ${chapterData.locations.length} 个位置`);
            }

            // 加载道具数据
            if (chapterData.items && Array.isArray(chapterData.items)) {
                chapterData.items.forEach(item => {
                    this.data.items.set(item.id, item);
                });
                console.log(`加载了 ${chapterData.items.length} 个道具`);
            }

            // 加载NPC数据
            if (chapterData.npcs && Array.isArray(chapterData.npcs)) {
                chapterData.npcs.forEach(npc => {
                    this.data.npcs.set(npc.id, npc);
                });
                console.log(`加载了 ${chapterData.npcs.length} 个NPC`);
            }

            // 加载对话数据
            if (chapterData.dialogues && typeof chapterData.dialogues === 'object') {
                Object.entries(chapterData.dialogues).forEach(([dialogueId, dialogue]) => {
                    this.data.dialogues.set(dialogueId, dialogue);
                });
                console.log(`加载了 ${Object.keys(chapterData.dialogues).length} 个对话`);
            }

            // 加载任务数据
            if (chapterData.quests && Array.isArray(chapterData.quests)) {
                chapterData.quests.forEach(quest => {
                    this.data.quests.set(quest.id, quest);
                });
                console.log(`加载了 ${chapterData.quests.length} 个任务`);
            }

            // 加载谜题数据（如果有）
            if (chapterData.puzzles && Array.isArray(chapterData.puzzles)) {
                chapterData.puzzles.forEach(puzzle => {
                    this.data.puzzles.set(puzzle.id, puzzle);
                });
                console.log(`加载了 ${chapterData.puzzles.length} 个谜题`);
            }

            // 存储线索数据到游戏状态（线索可能需要在章节间共享）
            if (chapterData.clues && typeof chapterData.clues === 'object') {
                // 线索存储在游戏状态中，而不是data中
                // 可以在需要时通过章节数据访问
                this.state.world.clues = chapterData.clues;
                console.log(`加载了 ${Object.keys(chapterData.clues).length} 个线索定义`);
            }

            // 存储事件数据到游戏状态
            if (chapterData.events && Array.isArray(chapterData.events)) {
                this.state.world.events = chapterData.events;
                console.log(`加载了 ${chapterData.events.length} 个事件`);
            }

            // 存储章节元数据
            this.state.world.chapterData = {
                title: chapterData.title,
                description: chapterData.description,
                chapter: chapterData.chapter
            };

            console.log(`第${chapter}章数据加载完成: ${chapterData.title}`);
            return chapterData;

        } catch (error) {
            console.error(`加载第${chapter}章数据失败:`, error);
            throw error;
        }
    }

    /**
     * 使用XMLHttpRequest加载JSON文件（适用于本地文件环境）
     */
    loadJSONWithXHR(url) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'json';

            xhr.onload = () => {
                if (xhr.status === 200 || xhr.status === 0) { // 0表示本地文件
                    console.log(`XHR加载成功: ${url}`);
                    resolve(xhr.response);
                } else {
                    reject(new Error(`XHR加载失败: ${xhr.status} ${xhr.statusText}`));
                }
            };

            xhr.onerror = () => {
                reject(new Error(`XHR请求错误: ${url}`));
            };

            xhr.ontimeout = () => {
                reject(new Error(`XHR请求超时: ${url}`));
            };

            // 设置超时
            xhr.timeout = 10000;

            try {
                xhr.send();
            } catch (error) {
                reject(new Error(`XHR发送失败: ${error.message}`));
            }
        });
    }

    /**
     * 初始化UI事件
     */
    initUIEvents() {
        // 命令输入
        document.getElementById('command-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleCommand();
            }
        });
        document.getElementById('send-command').addEventListener('click', () => {
            this.handleCommand();
        });

        // 快捷按钮
        document.getElementById('btn-inventory').addEventListener('click', () => {
            this.togglePanel('inventory-panel');
        });
        document.getElementById('btn-map').addEventListener('click', () => {
            this.togglePanel('map-panel');
        });
        document.getElementById('btn-notebook').addEventListener('click', () => {
            this.togglePanel('notebook-panel');
        });
        document.getElementById('btn-tasks').addEventListener('click', () => {
            this.togglePanel('tasks-panel');
        });
        document.getElementById('btn-save').addEventListener('click', () => {
            this.saveGame();
        });
        document.getElementById('btn-load').addEventListener('click', () => {
            this.loadGame();
        });
        document.getElementById('btn-help').addEventListener('click', () => {
            this.showHelp();
        });

        // 面板关闭按钮
        document.getElementById('close-inventory').addEventListener('click', () => {
            this.togglePanel('inventory-panel', false);
        });
        document.getElementById('close-map').addEventListener('click', () => {
            this.togglePanel('map-panel', false);
        });
        document.getElementById('close-notebook').addEventListener('click', () => {
            this.togglePanel('notebook-panel', false);
        });
        document.getElementById('close-tasks').addEventListener('click', () => {
            this.togglePanel('tasks-panel', false);
        });
        document.getElementById('close-interactive').addEventListener('click', () => {
            document.getElementById('interactive-modal').classList.remove('active');
        });

        // 导航按钮
        document.getElementById('btn-north').addEventListener('click', () => this.move('north'));
        document.getElementById('btn-south').addEventListener('click', () => this.move('south'));
        document.getElementById('btn-east').addEventListener('click', () => this.move('east'));
        document.getElementById('btn-west').addEventListener('click', () => this.move('west'));

        // 反馈清空按钮
        document.getElementById('clear-feedback').addEventListener('click', () => {
            document.getElementById('feedback-content').innerHTML = '';
            this.addFeedback("系统", "操作记录已清空。", "system");
        });

        // 道具操作按钮
        document.getElementById('use-item').addEventListener('click', () => this.useItem());
        document.getElementById('examine-item').addEventListener('click', () => this.examineItem());
        document.getElementById('drop-item').addEventListener('click', () => this.dropItem());
        document.getElementById('combine-item').addEventListener('click', () => this.combineItem());

        // 场景描述中的交互元素点击事件（事件委托）
        document.getElementById('scene-description').addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList.contains('interactable')) {
                this.handleInteractiveClick(target);
            }
        });
    }

    /**
     * 初始化游戏状态
     */
    initGameState() {
        // 添加初始道具
        this.addItemToInventory("item_tools");

        // 激活第一章任务
        this.activateQuest("quest_chapter1");

        // 更新UI显示
        this.updateUI();
    }

    /**
     * 渲染当前场景
     */
    renderScene() {
        const locationId = this.state.player.location;
        const location = this.data.locations.get(locationId);

        if (!location) {
            console.error(`位置 ${locationId} 不存在`);
            return;
        }

        // 更新位置信息
        document.getElementById('location-name').textContent = location.name;

        // 更新场景图片
        this.updateSceneImage(locationId);

        const sceneDescriptionHTML = this.processDescription(location.description, location.interactives || []);
        document.getElementById('scene-description').innerHTML = sceneDescriptionHTML;

        // 调试：检查生成的DOM元素
        const sceneDescEl = document.getElementById('scene-description');
        console.log('scene-description子元素数量:', sceneDescEl.children.length);
        console.log('scene-description innerHTML:', sceneDescEl.innerHTML.substring(0, 200));

        // 更新导航按钮
        this.updateNavigationButtons(location);

        // 如果是第一次访问，添加到已发现位置
        if (!this.state.player.discoveredLocations.has(locationId)) {
            this.state.player.discoveredLocations.add(locationId);
            this.addFeedback("探索", `发现了新地点：${location.name}`, "success");
        }

        // 检查任务触发
        this.checkQuestTriggers(locationId);
    }

    /**
     * 更新场景图片
     */
    updateSceneImage(locationId) {
        // 场景图片映射表
        const sceneImageMap = {
            'college_dorm': 'college_dorm.jpg',
            'subway_station': 'subway_station.jpg',
            'train_station': 'train_station.jpg',
            'mountain_road': 'mountain_road.jpg'
            // 添加更多场景的图片映射
        };

        const imageContainer = document.getElementById('scene-image-container');

        // 如果有映射的图片文件，尝试加载
        if (sceneImageMap[locationId]) {
            const imageUrl = `assets/scenes/${sceneImageMap[locationId]}`;

            // 创建图片元素
            const img = new Image();
            img.src = imageUrl;
            img.alt = `场景：${locationId}`;
            img.onload = () => {
                // 图片加载成功，替换占位符
                imageContainer.innerHTML = '';
                imageContainer.appendChild(img);
                // 添加淡入效果
                setTimeout(() => {
                    img.classList.add('loaded');
                }, 10);
                console.log(`场景图片加载成功: ${imageUrl}`);
            };
            img.onerror = () => {
                // 图片加载失败，显示占位符
                console.warn(`场景图片加载失败: ${imageUrl}`);
                this.showSceneImagePlaceholder(imageContainer, locationId);
            };
        } else {
            // 没有映射的图片，显示占位符
            this.showSceneImagePlaceholder(imageContainer, locationId);
        }
    }

    /**
     * 显示场景图片占位符
     */
    showSceneImagePlaceholder(container, locationId) {
        // 场景描述映射，用于占位符文本
        const sceneDescriptions = {
            'college_dorm': '大学宿舍 - 城市冬日的暮色',
            'subway_station': '地铁站 - 晚高峰的人群',
            'train_station': '火车站候车厅 - 电子显示屏闪烁',
            'mountain_road': '山路 - 暴雪中的蜿蜒道路'
            // 添加更多场景描述
        };

        const description = sceneDescriptions[locationId] || '场景图片';

        container.innerHTML = `
            <div class="scene-image-placeholder">
                <i class="fas fa-image"></i>
                <span>${description}</span>
                <span style="font-size: 12px; margin-top: 5px; color: var(--color-text-muted);">(图片占位符)</span>
            </div>
        `;
    }

    /**
     * 处理描述文本，添加交互标注
     */
    processDescription(description, interactives) {
        if (!interactives || interactives.length === 0) {
            // 没有交互元素，只处理换行
            return description.replace(/\n/g, '<br>');
        }

        // 类型到CSS类的映射
        const typeToClass = {
            'examine': 'blue-highlight',
            'collect': 'green-highlight',
            'clue': 'yellow-highlight',
            'danger': 'red-highlight',
            'npc': 'purple-highlight',
            'interact': 'orange-highlight'
        };

        // 按照名称长度降序排序，避免较短名称匹配较长名称的一部分
        const sortedInteractives = [...interactives].sort((a, b) => b.name.length - a.name.length);

        let processedDescription = description;

        // 对每个交互元素，在描述中查找名称并替换为高亮元素
        sortedInteractives.forEach(interactive => {
            const className = typeToClass[interactive.type] || 'blue-highlight';
            // 转义正则表达式特殊字符
            const escapedName = interactive.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedName, 'g');

            // 检查是否有匹配
            const matches = processedDescription.match(regex);
            if (matches) {
                console.log(`找到匹配: ${interactive.name} (类型: ${interactive.type}, 类: ${className}, 匹配次数: ${matches.length})`);

                // 替换为带高亮样式的元素
                const replacement = `<span class="${className} interactable" data-id="${interactive.id}" data-type="${interactive.type}" data-name="${interactive.name}" title="点击${interactive.name}">${interactive.name}</span>`;
                processedDescription = processedDescription.replace(regex, replacement);
                console.log(`替换结果: ${processedDescription.substring(0, 100)}...`);
            } else {
                console.log(`未找到匹配: ${interactive.name} 在描述中`);
            }
        });

        // 处理换行符
        processedDescription = processedDescription.replace(/\n/g, '<br>');

        // 调试日志
        console.log('处理后的描述:', processedDescription);

        return processedDescription;
    }

    /**
     * 处理交互元素点击
     */
    handleInteractiveClick(element) {
        const id = element.dataset.id;
        const type = element.dataset.type;
        const name = element.dataset.name;

        console.log(`点击交互元素: ${name} (${id}, 类型: ${type})`);

        // 获取当前位置
        const locationId = this.state.player.location;
        const location = this.data.locations.get(locationId);
        if (!location) {
            console.error(`位置 ${locationId} 不存在`);
            return;
        }

        // 查找对应的交互元素
        const interactive = location.interactives.find(item => item.id === id);
        if (!interactive) {
            console.error(`交互元素 ${id} 不存在于当前位置`);
            return;
        }

        // 显示交互对象模态框
        this.showInteractiveModal(interactive, type);
    }

    /**
     * 显示交互对象模态框
     */
    showInteractiveModal(interactive, type) {
        console.log(`显示交互对象模态框: ${interactive.name} (类型: ${type})`);

        // 更新模态框标题
        document.getElementById('interactive-modal-title').textContent = interactive.name;

        // 准备模态框内容
        const contentElement = document.getElementById('interactive-modal-content');

        // 根据交互类型设置不同的描述
        let typeLabel = '未知';
        let typeColor = '#666';

        switch (type) {
            case 'examine':
                typeLabel = '可检查对象';
                typeColor = 'var(--color-interact-blue)';
                break;
            case 'collect':
                typeLabel = '可收集物品';
                typeColor = 'var(--color-interact-green)';
                break;
            case 'clue':
                typeLabel = '重要线索';
                typeColor = 'var(--color-interact-yellow)';
                break;
            case 'danger':
                typeLabel = '危险/机关';
                typeColor = 'var(--color-interact-red)';
                break;
            case 'npc':
                typeLabel = '角色';
                typeColor = 'var(--color-interact-purple)';
                break;
            case 'interact':
                typeLabel = '可互动设备';
                typeColor = 'var(--color-interact-orange)';
                break;
        }

        // 构建内容HTML
        const description = interactive.description || '没有详细描述。';
        contentElement.innerHTML = `
            <div style="margin-bottom: 15px;">
                <span style="display: inline-block; padding: 3px 10px; background-color: ${typeColor}; color: white; border-radius: 3px; font-size: 13px; margin-bottom: 10px;">
                    ${typeLabel}
                </span>
                <p style="margin-top: 10px; font-size: 15px; line-height: 1.6;">${description}</p>
            </div>
        `;

        // 构建操作按钮
        const actionsElement = document.getElementById('interactive-modal-actions');
        actionsElement.innerHTML = '';

        // 可用的操作列表
        const availableActions = interactive.actions || [];

        // 操作按钮配置
        const actionButtons = [
            {
                id: 'examine',
                label: '查看',
                icon: 'fas fa-search',
                description: '仔细检查这个对象',
                available: availableActions.includes('examine') || availableActions.includes('examine_item'),
                handler: () => this.executeInteraction(interactive, type, 'examine')
            },
            {
                id: 'talk',
                label: '交谈',
                icon: 'fas fa-comment',
                description: '与这个角色对话',
                available: availableActions.includes('talk') || type === 'npc',
                handler: () => this.executeInteraction(interactive, type, 'talk')
            },
            {
                id: 'take',
                label: '拿起',
                icon: 'fas fa-hand-paper',
                description: '拾取这个物品',
                available: availableActions.includes('take') || availableActions.includes('take_item'),
                handler: () => this.executeInteraction(interactive, type, 'take')
            },
            {
                id: 'use',
                label: '使用',
                icon: 'fas fa-hand-pointer',
                description: '使用这个物品',
                available: availableActions.includes('use'),
                handler: () => this.executeInteraction(interactive, type, 'use')
            },
            {
                id: 'read',
                label: '阅读',
                icon: 'fas fa-book',
                description: '阅读这个物品上的文字',
                available: availableActions.includes('read') || availableActions.includes('read_message'),
                handler: () => this.executeInteraction(interactive, type, 'read')
            },
            {
                id: 'record',
                label: '记录',
                icon: 'fas fa-pencil-alt',
                description: '记录这个线索',
                available: availableActions.includes('record'),
                handler: () => this.executeInteraction(interactive, type, 'record')
            },
            {
                id: 'close',
                label: '关闭',
                icon: 'fas fa-times',
                description: '关闭这个窗口',
                available: true,
                handler: () => this.closeInteractiveModal()
            }
        ];

        // 添加操作按钮
        actionButtons.forEach(action => {
            if (action.available) {
                const button = document.createElement('button');
                button.className = 'interactive-action-btn';
                button.innerHTML = `<i class="${action.icon}"></i> ${action.label}`;
                button.title = action.description;
                button.addEventListener('click', () => {
                    action.handler();
                    // 执行操作后关闭模态框
                    this.closeInteractiveModal();
                });
                actionsElement.appendChild(button);
            }
        });

        // 显示模态框
        document.getElementById('interactive-modal').classList.add('active');
    }

    /**
     * 关闭交互对象模态框
     */
    closeInteractiveModal() {
        document.getElementById('interactive-modal').classList.remove('active');
    }

    /**
     * 执行交互操作
     */
    executeInteraction(interactive, elementType, actionType) {
        console.log(`执行交互操作: ${interactive.name}, 元素类型: ${elementType}, 操作: ${actionType}`);

        // 调用原有的处理逻辑，使用操作类型作为反馈类型
        this.processInteractiveResult(interactive, actionType);

        // 添加操作反馈
        const actionName = this.getActionNameForType(actionType);
        this.addFeedback(actionName, `你对${interactive.name}执行了${actionName}操作。`, 'info');
    }

    /**
     * 根据操作类型获取操作名称
     */
    getActionNameForType(actionType) {
        const actionNames = {
            'examine': '检查',
            'talk': '交谈',
            'take': '拿起',
            'use': '使用',
            'read': '阅读',
            'record': '记录'
        };
        return actionNames[actionType] || '操作';
    }

    /**
     * 处理交互元素结果
     */
    processInteractiveResult(interactive, type) {
        const result = interactive.result;
        if (!result) {
            this.addFeedback("系统", `你与${interactive.name}互动，但什么都没有发生。`, "info");
            return;
        }

        // 添加反馈信息
        if (result.feedback) {
            const feedbackType = this.getFeedbackTypeForInteraction(type);
            this.addFeedback(this.getActionName(type), result.feedback, feedbackType);
        }

        // 处理线索
        if (result.clue) {
            this.addClue(result.clue);
        }

        // 处理道具
        if (result.item) {
            this.addItemToInventory(result.item);
        }

        // 处理对话
        if (result.dialogue) {
            this.startDialogue(result.dialogue);
        }

        // 其他结果处理可以根据需要添加
    }

    /**
     * 根据交互类型获取反馈类型
     */
    getFeedbackTypeForInteraction(type) {
        switch (type) {
            case 'danger':
                return 'danger';
            case 'clue':
                return 'success';
            case 'examine':
            case 'talk':
            case 'read':
            case 'record':
                return 'info';
            case 'npc':
                return 'info';
            case 'collect':
            case 'take':
                return 'success';
            case 'interact':
            case 'use':
                return 'warning';
            default:
                return 'info';
        }
    }

    /**
     * 根据交互类型获取操作名称
     */
    getActionName(type) {
        switch (type) {
            case 'examine':
            case 'read':
            case 'record':
                return '检查';
            case 'npc':
            case 'talk':
                return '对话';
            case 'collect':
            case 'take':
                return '收集';
            case 'clue':
                return '线索';
            case 'danger':
                return '危险';
            case 'interact':
            case 'use':
                return '互动';
            default:
                return '系统';
        }
    }

    /**
     * 更新导航按钮状态
     */
    updateNavigationButtons(location) {
        // 标准方向映射
        const standardDirections = ['north', 'south', 'east', 'west'];

        // 特殊方向显示名称映射
        const specialDirectionNames = {
            'leave': '离开',
            'back': '返回',
            'board_train': '登车',
            'enter': '进入',
            'exit': '退出',
            'up': '上',
            'down': '下'
        };

        // 更新标准方向按钮
        standardDirections.forEach(dir => {
            const btn = document.getElementById(`btn-${dir}`);
            const exit = location.exits.find(e => e.direction === dir);
            if (exit) {
                btn.disabled = false;
                btn.title = `前往: ${exit.description}`;
            } else {
                btn.disabled = true;
                btn.title = "此方向无路可走";
            }
        });

        // 处理特殊方向按钮
        const specialContainer = document.getElementById('special-nav-buttons');
        specialContainer.innerHTML = ''; // 清空之前的特殊方向按钮

        // 获取所有特殊方向出口（非标准方向）
        const specialExits = location.exits.filter(exit =>
            !standardDirections.includes(exit.direction)
        );

        // 创建特殊方向按钮
        specialExits.forEach(exit => {
            const direction = exit.direction;
            const displayName = specialDirectionNames[direction] || direction;

            const btn = document.createElement('button');
            btn.className = 'special-nav-btn';
            btn.dataset.direction = direction;
            btn.innerHTML = `<i class="fas fa-arrow-right"></i> ${displayName}`;
            btn.title = `前往: ${exit.description}`;

            // 绑定点击事件
            btn.addEventListener('click', () => this.move(direction));

            specialContainer.appendChild(btn);
        });

        // 如果没有特殊方向，隐藏容器
        if (specialExits.length === 0) {
            specialContainer.style.display = 'none';
        } else {
            specialContainer.style.display = 'flex';
        }
    }

    /**
     * 移动玩家
     */
    move(direction) {
        const locationId = this.state.player.location;
        const location = this.data.locations.get(locationId);
        const exit = location.exits.find(e => e.direction === direction);

        if (!exit) {
            this.addFeedback("移动", "此方向无路可走。", "warning");
            return;
        }

        const targetLocation = this.data.locations.get(exit.target);
        if (!targetLocation) {
            console.error(`目标位置 ${exit.target} 不存在`);
            return;
        }

        // 更新玩家位置
        this.state.player.location = exit.target;
        this.addFeedback("移动", `前往${targetLocation.name}。`, "success");

        // 渲染新场景
        this.renderScene();
        this.updateUI();
    }

    /**
     * 处理命令输入
     */
    handleCommand() {
        const input = document.getElementById('command-input');
        const command = input.value.trim();

        if (!command) return;

        // 添加到反馈
        this.addFeedback("命令", `> ${command}`, "system");

        // 解析命令
        const parts = command.toLowerCase().split(' ');
        const action = parts[0];
        const target = parts.slice(1).join(' ');

        switch (action) {
            case '查看':
            case '检查':
            case 'examine':
                this.handleExamine(target);
                break;
            case '前往':
            case 'go':
                this.handleGo(target);
                break;
            case '使用':
            case 'use':
                this.handleUse(target);
                break;
            case '交谈':
            case 'talk':
                this.handleTalk(target);
                break;
            case '调查':
            case 'investigate':
                this.handleInvestigate(target);
                break;
            case '收集':
            case 'collect':
                this.handleCollect(target);
                break;
            case '帮助':
            case 'help':
                this.showHelp();
                break;
            default:
                this.addFeedback("系统", `未知命令: ${action}。可用的命令: 查看, 前往, 使用, 交谈, 调查, 收集, 帮助。`, "warning");
        }

        // 清空输入框
        input.value = '';
        input.focus();
    }

    /**
     * 处理检查命令
     */
    handleExamine(target) {
        if (!target) {
            this.addFeedback("系统", "请指定要检查的对象。例如: 查看 书桌", "warning");
            return;
        }

        const locationId = this.state.player.location;
        const location = this.data.locations.get(locationId);

        // 查找匹配的交互对象
        const interactive = location.interactives.find(i =>
            i.name.includes(target) || target.includes(i.name)
        );

        if (interactive) {
            this.addFeedback("检查", interactive.result.feedback || `你检查了${interactive.name}。`, "success");

            // 处理结果
            if (interactive.result.clue) {
                this.addClue(interactive.result.clue);
            }
            if (interactive.result.item) {
                this.addItemToInventory(interactive.result.item);
            }
            if (interactive.result.dialogue) {
                this.startDialogue(interactive.result.dialogue);
            }
        } else {
            this.addFeedback("检查", `这里没有'${target}'可以检查。`, "warning");
        }
    }

    /**
     * 处理移动命令
     */
    handleGo(target) {
        if (!target) {
            this.addFeedback("系统", "请指定要前往的地点。例如: 前往 火车站", "warning");
            return;
        }

        const locationId = this.state.player.location;
        const location = this.data.locations.get(locationId);

        // 查找匹配的出口
        const exit = location.exits.find(e =>
            e.target.includes(target) || e.description.includes(target)
        );

        if (exit) {
            this.move(exit.direction);
        } else {
            this.addFeedback("移动", `无法前往'${target}'。`, "warning");
        }
    }

    /**
     * 处理使用命令
     */
    handleUse(target) {
        if (!target) {
            this.addFeedback("系统", "请指定要使用的道具。例如: 使用 钥匙", "warning");
            return;
        }

        if (!this.selectedItem) {
            this.addFeedback("使用", "请先在道具栏中选择要使用的道具。", "warning");
            return;
        }

        this.addFeedback("使用", `尝试使用${this.selectedItem.name}...`, "info");
        // 具体使用逻辑需要根据场景和目标实现
    }

    /**
     * 处理交谈命令
     */
    handleTalk(target) {
        if (!target) {
            this.addFeedback("系统", "请指定要交谈的对象。例如: 交谈 苏晓雨", "warning");
            return;
        }

        const locationId = this.state.player.location;
        const location = this.data.locations.get(locationId);

        // 查找匹配的NPC
        const npcId = location.characters.find(charId => {
            const npc = this.data.npcs.get(charId);
            return npc && (npc.name.includes(target) || target.includes(npc.name));
        });

        if (npcId) {
            // 查找对应的对话
            for (const [dialogueId, dialogue] of this.data.dialogues) {
                if (dialogue.npc_id === npcId) {
                    this.startDialogue(dialogueId);
                    return;
                }
            }
            this.addFeedback("交谈", `你尝试与${this.data.npcs.get(npcId).name}交谈，但对方没有回应。`, "info");
        } else {
            this.addFeedback("交谈", `这里没有'${target}'可以交谈。`, "warning");
        }
    }

    /**
     * 处理调查命令
     */
    handleInvestigate(target) {
        // 暂时与检查相同
        this.handleExamine(target);
    }

    /**
     * 处理收集命令
     */
    handleCollect(target) {
        this.addFeedback("系统", "收集功能尚未完全实现。请点击环境中的绿色高亮文字进行收集。", "info");
    }

    /**
     * 开始对话
     */
    startDialogue(dialogueId) {
        const dialogue = this.data.dialogues.get(dialogueId);
        if (!dialogue) {
            console.error(`对话 ${dialogueId} 不存在`);
            return;
        }

        // 显示对话模态框
        const modal = document.getElementById('dialog-modal');
        const npcName = document.getElementById('dialog-npc-name');
        const dialogContent = document.getElementById('dialog-content');
        const dialogOptions = document.getElementById('dialog-options');

        npcName.textContent = dialogue.npc_name;
        dialogContent.innerHTML = '';
        dialogOptions.innerHTML = '';

        // 显示初始分支
        dialogue.initial_branches.forEach(branch => {
            const optionBtn = document.createElement('button');
            optionBtn.className = 'dialog-option';
            optionBtn.textContent = branch.player_text;
            optionBtn.addEventListener('click', () => {
                this.processDialogueBranch(dialogue, branch);
            });
            dialogOptions.appendChild(optionBtn);
        });

        modal.classList.add('active');
    }

    /**
     * 处理对话分支
     */
    processDialogueBranch(dialogue, branch) {
        const dialogContent = document.getElementById('dialog-content');
        const dialogOptions = document.getElementById('dialog-options');

        // 显示NPC回应
        dialogContent.innerHTML = `<p><strong>${dialogue.npc_name}:</strong> ${branch.npc_response}</p>`;

        // 处理结果
        if (branch.result.clue) {
            this.addClue(branch.result.clue);
        }
        if (branch.result.relationship) {
            // 更新关系值
            const npc = this.data.npcs.get(dialogue.npc_id);
            npc.relationship += branch.result.relationship;
        }
        if (branch.result.unlock_location) {
            // 解锁新位置
            this.state.player.discoveredLocations.add(branch.result.unlock_location);
            this.addFeedback("系统", `新地点已解锁: ${branch.result.unlock_location}`, "success");
        }

        // 显示下一级选项
        dialogOptions.innerHTML = '';
        if (branch.next_branches && branch.next_branches.length > 0) {
            branch.next_branches.forEach(branchId => {
                const nextBranch = dialogue.branches[branchId];
                if (nextBranch) {
                    const optionBtn = document.createElement('button');
                    optionBtn.className = 'dialog-option';
                    optionBtn.textContent = nextBranch.player_text;
                    optionBtn.addEventListener('click', () => {
                        this.processDialogueBranch(dialogue, nextBranch);
                    });
                    dialogOptions.appendChild(optionBtn);
                }
            });
        } else {
            // 对话结束
            const endBtn = document.createElement('button');
            endBtn.className = 'dialog-option';
            endBtn.textContent = "结束对话";
            endBtn.addEventListener('click', () => {
                document.getElementById('dialog-modal').classList.remove('active');
            });
            dialogOptions.appendChild(endBtn);
        }
    }

    /**
     * 添加道具到库存
     */
    addItemToInventory(itemId) {
        const item = this.data.items.get(itemId);
        if (!item) {
            console.error(`道具 ${itemId} 不存在`);
            return;
        }

        // 检查库存是否已满
        if (this.state.player.inventory.length >= 12) {
            this.addFeedback("道具", "库存已满，无法添加新道具。", "warning");
            return;
        }

        // 检查是否已拥有
        if (this.state.player.inventory.some(i => i.id === itemId)) {
            this.addFeedback("道具", `你已拥有${item.name}。`, "info");
            return;
        }

        // 添加到库存
        this.state.player.inventory.push({
            id: item.id,
            name: item.name,
            type: item.type,
            description: item.description
        });

        this.addFeedback("道具", `获得: ${item.name}`, "success");
        this.updateInventoryDisplay();
    }

    /**
     * 更新库存显示
     */
    updateInventoryDisplay() {
        const inventoryGrid = document.getElementById('inventory-grid');
        const inventoryCount = document.getElementById('inventory-count');

        inventoryGrid.innerHTML = '';
        inventoryCount.textContent = `${this.state.player.inventory.length}/12`;

        // 创建12个道具槽
        for (let i = 0; i < 12; i++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot empty';
            slot.dataset.index = i;

            if (i < this.state.player.inventory.length) {
                const item = this.state.player.inventory[i];
                slot.classList.remove('empty');
                slot.classList.add('has-item');

                const icon = document.createElement('i');
                icon.className = `item-icon ${this.data.items.get(item.id).icon || 'fas fa-question'}`;
                slot.appendChild(icon);

                slot.title = item.name;
                slot.addEventListener('click', () => this.selectItem(i));
            }

            inventoryGrid.appendChild(slot);
        }
    }

    /**
     * 选中道具
     */
    selectItem(index) {
        if (index >= this.state.player.inventory.length) {
            this.selectedItem = null;
            this.updateItemActions();
            return;
        }

        const itemData = this.state.player.inventory[index];
        const itemTemplate = this.data.items.get(itemData.id);

        this.selectedItem = {
            index: index,
            ...itemData,
            template: itemTemplate
        };

        // 更新选中状态
        document.querySelectorAll('.inventory-slot').forEach((slot, i) => {
            if (i === index) {
                slot.classList.add('selected');
            } else {
                slot.classList.remove('selected');
            }
        });

        // 显示道具信息
        const selectedInfo = document.getElementById('selected-item-info');
        selectedInfo.innerHTML = `
            <h4>${itemData.name}</h4>
            <p>${itemData.description}</p>
            <small>类型: ${itemTemplate.type}</small>
        `;

        this.updateItemActions();
    }

    /**
     * 更新道具操作按钮状态
     */
    updateItemActions() {
        const useBtn = document.getElementById('use-item');
        const examineBtn = document.getElementById('examine-item');
        const dropBtn = document.getElementById('drop-item');
        const combineBtn = document.getElementById('combine-item');

        if (this.selectedItem) {
            const item = this.selectedItem.template;
            useBtn.disabled = !item.usable;
            examineBtn.disabled = false;
            dropBtn.disabled = !item.droppable;
            combineBtn.disabled = !item.combinable;
        } else {
            useBtn.disabled = true;
            examineBtn.disabled = true;
            dropBtn.disabled = true;
            combineBtn.disabled = true;
        }
    }

    /**
     * 使用道具
     */
    useItem() {
        if (!this.selectedItem) return;
        this.addFeedback("使用", `使用${this.selectedItem.name}... (功能开发中)`, "info");
    }

    /**
     * 查看道具详情
     */
    examineItem() {
        if (!this.selectedItem) return;

        const item = this.selectedItem.template;
        const modal = document.getElementById('item-modal');
        const content = document.getElementById('item-modal-content');

        content.innerHTML = `
            <div class="item-modal-header">
                <i class="item-modal-icon ${item.icon || 'fas fa-question'}"></i>
                <div>
                    <h4 class="item-modal-title">${this.selectedItem.name}</h4>
                    <span class="item-modal-type">${item.type}</span>
                </div>
            </div>
            <div class="item-modal-description">
                <h5>详细描述</h5>
                <p>${item.detailed_description || item.description}</p>
                <p><strong>使用场景:</strong> ${item.use_scenes?.join(', ') || '无特定场景'}</p>
                <p><strong>获得方式:</strong> ${item.acquired_from}</p>
            </div>
        `;

        modal.classList.add('active');
    }

    /**
     * 丢弃道具
     */
    dropItem() {
        if (!this.selectedItem) return;

        const itemName = this.selectedItem.name;
        const index = this.selectedItem.index;

        this.state.player.inventory.splice(index, 1);
        this.selectedItem = null;

        this.addFeedback("道具", `丢弃了: ${itemName}`, "info");
        this.updateInventoryDisplay();
        this.updateItemActions();
    }

    /**
     * 组合道具
     */
    combineItem() {
        this.addFeedback("系统", "道具组合功能开发中。", "info");
    }

    /**
     * 添加线索
     */
    addClue(clueId) {
        // 尝试从world.clues获取线索定义（JSON加载的数据）
        // 如果不存在，尝试从data.clues获取（硬编码数据）
        let clue = null;
        if (this.state.world.clues && this.state.world.clues[clueId]) {
            clue = this.state.world.clues[clueId];
        } else if (this.data.clues && this.data.clues[clueId]) {
            clue = this.data.clues[clueId];
        }

        if (!clue) {
            console.error(`线索 ${clueId} 不存在`);
            return;
        }

        // 检查是否已拥有
        if (this.state.player.clues.some(c => c.id === clueId)) {
            return;
        }

        // 添加到线索列表
        this.state.player.clues.push({
            id: clue.id,
            title: clue.title,
            content: clue.content,
            category: clue.category,
            chapter: clue.chapter
        });

        this.addFeedback("线索", `发现新线索: ${clue.title}`, "success");
        this.updateNotebookDisplay();
    }

    /**
     * 更新笔记显示
     */
    updateNotebookDisplay() {
        const cluesList = document.getElementById('clues-list');
        const clueCount = document.getElementById('clue-count');

        cluesList.innerHTML = '';
        clueCount.textContent = this.state.player.clues.length;

        if (this.state.player.clues.length === 0) {
            cluesList.innerHTML = '<p class="no-clues">尚未发现任何线索。</p>';
            return;
        }

        // 按章节和类别分组显示线索
        const chapters = {};
        this.state.player.clues.forEach(clue => {
            if (!chapters[clue.chapter]) {
                chapters[clue.chapter] = {};
            }
            if (!chapters[clue.chapter][clue.category]) {
                chapters[clue.chapter][clue.category] = [];
            }
            chapters[clue.chapter][clue.category].push(clue);
        });

        Object.keys(chapters).sort().forEach(chapter => {
            const chapterSection = document.createElement('div');
            chapterSection.className = 'chapter-section';
            chapterSection.innerHTML = `<h4>第${chapter}章</h4>`;

            Object.keys(chapters[chapter]).forEach(category => {
                const categorySection = document.createElement('div');
                categorySection.className = 'category-section';
                categorySection.innerHTML = `<h5>${category}</h5>`;

                chapters[chapter][category].forEach(clue => {
                    const clueItem = document.createElement('div');
                    clueItem.className = 'clue-item';
                    clueItem.innerHTML = `
                        <div class="clue-title">${clue.title}</div>
                        <div class="clue-content">${clue.content}</div>
                    `;
                    categorySection.appendChild(clueItem);
                });

                chapterSection.appendChild(categorySection);
            });

            cluesList.appendChild(chapterSection);
        });
    }

    /**
     * 激活任务
     */
    activateQuest(questId) {
        const quest = this.data.quests.get(questId);
        if (!quest) {
            console.error(`任务 ${questId} 不存在`);
            return;
        }

        // 检查是否已激活或完成
        if (this.state.player.quests.active.includes(questId) ||
            this.state.player.quests.completed.includes(questId)) {
            return;
        }

        // 添加到激活任务列表
        this.state.player.quests.active.push(questId);
        this.state.player.currentQuest = questId;

        this.addFeedback("任务", `新任务: ${quest.name}`, "success");
        this.addFeedback("任务", quest.description, "info");
        this.updateTasksDisplay();
    }

    /**
     * 检查任务触发
     */
    checkQuestTriggers(locationId) {
        const activeQuests = this.state.player.quests.active;

        activeQuests.forEach(questId => {
            const quest = this.data.quests.get(questId);
            if (!quest) return;

            quest.steps.forEach(step => {
                if (!step.completed && step.target === locationId) {
                    step.completed = true;
                    this.addFeedback("任务", `任务进展: ${step.description} (完成)`, "success");

                    // 检查任务是否全部完成
                    const allCompleted = quest.steps.every(s => s.completed);
                    if (allCompleted) {
                        this.completeQuest(questId);
                    }
                }
            });
        });
    }

    /**
     * 完成任务
     */
    completeQuest(questId) {
        const quest = this.data.quests.get(questId);
        if (!quest) return;

        // 从激活列表移除，添加到完成列表
        const index = this.state.player.quests.active.indexOf(questId);
        if (index > -1) {
            this.state.player.quests.active.splice(index, 1);
        }
        this.state.player.quests.completed.push(questId);

        // 发放奖励
        if (quest.rewards.experience) {
            // 经验值系统暂未实现
        }
        if (quest.rewards.items && quest.rewards.items.length > 0) {
            quest.rewards.items.forEach(itemId => {
                this.addItemToInventory(itemId);
            });
        }
        if (quest.rewards.unlock && quest.rewards.unlock.length > 0) {
            quest.rewards.unlock.forEach(locationId => {
                this.state.player.discoveredLocations.add(locationId);
            });
        }

        this.addFeedback("任务", `任务完成: ${quest.name}`, "success");
        this.updateTasksDisplay();
    }

    /**
     * 更新任务显示
     */
    updateTasksDisplay() {
        const tasksList = document.getElementById('tasks-list');
        const taskCount = document.getElementById('task-count');

        tasksList.innerHTML = '';

        // 计算活跃任务数量
        const activeCount = this.state.player.quests.active.length;
        taskCount.textContent = activeCount;

        if (activeCount === 0) {
            tasksList.innerHTML = '<p class="no-tasks">当前没有活跃任务。</p>';
            return;
        }

        // 显示活跃任务
        this.state.player.quests.active.forEach(questId => {
            const quest = this.data.quests.get(questId);
            if (!quest) return;

            const taskItem = document.createElement('div');
            taskItem.className = 'task-item active';

            let stepsHtml = '';
            quest.steps.forEach(step => {
                stepsHtml += `
                    <div class="task-step ${step.completed ? 'completed' : ''}">
                        <i class="fas fa-${step.completed ? 'check' : 'circle'}"></i>
                        ${step.description}
                    </div>
                `;
            });

            taskItem.innerHTML = `
                <div class="task-title">
                    <i class="fas fa-quest"></i>
                    ${quest.name}
                </div>
                <div class="task-description">${quest.description}</div>
                <div class="task-steps">${stepsHtml}</div>
            `;

            tasksList.appendChild(taskItem);
        });
    }

    /**
     * 切换面板显示
     */
    togglePanel(panelId, forceState = null) {
        const panel = document.getElementById(panelId);
        const isActive = panel.classList.contains('active');

        if (forceState !== null) {
            if (forceState && !isActive) {
                panel.classList.add('active');
                this.updatePanelContent(panelId);
            } else if (!forceState && isActive) {
                panel.classList.remove('active');
            }
        } else {
            if (isActive) {
                panel.classList.remove('active');
            } else {
                // 关闭其他面板
                document.querySelectorAll('.panel.active').forEach(p => {
                    if (p.id !== panelId) p.classList.remove('active');
                });
                panel.classList.add('active');
                this.updatePanelContent(panelId);
            }
        }
    }

    /**
     * 更新面板内容
     */
    updatePanelContent(panelId) {
        switch (panelId) {
            case 'inventory-panel':
                this.updateInventoryDisplay();
                break;
            case 'notebook-panel':
                this.updateNotebookDisplay();
                break;
            case 'tasks-panel':
                this.updateTasksDisplay();
                break;
            case 'map-panel':
                this.updateMapDisplay();
                break;
        }
    }

    /**
     * 更新地图显示
     */
    updateMapDisplay() {
        const mapDisplay = document.getElementById('map-display');

        // 简单的地图显示
        const locations = Array.from(this.data.locations.values());
        let mapHtml = '<div class="map-simple">';

        locations.forEach(location => {
            const isCurrent = location.id === this.state.player.location;
            const isDiscovered = this.state.player.discoveredLocations.has(location.id);

            if (isDiscovered) {
                mapHtml += `<div class="map-location ${isCurrent ? 'current' : ''}">${location.name}</div>`;
            }
        });

        mapHtml += '</div>';
        mapDisplay.innerHTML = mapHtml;
    }

    /**
     * 添加操作反馈
     */
    addFeedback(sender, message, type = "info") {
        const feedbackContent = document.getElementById('feedback-content');
        const feedbackItem = document.createElement('div');

        feedbackItem.className = `feedback-item ${type}`;
        feedbackItem.innerHTML = `<strong>${sender}:</strong> ${message}`;

        feedbackContent.appendChild(feedbackItem);

        // 滚动到底部
        feedbackContent.scrollTop = feedbackContent.scrollHeight;
    }

    /**
     * 更新UI显示
     */
    updateUI() {
        // 更新理智值
        document.getElementById('sanity-value').textContent = this.state.player.sanity;

        // 更新游戏时间
        document.getElementById('game-time').textContent = `${this.state.world.date} ${this.state.world.time}`;

        // 更新进度
        const progress = this.calculateProgress();
        document.getElementById('progress-value').textContent = `${progress}%`;
    }

    /**
     * 计算游戏进度
     */
    calculateProgress() {
        // 简单计算：已发现位置数量 / 总位置数量
        const totalLocations = this.data.locations.size;
        const discoveredCount = this.state.player.discoveredLocations.size;

        if (totalLocations === 0) return 0;
        return Math.round((discoveredCount / totalLocations) * 100);
    }

    /**
     * 显示/隐藏加载遮罩
     */
    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (show) {
            overlay.style.display = 'flex';
        } else {
            overlay.style.display = 'none';
        }
    }

    /**
     * 保存游戏
     */
    saveGame() {
        try {
            const saveData = {
                state: {
                    ...this.state,
                    player: {
                        ...this.state.player,
                        discoveredLocations: Array.from(this.state.player.discoveredLocations),
                        flags: Array.from(this.state.player.flags.entries()),
                        relationships: Array.from(this.state.player.relationships.entries())
                    },
                    world: {
                        ...this.state.world,
                        triggeredEvents: Array.from(this.state.world.triggeredEvents)
                    }
                },
                timestamp: new Date().toISOString(),
                version: "1.0"
            };

            localStorage.setItem('saved_game', JSON.stringify(saveData));
            this.addFeedback("系统", "游戏进度已保存。", "success");
        } catch (error) {
            console.error("保存游戏失败:", error);
            this.addFeedback("系统", "保存失败，请检查浏览器设置。", "danger");
        }
    }

    /**
     * 加载游戏
     */
    async loadGame() {
        try {
            const savedData = localStorage.getItem('saved_game');
            if (!savedData) {
                this.addFeedback("系统", "没有找到保存的游戏。", "warning");
                return;
            }

            const saveData = JSON.parse(savedData);
            const savedChapter = saveData.state.world.chapter || 1;

            console.log(`加载保存的游戏，章节: ${savedChapter}`);

            // 如果章节不同，需要重新加载数据
            if (savedChapter !== this.state.world.chapter) {
                console.log(`章节变化: ${this.state.world.chapter} -> ${savedChapter}，重新加载数据`);
                try {
                    await this.loadChapterData(savedChapter);
                } catch (error) {
                    console.error(`重新加载第${savedChapter}章数据失败:`, error);
                    // 如果加载失败，尝试使用硬编码的第一章数据
                    if (savedChapter === 1) {
                        this.loadChapter1Data();
                    } else {
                        throw new Error(`无法加载第${savedChapter}章数据`);
                    }
                }
            }

            // 恢复状态
            this.state = {
                ...saveData.state,
                player: {
                    ...saveData.state.player,
                    discoveredLocations: new Set(saveData.state.player.discoveredLocations),
                    flags: new Map(saveData.state.player.flags),
                    relationships: new Map(saveData.state.player.relationships)
                },
                world: {
                    ...saveData.state.world,
                    triggeredEvents: new Set(saveData.state.world.triggeredEvents),
                    // 确保保留已加载的章节数据
                    clues: this.state.world.clues,
                    events: this.state.world.events,
                    chapterData: this.state.world.chapterData
                }
            };

            // 确保章节号正确
            this.state.world.chapter = savedChapter;

            this.addFeedback("系统", "游戏进度已加载。", "success");
            this.renderScene();
            this.updateUI();
            this.updateInventoryDisplay();
            this.updateNotebookDisplay();
            this.updateTasksDisplay();
        } catch (error) {
            console.error("加载游戏失败:", error);
            this.addFeedback("系统", "加载失败，存档可能已损坏。", "danger");
        }
    }

    /**
     * 显示帮助
     */
    showHelp() {
        const modal = document.getElementById('hint-modal');
        const content = document.getElementById('hint-content');

        content.innerHTML = `
            <h4>游戏操作指南</h4>
            <p><strong>交互方式:</strong></p>
            <ul>
                <li>点击高亮文字进行互动（蓝色:检查, 绿色:收集, 黄色:线索, 红色:危险, 紫色:NPC, 橙色:设备）</li>
                <li>使用命令输入框输入文本命令</li>
                <li>使用右侧快捷按钮打开功能面板</li>
            </ul>

            <p><strong>常用命令:</strong></p>
            <ul>
                <li>查看/检查 [对象] - 详细检查对象</li>
                <li>前往 [地点] - 移动到指定地点</li>
                <li>使用 [道具] - 使用选中的道具</li>
                <li>交谈 [人物] - 与NPC对话</li>
                <li>调查 [区域] - 调查特定区域</li>
                <li>收集 [物品] - 收集物品</li>
                <li>帮助 - 显示本帮助</li>
            </ul>

            <p><strong>游戏系统:</strong></p>
            <ul>
                <li><strong>道具系统:</strong> 收集和使用道具解决谜题</li>
                <li><strong>线索系统:</strong> 发现线索记录在笔记本中</li>
                <li><strong>任务系统:</strong> 完成任务推进剧情</li>
                <li><strong>对话系统:</strong> 选择不同对话分支影响剧情</li>
            </ul>

            <p><strong>提示:</strong></p>
            <ul>
                <li>仔细观察环境描述，寻找隐藏线索</li>
                <li>与所有NPC对话，获取信息和任务</li>
                <li>合理使用道具，有些谜题需要特定道具</li>
                <li>注意角色的理智值，遇到恐怖事件会下降</li>
                <li>定期保存游戏进度</li>
            </ul>
        `;

        modal.classList.add('active');
    }
}

// ============================================
// 游戏启动
// ============================================

// 当页面加载完成后启动游戏
document.addEventListener('DOMContentLoaded', () => {
    window.game = new AdventureGame();

    // 关闭模态框的事件
    document.getElementById('close-dialog').addEventListener('click', () => {
        document.getElementById('dialog-modal').classList.remove('active');
    });

    document.getElementById('close-hint').addEventListener('click', () => {
        document.getElementById('hint-modal').classList.remove('active');
    });

    document.getElementById('close-item-modal').addEventListener('click', () => {
        document.getElementById('item-modal').classList.remove('active');
    });

    // 点击模态框背景关闭
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
});

// 全局游戏实例
let game;