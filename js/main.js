import { GAME_W, GAME_H, STATES, COLORS, ROOM_TYPES, ROOM_OFFSET_X, ROOM_OFFSET_Y,
    TILE, ROOM_COLS, ROOM_ROWS } from './constants.js';
import { Renderer } from './renderer.js';
import { Input } from './input.js';
import { Player } from './player.js';
import { ProjectileManager } from './projectile.js';
import { Floor } from './floor.js';
import { HUD } from './hud.js';
import { ParticleManager } from './particles.js';
import { Boss } from './boss.js';
import { Audio } from './audio.js';
import { createRoomItem } from './items.js';

class Game {
    constructor() {
        const canvas = document.getElementById('game');
        this.renderer = new Renderer(canvas);
        this.input = new Input(canvas);
        this.player = new Player();
        this.projectiles = new ProjectileManager();
        this.particles = new ParticleManager();
        this.hud = new HUD();
        this.audio = new Audio();

        this.state = STATES.MENU;
        this.floor = null;
        this.floorNum = 0;
        this.enemies = [];
        this.boss = null;
        this.items = [];
        this.transitionDir = null;
        this.transitionTimer = 0;
        this.menuBob = 0;
        this.winTimer = 0;

        this.lastTime = 0;
        this.accumulator = 0;
        this.FPS = 60;
        this.frameTime = 1000 / this.FPS;

        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    loop(time) {
        requestAnimationFrame(this.loop);

        if (!this.lastTime) this.lastTime = time;
        const delta = time - this.lastTime;
        this.lastTime = time;

        this.accumulator += delta;

        // Cap accumulator to prevent spiral of death
        if (this.accumulator > this.frameTime * 5) {
            this.accumulator = this.frameTime * 5;
        }

        while (this.accumulator >= this.frameTime) {
            this.update();
            this.accumulator -= this.frameTime;
        }

        this.draw();
    }

    update() {
        switch (this.state) {
            case STATES.MENU: this.updateMenu(); break;
            case STATES.PLAYING: this.updatePlaying(); break;
            case STATES.ROOM_TRANSITION: this.updateTransition(); break;
            case STATES.GAME_OVER: this.updateGameOver(); break;
            case STATES.WIN: this.updateWin(); break;
        }
    }

    draw() {
        this.renderer.clear();

        switch (this.state) {
            case STATES.MENU: this.drawMenu(); break;
            case STATES.PLAYING: this.drawPlaying(); break;
            case STATES.ROOM_TRANSITION: this.drawPlaying(); break;
            case STATES.GAME_OVER: this.drawGameOver(); break;
            case STATES.WIN: this.drawWin(); break;
        }
    }

    // ==================== MENU ====================

    updateMenu() {
        this.menuBob += 0.03;
        if (this.input.consumeAnyKey()) {
            this.audio.ensureContext();
            this.audio.play('menuSelect');
            this.startGame();
        }
    }

    drawMenu() {
        // Starfield / heaven background
        for (let i = 0; i < 40; i++) {
            const sx = ((i * 73 + 17) % GAME_W);
            const sy = ((i * 47 + 31) % GAME_H);
            const brightness = 0.3 + Math.sin(this.menuBob + i) * 0.2;
            this.renderer.ctx.globalAlpha = brightness;
            this.renderer.rect(sx, sy, 1, 1, COLORS.gold);
        }
        this.renderer.ctx.globalAlpha = 1;

        // Title
        const titleY = 50 + Math.sin(this.menuBob) * 3;
        this.renderer.centeredText('HEAVEN INC.', titleY, COLORS.textGold, 3);
        this.renderer.centeredText('CORPORATE DIVINE WARFARE', titleY + 22, COLORS.heavenMid, 1);

        // Angel preview
        const cx = GAME_W / 2;
        const cy = 120 + Math.sin(this.menuBob * 1.5) * 2;
        this.renderer.circle(cx, cy - 10, 4, COLORS.playerHalo);
        this.renderer.circle(cx, cy, 7, COLORS.playerBody);
        this.renderer.rect(cx - 1, cy - 2, 2, 2, COLORS.playerEyes);
        this.renderer.rect(cx + 2, cy - 2, 2, 2, COLORS.playerEyes);
        // Wings
        this.renderer.rect(cx - 12, cy - 2, 5, 6, COLORS.playerWings);
        this.renderer.rect(cx + 8, cy - 2, 5, 6, COLORS.playerWings);

        // Controls info
        const flash = Math.sin(this.menuBob * 2) > 0;
        if (flash) {
            this.renderer.centeredText('PRESS ANY KEY TO START', 170, COLORS.textWhite, 1);
        }

        this.renderer.centeredText('WASD TO MOVE', 195, COLORS.heavenLight, 1);
        this.renderer.centeredText('ARROWS TO SHOOT', 205, COLORS.heavenLight, 1);

        // Version
        this.renderer.text('V1.0', 2, GAME_H - 8, COLORS.heavenDark, 1);
    }

    // ==================== GAMEPLAY ====================

    startGame() {
        this.player.reset();
        this.floorNum = 1;
        this.startFloor();
        this.state = STATES.PLAYING;
    }

    startFloor() {
        this.floor = new Floor(this.floorNum);
        this.enemies = [];
        this.boss = null;
        this.items = [];
        this.projectiles.clear();
        this.particles.clear();
        this.player.centerInRoom();

        // Pre-populate item rooms
        for (const room of this.floor.rooms) {
            if (room.type === ROOM_TYPES.ITEM) {
                const item = createRoomItem(room);
                this.items.push(item);
            }
        }

        this.hud.showMessage('FLOOR ' + this.floorNum, COLORS.textGold, 90);
    }

    updatePlaying() {
        const room = this.floor.getCurrentRoom();

        // Player update
        this.player.update(this.input, room);

        // Shooting
        const shots = this.player.shoot(this.input);
        if (shots) {
            this.projectiles.add(shots);
            this.audio.play('shoot');
        }

        // Projectile update
        this.projectiles.update(room);

        // Enemy updates
        for (const enemy of this.enemies) {
            enemy.update(this.player, room, this.projectiles);
        }

        // Boss update
        if (this.boss) {
            this.boss.update(this.player, room, this.projectiles, this.enemies);
        }

        // Player projectiles vs enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (enemy.dead) continue;
            const hits = this.projectiles.checkHit(enemy, true);
            for (const hit of hits) {
                enemy.takeDamage(hit.damage);
                this.particles.emitHit(enemy.x, enemy.y);
                this.audio.play('hit');
                if (enemy.dead) {
                    this.particles.emitDeath(enemy.x, enemy.y);
                    this.audio.play('enemyDeath');
                    this.player.halos += 1;
                    // Splitter spawns
                    const spawns = enemy.onDeath();
                    this.enemies.push(...spawns);
                }
            }
        }

        // Player projectiles vs boss
        if (this.boss && !this.boss.dead) {
            const hits = this.projectiles.checkHit(this.boss, true);
            for (const hit of hits) {
                this.boss.takeDamage(hit.damage);
                this.particles.emitHit(this.boss.x, this.boss.y);
                this.audio.play('hit');
                if (this.boss.dead) {
                    this.particles.emitBossDeath(this.boss.x, this.boss.y);
                    this.audio.play('bossDeath');
                    room.openDoors();
                    this.player.halos += 10;

                    if (this.floorNum >= 3) {
                        // Won the game!
                        this.state = STATES.WIN;
                        this.winTimer = 0;
                        return;
                    } else {
                        this.hud.showMessage('BOSS DEFEATED! FIND THE EXIT', COLORS.uiGreen, 120);
                    }
                }
            }
        }

        // Enemy projectiles vs player
        const playerHits = this.projectiles.checkHit(this.player, false);
        if (playerHits.length > 0) {
            const totalDamage = playerHits.reduce((sum, h) => sum + h.damage, 0);
            if (this.player.takeDamage(totalDamage)) {
                this.audio.play('playerHit');
                this.particles.emitHit(this.player.x, this.player.y);
            }
        }

        // Enemy contact damage
        for (const enemy of this.enemies) {
            if (!enemy.dead && enemy.collidesPlayer(this.player)) {
                if (this.player.takeDamage(enemy.damage)) {
                    this.audio.play('playerHit');
                    this.particles.emitHit(this.player.x, this.player.y);
                }
            }
        }

        // Boss contact damage
        if (this.boss && !this.boss.dead && this.boss.collidesPlayer(this.player)) {
            if (this.player.takeDamage(this.boss.damage)) {
                this.audio.play('playerHit');
            }
        }

        // Clean up dead enemies
        this.enemies = this.enemies.filter(e => !e.dead);

        // Check room cleared
        if (!room.cleared && room.type === ROOM_TYPES.NORMAL && this.enemies.length === 0) {
            room.openDoors();
            this.audio.play('doorOpen');
            this.hud.showMessage('ROOM CLEARED', COLORS.uiGreen, 60);
        }

        // Item pickup
        for (const item of this.items) {
            if (!item.picked && item.collidesPlayer(this.player)) {
                item.picked = true;
                this.player.addItem(item.def);
                this.particles.emitPickup(item.x, item.y, item.def.color);
                this.audio.play('pickup');
                this.hud.showMessage(item.def.name + ' - ' + item.def.desc, COLORS.textGold, 90);
            }
            item.update();
        }

        // Trapdoor to next floor (appears in boss room after boss dies)
        if (room.type === ROOM_TYPES.BOSS && room.cleared && this.floorNum < 3) {
            const trapX = ROOM_OFFSET_X + (ROOM_COLS + 2) * TILE / 2;
            const trapY = ROOM_OFFSET_Y + (ROOM_ROWS + 2) * TILE / 2;
            const dx = this.player.x - trapX;
            const dy = this.player.y - trapY;
            if (Math.sqrt(dx * dx + dy * dy) < 12) {
                this.floorNum++;
                this.audio.play('descend');
                this.startFloor();
                return;
            }
        }

        // Door transitions
        if (room.doorsOpen) {
            const doorDir = this.player.atDoor();
            if (doorDir && room.doors[doorDir]) {
                this.transitionDir = doorDir;
                this.transitionTimer = 15;
                this.state = STATES.ROOM_TRANSITION;
            }
        }

        // Particles
        this.particles.update();
        this.hud.update();

        // Player death
        if (this.player.hp <= 0) {
            this.state = STATES.GAME_OVER;
        }
    }

