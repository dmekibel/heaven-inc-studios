import { PLAYER_SIZE, PLAYER_SPEED, PLAYER_MAX_HP, PLAYER_IFRAMES,
    PLAYER_FIRE_RATE, PLAYER_SHOT_SPEED, PLAYER_SHOT_RANGE,
    PLAYER_SHOT_DAMAGE, PLAYER_SHOT_SIZE, ROOM_OFFSET_X, ROOM_OFFSET_Y,
    TILE, ROOM_COLS, ROOM_ROWS, COLORS } from './constants.js';
import { PLAYER_SPRITES } from './sprites.js';

export class Player {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = ROOM_OFFSET_X + (ROOM_COLS + 2) * TILE / 2;
        this.y = ROOM_OFFSET_Y + (ROOM_ROWS + 2) * TILE / 2;
        this.w = PLAYER_SIZE;
        this.h = PLAYER_SIZE;
        this.hp = PLAYER_MAX_HP;
        this.maxHp = PLAYER_MAX_HP;
        this.speed = PLAYER_SPEED;
        this.damage = PLAYER_SHOT_DAMAGE;
        this.fireRate = PLAYER_FIRE_RATE;
        this.shotSpeed = PLAYER_SHOT_SPEED;
        this.shotRange = PLAYER_SHOT_RANGE;
        this.shotSize = PLAYER_SHOT_SIZE;
        this.iframes = 0;
        this.fireCooldown = 0;
        this.animFrame = 0;
        this.animTimer = 0;
        this.facing = 1; // 1 = right, -1 = left
        this.items = [];
        this.halos = 0; // currency
        this.tripleShot = false;
        this.piercing = false;
        this.shield = 0;
        this.flashTimer = 0;
    }

    centerInRoom() {
        this.x = ROOM_OFFSET_X + (ROOM_COLS + 2) * TILE / 2;
        this.y = ROOM_OFFSET_Y + (ROOM_ROWS + 2) * TILE / 2;
    }

    update(input, room) {
        // Movement
        const move = input.getMove();
        if (move.x !== 0 || move.y !== 0) {
            const newX = this.x + move.x * this.speed;
            const newY = this.y + move.y * this.speed;

            // Check collision with walls and obstacles
            if (!room.collidesWall(newX - this.w / 2, this.y - this.h / 2, this.w, this.h)) {
                this.x = newX;
            }
            if (!room.collidesWall(this.x - this.w / 2, newY - this.h / 2, this.w, this.h)) {
                this.y = newY;
            }

            if (move.x > 0) this.facing = 1;
            if (move.x < 0) this.facing = -1;
        }

        // Animation
        this.animTimer++;
        if (this.animTimer > 15) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 2;
        }

        // Invincibility frames
        if (this.iframes > 0) this.iframes--;
        if (this.flashTimer > 0) this.flashTimer--;

        // Fire cooldown
        if (this.fireCooldown > 0) this.fireCooldown--;
    }

    shoot(input) {
        const dir = input.getShoot();
        if (dir.x === 0 && dir.y === 0) return null;
        if (this.fireCooldown > 0) return null;

        this.fireCooldown = this.fireRate;

        const shots = [];
        shots.push({
            x: this.x,
            y: this.y,
            dx: dir.x * this.shotSpeed,
            dy: dir.y * this.shotSpeed,
            damage: this.damage,
            range: this.shotRange,
            size: this.shotSize,
            piercing: this.piercing,
            traveled: 0,
            isPlayer: true,
        });

        if (this.tripleShot) {
            // Add two angled shots
            const angle = Math.atan2(dir.y, dir.x);
            const spread = 0.3;
            for (const offset of [-spread, spread]) {
                const a = angle + offset;
                shots.push({
                    x: this.x,
                    y: this.y,
                    dx: Math.cos(a) * this.shotSpeed,
                    dy: Math.sin(a) * this.shotSpeed,
                    damage: this.damage,
                    range: this.shotRange,
                    size: this.shotSize,
                    piercing: this.piercing,
                    traveled: 0,
                    isPlayer: true,
                });
            }
        }
        return shots;
    }

    takeDamage(amount) {
        if (this.iframes > 0) return false;

        if (this.shield > 0) {
            this.shield--;
            this.iframes = PLAYER_IFRAMES;
            this.flashTimer = 10;
            return true;
        }

        this.hp -= amount;
        this.iframes = PLAYER_IFRAMES;
        this.flashTimer = 10;
        return true;
    }

    heal(amount) {
        this.hp = Math.min(this.hp + amount, this.maxHp);
    }

    addItem(itemDef) {
        this.items.push(itemDef);
        switch (itemDef.stat) {
            case 'damage': this.damage += itemDef.value; break;
            case 'speed': this.speed += itemDef.value; break;
            case 'fireRate': this.fireRate = Math.max(5, this.fireRate + itemDef.value); break;
            case 'range': this.shotRange += itemDef.value; break;
            case 'maxHp': this.maxHp += itemDef.value; this.hp += itemDef.value; break;
            case 'shotSize': this.shotSize += itemDef.value; break;
            case 'heal': this.hp = this.maxHp; break;
            case 'tripleShot': this.tripleShot = true; break;
            case 'piercing': this.piercing = true; break;
            case 'shield': this.shield += itemDef.value; break;
        }
    }

    // Check if player is at a door edge
    atDoor() {
        const roomLeft = ROOM_OFFSET_X + TILE;
        const roomRight = ROOM_OFFSET_X + (ROOM_COLS + 1) * TILE;
        const roomTop = ROOM_OFFSET_Y + TILE;
        const roomBottom = ROOM_OFFSET_Y + (ROOM_ROWS + 1) * TILE;
        const cx = this.x;
        const cy = this.y;
        const doorZone = 4;

        // Check each edge
        if (cy - this.h / 2 <= roomTop + doorZone) return 'up';
        if (cy + this.h / 2 >= roomBottom - doorZone) return 'down';
        if (cx - this.w / 2 <= roomLeft + doorZone) return 'left';
        if (cx + this.w / 2 >= roomRight - doorZone) return 'right';
        return null;
    }

    draw(renderer) {
        // Blink during iframes
        if (this.iframes > 0 && Math.floor(this.iframes / 3) % 2 === 0) return;

        const spriteData = PLAYER_SPRITES.idle[this.animFrame];
        const drawX = Math.round(this.x - spriteData.width / 2);
        const drawY = Math.round(this.y - spriteData.height / 2);
        renderer.sprite(spriteData, drawX, drawY, 1, this.facing < 0);

        // Shield indicator
        if (this.shield > 0) {
            renderer.ctx.strokeStyle = COLORS.uiTeal;
            renderer.ctx.lineWidth = 1;
            renderer.ctx.beginPath();
            renderer.ctx.arc(Math.round(this.x), Math.round(this.y), this.w / 2 + 3, 0, Math.PI * 2);
            renderer.ctx.stroke();
        }
    }
}
