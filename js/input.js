export class Input {
    constructor(canvas) {
        this.canvas = canvas;
        this.keys = {};
        this.moveDir = { x: 0, y: 0 };
        this.shootDir = { x: 0, y: 0 };
        this.isMobile = false;
        this.joystickActive = false;
        this.joystickBase = null;
        this.joystickStick = null;
        this.anyKey = false;

        this.setupKeyboard();
        this.setupTouch();
    }

    setupKeyboard() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            this.anyKey = true;
            e.preventDefault();
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }

    setupTouch() {
        this.joystickBase = document.getElementById('joystick-base');
        this.joystickStick = document.getElementById('joystick-stick');
        const joystickZone = document.getElementById('joystick-zone');
        const shootBtns = document.querySelectorAll('.shoot-btn');

        if (!joystickZone) return;

        // Joystick
        let joyCenter = { x: 0, y: 0 };
        let joyTouchId = null;

        joystickZone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.isMobile = true;
            this.anyKey = true;
            const touch = e.changedTouches[0];
            joyTouchId = touch.identifier;
            const rect = this.joystickBase.getBoundingClientRect();
            joyCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            this.joystickActive = true;
        });

        joystickZone.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (const touch of e.changedTouches) {
                if (touch.identifier === joyTouchId) {
                    const dx = touch.clientX - joyCenter.x;
                    const dy = touch.clientY - joyCenter.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const maxDist = 35;
                    const clampDist = Math.min(dist, maxDist);
                    const angle = Math.atan2(dy, dx);

                    const stickX = Math.cos(angle) * clampDist;
                    const stickY = Math.sin(angle) * clampDist;

                    this.joystickStick.style.transform = `translate(${stickX}px, ${stickY}px)`;

                    if (dist > 8) {
                        this.moveDir.x = Math.cos(angle);
                        this.moveDir.y = Math.sin(angle);
                    } else {
                        this.moveDir.x = 0;
                        this.moveDir.y = 0;
                    }
                }
            }
        });

        const endJoystick = (e) => {
            for (const touch of e.changedTouches) {
                if (touch.identifier === joyTouchId) {
                    joyTouchId = null;
                    this.joystickActive = false;
                    this.moveDir.x = 0;
                    this.moveDir.y = 0;
                    this.joystickStick.style.transform = 'translate(0, 0)';
                }
            }
        };
        joystickZone.addEventListener('touchend', endJoystick);
        joystickZone.addEventListener('touchcancel', endJoystick);

        // Shoot buttons
        const shootDirs = {
            up: { x: 0, y: -1 },
            down: { x: 0, y: 1 },
            left: { x: -1, y: 0 },
            right: { x: 1, y: 0 },
        };

        shootBtns.forEach(btn => {
            const dir = btn.dataset.dir;
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.isMobile = true;
                this.anyKey = true;
                this.shootDir = { ...shootDirs[dir] };
            });
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                // Only clear if this direction was active
                if (this.shootDir.x === shootDirs[dir].x && this.shootDir.y === shootDirs[dir].y) {
                    this.shootDir = { x: 0, y: 0 };
                }
            });
        });

        // Also handle canvas touch for menu
        this.canvas.addEventListener('touchstart', () => {
            this.anyKey = true;
        });
    }

    getMove() {
        if (this.isMobile || this.joystickActive) {
            return { x: this.moveDir.x, y: this.moveDir.y };
        }

        let x = 0, y = 0;
        if (this.keys['w'] || this.keys['arrowup']) y -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) y += 1;
        if (this.keys['a'] || this.keys['arrowleft']) x -= 1;
        if (this.keys['d'] || this.keys['arrowright']) x += 1;

        // Normalize diagonal
        if (x !== 0 && y !== 0) {
            const len = Math.sqrt(x * x + y * y);
            x /= len;
            y /= len;
        }
        return { x, y };
    }

    getShoot() {
        if (this.isMobile) {
            return { x: this.shootDir.x, y: this.shootDir.y };
        }

        let x = 0, y = 0;
        if (this.keys['arrowup']) y -= 1;
        if (this.keys['arrowdown']) y += 1;
        if (this.keys['arrowleft']) x -= 1;
        if (this.keys['arrowright']) x += 1;
        return { x, y };
    }

    consumeAnyKey() {
        const was = this.anyKey;
        this.anyKey = false;
        return was;
    }
}
