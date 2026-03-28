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
        this.expMult = 1;
        this.goldMult = 1;
        this.startLevel = 1;

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

        this.weapons = {};
        this.synergies = {};

        this.orbitalCount = 0;
        this.orbitals = [];
        this.orbitalDamageMult = 1;
        this.orbitalKnockback = 2;

        this.lightningLevel = 0;
        this.lightningCooldown = 0;
        this.lightningCooldownMax = 180;
        this.lightningChains = 0;
        this.lightningTargets = 1;

        this.missileCount = 0;
        this.missileCooldown = 0;
        this.missileCooldownMax = 180;
        this.missileAoe = 40;

        this.laserLevel = 0;
        this.laserCooldown = 0;
        this.laserCooldownMax = 300;
        this.laserDuration = 0;
        this.laserActive = 0;
        this.laserAngle = 0;
        this.laserWidth = 8;
        this.laserBeams = 1;

        this.flameLevel = 0;
        this.flameCooldown = 0;
        this.flameCooldownMax = 120;
        this.flameDuration = 0;
        this.flameActive = 0;
        this.flameRange = 80;
        this.flameAngle = Math.PI * 0.4;

        this.frostLevel = 0;
        this.frostRange = 0;
        this.frostSlow = 0;
        this.frostDps = 0;

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

    update(keys, worldWidth, worldHeight, joyDir) {
        this.animPhase += 0.15;
        this.invincible = Math.max(0, this.invincible - 1);

        let dx = 0, dy = 0;
        if (keys['ArrowLeft'] || keys['KeyA']) dx -= 1;
        if (keys['ArrowRight'] || keys['KeyD']) dx += 1;
        if (keys['ArrowUp'] || keys['KeyW']) dy -= 1;
        if (keys['ArrowDown'] || keys['KeyS']) dy += 1;

        if (joyDir && (joyDir.x !== 0 || joyDir.y !== 0)) {
            dx = joyDir.x;
            dy = joyDir.y;
        }

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

        // no world boundary — infinite map

        this.attackTimer = Math.max(0, this.attackTimer - 1);

        this.regenTimer++;
        if (this.regenTimer >= 60 && this.hpRegen > 0) {
            this.regenTimer = 0;
            this.hp = Math.min(this.maxHp, this.hp + this.hpRegen);
        }

        this.lightningCooldown = Math.max(0, this.lightningCooldown - 1);
        this.missileCooldown = Math.max(0, this.missileCooldown - 1);
        this.laserCooldown = Math.max(0, this.laserCooldown - 1);
        this.laserActive = Math.max(0, this.laserActive - 1);
        this.flameCooldown = Math.max(0, this.flameCooldown - 1);
        this.flameActive = Math.max(0, this.flameActive - 1);

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
        const px = this.x;
        const py = this.y + bob;
        const f = this.facing;
        const s = this.size;

        // jetpack flame
        if (this.moving) {
            const flicker = Math.sin(this.animPhase * 6) * 2;
            ctx.fillStyle = '#ff6622';
            ctx.beginPath();
            ctx.moveTo(px - f * 4 - 4, py + s * 0.5);
            ctx.lineTo(px - f * 4, py + s + 4 + flicker);
            ctx.lineTo(px - f * 4 + 4, py + s * 0.5);
            ctx.fill();
            ctx.fillStyle = '#ffcc22';
            ctx.beginPath();
            ctx.moveTo(px - f * 4 - 2, py + s * 0.5);
            ctx.lineTo(px - f * 4, py + s + flicker);
            ctx.lineTo(px - f * 4 + 2, py + s * 0.5);
            ctx.fill();
        }

        // jetpack
        ctx.fillStyle = '#556677';
        ctx.fillRect(px - f * 4 - 5, py - 2, 10, s * 0.8);
        ctx.fillStyle = '#ff4422';
        ctx.beginPath();
        ctx.arc(px - f * 4, py - 2, 3, 0, Math.PI * 2);
        ctx.fill();

        // body (spacesuit)
        ctx.shadowColor = '#4ecdc4';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#dde8f0';
        ctx.beginPath();
        ctx.ellipse(px, py + 3, s * 0.65, s * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // suit belt
        ctx.fillStyle = '#667788';
        ctx.fillRect(px - s * 0.6, py + 2, s * 1.2, 3);

        // suit emblem
        ctx.fillStyle = '#4ecdc4';
        ctx.beginPath();
        ctx.arc(px + f * 3, py - 1, 3, 0, Math.PI * 2);
        ctx.fill();

        // helmet (globe shape)
        const hx = px + f * 1;
        const hy = py - s * 0.55;
        ctx.fillStyle = '#eef4f8';
        ctx.beginPath();
        ctx.arc(hx, hy, s * 0.65, 0, Math.PI * 2);
        ctx.fill();

        // helmet ring
        ctx.strokeStyle = '#99aabb';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(hx, hy, s * 0.65, 0, Math.PI * 2);
        ctx.stroke();

        // visor (reflective)
        const visorGrad = ctx.createLinearGradient(hx - s * 0.4, hy - s * 0.3, hx + s * 0.4, hy + s * 0.3);
        visorGrad.addColorStop(0, '#225588');
        visorGrad.addColorStop(0.5, '#44bbdd');
        visorGrad.addColorStop(1, '#2266aa');
        ctx.fillStyle = visorGrad;
        ctx.beginPath();
        ctx.ellipse(hx + f * 2, hy, s * 0.45, s * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // visor shine
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.ellipse(hx + f * 2 - 3, hy - 3, 3, 2, -0.5, 0, Math.PI * 2);
        ctx.fill();

        // antenna
        ctx.strokeStyle = '#99aabb';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(hx, hy - s * 0.65);
        ctx.lineTo(hx + 2, hy - s * 1.1);
        ctx.stroke();
        const antennaGlow = Math.sin(this.animPhase * 2) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(78, 205, 196, ${antennaGlow})`;
        ctx.shadowColor = '#4ecdc4';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(hx + 2, hy - s * 1.1, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // legs
        const legPhase = this.moving ? Math.sin(this.animPhase * 3) * 4 : 0;
        ctx.strokeStyle = '#dde8f0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(px - 4, py + s * 0.6);
        ctx.lineTo(px - 5 + legPhase, py + s + 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(px + 4, py + s * 0.6);
        ctx.lineTo(px + 5 - legPhase, py + s + 2);
        ctx.stroke();

        // boots
        ctx.fillStyle = '#556677';
        ctx.fillRect(px - 7 + legPhase, py + s, 5, 3);
        ctx.fillRect(px + 3 - legPhase, py + s, 5, 3);

        this.orbitals.forEach(orb => orb.draw(ctx));

        ctx.restore();
    }

    canMissile() { return this.missileCount > 0 && this.missileCooldown <= 0; }
    resetMissileCooldown() { this.missileCooldown = this.missileCooldownMax; }
    canLaser() { return this.laserLevel > 0 && this.laserCooldown <= 0 && this.laserActive <= 0; }
    resetLaserCooldown() { this.laserCooldown = this.laserCooldownMax; }
    canFlame() { return this.flameLevel > 0 && this.flameCooldown <= 0 && this.flameActive <= 0; }
    resetFlameCooldown() { this.flameCooldown = this.flameCooldownMax; }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.baseMaxHp = 100;
        this.maxHp = this.baseMaxHp;
        this.hp = this.maxHp;
        this.level = 1;
        this.exp = 0;
        this.expToNext = 20;
        this.expMult = 1;
        this.goldMult = 1;
        this.startLevel = 1;
        this.baseDamage = 10;
        this.baseAttackCooldown = 30;
        this.baseSpeed = 3;
        this.damageMult = 1;
        this.attackSpeedMult = 1;
        this.moveSpeedMult = 1;
        this.projectileCount = 1;
        this.pierceCount = 0;
        this.projectileSpeed = 8;
        this.homingLevel = 0;
        this.aoeRadius = 0;
        this.weapons = {};
        this.synergies = {};
        this.orbitalCount = 0;
        this.orbitals = [];
        this.orbitalDamageMult = 1;
        this.orbitalKnockback = 2;
        this.lightningLevel = 0;
        this.lightningCooldown = 0;
        this.lightningCooldownMax = 180;
        this.lightningChains = 0;
        this.lightningTargets = 1;
        this.missileCount = 0;
        this.missileCooldown = 0;
        this.missileCooldownMax = 180;
        this.missileAoe = 40;
        this.laserLevel = 0;
        this.laserCooldown = 0;
        this.laserCooldownMax = 300;
        this.laserDuration = 0;
        this.laserActive = 0;
        this.laserAngle = 0;
        this.laserWidth = 8;
        this.laserBeams = 1;
        this.flameLevel = 0;
        this.flameCooldown = 0;
        this.flameCooldownMax = 120;
        this.flameDuration = 0;
        this.flameActive = 0;
        this.flameRange = 80;
        this.flameAngle = Math.PI * 0.4;
        this.frostLevel = 0;
        this.frostRange = 0;
        this.frostSlow = 0;
        this.frostDps = 0;
        this.hpRegen = 0;
        this.regenTimer = 0;
        this.attackTimer = 0;
        this.magnetRange = 80;
        this.kills = 0;
        this.damageDealt = 0;
        this.invincible = 60;
    }
}
