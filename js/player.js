class ExpOrb {
    constructor(x, y, value) {
        this.x = x;
        this.y = y;
        this.value = value;
        this.size = Math.min(8, 3 + value / 10);
        this.color = value >= 50 ? '#ffd700' : value >= 20 ? '#44ddff' : '#44ff88';
        this.alive = true;
        this.magnetized = false;
        this.animPhase = Math.random() * Math.PI * 2;
    }

    update(playerX, playerY, magnetRange) {
        this.animPhase += 0.1;
        const dist = Utils.distance(this.x, this.y, playerX, playerY);

        if (dist < magnetRange) {
            this.magnetized = true;
        }

        if (this.magnetized) {
            const angle = Utils.angle(this.x, this.y, playerX, playerY);
            const speed = Math.max(3, 10 - dist * 0.02);
            this.x += Math.cos(angle) * speed;
            this.y += Math.sin(angle) * speed;
        }

        if (dist < 20) {
            this.alive = false;
            return this.value;
        }
        return 0;
    }

    draw(ctx) {
        const bob = Math.sin(this.animPhase) * 2;
        ctx.save();
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y + bob, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.arc(this.x - 1, this.y + bob - 1, this.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 16;
        this.baseSpeed = 3;
        this.moveSpeedMult = 1;

        this.baseMaxHp = 100;
        this.maxHp = 100;
        this.hp = 100;
        this.hpRegen = 0;
        this.regenTimer = 0;

        this.level = 1;
        this.exp = 0;
        this.expToNext = 20;

        this.baseDamage = 10;
        this.damageMult = 1;
        this.baseAttackCooldown = 30;
        this.attackSpeedMult = 1;
        this.attackTimer = 0;
        this.projectileCount = 1;
        this.pierceCount = 0;
        this.projectileSpeed = 8;
        this.homingLevel = 0;
        this.aoeRadius = 0;

        this.orbitalCount = 0;
        this.orbitals = [];

        this.lightningLevel = 0;
        this.lightningCooldown = 0;
        this.lightningCooldownMax = 180;

        this.magnetRange = 80;
        this.invincible = 0;

        this.kills = 0;
        this.damageDealt = 0;

        this.animPhase = 0;
        this.facing = 1;
        this.moving = false;

        this.vx = 0;
        this.vy = 0;
    }

    get speed() {
        return this.baseSpeed * this.moveSpeedMult;
    }

    get attackCooldown() {
        return Math.max(5, Math.round(this.baseAttackCooldown / this.attackSpeedMult));
    }

    get damage() {
        return Math.round(this.baseDamage * this.damageMult);
    }

    update(keys, worldWidth, worldHeight) {
        this.animPhase += 0.15;
        this.invincible = Math.max(0, this.invincible - 1);

        let dx = 0, dy = 0;
        if (keys['ArrowLeft'] || keys['KeyA']) dx -= 1;
        if (keys['ArrowRight'] || keys['KeyD']) dx += 1;
        if (keys['ArrowUp'] || keys['KeyW']) dy -= 1;
        if (keys['ArrowDown'] || keys['KeyS']) dy += 1;

        this.moving = dx !== 0 || dy !== 0;
        if (this.moving) {
            const len = Math.sqrt(dx * dx + dy * dy);
            dx /= len;
            dy /= len;
            if (dx !== 0) this.facing = dx > 0 ? 1 : -1;
        }

        this.vx = dx * this.speed;
        this.vy = dy * this.speed;
        this.x += this.vx;
        this.y += this.vy;

        this.x = Utils.clamp(this.x, this.size, worldWidth - this.size);
        this.y = Utils.clamp(this.y, this.size, worldHeight - this.size);

        this.attackTimer = Math.max(0, this.attackTimer - 1);

        this.regenTimer++;
        if (this.regenTimer >= 60 && this.hpRegen > 0) {
            this.regenTimer = 0;
            this.hp = Math.min(this.maxHp, this.hp + this.hpRegen);
        }

        this.lightningCooldown = Math.max(0, this.lightningCooldown - 1);

        this.updateOrbitals();
    }

    updateOrbitals() {
        while (this.orbitals.length < this.orbitalCount) {
            this.orbitals.push(new OrbitalProjectile(
                this, this.orbitals.length, this.orbitalCount
            ));
        }
        while (this.orbitals.length > this.orbitalCount) {
            this.orbitals.pop();
        }
        if (this.orbitals.length > 0) {
            this.orbitals.forEach((orb, i) => {
                orb.total = this.orbitalCount;
                orb.angle = (Math.PI * 2 / this.orbitalCount) * i + this.animPhase * 0.5;
                orb.update();
            });
        }
    }

    takeDamage(amount) {
        if (this.invincible > 0) return 0;
        this.hp -= amount;
        this.invincible = 20;
        if (this.hp <= 0) {
            this.hp = 0;
        }
        return amount;
    }

    addExp(amount) {
        this.exp += amount;
        let leveledUp = false;
        while (this.exp >= this.expToNext) {
            this.exp -= this.expToNext;
            this.level++;
            this.expToNext = Math.round(20 + this.level * 8 + Math.pow(this.level, 1.5) * 2);
            leveledUp = true;
        }
        return leveledUp;
    }

    canShoot() {
        return this.attackTimer <= 0;
    }

    shoot(targetX, targetY) {
        this.attackTimer = this.attackCooldown;
        const projectiles = [];
        const baseAngle = Utils.angle(this.x, this.y, targetX, targetY);
        const spread = 0.15;

        for (let i = 0; i < this.projectileCount; i++) {
            let angle;
            if (this.projectileCount === 1) {
                angle = baseAngle;
            } else {
                const offset = (i - (this.projectileCount - 1) / 2) * spread;
                angle = baseAngle + offset;
            }

            projectiles.push(new Projectile(this.x, this.y, angle, {
                damage: this.damage,
                speed: this.projectileSpeed,
                pierce: this.pierceCount,
                homing: this.homingLevel > 0,
                homingStrength: 0.02 + this.homingLevel * 0.015,
                aoe: this.aoeRadius,
                color: this.aoeRadius > 0 ? '#ff8844' : '#ffdd44',
                size: this.aoeRadius > 0 ? 6 : 4
            }));
        }
        return projectiles;
    }

    canLightning() {
        return this.lightningLevel > 0 && this.lightningCooldown <= 0;
    }

    resetLightningCooldown() {
        this.lightningCooldown = this.lightningCooldownMax;
    }

    draw(ctx) {
        ctx.save();

        if (this.invincible > 0 && Math.floor(this.invincible / 3) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        const bob = this.moving ? Math.sin(this.animPhase * 2) * 2 : Math.sin(this.animPhase * 0.5) * 1;

        ctx.shadowColor = '#4ecdc4';
        ctx.shadowBlur = 15;

        ctx.fillStyle = '#2a5a6a';
        ctx.beginPath();
        ctx.arc(this.x, this.y + bob, this.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#4ecdc4';
        ctx.beginPath();
        ctx.arc(this.x, this.y + bob, this.size * 0.75, 0, Math.PI * 2);
        ctx.fill();

        const eyeX = this.facing * 4;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x + eyeX - 3, this.y + bob - 2, 4, 0, Math.PI * 2);
        ctx.arc(this.x + eyeX + 3, this.y + bob - 2, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.arc(this.x + eyeX - 3 + this.facing, this.y + bob - 2, 2, 0, Math.PI * 2);
        ctx.arc(this.x + eyeX + 3 + this.facing, this.y + bob - 2, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#4ecdc4';
        ctx.beginPath();
        ctx.arc(this.x - this.facing * 2, this.y + bob + 5, 3, 0, Math.PI * 2);
        ctx.fill();

        this.orbitals.forEach(orb => orb.draw(ctx));

        ctx.restore();
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.maxHp = this.baseMaxHp;
        this.hp = this.maxHp;
        this.level = 1;
        this.exp = 0;
        this.expToNext = 20;
        this.damageMult = 1;
        this.attackSpeedMult = 1;
        this.moveSpeedMult = 1;
        this.projectileCount = 1;
        this.pierceCount = 0;
        this.homingLevel = 0;
        this.aoeRadius = 0;
        this.orbitalCount = 0;
        this.orbitals = [];
        this.lightningLevel = 0;
        this.lightningCooldown = 0;
        this.hpRegen = 0;
        this.magnetRange = 80;
        this.kills = 0;
        this.damageDealt = 0;
        this.invincible = 60;
    }
}
