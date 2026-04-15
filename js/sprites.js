import { COLORS } from './constants.js';

const C = COLORS;
const _ = null; // transparent

// Helper to create sprite data
function spr(width, height, pixels) {
    return { width, height, pixels };
}

// ==================== PLAYER (Angel) ====================
// 14x14 angel character - 2 animation frames

export const PLAYER_SPRITES = {
    idle: [
        // Frame 1
        spr(14, 14, [
            _,_,_,_,_,C.playerHalo,C.playerHalo,C.playerHalo,C.playerHalo,_,_,_,_,_,
            _,_,_,_,_,_,C.playerHalo,C.playerHalo,_,_,_,_,_,_,
            _,_,_,_,C.playerBody,C.playerBody,C.playerBody,C.playerBody,C.playerBody,C.playerBody,_,_,_,_,
            _,_,_,C.playerBody,C.playerBody,C.playerBody,C.playerBody,C.playerBody,C.playerBody,C.playerBody,C.playerBody,_,_,_,
            _,_,_,C.playerBody,C.playerBody,C.playerEyes,C.playerBody,C.playerBody,C.playerEyes,C.playerBody,C.playerBody,_,_,_,
            _,_,_,C.playerBody,C.playerBody,C.playerEyes,C.playerBody,C.playerBody,C.playerEyes,C.playerBody,C.playerBody,_,_,_,
            _,_,_,_,C.playerBody,C.playerBody,C.playerBody,C.playerBody,C.playerBody,C.playerBody,_,_,_,_,
            _,C.playerWings,C.playerWings,_,_,C.playerBody,C.playerBody,C.playerBody,C.playerBody,_,_,C.playerWings,C.playerWings,_,
            C.playerWings,C.playerWings,C.playerWings,_,C.playerBody,C.playerBody,C.playerBody,C.playerBody,C.playerBody,C.playerBody,_,C.playerWings,C.playerWings,C.playerWings,
            _,C.playerWings,_,_,C.playerBody,C.playerBody,C.playerBody,C.playerBody,C.playerBody,C.playerBody,_,_,C.playerWings,_,
            _,_,_,_,C.playerBody,C.playerBody,C.playerBody,C.playerBody,C.playerBody,C.playerBody,_,_,_,_,
            _,_,_,_,_,C.playerBody,C.playerBody,C.playerBody,C.playerBody,_,_,_,_,_,
            _,_,_,_,C.playerBody,C.playerBody,_,_,C.playerBody,C.playerBody,_,_,_,_,
            _,_,_,_,C.playerBody,C.playerBody,_,_,C.playerBody,C.playerBody,_,_,_,_,
        ]),
        // Frame 2 - wings up
        spr(14, 14, [
            _,_,_,_,_,C.playerHalo,C.playerHalo,C.playerHalo,C.playerHalo,_,_,_,_,_,
            _,_,_,_,_,_,C.playerHalo,C.playerHalo,_,_,_,_,_,_,
            _,_,_,_,C.playerBody,C.playerBody,C.playerBody,C.playerBody,C.playerBody,C.playerBody,_,_,_,_,
            _,_,_,C.playerBody,C.playerBody,C.playerBody,C.playerBody,C.playerBody,C.playerBody,C.playerBody,C.playerBody,_,_,_,
            _,_,_,C.playerBody,C.playerBody,C.playerEyes,C.playerBody,C.playerBody,C.playerEyes,C.playerBody,C.playerBody,_,_,_,
            _,_,_,C.playerBody,C.playerBody,C.playerEyes,C.playerBody,C.playerBody,C.playerEyes,C.playerBody,C.playerBody,_,_,_,
            _,C.playerWings,_,_,C.playerBody,C.playerBody,C.playerBody,C.playerBody,C.playerBody,C.playerBody,_,_,C.playerWings,_,
            C.playerWings,C.playerWings,C.playerWings,_,_,C.playerBody,C.playerBody,C.playerBody,C.playerBody,_,_,C.playerWings,C.playerWings,C.playerWings,
            _,C.playerWings,C.playerWings,_,C.playerBody,C.playerBody,C.playerBody,C.playerBody,C.playerBody,C.playerBody,_,C.playerWings,C.playerWings,_,
            _,_,_,_,C.playerBody,C.playerBody,C.playerBody,C.playerBody,C.playerBody,C.playerBody,_,_,_,_,
            _,_,_,_,C.playerBody,C.playerBody,C.playerBody,C.playerBody,C.playerBody,C.playerBody,_,_,_,_,
            _,_,_,_,_,C.playerBody,C.playerBody,C.playerBody,C.playerBody,_,_,_,_,_,
            _,_,_,_,C.playerBody,C.playerBody,_,_,C.playerBody,C.playerBody,_,_,_,_,
            _,_,_,_,C.playerBody,C.playerBody,_,_,C.playerBody,C.playerBody,_,_,_,_,
        ]),
    ],
};

