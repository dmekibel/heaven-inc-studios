// Game dimensions (internal resolution - scaled up for pixel art)
export const GAME_W = 320;
export const GAME_H = 240;
export const TILE = 16;
export const PIXEL = 1;

// Room dimensions in tiles
export const ROOM_COLS = 15;  // 15 * 16 = 240 pixels wide (+ walls)
export const ROOM_ROWS = 9;  // 9 * 16 = 144 pixels tall (+ walls)
export const ROOM_W = (ROOM_COLS + 2) * TILE; // 272
export const ROOM_H = (ROOM_ROWS + 2) * TILE; // 176
export const ROOM_OFFSET_X = (GAME_W - ROOM_W) / 2;
export const ROOM_OFFSET_Y = 40; // Leave room for HUD at top

// Floor grid
export const FLOOR_GRID = 5; // 5x5 grid of possible rooms

// Player
export const PLAYER_SIZE = 14;
export const PLAYER_SPEED = 1.8;
export const PLAYER_MAX_HP = 6; // 3 full hearts (2 HP each)
export const PLAYER_IFRAMES = 60; // invincibility frames after hit
export const PLAYER_FIRE_RATE = 18; // frames between shots
export const PLAYER_SHOT_SPEED = 3.5;
export const PLAYER_SHOT_RANGE = 140;
export const PLAYER_SHOT_DAMAGE = 1;
export const PLAYER_SHOT_SIZE = 6;

// Enemies
export const ENEMY_SIZES = {
    imp: 12,
    hellfire: 14,
    dasher: 12,
    splitter: 14,
    splitterSmall: 8,
    teleporter: 12,
    tank: 18
};

export const ENEMY_HP = {
    imp: 2,
    hellfire: 3,
    dasher: 2,
    splitter: 3,
    splitterSmall: 1,
    teleporter: 2,
    tank: 6
};

export const ENEMY_SPEED = {
    imp: 0.6,
    hellfire: 0.4,
    dasher: 0.3,
    dasherCharge: 3.5,
    splitter: 0.5,
    splitterSmall: 0.8,
    teleporter: 0.5,
    tank: 0.3
};

export const ENEMY_DAMAGE = {
    imp: 1,
    hellfire: 1,
    dasher: 1,
    splitter: 1,
    splitterSmall: 1,
    teleporter: 1,
    tank: 2
};

// Colors - Dexter's Lab + Fairly Odd Parents palette
export const COLORS = {
    // Background / Heaven
    bg: '#1a1a2e',
    heavenLight: '#F0E6FF',
    heavenMid: '#B388FF',
    heavenDark: '#7C4DFF',
    gold: '#FFD700',
    skyBlue: '#87CEEB',

    // Player
    playerBody: '#FFFFFF',
    playerWings: '#87CEEB',
    playerHalo: '#FFD700',
    playerEyes: '#2C2C54',

    // Enemies
    demonRed: '#FF1744',
    demonPink: '#FF1493',
    demonOrange: '#FF6B35',
    demonPurple: '#6B3FA0',
    demonDarkRed: '#8B0000',
    demonGreen: '#76FF03',

    // Office / Room
    wallOuter: '#2C2C54',
    wallInner: '#4A4A7A',
    floor: '#E8E0F0',
    floorTile: '#D8D0E4',
    floorAccent: '#C8B8D8',
    door: '#FFD700',
    doorLocked: '#8B8B8B',
    obstacle: '#9E9E9E',

    // UI
    uiGreen: '#00C853',
    uiTeal: '#00BCD4',
    uiPink: '#FF6B9D',
    uiRed: '#FF1744',
    heartFull: '#FF1744',
    heartEmpty: '#4A4A4A',
    textWhite: '#FFFFFF',
    textGold: '#FFD700',

    // Items
    itemGlow: '#FFD700',
    itemBg: '#B388FF',

    // Particles
    particleHit: '#FFEB3B',
    particleDeath: '#FF1493',
    particleHeal: '#00C853',
};

// Room types
export const ROOM_TYPES = {
    START: 'start',
    NORMAL: 'normal',
    ITEM: 'item',
    BOSS: 'boss',
    SHOP: 'shop'
};

// Game states
export const STATES = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    ROOM_TRANSITION: 'transition',
    GAME_OVER: 'gameover',
    WIN: 'win'
};

// Enemy spawn tables per floor
export const FLOOR_ENEMIES = {
    1: ['imp', 'imp', 'imp', 'hellfire', 'dasher'],
    2: ['imp', 'hellfire', 'hellfire', 'dasher', 'splitter', 'teleporter'],
    3: ['hellfire', 'dasher', 'splitter', 'teleporter', 'tank', 'tank']
};

// Items
export const ITEM_DEFS = [
    { id: 'golden_stapler', name: 'Golden Stapler', desc: 'Damage Up', stat: 'damage', value: 0.5, color: '#FFD700' },
    { id: 'holy_coffee', name: 'Holy Coffee', desc: 'Speed Up', stat: 'speed', value: 0.3, color: '#8B4513' },
    { id: 'blessed_memo', name: 'Blessed Memo', desc: 'Fire Rate Up', stat: 'fireRate', value: -3, color: '#FFFFFF' },
    { id: 'angel_spreadsheet', name: "Angel's Spreadsheet", desc: 'Range Up', stat: 'range', value: 30, color: '#00C853' },
    { id: 'sacred_lanyard', name: 'Sacred Lanyard', desc: 'HP Up', stat: 'maxHp', value: 2, color: '#FF6B9D' },
    { id: 'divine_pen', name: 'Divine Pen', desc: 'Shot Size Up', stat: 'shotSize', value: 2, color: '#4A90D9' },
    { id: 'heavenly_mug', name: 'Heavenly Mug', desc: 'Full Heal', stat: 'heal', value: 999, color: '#87CEEB' },
    { id: 'cloud_shoes', name: 'Cloud Shoes', desc: 'Speed Up+', stat: 'speed', value: 0.5, color: '#E0E0E0' },
    { id: 'harp_strings', name: 'Harp Strings', desc: 'Triple Shot', stat: 'tripleShot', value: 1, color: '#B388FF' },
    { id: 'prayer_book', name: 'Prayer Book', desc: 'Damage Up+', stat: 'damage', value: 1, color: '#6B3FA0' },
    { id: 'office_badge', name: 'Office Badge', desc: 'Shield (1 hit)', stat: 'shield', value: 1, color: '#00BCD4' },
    { id: 'corner_office', name: 'Corner Office Key', desc: 'Piercing Shots', stat: 'piercing', value: 1, color: '#FF6B35' },
];
