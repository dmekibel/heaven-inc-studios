import { ENEMY_SIZES, ENEMY_HP, ENEMY_SPEED, ENEMY_DAMAGE, COLORS,
    ROOM_OFFSET_X, ROOM_OFFSET_Y, TILE, ROOM_COLS, ROOM_ROWS } from './constants.js';
import { ENEMY_SPRITES } from './sprites.js';

export class Enemy {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.w = ENEMY_SIZES[type] || 12;
        this.h = this.w;
        this.hp = ENEMY_HP[type] || 2;
        this.maxHp = this.hp;
        this.speed = ENEMY_SPEED[type] || 0.5;
        this.damage = ENEMY_DAMAGE[type] || 1;
        this.dead = false;
        this.flashTimer = 0;
        this.animTimer = 0;
        this.animFrame = 0;

        // Type-specific state
        this.ai = this.getAI();
        this.aiTimer = 0;
        this.aiState = 'idle';
        this.chargeDir = { x: 0, y: 0 };
        this.teleportCooldown = 0;
        this.fireCooldown = 0;
    }

    getAI() {
        switch (this.type) {
            case 'imp': return this.aiImp.bind(this);
            case 'hellfire': return this.aiHellfire.bind(this);
            case 'dasher': return this.aiDasher.bind(this);
            case 'splitter': return this.aiSplitter.bind(this);
            case 'splitterSmall': return this.aiImp.bind(this);
            case 'teleporter': return this.aiTeleporter.bind(this);
            case 'tank': return this.aiTank.bind(this);
            default: return this.aiImp.bind(this);
        }
    }

    update(player, room, projectileManager) {
        if (this.dead) return;

        this.animTimer++;
        if (this.animTimer > 20) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 2;
        }

        if (this.flashTimer > 0) this.flashTimer--;
        if (this.fireCooldown > 0) this.fireCooldown--;
        if (this.teleportCooldown > 0) this.teleportCooldown--;

        this.ai(player, room, projectileManager);
    }

    moveToward(targetX, targetY, speed, room) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) return;

        const mx = (dx / dist) * speed;
        const my = (dy / dist) * speed;

        const newX = this.x + mx;
        const newY = this.y + my;

        if (!room.collidesWall(newX - this.w / 2, this.y - this.h / 2, this.w, this.h)) {
            this.x = newX;
        }
        if (!room.collidesWall(this.x - this.w / 2, newY - this.h / 2, this.w, this.h)) {
            this.y = newY;
        }
    }

    // ===== AI Behaviors =====

    aiImp(player, room) {
        this.moveToward(player.x, player.y, this.speed, room);
    }

    aiHellfire(player, room, projectileManager) {
        // Move slowly, shoot fireballs
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 60) {
            this.moveToward(player.x, player.y, this.speed, room);
        }

        if (this.fireCooldown <= 0 && dist < 150) {
            this.fireCooldown = 90;
            const angle = Math.atan2(dy, dx);
            projectileManager.add({
                x: this.x,
                y: this.y,
                dx: Math.cos(angle) * 1.5,
                dy: Math.sin(angle) * 1.5,
                damage: 1,
                range: 200,
                size: 6,
                piercing: false,
                traveled: 0,
                isPlayer: false,
            });
        }
    }

    aiDasher(player, room) {
        this.aiTimer++;

        if (this.aiState === 'idle') {
            // Wander slowly
            if (this.aiTimer > 60) {
                // Lock on to player and charge
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    this.chargeDir = { x: dx / dist, y: dy / dist };
                    this.aiState = 'charging';
                    this.aiTimer = 0;
                }
            }
        } else if (this.aiState === 'charging') {
            // Brief telegraph
            if (this.aiTimer > 20) {
                this.aiState = 'dashing';
                this.aiTimer = 0;
            }
        } else if (this.aiState === 'dashing') {
            const speed = ENEMY_SPEED.dasherCharge;
            const newX = this.x + this.chargeDir.x * speed;
            const newY = this.y + this.chargeDir.y * speed;

            if (room.collidesWall(newX - this.w / 2, newY - this.h / 2, this.w, this.h)) {
                this.aiState = 'idle';
                this.aiTimer = 0;
            } else {
                this.x = newX;
                this.y = newY;
            }

            if (this.aiTimer > 30) {
                this.aiState = 'idle';
                this.aiTimer = 0;
            }
        }
    }

    aiSplitter(player, room) {
        this.moveToward(player.x, player.y, this.speed, room);
    }

    aiTeleporter(player, room) {
        this.moveToward(player.x, player.y, this.speed, room);

        if (this.teleportCooldown <= 0) {
            this.teleportCooldown = 120 + Math.random() * 60;
            // Teleport to random position in room
            const roomLeft = ROOM_OFFSET_X + TILE * 2;
            const roomRight = ROOM_OFFSET_X + ROOM_COLS * TILE;
            const roomTop = ROOM_OFFSET_Y + TILE * 2;
            const roomBottom = ROOM_OFFSET_Y + ROOM_ROWS * TILE;

            for (let i = 0; i < 10; i++) {
                const nx = roomLeft + Math.random() * (roomRight - roomLeft);
                const ny = roomTop + Math.random() * (roomBottom - roomTop);
                if (!room.collidesWall(nx - this.w / 2, ny - this.h / 2, this.w, this.h)) {
                    this.x = nx;
                    this.y = ny;
                    break;
                }
            }
        }
    }

    aiTank(player, room) {
        this.moveToward(player.x, player.y, this.speed, room);
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.flashTimer = 6;
        if (this.hp <= 0) {
            this.dead = true;
        }
    }

    // Returns split enemies when a splitter dies
    onDeath() {
        if (this.type === 'splitter') {
            return [
                new Enemy('splitterSmall', this.x - 8, this.y),
                new Enemy('splitterSmall', this.x + 8, this.y),
            ];
        }
        return [];
    }

    collidesPlayer(player) {
        const dx = this.x - player.x;
        const dy = this.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < (this.w + player.w) / 2;
    }

    draw(renderer) {
        if (this.dead) return;

        // Flash white on hit
        if (this.flashTimer > 0) {
            renderer.rect(
                Math.round(this.x - this.w / 2),
                Math.round(this.y - this.h / 2),
                this.w, this.h, '#FFFFFF'
            );
            return;
        }

        // Draw sprite
        const spriteType = this.type === 'splitterSmall' ? 'splitter' : this.type;
        const sprites = ENEMY_SPRITES[spriteType];
        if (sprites && sprites.length > 0) {
            const frame = sprites[0];
            const scale = this.type === 'splitterSmall' ? 0.6 : 1;
            if (scale !== 1) {
                // For small sprites, just draw a colored circle
                renderer.circle(this.x, this.y, this.w / 2, COLORS.demonPurple);
                renderer.circle(this.x - 2, this.y - 1, 1, '#FF69B4');
                renderer.circle(this.x + 2, this.y - 1, 1, '#FF69B4');
            } else {
                renderer.sprite(frame,
                    Math.round(this.x - frame.width / 2),
                    Math.round(this.y - frame.height / 2));
            }
        } else {
            // Fallback
            renderer.circle(this.x, this.y, this.w / 2, COLORS.demonRed);
        }

        // Dasher telegraph
        if (this.type === 'dasher' && this.aiState === 'charging') {
            renderer.ctx.globalAlpha = 0.3 + Math.sin(this.aiTimer * 0.5) * 0.3;
            renderer.circle(this.x, this.y, this.w / 2 + 4, COLORS.demonPink);
            renderer.ctx.globalAlpha = 1;
        }

        // HP bar for non-full health
        if (this.hp < this.maxHp && this.hp > 0) {
            const barW = this.w;
            const barH = 2;
            const barX = this.x - barW / 2;
            const barY = this.y - this.h / 2 - 4;
            renderer.rect(barX, barY, barW, barH, '#333');
            renderer.rect(barX, barY, barW * (this.hp / this.maxHp), barH, COLORS.uiRed);
        }
    }
}

export function spawnEnemies(type, count, room) {
    const enemies = [];
    const roomLeft = ROOM_OFFSET_X + TILE * 2;
    const roomRight = ROOM_OFFSET_X + ROOM_COLS * TILE;
    const roomTop = ROOM_OFFSET_Y + TILE * 2;
    const roomBottom = ROOM_OFFSET_Y + ROOM_ROWS * TILE;
    const centerX = ROOM_OFFSET_X + (ROOM_COLS + 2) * TILE / 2;
    const centerY = ROOM_OFFSET_Y + (ROOM_ROWS + 2) * TILE / 2;

    for (let i = 0; i < count; i++) {
        let x, y, attempts = 0;
        do {
            x = roomLeft + Math.random() * (roomRight - roomLeft);
            y = roomTop + Math.random() * (roomBottom - roomTop);
            attempts++;
        } while (
            attempts < 20 &&
            (Math.abs(x - centerX) < 30 && Math.abs(y - centerY) < 30) ||
            room.collidesObstacle(x - 6, y - 6, 12, 12)
        );
        enemies.push(new Enemy(type, x, y));
    }
    return enemies;
}