// ==================== ENEMIES ====================

export const ENEMY_SPRITES = {
    imp: [
        spr(12, 12, [
            _,_,_,_,C.demonRed,C.demonRed,C.demonRed,C.demonRed,_,_,_,_,
            _,_,_,C.demonRed,C.demonRed,C.demonRed,C.demonRed,C.demonRed,C.demonRed,_,_,_,
            _,_,C.demonRed,C.demonRed,C.demonRed,C.demonRed,C.demonRed,C.demonRed,C.demonRed,C.demonRed,_,_,
            _,C.demonRed,C.demonRed,C.demonRed,'#FFFFFF',C.demonRed,C.demonRed,'#FFFFFF',C.demonRed,C.demonRed,C.demonRed,_,
            _,C.demonRed,C.demonRed,C.demonRed,'#FFFFFF',C.demonRed,C.demonRed,'#FFFFFF',C.demonRed,C.demonRed,C.demonRed,_,
            _,_,C.demonRed,C.demonRed,C.demonRed,C.demonRed,C.demonRed,C.demonRed,C.demonRed,C.demonRed,_,_,
            _,_,C.demonRed,C.demonRed,C.demonRed,'#FFFFFF','#FFFFFF',C.demonRed,C.demonRed,C.demonRed,_,_,
            _,_,_,C.demonRed,C.demonRed,C.demonRed,C.demonRed,C.demonRed,C.demonRed,_,_,_,
            _,_,_,C.demonRed,C.demonRed,C.demonRed,C.demonRed,C.demonRed,C.demonRed,_,_,_,
            _,_,_,_,C.demonRed,_,_,C.demonRed,_,_,_,_,
            _,_,_,_,C.demonRed,_,_,C.demonRed,_,_,_,_,
            _,_,_,C.demonRed,_,_,_,_,C.demonRed,_,_,_,
        ]),
    ],

    hellfire: [
        spr(14, 14, [
            _,_,C.demonOrange,_,_,_,_,_,_,_,_,C.demonOrange,_,_,
            _,_,C.demonOrange,_,_,_,_,_,_,_,_,C.demonOrange,_,_,
            _,_,_,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,_,_,_,
            _,_,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,_,_,
            _,C.demonOrange,C.demonOrange,C.demonOrange,'#FFD700',C.demonOrange,C.demonOrange,C.demonOrange,'#FFD700',C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,_,
            _,C.demonOrange,C.demonOrange,C.demonOrange,'#FFD700',C.demonOrange,C.demonOrange,C.demonOrange,'#FFD700',C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,_,
            _,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,_,
            _,_,C.demonOrange,C.demonOrange,C.demonOrange,'#FF0000','#FF0000','#FF0000','#FF0000',C.demonOrange,C.demonOrange,C.demonOrange,_,_,
            _,_,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,_,_,
            _,_,_,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,_,_,_,
            _,_,_,_,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,C.demonOrange,_,_,_,_,
            _,_,_,_,C.demonOrange,_,_,_,_,C.demonOrange,_,_,_,_,
            _,_,_,C.demonOrange,_,_,_,_,_,_,C.demonOrange,_,_,_,
            _,_,C.demonOrange,_,_,_,_,_,_,_,_,C.demonOrange,_,_,
        ]),
    ],

    dasher: [
        spr(12, 12, [
            _,_,_,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,_,_,_,
            _,_,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,_,_,
            _,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,_,
            C.demonPink,C.demonPink,C.demonPink,'#FFFFFF','#FFFFFF',C.demonPink,C.demonPink,'#FFFFFF','#FFFFFF',C.demonPink,C.demonPink,C.demonPink,
            C.demonPink,C.demonPink,C.demonPink,'#FFFFFF','#FFFFFF',C.demonPink,C.demonPink,'#FFFFFF','#FFFFFF',C.demonPink,C.demonPink,C.demonPink,
            _,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,_,
            _,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,_,
            _,_,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,_,_,
            _,_,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,C.demonPink,_,_,
            _,_,_,C.demonPink,C.demonPink,_,_,C.demonPink,C.demonPink,_,_,_,
            _,_,_,C.demonPink,C.demonPink,_,_,C.demonPink,C.demonPink,_,_,_,
            _,_,C.demonPink,C.demonPink,_,_,_,_,C.demonPink,C.demonPink,_,_,
        ]),
    ],

    splitter: [
        spr(14, 14, [
            _,_,_,_,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,_,_,_,_,
            _,_,_,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,_,_,_,
            _,_,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,_,_,
            _,C.demonPurple,C.demonPurple,C.demonPurple,'#FF69B4',C.demonPurple,C.demonPurple,C.demonPurple,'#FF69B4',C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,_,
            _,C.demonPurple,C.demonPurple,C.demonPurple,'#FF69B4',C.demonPurple,C.demonPurple,C.demonPurple,'#FF69B4',C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,_,
            _,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,_,
            _,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,_,
            _,_,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,'#9C27B0',C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,_,_,
            _,_,C.demonPurple,C.demonPurple,C.demonPurple,'#9C27B0',_,'#9C27B0',C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,_,_,
            _,_,_,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,_,_,_,
            _,_,_,_,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,_,_,_,_,
            _,_,_,_,_,C.demonPurple,C.demonPurple,C.demonPurple,C.demonPurple,_,_,_,_,_,
            _,_,_,_,C.demonPurple,_,_,_,_,C.demonPurple,_,_,_,_,
            _,_,_,C.demonPurple,_,_,_,_,_,_,C.demonPurple,_,_,_,
        ]),
    ],

    teleporter: [
        spr(12, 12, [
            _,_,C.demonGreen,C.demonGreen,_,_,_,_,C.demonGreen,C.demonGreen,_,_,
            _,C.demonGreen,_,_,C.demonGreen,C.demonGreen,C.demonGreen,C.demonGreen,_,_,C.demonGreen,_,
            _,_,_,C.demonGreen,C.demonGreen,C.demonGreen,C.demonGreen,C.demonGreen,C.demonGreen,_,_,_,
            _,_,C.demonGreen,C.demonGreen,'#FFFFFF',C.demonGreen,C.demonGreen,'#FFFFFF',C.demonGreen,C.demonGreen,_,_,
            _,_,C.demonGreen,C.demonGreen,'#FFFFFF',C.demonGreen,C.demonGreen,'#FFFFFF',C.demonGreen,C.demonGreen,_,_,
            _,_,C.demonGreen,C.demonGreen,C.demonGreen,C.demonGreen,C.demonGreen,C.demonGreen,C.demonGreen,C.demonGreen,_,_,
            _,_,_,C.demonGreen,C.demonGreen,C.demonGreen,C.demonGreen,C.demonGreen,C.demonGreen,_,_,_,
            _,_,_,C.demonGreen,C.demonGreen,C.demonGreen,C.demonGreen,C.demonGreen,C.demonGreen,_,_,_,
            _,_,_,_,C.demonGreen,C.demonGreen,C.demonGreen,C.demonGreen,_,_,_,_,
            _,_,_,_,_,C.demonGreen,C.demonGreen,_,_,_,_,_,
            _,_,C.demonGreen,_,_,_,_,_,_,C.demonGreen,_,_,
            _,C.demonGreen,_,_,_,_,_,_,_,_,C.demonGreen,_,
        ]),
    ],

    tank: [
        spr(18, 18, [
            _,_,_,_,_,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,_,_,_,_,_,
            _,_,_,_,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,_,_,_,_,
            _,_,_,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,_,_,_,
            _,_,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,_,_,
            _,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,'#FF0000',C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,'#FF0000',C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,_,
            _,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,'#FF0000',C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,'#FF0000',C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,_,
            C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,
            C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,
            C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,'#FF0000','#FF0000','#FF0000','#FF0000',C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,
            C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,
            C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,
            _,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,_,
            _,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,_,
            _,_,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,_,_,
            _,_,_,C.demonDarkRed,C.demonDarkRed,_,_,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,_,_,C.demonDarkRed,C.demonDarkRed,_,_,_,
            _,_,_,C.demonDarkRed,C.demonDarkRed,_,_,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,_,_,C.demonDarkRed,C.demonDarkRed,_,_,_,
            _,_,C.demonDarkRed,C.demonDarkRed,_,_,_,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,C.demonDarkRed,_,_,_,C.demonDarkRed,C.demonDarkRed,_,_,
            _,_,C.demonDarkRed,C.demonDarkRed,_,_,_,_,_,_,_,_,_,_,C.demonDarkRed,C.demonDarkRed,_,_,
        ]),
    ],
};

