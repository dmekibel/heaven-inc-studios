import { ITEM_DEFS, COLORS, ROOM_OFFSET_X, ROOM_OFFSET_Y, TILE, ROOM_COLS, ROOM_ROWS } from './constants.js';
import { makeItemSprite } from './sprites.js';

export class ItemPickup {
    constructor(itemDef, x, y) {
        this.def = itemDef;
        this.x = x;
        this.y = y;
        this.w = 10;
        this.h = 10;
        this.picked = false;
        this.bobTimer = Math.random() * Math.PI * 2;
        this.sprite = makeItemSprite(itemDef.color);
        this.showName = false;
        this.nameTimer = 0;
    }

    update() {
        this.bobTimer += 0.05;
        if (this.nameTimer > 0) this.nameTimer--;
    }

    collidesPlayer(player) {
        const dx = this.x - player.x;
        const dy = (this.y + Math.sin(this.bobTimer) * 2) - player.y;
        return Math.sqrt(dx * dx + dy * dy) < 14;
    }

    draw(renderer) {
        if (this.picked) return;

        const drawY = this.y + Math.sin(this.bobTimer) * 2;

        // Glow
        renderer.ctx.globalAlpha = 0.3 + Math.sin(this.bobTimer * 2) * 0.1;
        renderer.circle(this.x, drawY, 8, COLORS.itemGlow);
        renderer.ctx.globalAlpha = 1;

        // Item sprite
        renderer.sprite(this.sprite, this.x - 5, drawY - 5);

        // Name popup
        if (this.showName && this.nameTimer > 0) {
            const name = this.def.name;
            const desc = this.def.desc;
            const nameW = renderer.textWidth(name, 1);
            const descW = renderer.textWidth(desc, 1);
            const maxW = Math.max(nameW, descW);

            renderer.rect(this.x - maxW / 2 - 2, this.y - 26, maxW + 4, 16, 'rgba(0,0,0,0.8)');
            renderer.text(name, this.x - nameW / 2, this.y - 24, COLORS.textGold, 1);
            renderer.text(desc, this.x - descW / 2, this.y - 16, COLORS.textWhite, 1);
        }
    }
}

export function getRandomItem(exclude = []) {
    const available = ITEM_DEFS.filter(item => !exclude.includes(item.id));
    return available[Math.floor(Math.random() * available.length)];
}

export function createRoomItem(room) {
    const midX = ROOM_OFFSET_X + (ROOM_COLS + 2) * TILE / 2;
    const midY = ROOM_OFFSET_Y + (ROOM_ROWS + 2) * TILE / 2 - 4;
    const itemDef = getRandomItem();
    const item = new ItemPickup(itemDef, midX, midY);
    room.item = item;
    return item;
}
