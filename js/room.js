import { TILE, ROOM_COLS, ROOM_ROWS, ROOM_OFFSET_X, ROOM_OFFSET_Y, COLORS, ROOM_TYPES } from './constants.js';

export class Room {
    constructor(type, gridX, gridY) {
        this.type = type;
        this.gridX = gridX;
        this.gridY = gridY;
        this.cleared = type === ROOM_TYPES.START;
        this.visited = type === ROOM_TYPES.START;
        this.doors = { up: false, down: false, left: false, right: false };
        this.obstacles = []; // {x, y} in tile coords (relative to room interior)
        this.enemies = [];
        this.item = null;
        this.doorsOpen = type === ROOM_TYPES.START;

        if (type === ROOM_TYPES.NORMAL) {
            this.generateObstacles();
        }
    }

    generateObstacles() {
        // Random office obstacles (desks, filing cabinets, etc)
        const count = Math.floor(Math.random() * 4) + 1;
        const used = new Set();

        for (let i = 0; i < count; i++) {
            let attempts = 0;
            while (attempts < 20) {
                const tx = Math.floor(Math.random() * (ROOM_COLS - 4)) + 2;
                const ty = Math.floor(Math.random() * (ROOM_ROWS - 4)) + 2;
                const key = `${tx},${ty}`;
                // Don't place in center (player spawn area)
                const cx = Math.floor(ROOM_COLS / 2);
                const cy = Math.floor(ROOM_ROWS / 2);
                if (!used.has(key) && (Math.abs(tx - cx) > 2 || Math.abs(ty - cy) > 2)) {
                    used.add(key);
                    this.obstacles.push({ x: tx, y: ty });
                    // Sometimes add 2-wide obstacles (desks)
                    if (Math.random() < 0.4 && tx < ROOM_COLS - 3) {
                        this.obstacles.push({ x: tx + 1, y: ty });
                        used.add(`${tx + 1},${ty}`);
                    }
                    break;
                }
                attempts++;
            }
        }
    }

    openDoors() {
        this.doorsOpen = true;
        this.cleared = true;
    }

    collidesWall(x, y, w, h) {
        const roomLeft = ROOM_OFFSET_X + TILE;
        const roomRight = ROOM_OFFSET_X + (ROOM_COLS + 1) * TILE;
        const roomTop = ROOM_OFFSET_Y + TILE;
        const roomBottom = ROOM_OFFSET_Y + (ROOM_ROWS + 1) * TILE;

        // Door openings (allow passage if doors open)
        if (this.doorsOpen) {
            const doorW = TILE * 2;
            const midX = ROOM_OFFSET_X + (ROOM_COLS + 2) * TILE / 2;
            const midY = ROOM_OFFSET_Y + (ROOM_ROWS + 2) * TILE / 2;

            // Check if in door zone
            if (this.doors.up && y < roomTop && x + w > midX - doorW / 2 && x < midX + doorW / 2) return false;
            if (this.doors.down && y + h > roomBottom && x + w > midX - doorW / 2 && x < midX + doorW / 2) return false;
            if (this.doors.left && x < roomLeft && y + h > midY - doorW / 2 && y < midY + doorW / 2) return false;
            if (this.doors.right && x + w > roomRight && y + h > midY - doorW / 2 && y < midY + doorW / 2) return false;
        }

        // Wall collision
        if (x < roomLeft || x + w > roomRight || y < roomTop || y + h > roomBottom) {
            return true;
        }

        // Obstacle collision
        return this.collidesObstacle(x, y, w, h);
    }

    collidesObstacle(x, y, w, h) {
        for (const obs of this.obstacles) {
            const ox = ROOM_OFFSET_X + (obs.x + 1) * TILE;
            const oy = ROOM_OFFSET_Y + (obs.y + 1) * TILE;
            if (x < ox + TILE && x + w > ox && y < oy + TILE && y + h > oy) {
                return true;
            }
        }
        return false;
    }

