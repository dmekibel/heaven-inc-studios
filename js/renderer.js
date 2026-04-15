import { GAME_W, GAME_H, TILE, COLORS } from './constants.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.canvas.width = GAME_W;
        this.canvas.height = GAME_H;
        this.ctx.imageSmoothingEnabled = false;
        this.scale = 1;
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const windowW = window.innerWidth;
        const windowH = window.innerHeight;
        const scaleX = windowW / GAME_W;
        const scaleY = windowH / GAME_H;
        this.scale = Math.floor(Math.min(scaleX, scaleY));
        if (this.scale < 1) this.scale = 1;
        this.canvas.style.width = (GAME_W * this.scale) + 'px';
        this.canvas.style.height = (GAME_H * this.scale) + 'px';
    }

    clear() {
        this.ctx.fillStyle = COLORS.bg;
        this.ctx.fillRect(0, 0, GAME_W, GAME_H);
    }

    rect(x, y, w, h, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(Math.round(x), Math.round(y), w, h);
    }

    strokeRect(x, y, w, h, color, lineWidth = 1) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, w - 1, h - 1);
    }

    circle(x, y, r, color) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(Math.round(x), Math.round(y), r, 0, Math.PI * 2);
        this.ctx.fill();
    }

    // Draw a sprite from pixel array data
    // spriteData: { width, height, pixels: ['color', ...] } where null = transparent
    sprite(spriteData, x, y, scale = 1, flipX = false) {
        const sx = Math.round(x);
        const sy = Math.round(y);
        for (let py = 0; py < spriteData.height; py++) {
            for (let px = 0; px < spriteData.width; px++) {
                const idx = py * spriteData.width + px;
                const color = spriteData.pixels[idx];
                if (color) {
                    const drawX = flipX
                        ? sx + (spriteData.width - 1 - px) * scale
                        : sx + px * scale;
                    this.ctx.fillStyle = color;
                    this.ctx.fillRect(drawX, sy + py * scale, scale, scale);
                }
            }
        }
    }

    // Animated sprite - picks frame based on time
    animSprite(frames, x, y, frameIndex, scale = 1, flipX = false) {
        const frame = frames[frameIndex % frames.length];
        this.sprite(frame, x, y, scale, flipX);
    }

    text(str, x, y, color = COLORS.textWhite, size = 1) {
        // Pixel font - each char is 3x5 pixels
        const chars = this.getPixelFont();
        const charW = 4 * size; // 3px + 1px spacing
        const startX = Math.round(x);
        const startY = Math.round(y);

        for (let i = 0; i < str.length; i++) {
            const ch = str[i].toUpperCase();
            const charData = chars[ch];
            if (!charData) continue;

            for (let cy = 0; cy < 5; cy++) {
                for (let cx = 0; cx < 3; cx++) {
                    if (charData[cy * 3 + cx]) {
                        this.ctx.fillStyle = color;
                        this.ctx.fillRect(
                            startX + i * charW + cx * size,
                            startY + cy * size,
                            size, size
                        );
                    }
                }
            }
        }
    }

    textWidth(str, size = 1) {
        return str.length * 4 * size;
    }

    centeredText(str, y, color = COLORS.textWhite, size = 1) {
        const w = this.textWidth(str, size);
        this.text(str, Math.round((GAME_W - w) / 2), y, color, size);
    }

    // Heart drawing for HUD
    heart(x, y, full = true) {
        const c = full ? COLORS.heartFull : COLORS.heartEmpty;
        // 7x6 pixel heart
        const pixels = [
            0,1,0,0,0,1,0,
            1,1,1,0,1,1,1,
            1,1,1,1,1,1,1,
            0,1,1,1,1,1,0,
            0,0,1,1,1,0,0,
            0,0,0,1,0,0,0,
        ];
        for (let py = 0; py < 6; py++) {
            for (let px = 0; px < 7; px++) {
                if (pixels[py * 7 + px]) {
                    this.ctx.fillStyle = c;
                    this.ctx.fillRect(x + px, y + py, 1, 1);
                }
            }
        }
    }

    // Flash overlay
    flash(color, alpha) {
        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, GAME_W, GAME_H);
        this.ctx.globalAlpha = 1;
    }

    getPixelFont() {
        if (this._font) return this._font;
        // 3x5 pixel font
        this._font = {
            'A': [0,1,0, 1,0,1, 1,1,1, 1,0,1, 1,0,1],
            'B': [1,1,0, 1,0,1, 1,1,0, 1,0,1, 1,1,0],
            'C': [0,1,1, 1,0,0, 1,0,0, 1,0,0, 0,1,1],
            'D': [1,1,0, 1,0,1, 1,0,1, 1,0,1, 1,1,0],
            'E': [1,1,1, 1,0,0, 1,1,0, 1,0,0, 1,1,1],
            'F': [1,1,1, 1,0,0, 1,1,0, 1,0,0, 1,0,0],
            'G': [0,1,1, 1,0,0, 1,0,1, 1,0,1, 0,1,1],
            'H': [1,0,1, 1,0,1, 1,1,1, 1,0,1, 1,0,1],
            'I': [1,1,1, 0,1,0, 0,1,0, 0,1,0, 1,1,1],
            'J': [0,0,1, 0,0,1, 0,0,1, 1,0,1, 0,1,0],
            'K': [1,0,1, 1,0,1, 1,1,0, 1,0,1, 1,0,1],
            'L': [1,0,0, 1,0,0, 1,0,0, 1,0,0, 1,1,1],
            'M': [1,0,1, 1,1,1, 1,1,1, 1,0,1, 1,0,1],
            'N': [1,0,1, 1,1,1, 1,1,1, 1,1,1, 1,0,1],
            'O': [0,1,0, 1,0,1, 1,0,1, 1,0,1, 0,1,0],
            'P': [1,1,0, 1,0,1, 1,1,0, 1,0,0, 1,0,0],
            'Q': [0,1,0, 1,0,1, 1,0,1, 1,1,0, 0,1,1],
            'R': [1,1,0, 1,0,1, 1,1,0, 1,0,1, 1,0,1],
            'S': [0,1,1, 1,0,0, 0,1,0, 0,0,1, 1,1,0],
            'T': [1,1,1, 0,1,0, 0,1,0, 0,1,0, 0,1,0],
            'U': [1,0,1, 1,0,1, 1,0,1, 1,0,1, 0,1,0],
            'V': [1,0,1, 1,0,1, 1,0,1, 0,1,0, 0,1,0],
            'W': [1,0,1, 1,0,1, 1,1,1, 1,1,1, 1,0,1],
            'X': [1,0,1, 1,0,1, 0,1,0, 1,0,1, 1,0,1],
            'Y': [1,0,1, 1,0,1, 0,1,0, 0,1,0, 0,1,0],
            'Z': [1,1,1, 0,0,1, 0,1,0, 1,0,0, 1,1,1],
            '0': [0,1,0, 1,0,1, 1,0,1, 1,0,1, 0,1,0],
            '1': [0,1,0, 1,1,0, 0,1,0, 0,1,0, 1,1,1],
            '2': [1,1,0, 0,0,1, 0,1,0, 1,0,0, 1,1,1],
            '3': [1,1,0, 0,0,1, 0,1,0, 0,0,1, 1,1,0],
            '4': [1,0,1, 1,0,1, 1,1,1, 0,0,1, 0,0,1],
            '5': [1,1,1, 1,0,0, 1,1,0, 0,0,1, 1,1,0],
            '6': [0,1,1, 1,0,0, 1,1,0, 1,0,1, 0,1,0],
            '7': [1,1,1, 0,0,1, 0,1,0, 0,1,0, 0,1,0],
            '8': [0,1,0, 1,0,1, 0,1,0, 1,0,1, 0,1,0],
            '9': [0,1,0, 1,0,1, 0,1,1, 0,0,1, 1,1,0],
            ' ': [0,0,0, 0,0,0, 0,0,0, 0,0,0, 0,0,0],
            '.': [0,0,0, 0,0,0, 0,0,0, 0,0,0, 0,1,0],
            ',': [0,0,0, 0,0,0, 0,0,0, 0,1,0, 1,0,0],
            '!': [0,1,0, 0,1,0, 0,1,0, 0,0,0, 0,1,0],
            '?': [1,1,0, 0,0,1, 0,1,0, 0,0,0, 0,1,0],
            '-': [0,0,0, 0,0,0, 1,1,1, 0,0,0, 0,0,0],
            '+': [0,0,0, 0,1,0, 1,1,1, 0,1,0, 0,0,0],
            ':': [0,0,0, 0,1,0, 0,0,0, 0,1,0, 0,0,0],
            '/': [0,0,1, 0,0,1, 0,1,0, 1,0,0, 1,0,0],
            "'": [0,1,0, 0,1,0, 0,0,0, 0,0,0, 0,0,0],
            '"': [1,0,1, 1,0,1, 0,0,0, 0,0,0, 0,0,0],
            '(': [0,1,0, 1,0,0, 1,0,0, 1,0,0, 0,1,0],
            ')': [0,1,0, 0,0,1, 0,0,1, 0,0,1, 0,1,0],
        };
        return this._font;
    }
}