    updateTransition() {
        this.transitionTimer--;
        if (this.transitionTimer <= 0) {
            // Move to next room
            const newRoom = this.floor.moveRoom(this.transitionDir);
            if (!newRoom) {
                this.state = STATES.PLAYING;
                return;
            }

            // Check if moving from cleared boss room = next floor
            const prevRoom = this.floor.grid[
                this.floor.currentY - (this.transitionDir === 'down' ? 1 : 0) + (this.transitionDir === 'up' ? 1 : 0)
            ]?.[
                this.floor.currentX - (this.transitionDir === 'right' ? 1 : 0) + (this.transitionDir === 'left' ? 1 : 0)
            ];

            // Reposition player at opposite door
            const midX = ROOM_OFFSET_X + (ROOM_COLS + 2) * TILE / 2;
            const midY = ROOM_OFFSET_Y + (ROOM_ROWS + 2) * TILE / 2;
            switch (this.transitionDir) {
                case 'up':
                    this.player.x = midX;
                    this.player.y = ROOM_OFFSET_Y + (ROOM_ROWS) * TILE;
                    break;
                case 'down':
                    this.player.x = midX;
                    this.player.y = ROOM_OFFSET_Y + TILE * 2;
                    break;
                case 'left':
                    this.player.x = ROOM_OFFSET_X + ROOM_COLS * TILE;
                    this.player.y = midY;
                    break;
                case 'right':
                    this.player.x = ROOM_OFFSET_X + TILE * 2;
                    this.player.y = midY;
                    break;
            }

            // Clear projectiles and enemies
            this.projectiles.clear();
            this.particles.clear();
            this.enemies = [];
            this.boss = null;

            // Spawn enemies for new room
            if (!newRoom.cleared) {
                if (newRoom.type === ROOM_TYPES.NORMAL) {
                    this.enemies = this.floor.spawnRoomEnemies(newRoom);
                } else if (newRoom.type === ROOM_TYPES.BOSS) {
                    this.boss = new Boss(this.floorNum);
                }
            }

            // Load items for this room
            // Items already exist in this.items from floor init

            this.state = STATES.PLAYING;
        }
    }

