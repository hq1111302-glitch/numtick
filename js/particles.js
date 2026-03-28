class Particle {
    constructor(x, y, options = {}) {
        this.x = x;
        this.y = y;
        this.vx = options.vx || Utils.randomRange(-2, 2);
        this.vy = options.vy || Utils.randomRange(-2, 2);
        this.life = options.life || 30;
        this.maxLife = this.life;
        this.size = options.size || Utils.randomRange(2, 5);
        this.color = options.color || '#fff';
        this.shrink = options.shrink !== false;
        this.gravity = options.gravity || 0;
        this.friction = options.friction || 0.98;
        this.glow = options.glow || false;
    }

    update() {
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        const size = this.shrink ? this.size * alpha : this.size;

        ctx.save();
        ctx.globalAlpha = alpha;

        if (this.glow) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
        }

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(0.5, size), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    get isDead() {
        return this.life <= 0;
    }
}

class DamageNumber {
    constructor(x, y, value, color = '#fff') {
        this.x = x;
        this.y = y;
        this.value = value;
        this.color = color;
        this.life = 40;
        this.maxLife = 40;
        this.vy = -2;
        this.vx = Utils.randomRange(-0.5, 0.5);
        this.size = typeof value === 'number' ? Math.min(20, 12 + value / 10) : 14;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy *= 0.96;
        this.life--;
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        const scale = 1 + (1 - alpha) * 0.3;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${Math.round(this.size * scale)}px 'Segoe UI'`;
        ctx.textAlign = 'center';
        ctx.fillStyle = this.color;
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 3;
        ctx.strokeText(this.value, this.x, this.y);
        ctx.fillText(this.value, this.x, this.y);
        ctx.restore();
    }

    get isDead() {
        return this.life <= 0;
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.damageNumbers = [];
    }

    emit(x, y, count, options = {}) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, {
                ...options,
                vx: options.vx !== undefined ? options.vx + Utils.randomRange(-1, 1) : Utils.randomRange(-3, 3),
                vy: options.vy !== undefined ? options.vy + Utils.randomRange(-1, 1) : Utils.randomRange(-3, 3),
            }));
        }
    }

    emitCircle(x, y, count, speed, options = {}) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Utils.randomRange(-0.2, 0.2);
            const s = speed + Utils.randomRange(-0.5, 0.5);
            this.particles.push(new Particle(x, y, {
                ...options,
                vx: Math.cos(angle) * s,
                vy: Math.sin(angle) * s,
            }));
        }
    }

    showDamage(x, y, value, color) {
        this.damageNumbers.push(new DamageNumber(x, y, value, color));
    }

    update() {
        this.particles = this.particles.filter(p => {
            p.update();
            return !p.isDead;
        });
        this.damageNumbers = this.damageNumbers.filter(d => {
            d.update();
            return !d.isDead;
        });
    }

    draw(ctx) {
        this.particles.forEach(p => p.draw(ctx));
        this.damageNumbers.forEach(d => d.draw(ctx));
    }

    clear() {
        this.particles = [];
        this.damageNumbers = [];
    }
}
