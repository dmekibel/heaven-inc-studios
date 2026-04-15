import { COLORS, ROOM_OFFSET_X, ROOM_OFFSET_Y, TILE, ROOM_COLS, ROOM_ROWS } from './constants.js';
import { BOSS_SPRITES } from './sprites.js';
import { Enemy, spawnEnemies } from './enemies.js';

export class Boss {
    constructor(floorNum) {
        this.floorNum = floorNum;
        const midX = ROOM_OFFSET_X + (ROOM_COLS + 2) * TILE / 2;
        const midY = ROOM_OFFSET_Y + (ROOM_ROWS + 2) * TILE / 2 - 10;

        this.x = midX;
        this.y = midY;
        this.dead = false;
        this.flashTimer = 0;
        this.aiTimer = 0;
        this.aiState = 'idle';
        this.phase = 1;

        switch (floorNum) {
            case 1:
                this.name = 'MIDDLE MANAGER OF HELL';
                this.hp = 25;
                this.maxHp = 25;
                this.w = 20;
                this.h = 20;
                this.speed = 0.8;
                this.damage = 1;
                this.spriteKey = 'manager';
                break;
            case 2:
                this.name = 'VP OF DAMNATION';
                this.hp = 40;
                this.maxHp = 40;
                this.w = 22;
                this.h = 22;
                this.speed = 0.6;
                this.damage = 1;
                this.spriteKey = 'vp';
                break;
            case 3:
                this.name = 'CEO OF THE UNDERWORLD';
                this.hp = 60;
                this.maxHp = 60;
                this.w = 24;
                this.h = 24;
                this.speed = 0.5;
                this.damage = 2;
                this.spriteKey = 'ceo';
                break;
            default:
                this.name = 'DEMON BOSS';
                this.hp = 20;
                this.maxHp = 20;
                this.w = 20;
                this.h = 20;
                this.speed = 0.7;
                this.damage = 1;
                this.spriteKey = 'manager';
        }
    }

    update(player, room, projectileManager, enemies) {
        if (this.dead) return;

        this.aiTimer++;
        if (this.flashTimer > 0) this.flashTimer--;

        // Phase transitions
        if (this.floorNum === 3) {
            if (this.hp < this.maxHp * 0.66 && this.phase === 1) {
                this.phase = 2;
                this.speed = 0.8;
            }
            if (this.hp < this.maxHp * 0.33 && this.phase === 2) {
                this.phase = 3;
                this.speed = 1.0;
            }
        }

        switch (this.floorNum) {
            case 1: this.aiManager(player, room, projectileManager, enemies); break;
            case 2: this.aiVP(player, room, projectileManager); break;
            case 3: this.aiCEO(player, room, projectileManager, enemies); break;
        }
    }

    // Floor 1 Boss: charges and spawns imps
    aiManager(player, room, projectileManager, enemies) {
        if (this.aiState === 'idle') {
            this.moveToward(player.x, player.y, this.speed, room);
            if (this.aiTimer > 120) {
                this.aiState = Math.random() < 0.5 ? 'charge' : 'spawn';
                this.aiTimer = 0;
            }
        } else if (this.aiState === 'charge') {
            if (this.aiTimer < 30) {
                // Telegraph
            } else if (this.aiTimer < 60) {
                this.moveToward(player.x, player.y, this.speed * 3, room);
            } else {
                this.aiState = 'idle';
                this.aiTimer = 0;
            }
        } else if (this.aiState === 'spawn') {
            if (this.aiTimer === 15 && enemies.length < 6) {
                // Spawn 2 imps
                const newEnemies = spawnEnemies('imp', 2, room);
                enemies.push(...newEnemies);
            }
            if (this.aiTimer > 40) {
                this.aiState = 'idle';
                this.aiTimer = 0;
            }
        }
    }