    drawPlaying() {
        const room = this.floor.getCurrentRoom();
        if (!room) return;

        // Draw room
        room.draw(this.renderer);

        // Draw items
        for (const item of this.items) {
            if (item.x >= ROOM_OFFSET_X && item.x <= ROOM_OFFSET_X + (ROOM_COLS + 2) * TILE) {
                // Only draw items in current room (simple check)
                const currentRoom = this.floor.getCurrentRoom();
                if (currentRoom.type === ROOM_TYPES.ITEM && currentRoom.item === item) {
                    item.draw(this.renderer);
                }
            }
        }

        // Draw enemies
        for (const enemy of this.enemies) {
            enemy.draw(this.renderer);
        }

        // Draw boss
        if (this.boss) {
            this.boss.draw(this.renderer);
        }

        // Draw projectiles
        this.projectiles.draw(this.renderer);

        // Draw player
        this.player.draw(this.renderer);

        // Draw particles
        this.particles.draw(this.renderer);

        // Draw HUD
        this.hud.draw(this.renderer, this.player, this.floor);

        // Transition fade
        if (this.state === STATES.ROOM_TRANSITION) {
            const alpha = 1 - (this.transitionTimer / 15);
            this.renderer.flash('#000000', alpha * 0.5);
        }

        // Trapdoor to next floor
        const currentRoom = this.floor.getCurrentRoom();
        if (currentRoom.type === ROOM_TYPES.BOSS && currentRoom.cleared && this.floorNum < 3) {
            const trapX = ROOM_OFFSET_X + (ROOM_COLS + 2) * TILE / 2;
            const trapY = ROOM_OFFSET_Y + (ROOM_ROWS + 2) * TILE / 2;
            const glow = Math.sin(Date.now() / 200) * 0.3 + 0.7;
            this.renderer.ctx.globalAlpha = glow;
            this.renderer.rect(trapX - 8, trapY - 8, 16, 16, '#1a1a2e');
            this.renderer.strokeRect(trapX - 8, trapY - 8, 16, 16, COLORS.gold, 1);
            this.renderer.ctx.globalAlpha = 1;
            // Stairs icon
            this.renderer.rect(trapX - 4, trapY - 4, 8, 2, COLORS.gold);
            this.renderer.rect(trapX - 2, trapY, 6, 2, COLORS.gold);
            this.renderer.rect(trapX, trapY + 4, 4, 2, COLORS.gold);
            // Prompt
            this.renderer.centeredText('DESCEND', trapY - 14, COLORS.textGold, 1);
        }
    }