// ==================== ITEMS ====================

export function makeItemSprite(color) {
    return spr(10, 10, [
        _,_,_,color,color,color,color,_,_,_,
        _,_,color,color,color,color,color,color,_,_,
        _,color,color,color,'#FFFFFF',color,color,color,color,_,
        color,color,color,'#FFFFFF','#FFFFFF',color,color,color,color,color,
        color,color,color,color,color,color,color,color,color,color,
        color,color,color,color,color,color,color,color,color,color,
        color,color,color,color,color,color,color,color,color,color,
        _,color,color,color,color,color,color,color,color,_,
        _,_,color,color,color,color,color,color,_,_,
        _,_,_,color,color,color,color,_,_,_,
    ]);
}

// ==================== PROJECTILE ====================

export const HALO_SPRITE = spr(6, 6, [
    _,C.gold,C.gold,C.gold,C.gold,_,
    C.gold,C.gold,'#FFF8DC','#FFF8DC',C.gold,C.gold,
    C.gold,'#FFF8DC',_,_,'#FFF8DC',C.gold,
    C.gold,'#FFF8DC',_,_,'#FFF8DC',C.gold,
    C.gold,C.gold,'#FFF8DC','#FFF8DC',C.gold,C.gold,
    _,C.gold,C.gold,C.gold,C.gold,_,
]);

