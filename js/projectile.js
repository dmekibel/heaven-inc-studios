import { HALO_SPRITE, FIREBALL_SPRITE } from './sprites.js';
import { COLORS, ROOM_OFFSET_X, ROOM_OFFSET_Y, TILE, ROOM_COLS, ROOM_ROWS } from './constants.js';

export class ProjectileManager {
    constructor() {
        this.projectiles = [];
    }

    clear() {
        this.projectiles = [];
    }

    add(proj) {
        if (Array.isArray(proj)) {
            this.projectiles.push(...proj);
        } else {
            this.projectiles.push(proj);
        }
    }

    update(room) {
        const roomLeft = ROOM_OFFSET_X + TILE;
        const roomRight = ROOM_OFFSET_X + (ROOM_COLS + 1) * TILE;
        const roomTop = ROOM_OFFSET_Y + TILE;
        const roomBottom = ROOM_OFFSET_Y + (ROOM_ROWS + 1) * TILE;

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.dx;
            p.y += p.dy;
            p.traveled += Math.sqrt(p.dx * p.dx + p.dy * p.dy);

            // Remove if out of range
            if (p.traveled >= p.range) {
                this.projectiles.splice(i, 1);
                continue;
            }

            // Remove if hits wall
            if (p.x < roomLeft || p.x > roomRight || p.y < roomTop || p.y > roomBottom) {
                this.projectiles.splice(i, 1);
                continue;
            }

            // Check obstacle collision
            if (room.collidesObstacle(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)) {
                this.projectiles.splice(i, 1);
                continue;
            }
        }
    }

    checkHit(target, isPlayerProjectile) {
        const hits = [];
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            if (p.isPlayer !== isPlayerProjectile) continue;

            const dx = p.x - target.x;
            const dy = p.y - target.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const hitDist = (p.size + (target.w || target.size || 12)) / 2;

            if (dist < hitDist) {
                hits.push(p);
                if (!p.piercing) {
                    this.projectiles.splice(i, 1);
                }
            }
        }
        return hits;
    }

    draw(renderer) {
        for (const p of this.projectiles) {
            if (p.isPlayer) {
                renderer.sprite(HALO_SPRITE,
                    Math.round(p.x - 3),
                    Math.round(p.y - 3));
            } else {
                renderer.sprite(FIREBALL_SPRITE,
                    Math.round(p.x - 3),
                    Math.round(p.y - 3));
            }
        }
    }
}
