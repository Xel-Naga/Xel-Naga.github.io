/**
 * 第一章数据：风雪赴约
 * 根据剧本内容和已开发功能设计
 * 
 * 已支持功能：
 * - 场景切换（exits）
 * - 互动道具（interactives + items）
 * - 事件系统（events）
 * - 任务追踪（quests）
 * - NPC对话树（npcs.dialogues）
 * - 场景变体（variants）
 * - 状态效果（effects）
 * - 重复检查（repeatDescriptions）
 */

const chapter1Data = {
  id: 'chapter1',
  name: '第一章：风雪赴约',
  description: '2025年1月，林墨与苏晓雨应陈青山之邀，前往西南山区的悬云观...',
  startLocation: 'dorm',
  
  // ========== 场景定义 ==========
  scenes: {
    // 场景1：大学宿舍
    dorm: {
      id: 'dorm',
      name: '大学宿舍',
      description: `窗外是城市冬日的暮色，高楼灯火渐次亮起。宿舍书桌上摊开<span class="highlight highlight-examine" data-id="textbook" data-type="examine">结构力学教材</span>、<span class="highlight highlight-examine" data-id="calculator" data-type="examine">工程计算器</span>、<span class="highlight highlight-examine" data-id="draft_paper" data-type="examine">画满公式的草稿纸</span>。一个半开的登山包，林墨正在往里装东西。`,
      ambience: '城市夜晚的白噪音，远处传来的车声',
      interactives: [
        {
          id: 'textbook',
          name: '结构力学教材',
          type: 'examine',
          description: '教材中发现夹着的便签："悬云山地质报告摘要：岩层异常稳定，地震记录为零。但当地传说有\'地动\'现象。矛盾。"',
          firstExamineBonus: '获得关键线索！',
          clueId: 'clue_geology_report',
          effects: { intuition: 5 },
        },
        {
          id: 'calculator',
          name: '工程计算器',
          type: 'examine',
          description: '计算器内存有特殊计算：悬挑结构承重模拟，结果显示"不可能支撑"。草稿纸上有相同的计算，但结果被划掉，改为"特殊材料？机关辅助？"',
          clueId: 'clue_calculation',
          effects: { sanity: -3, intuition: 5 },
        },
        {
          id: 'draft_paper',
          name: '草稿纸',
          type: 'examine',
          description: '草稿纸背面有潦草的梦境涂鸦：悬崖、栈道、一个奇怪的几何图案（类似八卦但不对称，缺少"乾"位）',
          clueId: 'clue_dream_doodle',
        },
        {
          id: 'phone_chat',
          name: '手机对话',
          type: 'clue',
          description: '陈青山的微信消息。仔细查看发现回复间隔异常，从几小时到一天不等。',
          clueId: 'clue_chat_anomaly',
          effects: { sanity: -2 },
        },
        {
          id: 'calendar',
          name: '墙上日历',
          type: 'examine',
          description: '日历标注着"悬云山考察"和"结构力学考试"。距离考试还有一周，时间紧迫。',
        },
        {
          id: 'sleeping_pills',
          name: '安眠药瓶',
          type: 'collect',
          itemId: 'item_sleeping_pills',
          name: '安眠药',
          description: '治疗噩梦和睡眠障碍的药，最近用量增加。',
          effects: { sanity: -5 },
        },
        {
          id: 'ancient_books',
          name: '书架古籍',
          type: 'examine',
          description: '《墨子》中有书签标记"机关篇"，《考工记》有折角"匠人营国"章节。',
          clueId: 'clue_ancient_knowledge',
          effects: { intuition: 10 },
        },
        {
          id: 'backpack',
          name: '登山包',
          type: 'device',
          description: '整理登山包，确认携带工具。',
          resultMessage: '你整理了登山包，将专业工具放入其中。',
          result: { addInitialItems: true },
        },
      ],
      exits: [
        { direction: 'next', target: 'subway', name: '前往地铁站', trigger: '整理完装备后' },
      ],
      onEnter: {
        initStatus: {
          stamina: 100,
          sanity: 100,
          temperature: 37,
        },
        addItems: ['item_level', 'item_notebook', 'item_keychain', 'item_tape_measure', 'item_flashlight', 'item_battery', 'item_energy_bar'],
      },
    },

    // 场景2：地铁站
    subway: {
      id: 'subway',
      name: '地铁站',
      description: `人流如织，指示灯闪烁，广播报站声嘈杂。<span class="highlight highlight-npc" data-id="su_xiaoyu" data-type="npc">苏晓雨</span>背着画板包，提着摄影器材箱，在闸机口张望。远处<span class="highlight highlight-examine" data-id="billboard" data-type="examine">地铁站广告牌</span>显示"悬云山旅游宣传"，但图片模糊不清。地上有一张被踩脏的<span class="highlight highlight-collect" data-id="warning_flyer" data-type="collect">传单</span>。`,
      ambience: '嘈杂的人声、广播报站、列车进站声',
      interactives: [
        {
          id: 'su_xiaoyu',
          name: '苏晓雨',
          type: 'npc',
          npcId: 'su_xiaoyu',
        },
        {
          id: 'billboard',
          name: '广告牌',
          type: 'examine',
          description: '广告牌上的悬云山图片被故意处理过，模糊了建筑细节。右下角有小字"图片仅供参考，实际景点可能有所不同"。',
          clueId: 'clue_billboard',
        },
        {
          id: 'warning_flyer',
          name: '警告传单',
          type: 'collect',
          itemId: 'item_warning_flyer',
          name: '旅行警告传单',
          description: '悬云山区旅行警告：近年多起失踪事件未破，建议结伴而行，避免深入未开发区域。',
          clueId: 'clue_warning_flyer',
          effects: { sanity: -5, intuition: 5 },
        },
      ],
      exits: [
        { direction: 'back', target: 'dorm', name: '返回宿舍' },
        { direction: 'next', target: 'train_station', name: '前往火车站' },
      ],
    },

    // 场景3：火车站候车厅
    train_station: {
      id: 'train_station',
      name: '火车站候车厅',
      description: `巨大的<span class="highlight highlight-examine" data-id="display_board" data-type="examine">电子显示屏</span>滚动着车次信息。旅客拖着行李匆匆走过。<span class="highlight highlight-examine" data-id="notice_board" data-type="examine">车站公告栏</span>贴有山区旅行警告。<span class="highlight highlight-examine" data-id="station_clock" data-type="examine">候车厅时钟</span>指针走动似乎有轻微异常。`,
      ambience: '广播声、行李箱轮子声、嘈杂对话',
      interactives: [
        {
          id: 'display_board',
          name: '电子显示屏',
          type: 'device',
          description: '查看车次信息。',
          resultMessage: '显示屏滚动着K447次列车信息：前往西南方向，检票口3号。',
          triggerEvent: 'event_screen_glitch',
        },
        {
          id: 'notice_board',
          name: '公告栏',
          type: 'examine',
          description: '公告栏贴着一张泛黄的警告："悬云山区冬季气候恶劣，常有突发暴雪，非必要勿入。近年来有多起失踪报告未破。最近一起：三年前考古队失踪。"',
          clueId: 'clue_notice_board',
          effects: { sanity: -5 },
        },
        {
          id: 'station_clock',
          name: '候车厅时钟',
          type: 'examine',
          description: '候车厅所有时钟都比标准时间快3秒/分钟。询问工作人员，回答："这些钟一直不准，修了好几次都没用。"',
          clueId: 'clue_time_anomaly',
          effects: { intuition: 5 },
        },
        {
          id: 'ticket_stub',
          name: '车票存根',
          type: 'collect',
          itemId: 'item_ticket_stub',
          name: '考古队员车票存根',
          description: '日期：三年前同月同日，目的地：悬云山站，乘客：李XX（考古队员？）',
          clueId: 'clue_ticket_stub',
          effects: { sanity: -8 },
        },
        {
          id: 'vending_machine',
          name: '自动售货机',
          type: 'device',
          description: '售货机显示"悬云山特产"，但所有商品都显示"缺货"。',
          resultMessage: '触摸屏有故障，反复闪烁"悬云……观……未……"。',
          effects: { sanity: -3 },
        },
      ],
      exits: [
        { direction: 'back', target: 'subway', name: '返回地铁站' },
        { direction: 'next', target: 'bus', name: '上车出发', triggerEvent: 'event_board_train' },
      ],
      events: {
        event_screen_glitch: {
          id: 'event_screen_glitch',
          name: '电子屏异常',
          description: '所有屏幕同时显示："悬云观—未开通—错误代码：404-机关阵"',
          effects: { sanity: -10, intuition: 5 },
          once: true,
        },
      },
    },

    // 场景4：长途大巴
    bus: {
      id: 'bus',
      name: '长途大巴',
      description: `老旧的大巴车在蜿蜒山路上颠簸，窗外是深不见底的山谷。车内空气混浊，乘客昏昏欲睡。<span class="highlight highlight-npc" data-id="su_xiaoyu" data-type="npc">苏晓雨</span>脸色苍白，靠在林墨肩上。`,
      ambience: '引擎轰鸣、颠簸震动、风声',
      interactives: [
        {
          id: 'mountain_view',
          name: '窗外山景',
          type: 'examine',
          description: '山体出现规则的几何切割痕迹，像是被巨大的工具整齐削过。某些岩层呈现不自然的平行纹理。',
          clueId: 'clue_mountain_structure',
          effects: { intuition: 5 },
        },
        {
          id: 'old_newspaper',
          name: '旧报纸',
          type: 'collect',
          itemId: 'item_newspaper',
          name: '旧报纸剪报',
          description: '《悬云山考古队神秘失踪，搜寻无果》- 三年前，一支考古队在悬云山考察古代遗迹时全员失踪。',
          clueId: 'clue_newspaper',
          effects: { sanity: -5 },
        },
        {
          id: 'care_xiaoyu',
          name: '照顾苏晓雨',
          type: 'device',
          description: '递水、安慰晕车的苏晓雨。',
          resultMessage: '苏晓雨感激地看着你，感觉好多了。',
          effects: { stamina: 5 },
        },
      ],
      exits: [
        { direction: 'next', target: 'county_station', name: '到达县城车站' },
      ],
      onEnter: {
        effects: { stamina: -5 },
      },
    },

    // 场景5：县城车站
    county_station: {
      id: 'county_station',
      name: '县城车站',
      description: `小县城车站，水泥地面开裂，墙面斑驳。几辆破旧中巴车停着。<span class="highlight highlight-npc" data-id="chen_qingshan" data-type="npc">陈青山</span>靠在一辆改装皮卡旁，挥手示意。一位<span class="highlight highlight-npc" data-id="old_man" data-type="npc">头发花白的老人</span>坐在屋檐下，神情激动地看着你们。`,
      ambience: '柴油味、当地方言、风声',
      interactives: [
        {
          id: 'chen_qingshan',
          name: '陈青山',
          type: 'npc',
          npcId: 'chen_qingshan',
        },
        {
          id: 'old_man',
          name: '白发老人',
          type: 'npc',
          npcId: 'village_elder',
        },
        {
          id: 'truck',
          name: '改装皮卡',
          type: 'examine',
          description: '车内发现：地质锤、罗盘、一卷泛黄的图纸、《墨子》古籍、夜视仪。',
          clueId: 'clue_chen_tools',
        },
      ],
      exits: [
        { direction: 'next', target: 'mountain_road', name: '乘车进山' },
      ],
      onEnter: {
        addItems: ['item_geological_hammer', 'item_compass', 'item_old_map', 'item_mozi_book'],
      },
    },

    // 场景6：山路
    mountain_road: {
      id: 'mountain_road',
      name: '山路',
      description: `皮卡驶出县城，道路变窄，两侧悬崖渐深。突然，白色浓雾从山谷升腾，几分钟内能见度降到不足十米。雾气中有细微的"叮铃……叮铃……"声，像是极小的铃铛在远处摇响。`,
      ambience: '引擎声、风声、隐约的铃铛声',
      interactives: [
        {
          id: 'fog',
          name: '浓雾',
          type: 'examine',
          description: '雾来得太突然了，不像是自然现象。',
          effects: { sanity: -3 },
        },
        {
          id: 'bell_sound',
          name: '铃铛声',
          type: 'clue',
          description: '铃铛声节奏：叮铃-叮铃-叮铃（三短），停顿，叮铃-叮铃（两长）。',
          clueId: 'clue_bell_rhythm',
          effects: { intuition: 5 },
        },
      ],
      exits: [
        { direction: 'next', target: 'avalanche', name: '继续前进' },
      ],
      onEnter: {
        effects: { temperature: -2 },
      },
    },

    // 场景7：山体滑坡
    avalanche: {
      id: 'avalanche',
      name: '山体滑坡现场',
      description: `天空以肉眼可见的速度暗下来。第一片雪花落下，紧接着鹅毛大雪倾泻而下。前方传来轰隆巨响——<span class="highlight highlight-danger" data-id="landslide" data-type="danger">落石</span>完全堵塞了道路！`,
      ambience: '风雪呼啸、岩石崩裂声',
      interactives: [
        {
          id: 'landslide',
          name: '落石',
          type: 'danger',
          description: '落石断面有规则的锯齿状痕迹，像是被巨大齿轮切割。自然滑坡的石头断面应该参差不齐。',
          clueId: 'clue_cut_stones',
          effects: { sanity: -5, intuition: 5 },
        },
        {
          id: 'ground_shake',
          name: '地面震动',
          type: 'examine',
          description: '路面有轻微但持续的震动，不是车辆或落石引起的。',
          clueId: 'clue_ground_shake',
        },
        {
          id: 'hail_rhythm',
          name: '冰雹节奏',
          type: 'clue',
          description: '冰雹的敲击有节奏：啪嗒-啪嗒-啪嗒（三短），停顿，啪嗒-啪嗒（两长）。与之前的铃铛声一致！',
          clueId: 'clue_hail_rhythm',
          effects: { sanity: -5, intuition: 10 },
        },
      ],
      exits: [
        { direction: 'next', target: 'hiking', name: '徒步进山' },
      ],
      onEnter: {
        effects: { temperature: -5, stamina: -5 },
        addItems: ['item_climbing_gear'],
      },
    },

    // 场景8：徒步山路
    hiking: {
      id: 'hiking',
      name: '积雪山路',
      description: `积雪已没过脚踝，每走一步都费力。风卷着雪片打在脸上，像小刀割。<span class="highlight highlight-examine" data-id="strange_footprints" data-type="examine">雪地上的奇怪脚印</span>引起了你的注意。`,
      ambience: '风雪声、脚步声、喘息声',
      interactives: [
        {
          id: 'strange_footprints',
          name: '奇怪脚印',
          type: 'examine',
          description: '不是人类脚印，也不是常见动物，有三个脚趾，间距规律。',
          clueId: 'clue_footprints',
          effects: { sanity: -3 },
        },
        {
          id: 'ancient_road_sign',
          name: '古老路标',
          type: 'examine',
          description: '残破的路碑，上面名字被风雨侵蚀。',
        },
        {
          id: 'eat_energy_bar',
          name: '补充能量',
          type: 'device',
          description: '吃能量棒恢复体力。',
          resultMessage: '你吃了一个能量棒，感觉恢复了一些体力。',
          effects: { stamina: 10 },
        },
      ],
      exits: [
        { direction: 'next', target: 'plank_road', name: '继续攀爬' },
      ],
      onEnter: {
        effects: { stamina: -15, temperature: -3 },
      },
    },

    // 场景9：悬崖栈道
    plank_road: {
      id: 'plank_road',
      name: '悬崖栈道',
      description: `木制栈道钉在悬崖侧面，宽约一米，外侧有简陋护栏。木板老旧，很多已经腐朽。<span class="highlight highlight-examine" data-id="plank_inscription" data-type="examine">栈道入口的石碑</span>上刻着警告。木板在脚下发出"嘎吱—嘎吱—"的呻吟声——和林墨梦中的声音一模一样。`,
      ambience: '木板呻吟声、风声、心跳声',
      interactives: [
        {
          id: 'plank_inscription',
          name: '石碑',
          type: 'examine',
          description: '石碑刻文："栈道九曲，一步一劫。心若不坚，魂归深渊。"',
          clueId: 'clue_plank_warning',
          effects: { sanity: -5 },
        },
        {
          id: 'plank_structure',
          name: '栈道结构',
          type: 'examine',
          description: '栈道承重结构异常，部分支撑点似乎可以移动。榫卯设计是从未见过的形制。',
          clueId: 'clue_plank_mechanism',
          effects: { intuition: 10 },
        },
        {
          id: 'under_plank',
          name: '栈道下方',
          type: 'danger',
          description: '栈道支撑柱上有齿轮结构，正在缓慢转动。',
          warning: '探身查看非常危险，确定要继续吗？',
          clueId: 'clue_gear_under_plank',
          effects: { sanity: -8, intuition: 5 },
        },
      ],
      exits: [
        { direction: 'next', target: 'stone_pavilion', name: '小心通过' },
      ],
      onEnter: {
        effects: { sanity: -10, stamina: -5 },
      },
    },

    // 场景10：石亭
    stone_pavilion: {
      id: 'stone_pavilion',
      name: '山腰石亭',
      description: `石亭建在栈道稍宽的平台处，四柱八角，顶覆积雪。亭中有石桌石凳，中央一个<span class="highlight highlight-examine" data-id="stone_incense_burner" data-type="examine">石制香炉</span>。`,
      ambience: '风声穿过八角的呜咽声',
      interactives: [
        {
          id: 'stone_incense_burner',
          name: '石制香炉',
          type: 'examine',
          description: '香炉里积满新雪，但炉底露出一截未燃尽的香根，还有一点点温度...就在这一两天内。',
          clueId: 'clue_recent_incense',
          effects: { intuition: 5 },
        },
        {
          id: 'pavilion_stone_tablet',
          name: '亭中石碑',
          type: 'examine',
          description: '石碑刻文："此山多诡，机关重重，非请莫入。万历三十五年，玄真道人立。"',
          clueId: 'clue_pavilion_tablet',
        },
      ],
      exits: [
        { direction: 'next', target: 'temple_view', name: '继续攀登' },
      ],
    },

    // 场景11：道观初现
    temple_view: {
      id: 'temple_view',
      name: '山脊垭口',
      description: `三人翻过最后一道山脊，精疲力尽。风雪奇迹般地小了，云层裂开一道缝隙。清冷的月光洒下，照亮前方景象——<span class="highlight highlight-examine" data-id="xuan_guan_view" data-type="examine">悬云观</span>如浮雕般嵌在绝壁之中。`,
      ambience: '突然安静的风雪、钟声',
      interactives: [
        {
          id: 'xuan_guan_view',
          name: '悬云观',
          type: 'examine',
          description: '悬崖对面，绝壁之上，一座道观如浮雕般嵌在岩体中。主体建筑悬空伸出崖外二十余米，仅靠八根粗大的石柱支撑。飞檐向下压，檐角如鹰爪般扣向深渊。观内灯火通明，但灯光颜色偏青。',
          clueId: 'clue_temple_structure',
          effects: { sanity: -5, intuition: 10 },
        },
        {
          id: 'temple_shadow',
          name: '道观影子',
          type: 'clue',
          description: '月光下，道观的影子投在悬崖上。影子形状扭曲变形，不像建筑本身，更像一个蹲伏的巨人，双手伸向深渊。',
          clueId: 'clue_temple_shadow',
          effects: { sanity: -8 },
        },
        {
          id: 'temple_bell',
          name: '道观钟声',
          type: 'clue',
          description: '观中传来钟声："铛——铛——铛————铛—铛——" 三长两短，停顿十秒，再次响起。同样的节奏！',
          clueId: 'clue_bell_pattern',
          effects: { sanity: -5, intuition: 5 },
        },
      ],
      exits: [
        { direction: 'next', target: 'gate', name: '走向道观', triggerChapterEnd: true },
      ],
      onEnter: {
        effects: { stamina: -10, temperature: -2 },
      },
    },

    // 场景12：山门（与第2章衔接）
    gate: {
      id: 'gate',
      name: '悬云观山门',
      description: `暴雪中的山门巍然矗立。石质门框在风雪中若隐若现，门楣上<span class="highlight highlight-clue" data-id="plaque" data-type="clue">"悬云观"三字匾额</span>被积雪半掩。山门两侧<span class="highlight highlight-examine" data-id="stone_lion_left" data-type="examine">石狮</span>头顶积雪，如戴白帽。`,
      ambience: '风雪呼啸，钟声隐约',
      interactives: [
        {
          id: 'stone_lion_left',
          name: '石狮',
          type: 'examine',
          description: '明代石雕狮子，风化严重但底座有新鲜摩擦痕迹。石狮右眼瞳孔处有一个极小的孔洞，像是某种机关的钥匙孔。',
          clueId: 'clue_lion_keyhole',
          effects: { intuition: 5 },
          repeatDescriptions: {
            first: '明代石雕狮子，风化严重但底座有新鲜摩擦痕迹。',
            second: '石狮底座的摩擦痕迹延伸向门内，似乎有人反复拖动重物。',
            third: '石狮右眼瞳孔处有一个极小的孔洞，不仔细观察难以发现。',
            subsequent: '石狮静静地蹲坐，雪落在它的头顶，像是一顶白帽。',
          },
        },
        {
          id: 'plaque',
          name: '匾额',
          type: 'clue',
          description: '木质匾额，刻有"悬云观"三字。细看之下，"悬云"二字似为藏头。',
          clueId: 'clue_plaque_text',
        },
        {
          id: 'gate_door',
          name: '山门',
          type: 'device',
          description: '推开沉重的山门进入道观。',
          resultMessage: '你推开了山门，一股暖流夹杂着檀香味扑面而来...',
          triggerEvent: 'chapter1_complete',
        },
      ],
      exits: [
        { direction: 'enter', target: 'courtyard', name: '进入道观', locked: false },
      ],
    },

    // 场景13：庭院（第2章开始）
    courtyard: {
      id: 'courtyard',
      name: '前院',
      description: `庭院积雪深厚，脚踩上去发出"咯吱"声响。院中一棵<span class="highlight highlight-examine" data-id="old_tree" data-type="examine">老槐树</span>枝干扭曲。正前方是<span class="highlight highlight-device" data-id="main_hall_door" data-type="device">三清殿大门</span>。`,
      ambience: '扫雪声、风声',
      interactives: [
        {
          id: 'old_tree',
          name: '老槐树',
          type: 'examine',
          description: '百年老槐，枝干扭曲如鬼爪。树皮上有奇怪的刻痕，像是某种符号。',
          clueId: 'clue_tree_symbols',
        },
        {
          id: 'main_hall_door',
          name: '三清殿大门',
          type: 'device',
          description: '进入三清殿',
          resultMessage: '你走向三清殿...',
        },
      ],
      exits: [
        { direction: 'back', target: 'gate', name: '返回山门' },
        { direction: 'enter', target: 'main_hall', name: '进入三清殿' },
      ],
    },

    // 场景14：三清殿
    main_hall: {
      id: 'main_hall',
      name: '三清殿',
      description: `殿内昏暗，香火缭绕。正中供奉三清像，金漆剥落。<span class="highlight highlight-npc" data-id="mingxin" data-type="npc">一位年轻道士</span>正在打扫。殿角放着一口<span class="highlight highlight-danger" data-id="ancient_bell" data-type="danger">古钟</span>。`,
      ambience: '香火燃烧声、钟鸣',
      interactives: [
        {
          id: 'mingxin',
          name: '明心道士',
          type: 'npc',
          npcId: 'mingxin',
        },
        {
          id: 'ancient_bell',
          name: '古钟',
          type: 'danger',
          description: '一口巨大的青铜钟，表面刻满符文。钟身微微震颤，发出低沉嗡鸣。',
          warning: '靠近古钟让你感到强烈的不安，确定要靠近吗？',
          effects: { sanity: -10 },
        },
        {
          id: 'sanqing_statues',
          name: '三清神像',
          type: 'examine',
          description: '神像金漆剥落，泥胎暴露。泥土呈现金属光泽，不似寻常。',
          clueId: 'clue_statue_material',
        },
      ],
      exits: [
        { direction: 'back', target: 'courtyard', name: '返回庭院' },
      ],
    },
  },

  // ========== NPC定义 ==========
  npcs: {
    su_xiaoyu: {
      id: 'su_xiaoyu',
      name: '苏晓雨',
      description: '21岁，美术学院视觉传达专业大二学生。活泼开朗，观察力敏锐。',
      avatar: '👩‍🎨',
      initialDialogue: '墨墨！这里人太多了，我差点被挤出去。',
      dialogues: [
        {
          id: 'greeting',
          text: '你没事吧？',
          response: '没事，就是有点晕车...青山说那座道观建筑风格很特别，我一定要记录下来。',
          next: ['equipment', 'qingshan', 'strange'],
        },
        {
          id: 'equipment',
          text: '确认一下装备',
          response: '我带了相机、三脚架、素描本、颜料...还有红外线测温仪和紫外线手电筒！',
          effects: { addItems: ['item_camera', 'item_tripod', 'item_sketchbook', 'item_thermometer', 'item_uv_light'] },
        },
        {
          id: 'qingshan',
          text: '你觉得陈青山有什么异常吗？',
          response: '我看了他的朋友圈，最近三个月全是悬云山的照片...有张照片角落里有金属反光，在古代木建筑里？',
          clueId: 'clue_metal_reflection',
        },
        {
          id: 'strange',
          text: '你有什么不安的预感吗？',
          response: '嗯...从看到那个警告传单开始，我就觉得这次旅行可能不像想象中那么简单。',
        },
      ],
    },

    chen_qingshan: {
      id: 'chen_qingshan',
      name: '陈青山',
      description: '22岁，林墨的发小，民宿老板。豪爽热情，但似乎隐藏着什么。',
      avatar: '👨‍🌾',
      initialDialogue: '墨哥！嫂子！这里！好久不见！',
      dialogues: [
        {
          id: 'greeting',
          text: '好久不见',
          response: '路上辛苦了！快上车，我们先吃个饭，然后进山。',
          next: ['temple', 'archaeology', 'family'],
        },
        {
          id: 'temple',
          text: '你说的古代机关是什么？',
          response: '我说了你可能不信。等到了你自己看，那东西...不是简单的机械。',
          effects: { sanity: -2 },
        },
        {
          id: 'archaeology',
          text: '听说有考古队在这里失踪？',
          response: '（表情明显僵硬）那个...是意外。山里天气变化快，他们可能迷路了。',
          clueId: 'clue_chen_avoidance',
        },
        {
          id: 'family',
          text: '你在这边有亲戚？',
          response: '嗯...算是吧。家族世代在这边，对这片山区比较熟悉。',
        },
      ],
    },

    village_elder: {
      id: 'village_elder',
      name: '白发老人',
      description: '县城边缘的老人，对悬云山似乎很了解',
      avatar: '👴',
      initialDialogue: '喂！你们是不是要去悬云观？！',
      dialogues: [
        {
          id: 'warning',
          text: '您有什么事吗？',
          response: '回去！那地方去不得！那观里的钟...自己会响。里面的道士...不是人。三年前那些考古的...再也没出来。',
          clueId: 'clue_elder_warning',
          effects: { sanity: -8 },
          once: true,
        },
      ],
    },

    mingxin: {
      id: 'mingxin',
      name: '明心道士',
      description: '25岁，悬云观年轻道士。圆脸微胖，戴黑框眼镜，笑容和善。',
      avatar: '🧑‍🦲',
      initialDialogue: '福生无量天尊！三位施主快请进，这雪太大了！',
      dialogues: [
        {
          id: 'greeting',
          text: '你好，我们是陈青山的朋友',
          response: '啊，陈先生已经跟我说了。快请进，我去通报观主玄真道长。',
          next: ['history', 'strange', 'rules'],
        },
        {
          id: 'history',
          text: '这道观有多少年历史了？',
          response: '悬云观建于明末，开山祖师号"悬机子"，精通道教术数与墨家机关。',
          clueId: 'clue_temple_history',
        },
        {
          id: 'strange',
          text: '这里有什么奇怪的现象吗？',
          response: '（压低声音）最近夜里...总会听到钟声，但钟楼里的钟明明没人敲...',
          clueId: 'clue_bell_selfring',
          effects: { sanity: -3 },
        },
        {
          id: 'rules',
          text: '道观有什么规矩吗？',
          response: '观主规定：夜晚不得随意走动，藏经阁未经许可不得入内，钟楼禁止靠近。',
        },
      ],
    },
  },

  // ========== 道具定义 ==========
  items: {
    // 初始道具
    item_level: {
      id: 'item_level',
      name: '水平仪',
      description: '小型水平仪，用于测量倾斜度。土木工程学生的基本工具。',
      type: 'tool',
      icon: '📐',
      usable: true,
    },
    item_notebook: {
      id: 'item_notebook',
      name: '笔记本',
      description: '记录线索和想法的笔记本。已经用了一半。',
      type: 'tool',
      icon: '📓',
    },
    item_keychain: {
      id: 'item_keychain',
      name: '桃木钥匙扣',
      description: '林墨随身携带的桃木钥匙扣，桃木在道教中有辟邪作用。',
      type: 'key',
      icon: '🔑',
    },
    item_tape_measure: {
      id: 'item_tape_measure',
      name: '卷尺',
      description: '5米钢卷尺，工程专业必备。',
      type: 'tool',
      icon: '📏',
    },

    // 可收集道具
    item_sleeping_pills: {
      id: 'item_sleeping_pills',
      name: '安眠药',
      description: '治疗噩梦和睡眠障碍的药物。可在危急时使用恢复理智，但会降低警觉度。',
      type: 'consumable',
      icon: '💊',
      usable: true,
      combinable: false,
      effects: { sanity: 10, stamina: -5 },
    },
    item_warning_flyer: {
      id: 'item_warning_flyer',
      name: '旅行警告传单',
      description: '悬云山区的旅行警告，提到近年多起失踪事件。',
      type: 'document',
      icon: '📰',
    },
    item_ticket_stub: {
      id: 'item_ticket_stub',
      name: '考古队员车票',
      description: '三年前的车票存根，乘客姓李，可能是失踪考古队员。',
      type: 'document',
      icon: '🎫',
    },
    item_newspaper: {
      id: 'item_newspaper',
      name: '旧报纸剪报',
      description: '关于悬云山考古队失踪的报道。',
      type: 'document',
      icon: '📄',
    },
    item_geological_hammer: {
      id: 'item_geological_hammer',
      name: '地质锤',
      description: '陈青山车上的地质锤，用于采集岩石样本。',
      type: 'tool',
      icon: '🔨',
    },
    item_compass: {
      id: 'item_compass',
      name: '罗盘',
      description: '老式罗盘，指针在悬云山附近会有轻微偏转。',
      type: 'tool',
      icon: '🧭',
    },
    item_old_map: {
      id: 'item_old_map',
      name: '泛黄图纸',
      description: '看起来像建筑图纸，但标注的符号看不懂。',
      type: 'document',
      icon: '🗺️',
    },
    item_mozi_book: {
      id: 'item_mozi_book',
      name: '《墨子》',
      description: '陈青山带来的古籍，书签标记在"机关篇"。',
      type: 'book',
      icon: '📖',
    },
    item_climbing_gear: {
      id: 'item_climbing_gear',
      name: '登山装备',
      description: '登山鞋、羽绒服、手套、头灯、能量棒、保温毯、急救包。',
      type: 'gear',
      icon: '🎒',
      usable: true,
      effects: { stamina: 10, temperature: 2 },
    },

    // 苏晓雨的装备
    item_camera: {
      id: 'item_camera',
      name: '相机',
      description: '专业数码相机，用于记录线索。',
      type: 'tool',
      icon: '📷',
    },
    item_thermometer: {
      id: 'item_thermometer',
      name: '红外测温仪',
      description: '可测量建筑表面温度变化，可能发现异常区域。',
      type: 'tool',
      icon: '🌡️',
    },
    item_uv_light: {
      id: 'item_uv_light',
      name: '紫外线手电筒',
      description: '可发现肉眼看不见的标记或痕迹。',
      type: 'tool',
      icon: '🔦',
    },

    // 可组合的道具示例
    item_flashlight: {
      id: 'item_flashlight',
      name: '手电筒',
      description: '普通的手电筒，电池有些不足。',
      type: 'tool',
      icon: '🔦',
      usable: true,
      combinable: true,
      effects: { sanity: 5 },
    },
    item_battery: {
      id: 'item_battery',
      name: '电池',
      description: '两节备用电池。',
      type: 'consumable',
      icon: '🔋',
      usable: true,
      combinable: true,
      effects: { stamina: 3 },
    },
    item_flashlight_full: {
      id: 'item_flashlight_full',
      name: '充满电的手电筒',
      description: '装上新电池的手电筒，亮度充足。',
      type: 'tool',
      icon: '🔦',
      usable: true,
      effects: { sanity: 10 },
    },

    // 能量棒
    item_energy_bar: {
      id: 'item_energy_bar',
      name: '能量棒',
      description: '高热量能量棒，可以快速补充体力。',
      type: 'consumable',
      icon: '🍫',
      usable: true,
      effects: { stamina: 15 },
    },

    // 暖宝宝
    item_warm_patch: {
      id: 'item_warm_patch',
      name: '暖宝宝',
      description: '一次性取暖贴，可以暂时抵御寒冷。',
      type: 'consumable',
      icon: '🧣',
      usable: true,
      combinable: true,
      effects: { temperature: 3 },
    },
    item_bandage: {
      id: 'item_bandage',
      name: '绷带',
      description: '干净的绷带，可以处理轻微伤口。',
      type: 'consumable',
      icon: '🩹',
      usable: true,
      combinable: true,
      effects: { stamina: 5 },
    },
    item_first_aid_kit: {
      id: 'item_first_aid_kit',
      name: '急救包',
      description: '完整的急救用品，包含绷带、消毒酒精、创可贴等。',
      type: 'gear',
      icon: '🧰',
      usable: true,
      effects: { stamina: 20, sanity: 5 },
    },
  },

  // ========== 道具组合配方 ==========
  itemRecipes: [
    {
      id: 'recipe_flashlight',
      ingredients: ['item_flashlight', 'item_battery'],
      resultId: 'item_flashlight_full',
      resultName: '充满电的手电筒',
    },
    {
      id: 'recipe_first_aid',
      ingredients: ['item_bandage', 'item_warm_patch'],
      resultId: 'item_first_aid_kit',
      resultName: '急救包',
    },
  ],

  // ========== 线索定义 ==========
  clues: {
    clue_geology_report: {
      id: 'clue_geology_report',
      name: '地质矛盾',
      category: '科学',
      description: '悬云山岩层异常稳定，地震记录为零。但当地传说有"地动"现象。这是矛盾。',
    },
    clue_calculation: {
      id: 'clue_calculation',
      name: '不可能的结构',
      category: '科学',
      description: '悬挑结构承重模拟显示"不可能支撑"，可能需要特殊材料或机关辅助。',
    },
    clue_dream_doodle: {
      id: 'clue_dream_doodle',
      name: '梦境图案',
      category: '神秘',
      description: '类似八卦但不对称，缺少"乾"位的几何图案。可能与墨家机关阵图有关。',
    },
    clue_chat_anomaly: {
      id: 'clue_chat_anomaly',
      name: '回复异常',
      category: '人物',
      description: '陈青山最近一周的回复间隔越来越长，从几小时到一天。',
    },
    clue_ancient_knowledge: {
      id: 'clue_ancient_knowledge',
      name: '古籍知识',
      category: '知识',
      description: '《墨子》机关篇、《考工记》匠人营国。可能为后续解谜提供加成。',
    },
    clue_billboard: {
      id: 'clue_billboard',
      name: '模糊的广告',
      category: '神秘',
      description: '广告牌图片被故意处理，模糊建筑细节。',
    },
    clue_time_anomaly: {
      id: 'clue_time_anomaly',
      name: '时间异常',
      category: '神秘',
      description: '候车厅时钟比标准时间快3秒/分钟，修了好几次都没用。可能与道观机关有关。',
    },
    clue_mountain_structure: {
      id: 'clue_mountain_structure',
      name: '人工痕迹',
      category: '科学',
      description: '山体出现规则的几何切割痕迹，岩层呈现不自然的平行纹理。',
    },
    clue_cut_stones: {
      id: 'clue_cut_stones',
      name: '切割痕迹',
      category: '科学',
      description: '落石断面有规则的锯齿状痕迹，像是被巨大齿轮切割。',
    },
    clue_bell_rhythm: {
      id: 'clue_bell_rhythm',
      name: '三短两长',
      category: '神秘',
      description: '铃铛声、冰雹声、钟声都遵循"三短两长"的节奏模式。这是某种信号？',
    },
    clue_plank_mechanism: {
      id: 'clue_plank_mechanism',
      name: '活动栈道',
      category: '机关',
      description: '栈道承重结构异常，部分支撑点可以移动。支撑柱上有齿轮结构。',
    },
    clue_temple_structure: {
      id: 'clue_temple_structure',
      name: '悬空建筑',
      category: '科学',
      description: '主体建筑悬空伸出崖外二十余米，仅靠八根石柱支撑。违反力学原理。',
    },
    clue_bell_pattern: {
      id: 'clue_bell_pattern',
      name: '钟声密码',
      category: '神秘',
      description: '钟声遵循"三长两短"的规律，与之前的铃铛声、冰雹声一致。',
    },
    clue_lion_keyhole: {
      id: 'clue_lion_keyhole',
      name: '石狮机关',
      category: '机关',
      description: '石狮瞳孔处有小孔，可能是某种机关的钥匙孔。',
    },
    clue_elder_warning: {
      id: 'clue_elder_warning',
      name: '老人警告',
      category: '人物',
      description: '那观里的钟自己会响，里面的道士不是人。三年前考古的人再也没出来。',
    },
    clue_chen_avoidance: {
      id: 'clue_chen_avoidance',
      name: '陈青山的回避',
      category: '人物',
      description: '提到考古队失踪时，陈青山表情明显僵硬，话题回避。',
    },
  },

  // ========== 任务定义 ==========
  quests: [
    {
      id: 'quest_preparation',
      name: '启程准备',
      description: '整理装备，准备前往悬云山',
      type: 'main',
      steps: [
        { id: 'step1', description: '检查宿舍物品', completed: false },
        { id: 'step2', description: '整理登山包', completed: false, trigger: 'interaction:backpack' },
        { id: 'step3', description: '与苏晓雨会合', completed: false, trigger: 'location:subway' },
      ],
      rewards: {
        items: ['item_level', 'item_notebook', 'item_keychain', 'item_tape_measure'],
      },
    },
    {
      id: 'quest_journey',
      name: '风雪之路',
      description: '前往悬云观的旅程充满异常',
      type: 'main',
      steps: [
        { id: 'step1', description: '发现车站异常', completed: false, trigger: 'event:event_screen_glitch' },
        { id: 'step2', description: '与陈青山会合', completed: false, trigger: 'location:county_station' },
        { id: 'step3', description: '通过滑坡路段', completed: false, trigger: 'location:avalanche' },
        { id: 'step4', description: '穿越悬崖栈道', completed: false, trigger: 'location:plank_road' },
      ],
    },
    {
      id: 'quest_arrival',
      name: '道观初现',
      description: '终于到达悬云观',
      type: 'main',
      steps: [
        { id: 'step1', description: '在山脊看到道观', completed: false, trigger: 'location:temple_view' },
        { id: 'step2', description: '调查山门石狮', completed: false, trigger: 'interaction:stone_lion_left' },
        { id: 'step3', description: '进入道观', completed: false, trigger: 'location:courtyard' },
      ],
      rewards: {
        nextChapter: 2,
      },
    },
    {
      id: 'quest_rhythm_mystery',
      name: '节奏之谜',
      description: '解开"三短两长"节奏的含义',
      type: 'side',
      steps: [
        { id: 'step1', description: '记录铃铛声节奏', completed: false, trigger: 'clue:clue_bell_rhythm' },
        { id: 'step2', description: '发现冰雹节奏', completed: false, trigger: 'clue:clue_hail_rhythm' },
        { id: 'step3', description: '听到道观钟声', completed: false, trigger: 'clue:clue_bell_pattern' },
      ],
    },
  ],

  // ========== 事件定义 ==========
  events: {
    event_screen_glitch: {
      id: 'event_screen_glitch',
      name: '电子屏异常',
      description: '候车厅所有屏幕同时显示："悬云观—未开通—错误代码：404-机关阵"',
      type: 'supernatural',
      once: true,
      effects: { sanity: -10, intuition: 5 },
      clueId: 'clue_digital_anomaly',
    },
    chapter1_complete: {
      id: 'chapter1_complete',
      name: '第一章完成',
      description: '你终于到达了悬云观，但这只是开始...',
      type: 'milestone',
      nextChapter: 2,
    },
  },
};

export default chapter1Data;
