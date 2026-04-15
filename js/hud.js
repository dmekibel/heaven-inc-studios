import { GAME_W, COLORS, ROOM_OFFSET_X, ROOM_OFFSET_Y, TILE, ROOM_COLS, ROOM_ROWS, FLOOR_GRID } from './constants.js';

export class HUD {
    constructor() {
        this.messageText = '';
        this.messageTimer = 0;
        this.messageColor = COLORS.textWhite;
    }

    showMessage(text, color = COLORS.textWhite, duration = 120) {
        this.messageText = text;
        this.messageTimer = duration;
        this.messageColor = color;
    }

    update() {
        if (this.messageTimer > 0) this.messageTimer--;
    }

    draw(renderer, player, floor) {
        // Health hearts
        const heartsPerRow = Math.ceil(player.maxHp / 2);
        for (let i = 0; i < heartsPerRow; i++) {
            const full = player.hp >= (i + 1) * 2;
            const half = !full && player.hp >= i * 2 + 1;
            renderer.heart(4 + i * 9, 4, full || half);
            if (half) {
                // Half heart - draw right half empty
                renderer.rect(4 + i * 9 + 4, 4, 4, 6, COLORS.heartEmpty);
            }
        }

        // Shield indicator
        if (player.shield > 0) {
            renderer.text('SHIELD:' + player.shield, 4, 14, COLORS.uiTeal, 1);
        }

        // Floor number
        renderer.text('FLOOR ' + floor.floorNum, GAME_W - 40, 4, COLORS.textGold, 1);

        // Halo count (currency)
        renderer.circle(GAME_W - 52, 7, 3, COLORS.gold);
        renderer.text('' + player.halos, GAME_W - 46, 4, COLORS.textGold, 1);

        // Minimap
        this.drawMinimap(renderer, floor);

        // Item pickup message
        if (this.messageTimer > 0) {
            const alpha = this.messageTimer < 30 ? this.messageTimer / 30 : 1;
            renderer.ctx.globalAlpha = alpha;
            renderer.centeredText(this.messageText, ROOM_OFFSET_Y + (ROOM_ROWS + 2) * TILE + 6, this.messageColor, 1);
            renderer.ctx.globalAlpha = 1;
        }
    }

    drawMinimap(renderer, floor) {
        const mapSize = 4; // pixels per room
        const mapGap = 1;
        const mapW = FLOOR_GRID * (mapSize + mapGap);
        const mapX = GAME_W - mapW - 4;
        const mapY = 16;

        // Background
        renderer.rect(mapX - 2, mapY - 2, mapW + 4, mapW + 4, 'rgba(0,0,0,0.5)');

        for (let gy = 0; gy < FLOOR_GRID; gy++) {
            for (let gx = 0; gx < FLOOR_GRID; gx++) {
                const room = floor.grid[gy][gx];
                if (!room) continue;
                if (!room.visited) continue;

                const rx = mapX + gx * (mapSize + mapGap);
                const ry = mapY + gy * (mapSize + mapGap);

                let color = COLORS.heavenLight;
                if (room.type === 'boss') color = COLORS.uiRed;
                else if (room.type === 'item') color = COLORS.textGold;
                else if (room.type === 'shop') color = COLORS.uiGreen;

                // Current room indicator
                if (gx === floor.currentX && gy === floor.currentY) {
                    renderer.rect(rx - 1, ry - 1, mapSize + 2, mapSize + 2, COLORS.textWhite);
                }

                renderer.rect(rx, ry, mapSize, mapSize, color);

                if (!room.cleared && room.type !== 'start') {
                    renderer.rect(rx + 1, ry + 1, 2, 2, '#000');
                }
            }
        }
    }
}
