import { COLORS } from './constants.js';

export class ParticleManager {
    constructor() {
        this.particles = [];
    }

    clear() {
        this.particles = [];
    }

    // Emit particles at position
    emit(x, y, color, count = 5, speed = 2, life = 20) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = speed * (0.5 + Math.random() * 0.5);
            this.particles.push({
                x, y,
                dx: Math.cos(angle) * spd,
                dy: Math.sin(angle) * spd,
                life: life + Math.floor(Math.random() * 10),
                maxLife: life + 10,
                color,
                size: 1 + Math.floor(Math.random() * 2),
            });
        }
    }

    emitDeath(x, y) {
        this.emit(x, y, COLORS.particleDeath, 12, 2.5, 25);
        this.emit(x, y, '#FF69B4', 6, 1.5, 15);
    }

    emitHit(x, y) {
        this.emit(x, y, COLORS.particleHit, 4, 1.5, 12);
    }

    emitHeal(x, y) {
        this.emit(x, y, COLORS.particleHeal, 8, 1, 30);
    }

    emitPickup(x, y, color) {
        this.emit(x, y, color, 10, 2, 20);
        this.emit(x, y, COLORS.textGold, 5, 1, 25);
    }

    emitBossDeath(x, y) {
        this.emit(x, y, '#FF0000', 20, 3, 40);
        this.emit(x, y, '#FF4500', 15, 2.5, 35);
        this.emit(x, y, '#FFD700', 10, 2, 30);
        this.emit(x, y, '#FFFFFF', 8, 1.5, 25);
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.dx;
            p.y += p.dy;
            p.dx *= 0.95;
            p.dy *= 0.95;
            p.life--;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(renderer) {
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            renderer.ctx.globalAlpha = alpha;
            renderer.rect(
                Math.round(p.x - p.size / 2),
                Math.round(p.y - p.size / 2),
                p.size, p.size, p.color
            );
        }
        renderer.ctx.globalAlpha = 1;
    }
}