    // Floor 2 Boss: teleports and area attacks
    aiVP(player, room, projectileManager) {
        if (this.aiState === 'idle') {
            this.moveToward(player.x, player.y, this.speed, room);
            if (this.aiTimer > 90) {
                this.aiState = Math.random() < 0.5 ? 'teleport' : 'barrage';
                this.aiTimer = 0;
            }
        } else if (this.aiState === 'teleport') {
            if (this.aiTimer === 15) {
                // Teleport near player
                const angle = Math.random() * Math.PI * 2;
                const dist = 40 + Math.random() * 30;
                const nx = player.x + Math.cos(angle) * dist;
                const ny = player.y + Math.sin(angle) * dist;
                const roomLeft = ROOM_OFFSET_X + TILE * 2;
                const roomRight = ROOM_OFFSET_X + ROOM_COLS * TILE;
                const roomTop = ROOM_OFFSET_Y + TILE * 2;
                const roomBottom = ROOM_OFFSET_Y + ROOM_ROWS * TILE;
                this.x = Math.max(roomLeft, Math.min(roomRight, nx));
                this.y = Math.max(roomTop, Math.min(roomBottom, ny));
            }
            if (this.aiTimer > 30) {
                this.aiState = 'idle';
                this.aiTimer = 0;
            }
        } else if (this.aiState === 'barrage') {
            // Fire in all 8 directions
            if (this.aiTimer === 15) {
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    projectileManager.add({
                        x: this.x, y: this.y,
                        dx: Math.cos(angle) * 2,
                        dy: Math.sin(angle) * 2,
                        damage: 1, range: 150, size: 6,
                        piercing: false, traveled: 0, isPlayer: false,
                    });
                }
            }
            if (this.aiTimer > 40) {
                this.aiState = 'idle';
                this.aiTimer = 0;
            }
        }
    }

    // Floor 3 Boss: multi-phase
    aiCEO(player, room, projectileManager, enemies) {
        if (this.aiState === 'idle') {
            this.moveToward(player.x, player.y, this.speed, room);

            const attackInterval = this.phase === 1 ? 100 : this.phase === 2 ? 70 : 50;
            if (this.aiTimer > attackInterval) {
                const attacks = ['charge', 'barrage', 'spawn'];
                if (this.phase >= 2) attacks.push('spiral');
                if (this.phase >= 3) attacks.push('spiral', 'barrage');
                this.aiState = attacks[Math.floor(Math.random() * attacks.length)];
                this.aiTimer = 0;
            }
        } else if (this.aiState === 'charge') {
            if (this.aiTimer < 25) { /* telegraph */ }
            else if (this.aiTimer < 55) {
                this.moveToward(player.x, player.y, this.speed * 3.5, room);
            } else {
                this.aiState = 'idle';
                this.aiTimer = 0;
            }
        } else if (this.aiState === 'barrage') {
            if (this.aiTimer === 10) {
                const count = this.phase >= 3 ? 16 : 12;
                for (let i = 0; i < count; i++) {
                    const angle = (i / count) * Math.PI * 2;
                    projectileManager.add({
                        x: this.x, y: this.y,
                        dx: Math.cos(angle) * 1.8,
                        dy: Math.sin(angle) * 1.8,
                        damage: this.damage, range: 180, size: 6,
                        piercing: false, traveled: 0, isPlayer: false,
                    });
                }
            }
            if (this.aiTimer > 35) { this.aiState = 'idle'; this.aiTimer = 0; }
        } else if (this.aiState === 'spawn') {
            if (this.aiTimer === 10 && enemies.length < 8) {
                const type = this.phase >= 3 ? 'dasher' : 'imp';
                enemies.push(...spawnEnemies(type, 2, room));
            }
            if (this.aiTimer > 35) { this.aiState = 'idle'; this.aiTimer = 0; }
        } else if (this.aiState === 'spiral') {
            // Spiral bullet pattern
            if (this.aiTimer % 5 === 0 && this.aiTimer < 60) {
                const angle = (this.aiTimer / 5) * 0.8;
                projectileManager.add({
                    x: this.x, y: this.y,
                    dx: Math.cos(angle) * 2,
                    dy: Math.sin(angle) * 2,
                    damage: this.damage, range: 200, size: 6,
                    piercing: false, traveled: 0, isPlayer: false,
                });
                projectileManager.add({
                    x: this.x, y: this.y,
                    dx: Math.cos(angle + Math.PI) * 2,
                    dy: Math.sin(angle + Math.PI) * 2,
                    damage: this.damage, range: 200, size: 6,
                    piercing: false, traveled: 0, isPlayer: false,
                });
            }
            if (this.aiTimer > 65) { this.aiState = 'idle'; this.aiTimer = 0; }
        }
    }

    moveToward(tx, ty, speed, room) {
        const dx = tx - this.x;
        const dy = ty - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) return;
        const newX = this.x + (dx / dist) * speed;
        const newY = this.y + (dy / dist) * speed;
        if (!room.collidesWall(newX - this.w / 2, this.y - this.h / 2, this.w, this.h)) this.x = newX;
        if (!room.collidesWall(this.x - this.w / 2, newY - this.h / 2, this.w, this.h)) this.y = newY;
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.flashTimer = 6;
        if (this.hp <= 0) this.dead = true;
    }

    collidesPlayer(player) {
        const dx = this.x - player.x;
        const dy = this.y - player.y;
        return Math.sqrt(dx * dx + dy * dy) < (this.w + player.w) / 2;
    }

    draw(renderer) {
        if (this.dead) return;

        if (this.flashTimer > 0) {
            renderer.rect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h, '#FFFFFF');
            return;
        }

        // Sprite
        const sprites = BOSS_SPRITES[this.spriteKey];
        if (sprites && sprites[0]) {
            const spr = sprites[0];
            renderer.sprite(spr, Math.round(this.x - spr.width / 2), Math.round(this.y - spr.height / 2));
        }

        // Charge telegraph
        if (this.aiState === 'charge' && this.aiTimer < 25) {
            renderer.ctx.globalAlpha = 0.4;
            renderer.circle(this.x, this.y, this.w / 2 + 6, '#FF4500');
            renderer.ctx.globalAlpha = 1;
        }

        // HP bar
        const barW = 40;
        const barH = 3;
        const barX = this.x - barW / 2;
        const barY = this.y - this.h / 2 - 8;
        renderer.rect(barX, barY, barW, barH, '#333');
        renderer.rect(barX, barY, barW * (this.hp / this.maxHp), barH, COLORS.uiRed);

        // Name
        const nameW = renderer.textWidth(this.name, 1);
        renderer.text(this.name, this.x - nameW / 2, barY - 8, COLORS.textWhite, 1);
    }
}