export const FIREBALL_SPRITE = spr(6, 6, [
    _,'#FF4500','#FF4500','#FF4500','#FF4500',_,
    '#FF4500','#FF6347','#FF6347','#FF6347','#FF6347','#FF4500',
    '#FF4500','#FF6347','#FFD700','#FFD700','#FF6347','#FF4500',
    '#FF4500','#FF6347','#FFD700','#FFD700','#FF6347','#FF4500',
    '#FF4500','#FF6347','#FF6347','#FF6347','#FF6347','#FF4500',
    _,'#FF4500','#FF4500','#FF4500','#FF4500',_,
]);

// ==================== BOSS SPRITES ====================

export const BOSS_SPRITES = {
    // Floor 1: Middle Manager of Hell
    manager: [
        spr(20, 20, (() => {
            const s = new Array(400).fill(C.demonRed);
            // Eyes
            [64,65,68,69, 84,85,88,89].forEach(i => s[i] = '#FFD700');
            // Mouth
            [126,127,128,129,130,131,132,133].forEach(i => s[i] = '#FFFFFF');
            // Tie
            [149,150,169,170,189,190,209,210,229,230].forEach(i => s[i] = '#2C2C54');
            // Horns
            [1,2,17,18].forEach(i => s[i] = '#4A0000');
            [17,18,37,38].forEach(i => s[i] = '#4A0000');
            // Transparent edges
            [0,19,380,399].forEach(i => s[i] = null);
            // Legs
            for(let i=360;i<400;i++) s[i] = null;
            [361,362,365,366,373,374,377,378].forEach(i => s[i] = C.demonRed);
            return s;
        })()),
    ],

    // Floor 2: VP of Damnation
    vp: [
        spr(22, 22, (() => {
            const s = new Array(484).fill(C.demonPurple);
            // Eyes - glowing
            [93,94,99,100, 115,116,121,122].forEach(i => s[i] = '#00FF00');
            // Crown
            [1,3,5,7,9,23,25,27,29,31].forEach(i => s[i] = '#FFD700');
            // Robe bottom
            for(let i=396;i<484;i++) s[i] = '#4A0060';
            // Transparent edges
            [0,21,462,483].forEach(i => s[i] = null);
            return s;
        })()),
    ],

    // Floor 3: CEO of the Underworld
    ceo: [
        spr(24, 24, (() => {
            const s = new Array(576).fill('#2C0000');
            // Core body lighter
            for(let y=4;y<20;y++) for(let x=4;x<20;x++) s[y*24+x] = C.demonDarkRed;
            // Eyes - large and menacing
            [124,125,126,130,131,132, 148,149,150,154,155,156].forEach(i => s[i] = '#FF0000');
            // Pupils
            [125,131,149,155].forEach(i => s[i] = '#FFD700');
            // Mouth/teeth
            [196,197,198,199,200,201,202,203].forEach(i => s[i] = '#FFFFFF');
            [220,222,224,226].forEach(i => s[i] = '#FFFFFF');
            // Crown of fire
            for(let x=6;x<18;x++) { s[x] = '#FF4500'; s[24+x] = '#FF6347'; }
            [6,9,14,17].forEach(i => { s[i] = '#FFD700'; });
            // Suit
            for(let y=14;y<22;y++) { s[y*24+11] = '#2C2C54'; s[y*24+12] = '#2C2C54'; }
            // Transparent corners
            [0,23,552,575].forEach(i => s[i] = null);
            return s;
        })()),
    ],
};
