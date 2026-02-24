/**
 * 游戏常量定义
 */

// 交互类型常量
export const INTERACTIVE_TYPES = {
    EXAMINE: 'examine',
    COLLECT: 'collect',
    CLUE: 'clue',
    DANGER: 'danger',
    NPC: 'npc',
    INTERACT: 'interact',
    LOCATION: 'location'
};

// 交互动作类型
export const ACTION_TYPES = {
    EXAMINE: 'examine',
    TAKE_ITEM: 'take_item',
    READ_MESSAGE: 'read_message',
    TALK: 'talk',
    USE: 'use',
    COMBINE: 'combine',
    DROP: 'drop'
};

// 颜色标注类名
export const COLOR_CLASSES = {
    INTERACTABLE: 'interactable',
    IMPORTANT: 'important',
    DANGER: 'danger',
    CLUE: 'clue',
    ITEM: 'item',
    NPC: 'npc',
    LOCATION: 'location'
};

// 颜色映射
export const COLOR_MAPPING = {
    [INTERACTIVE_TYPES.EXAMINE]: COLOR_CLASSES.INTERACTABLE,
    [INTERACTIVE_TYPES.COLLECT]: COLOR_CLASSES.ITEM,
    [INTERACTIVE_TYPES.CLUE]: COLOR_CLASSES.CLUE,
    [INTERACTIVE_TYPES.DANGER]: COLOR_CLASSES.DANGER,
    [INTERACTIVE_TYPES.NPC]: COLOR_CLASSES.NPC,
    [INTERACTIVE_TYPES.INTERACT]: COLOR_CLASSES.INTERACTABLE,
    [INTERACTIVE_TYPES.LOCATION]: COLOR_CLASSES.LOCATION
};

// 方向常量
export const DIRECTIONS = {
    NORTH: 'north',
    SOUTH: 'south',
    EAST: 'east',
    WEST: 'west',
    UP: 'up',
    DOWN: 'down',
    IN: 'in',
    OUT: 'out',
    LEAVE: 'leave',
    ENTER: 'enter'
};

// 方向显示名称
export const DIRECTION_DISPLAY_NAMES = {
    [DIRECTIONS.NORTH]: '北',
    [DIRECTIONS.SOUTH]: '南',
    [DIRECTIONS.EAST]: '东',
    [DIRECTIONS.WEST]: '西',
    [DIRECTIONS.UP]: '上',
    [DIRECTIONS.DOWN]: '下',
    [DIRECTIONS.IN]: '进入',
    [DIRECTIONS.OUT]: '离开',
    [DIRECTIONS.LEAVE]: '离开',
    [DIRECTIONS.ENTER]: '进入'
};

// 道具类型
export const ITEM_TYPES = {
    KEY: 'key',
    TOOL: 'tool',
    CLUE: 'clue',
    CONSUMABLE: 'consumable',
    COMBINABLE: 'combinable',
    QUEST: 'quest'
};

// 任务状态
export const QUEST_STATES = {
    NOT_STARTED: 'not_started',
    ACTIVE: 'active',
    COMPLETED: 'completed',
    FAILED: 'failed'
};

// 决策风险等级
export const RISK_LEVELS = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high'
};

// 决策风险等级显示文本
export const RISK_LEVEL_TEXTS = {
    [RISK_LEVELS.LOW]: '低风险',
    [RISK_LEVELS.MEDIUM]: '中风险',
    [RISK_LEVELS.HIGH]: '高风险'
};

// 默认游戏配置
export const DEFAULT_CONFIG = {
    MAX_INVENTORY_SLOTS: 12,
    MOVE_STAMINA_COST: 5,
    INTERACTION_STAMINA_COST: 3,
    MOVE_TIME_COST: 5, // 分钟
    INTERACTION_TIME_COST: 3, // 分钟
    DEFAULT_STAMINA: 100,
    DEFAULT_SANITY: 100,
    DEFAULT_TEMPERATURE: 37.0,
    NORMAL_TEMPERATURE_RANGE: [36, 38]
};