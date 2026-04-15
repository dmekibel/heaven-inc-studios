export class Audio {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.volume = 0.3;
    }

    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            this.enabled = false;
        }
    }

    ensureContext() {
        if (!this.ctx) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    play(type) {
        if (!this.enabled || !this.ctx) return;
        try {
            switch (type) {
                case 'shoot': this.playTone(800, 0.05, 'square', 0.15); break;
                case 'hit': this.playTone(200, 0.1, 'sawtooth', 0.2); break;
                case 'enemyDeath': this.playNoise(0.1, 0.25); break;
                case 'playerHit': this.playTone(150, 0.2, 'sawtooth', 0.3); break;
                case 'pickup': this.playMelody([523, 659, 784], 0.08, 'sine', 0.2); break;
                case 'doorOpen': this.playTone(440, 0.15, 'sine', 0.15); break;
                case 'bossDeath': this.playMelody([200, 300, 400, 600, 800], 0.15, 'square', 0.3); break;
                case 'menuSelect': this.playTone(600, 0.05, 'square', 0.1); break;
                case 'descend': this.playMelody([400, 350, 300, 250, 200], 0.1, 'triangle', 0.2); break;
            }
        } catch (e) {
            // Silently fail
        }
    }

    playTone(freq, duration, type = 'square', vol = 0.2) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.value = vol * this.volume;
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playNoise(duration, vol = 0.2) {
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.value = vol * this.volume;
        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start();
    }

    playMelody(freqs, noteDuration, type = 'square', vol = 0.2) {
        freqs.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.value = vol * this.volume;
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (i + 1) * noteDuration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + i * noteDuration);
            osc.stop(this.ctx.currentTime + (i + 1) * noteDuration);
        });
    }
}