    // ==================== GAME OVER ====================

    updateGameOver() {
        if (this.input.consumeAnyKey()) {
            this.audio.play('menuSelect');
            this.state = STATES.MENU;
        }
    }

    drawGameOver() {
        // Draw the room as background
        this.drawPlaying();

        // Dark overlay
        this.renderer.flash('#000000', 0.7);

        this.renderer.centeredText('GAME OVER', 80, COLORS.uiRed, 3);
        this.renderer.centeredText('YOUR ANGEL HAS FALLEN', 110, COLORS.heavenMid, 1);
        this.renderer.centeredText('FLOOR ' + this.floorNum, 130, COLORS.textGold, 1);
        this.renderer.centeredText('PRESS ANY KEY', 170, COLORS.textWhite, 1);
    }

    // ==================== WIN ====================

    updateWin() {
        this.winTimer++;
        this.particles.update();

        // Celebration particles
        if (this.winTimer % 10 === 0) {
            const x = Math.random() * GAME_W;
            const y = Math.random() * GAME_H * 0.5;
            const colors = [COLORS.gold, COLORS.heavenMid, COLORS.uiPink, COLORS.uiTeal];
            this.particles.emit(x, y, colors[Math.floor(Math.random() * colors.length)], 3, 1, 40);
        }

        if (this.winTimer > 60 && this.input.consumeAnyKey()) {
            this.audio.play('menuSelect');
            this.state = STATES.MENU;
        }
    }

    drawWin() {
        // Golden background
        for (let i = 0; i < 60; i++) {
            const sx = ((i * 73 + 17) % GAME_W);
            const sy = ((i * 47 + 31) % GAME_H);
            const brightness = 0.3 + Math.sin(this.winTimer * 0.02 + i) * 0.2;
            this.renderer.ctx.globalAlpha = brightness;
            this.renderer.rect(sx, sy, 2, 2, COLORS.gold);
        }
        this.renderer.ctx.globalAlpha = 1;

        this.particles.draw(this.renderer);

        this.renderer.centeredText('HEAVEN INC.', 40, COLORS.textGold, 3);
        this.renderer.centeredText('IS SAVED!', 65, COLORS.textGold, 2);

        this.renderer.centeredText('YOU DEFEATED THE', 100, COLORS.heavenLight, 1);
        this.renderer.centeredText('CEO OF THE UNDERWORLD', 112, COLORS.uiRed, 1);

        this.renderer.centeredText('PEACE RETURNS TO THE', 140, COLORS.heavenMid, 1);
        this.renderer.centeredText('CORPORATE HEAVENS', 152, COLORS.heavenMid, 1);

        // Stats
        this.renderer.centeredText('ITEMS COLLECTED: ' + this.player.items.length, 178, COLORS.textWhite, 1);
        this.renderer.centeredText('HALOS EARNED: ' + this.player.halos, 190, COLORS.textGold, 1);

        if (this.winTimer > 60) {
            const flash = Math.sin(this.winTimer * 0.1) > 0;
            if (flash) {
                this.renderer.centeredText('PRESS ANY KEY', 215, COLORS.textWhite, 1);
            }
        }
    }
}

// Boot
new Game();