    draw(renderer) {
        const rx = ROOM_OFFSET_X;
        const ry = ROOM_OFFSET_Y;
        const totalW = (ROOM_COLS + 2) * TILE;
        const totalH = (ROOM_ROWS + 2) * TILE;

        // Floor
        for (let ty = 1; ty <= ROOM_ROWS; ty++) {
            for (let tx = 1; tx <= ROOM_COLS; tx++) {
                const color = (tx + ty) % 2 === 0 ? COLORS.floor : COLORS.floorTile;
                renderer.rect(rx + tx * TILE, ry + ty * TILE, TILE, TILE, color);

                // Occasional floor accent
                if ((tx * 7 + ty * 13) % 17 === 0) {
                    renderer.rect(rx + tx * TILE + 2, ry + ty * TILE + 2, TILE - 4, TILE - 4, COLORS.floorAccent);
                }
            }
        }

        // Walls
        // Top wall
        for (let tx = 0; tx < ROOM_COLS + 2; tx++) {
            renderer.rect(rx + tx * TILE, ry, TILE, TILE, COLORS.wallOuter);
            renderer.rect(rx + tx * TILE + 1, ry + 1, TILE - 2, TILE - 2, COLORS.wallInner);
        }
        // Bottom wall
        for (let tx = 0; tx < ROOM_COLS + 2; tx++) {
            renderer.rect(rx + tx * TILE, ry + (ROOM_ROWS + 1) * TILE, TILE, TILE, COLORS.wallOuter);
            renderer.rect(rx + tx * TILE + 1, ry + (ROOM_ROWS + 1) * TILE + 1, TILE - 2, TILE - 2, COLORS.wallInner);
        }
        // Left wall
        for (let ty = 0; ty < ROOM_ROWS + 2; ty++) {
            renderer.rect(rx, ry + ty * TILE, TILE, TILE, COLORS.wallOuter);
            renderer.rect(rx + 1, ry + ty * TILE + 1, TILE - 2, TILE - 2, COLORS.wallInner);
        }
        // Right wall
        for (let ty = 0; ty < ROOM_ROWS + 2; ty++) {
            renderer.rect(rx + (ROOM_COLS + 1) * TILE, ry + ty * TILE, TILE, TILE, COLORS.wallOuter);
            renderer.rect(rx + (ROOM_COLS + 1) * TILE + 1, ry + ty * TILE + 1, TILE - 2, TILE - 2, COLORS.wallInner);
        }

        // Doors
        const midCol = Math.floor((ROOM_COLS + 2) / 2);
        const midRow = Math.floor((ROOM_ROWS + 2) / 2);
        const doorColor = this.doorsOpen ? COLORS.door : COLORS.doorLocked;

        if (this.doors.up) {
            renderer.rect(rx + (midCol - 1) * TILE, ry, TILE * 2, TILE, this.doorsOpen ? COLORS.floor : COLORS.wallOuter);
            if (!this.doorsOpen) {
                renderer.rect(rx + (midCol - 1) * TILE + 2, ry + 2, TILE * 2 - 4, TILE - 4, doorColor);
            }
        }
        if (this.doors.down) {
            renderer.rect(rx + (midCol - 1) * TILE, ry + (ROOM_ROWS + 1) * TILE, TILE * 2, TILE, this.doorsOpen ? COLORS.floor : COLORS.wallOuter);
            if (!this.doorsOpen) {
                renderer.rect(rx + (midCol - 1) * TILE + 2, ry + (ROOM_ROWS + 1) * TILE + 2, TILE * 2 - 4, TILE - 4, doorColor);
            }
        }
        if (this.doors.left) {
            renderer.rect(rx, ry + (midRow - 1) * TILE, TILE, TILE * 2, this.doorsOpen ? COLORS.floor : COLORS.wallOuter);
            if (!this.doorsOpen) {
                renderer.rect(rx + 2, ry + (midRow - 1) * TILE + 2, TILE - 4, TILE * 2 - 4, doorColor);
            }
        }
        if (this.doors.right) {
            renderer.rect(rx + (ROOM_COLS + 1) * TILE, ry + (midRow - 1) * TILE, TILE, TILE * 2, this.doorsOpen ? COLORS.floor : COLORS.wallOuter);
            if (!this.doorsOpen) {
                renderer.rect(rx + (ROOM_COLS + 1) * TILE + 2, ry + (midRow - 1) * TILE + 2, TILE - 4, TILE * 2 - 4, doorColor);
            }
        }

        // Obstacles (office furniture)
        for (const obs of this.obstacles) {
            const ox = rx + (obs.x + 1) * TILE;
            const oy = ry + (obs.y + 1) * TILE;
            renderer.rect(ox, oy, TILE, TILE, COLORS.obstacle);
            renderer.rect(ox + 1, oy + 1, TILE - 2, TILE - 2, '#B0B0B0');
            // Little detail on furniture
            renderer.rect(ox + 3, oy + 3, TILE - 6, 2, '#C8C8C8');
        }

        // Item pedestal
        if (this.type === ROOM_TYPES.ITEM && this.item) {
            const midX = ROOM_OFFSET_X + (ROOM_COLS + 2) * TILE / 2;
            const midY = ROOM_OFFSET_Y + (ROOM_ROWS + 2) * TILE / 2;
            // Pedestal
            renderer.rect(midX - 8, midY + 4, 16, 4, COLORS.heavenDark);
            renderer.rect(midX - 6, midY, 12, 4, COLORS.heavenMid);
        }

        // Room type indicators
        if (this.type === ROOM_TYPES.BOSS && !this.cleared) {
            // Ominous glow
            renderer.ctx.globalAlpha = 0.1 + Math.sin(Date.now() / 500) * 0.05;
            renderer.rect(rx + TILE, ry + TILE, ROOM_COLS * TILE, ROOM_ROWS * TILE, '#FF0000');
            renderer.ctx.globalAlpha = 1;
        }

        if (this.type === ROOM_TYPES.SHOP) {
            // Shop indicator
            const midX = ROOM_OFFSET_X + (ROOM_COLS + 2) * TILE / 2;
            renderer.centeredText('SHOP', ry + TILE + 4, COLORS.textGold, 1);
        }
    }
}
