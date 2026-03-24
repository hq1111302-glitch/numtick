class Projectile {
    constructor(x, y, angle, options = {}) {
        this.x = x;
        this.y = y;
        this.speed = options.speed || 8;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.damage = options.damage || 10;
        this.size = options.size || 4;
        this.color = options.color || '#ffdd44';
        this.pierce = options.pierce || 0;
        this.pierced = 0;
        this.life = options.life || 120;
        this.trail = [];
        this.trailLength = options.trailLength || 5;
        this.type = options.type || 'bullet';
        this.homing = options.homing || false;
        this.homingStrength = options.homingStrength || 0.03;
        this.aoe = options.aoe || 0;
        this.knockback = options.knockback || 2;
    }

    update(enemies) {
        if (this.homing && enemies.length > 0) {
            let closest = null;
            let closestDist = Infinity;
            for (const e of enemies) {
                const d = Utils.distance(this.x, this.y, e.x, e.y);
                if (d < closestDist) {
                    closestDist = d;
                    closest = e;
                }
            }
            if (closest) {
                const targetAngle = Utils.angle(this.x, this.y, closest.x, closest.y);
                const currentAngle = Math.atan2(this.vy, this.vx);
                let diff = targetAngle - currentAngle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                const newAngle = currentAngle + diff * this.homingStrength;
                this.vx = Math.cos(newAngle) * this.speed;
                this.vy = Math.sin(newAngle) * this.speed;
            }
        }

        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.trailLength) this.trail.shift();

        this.x += this.vx;
        this.y += this.vy;
        this.life--;
    }

    draw(ctx) {
        for (let i = 0; i < this.trail.length; i++) {
            const t = this.trail[i];
            const alpha = (i / this.trail.length) * 0.5;
            const size = this.size * (i / this.trail.length);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.save();
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    get isDead() {
        return this.life <= 0;
    }
}

class OrbitalProjectile {
    constructor(player, index, total, options = {}) {
        this.player = player;
        this.index = index;
        this.total = total;
        this.orbitRadius = options.orbitRadius || 80;
        this.speed = options.speed || 0.03;
        this.damage = options.damage || 15;
        this.size = options.size || 8;
        this.color = options.color || '#88ccff';
        this.angle = (Math.PI * 2 / total) * index;
        this.hitCooldowns = new Map();
    }

    update() {
        this.angle += this.speed;
        this.x = this.player.x + Math.cos(this.angle) * this.orbitRadius;
        this.y = this.player.y + Math.sin(this.angle) * this.orbitRadius;

        this.hitCooldowns.forEach((val, key) => {
            if (val <= 0) this.hitCooldowns.delete(key);
            else this.hitCooldowns.set(key, val - 1);
        });
    }

    canHit(enemy) {
        return !this.hitCooldowns.has(enemy);
    }

    recordHit(enemy) {
        this.hitCooldowns.set(enemy, 30);
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class LightningBolt {
    constructor(x, y, targetX, targetY, damage, chainCount = 0) {
        this.x = x;
        this.y = y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.damage = damage;
        this.chainCount = chainCount;
        this.life = 12;
        this.maxLife = 12;
        this.points = this._generatePoints();
    }

    _generatePoints() {
        const points = [{ x: this.x, y: this.y }];
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const segments = 6;
        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            points.push({
                x: this.x + dx * t + Utils.randomRange(-20, 20),
                y: this.y + dy * t + Utils.randomRange(-20, 20)
            });
        }
        points.push({ x: this.targetX, y: this.targetY });
        return points;
    }

    update() {
        this.life--;
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#aaddff';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#44aaff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }

    get isDead() {
        return this.life <= 0;
    }
}
