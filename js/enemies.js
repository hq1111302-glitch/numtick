const EnemyTypes = {
    normal: {
        name: '졸개',
        hp: 30,
        speed: 1.2,
        damage: 8,
        size: 14,
        color: '#ff6666',
        exp: 10,
        bodyColor: '#cc3333'
    },
    fast: {
        name: '돌격병',
        hp: 20,
        speed: 2.5,
        damage: 6,
        size: 10,
        color: '#ffaa44',
        exp: 12,
        bodyColor: '#cc8833'
    },
    tank: {
        name: '탱커',
        hp: 100,
        speed: 0.6,
        damage: 15,
        size: 22,
        color: '#8866cc',
        exp: 25,
        bodyColor: '#6644aa'
    },
    ranged: {
        name: '사격병',
        hp: 25,
        speed: 0.8,
        damage: 12,
        size: 12,
        color: '#44ccaa',
        exp: 15,
        bodyColor: '#339988',
        shootRange: 250,
        shootCooldown: 90
    },
    swarm: {
        name: '벌레',
        hp: 10,
        speed: 1.8,
        damage: 4,
        size: 8,
        color: '#aacc44',
        exp: 5,
        bodyColor: '#88aa22'
    },
    exploder: {
        name: '폭탄병',
        hp: 40,
        speed: 1.5,
        damage: 25,
        size: 16,
        color: '#ff4488',
        exp: 20,
        bodyColor: '#cc2266',
        explodeRange: 60
    }
};

const BossTypes = {
    stage1: {
        name: '어둠의 장군',
        hp: 800,
        speed: 0.8,
        damage: 20,
        size: 40,
        color: '#ff2222',
        exp: 200,
        bodyColor: '#aa0000',
        abilities: ['charge', 'summon']
    },
    stage2: {
        name: '폭풍의 마왕',
        hp: 2000,
        speed: 0.6,
        damage: 30,
        size: 50,
        color: '#aa44ff',
        exp: 500,
        bodyColor: '#8822dd',
        abilities: ['spiral', 'summon', 'teleport']
    },
    stage3: {
        name: '최종 보스: 카오스',
        hp: 5000,
        speed: 0.5,
        damage: 40,
        size: 60,
        color: '#ff0044',
        exp: 1000,
        bodyColor: '#cc0033',
        abilities: ['charge', 'spiral', 'summon', 'teleport', 'laser']
    }
};

class Enemy {
    constructor(x, y, type, scaleFactor = 1) {
        const template = EnemyTypes[type];
        this.x = x;
        this.y = y;
        this.type = type;
        this.maxHp = Math.round(template.hp * scaleFactor);
        this.hp = this.maxHp;
        this.speed = template.speed;
        this.damage = Math.round(template.damage * scaleFactor);
        this.size = template.size;
        this.color = template.color;
        this.bodyColor = template.bodyColor;
        this.exp = Math.round(template.exp * Math.sqrt(scaleFactor));
        this.vx = 0;
        this.vy = 0;
        this.knockbackX = 0;
        this.knockbackY = 0;
        this.hitFlash = 0;
        this.isBoss = false;
        this.alive = true;
        this.id = Math.random();

        if (type === 'ranged') {
            this.shootRange = template.shootRange;
            this.shootCooldown = template.shootCooldown;
            this.shootTimer = this.shootCooldown;
        }
        if (type === 'exploder') {
            this.explodeRange = template.explodeRange;
            this.exploding = false;
            this.explodeTimer = 0;
        }

        this.animPhase = Math.random() * Math.PI * 2;
    }

    update(playerX, playerY) {
        this.animPhase += 0.1;
        this.hitFlash = Math.max(0, this.hitFlash - 1);

        this.knockbackX *= 0.85;
        this.knockbackY *= 0.85;

        const angle = Utils.angle(this.x, this.y, playerX, playerY);
        const dist = Utils.distance(this.x, this.y, playerX, playerY);

        if (this.type === 'ranged' && dist < this.shootRange) {
            this.vx *= 0.9;
            this.vy *= 0.9;
        } else {
            this.vx = Math.cos(angle) * this.speed;
            this.vy = Math.sin(angle) * this.speed;
        }

        if (this.type === 'exploder' && dist < this.explodeRange) {
            this.exploding = true;
        }

        this.x += this.vx + this.knockbackX;
        this.y += this.vy + this.knockbackY;

        if (this.type === 'ranged') {
            this.shootTimer--;
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.hitFlash = 6;
        if (this.hp <= 0) {
            this.alive = false;
        }
    }

    applyKnockback(angle, force) {
        this.knockbackX += Math.cos(angle) * force;
        this.knockbackY += Math.sin(angle) * force;
    }

    draw(ctx) {
        ctx.save();
        const bob = Math.sin(this.animPhase) * 2;

        if (this.hitFlash > 0) {
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 20;
        }

        ctx.fillStyle = this.hitFlash > 0 ? '#fff' : this.bodyColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y + bob, this.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.hitFlash > 0 ? '#fff' : this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y + bob, this.size * 0.7, 0, Math.PI * 2);
        ctx.fill();

        const eyeOffX = this.vx > 0 ? 3 : -3;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x + eyeOffX - 3, this.y + bob - 3, 3, 0, Math.PI * 2);
        ctx.arc(this.x + eyeOffX + 3, this.y + bob - 3, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(this.x + eyeOffX - 3, this.y + bob - 3, 1.5, 0, Math.PI * 2);
        ctx.arc(this.x + eyeOffX + 3, this.y + bob - 3, 1.5, 0, Math.PI * 2);
        ctx.fill();

        if (this.hp < this.maxHp) {
            const barWidth = this.size * 2;
            const barHeight = 4;
            const barX = this.x - barWidth / 2;
            const barY = this.y - this.size - 10 + bob;

            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            ctx.fillStyle = this.isBoss ? '#ff4444' : '#44ff44';
            ctx.fillRect(barX, barY, barWidth * (this.hp / this.maxHp), barHeight);
        }

        if (this.type === 'exploder' && this.exploding) {
            ctx.strokeStyle = `rgba(255, 68, 136, ${0.3 + Math.sin(this.animPhase * 3) * 0.3})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.explodeRange, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    canShoot() {
        return this.type === 'ranged' && this.shootTimer <= 0;
    }

    resetShootTimer() {
        this.shootTimer = this.shootCooldown;
    }
}

class Boss extends Enemy {
    constructor(x, y, bossType, scaleFactor = 1) {
        const template = BossTypes[bossType];
        super(x, y, 'normal', 1);
        this.maxHp = Math.round(template.hp * scaleFactor);
        this.hp = this.maxHp;
        this.speed = template.speed;
        this.damage = Math.round(template.damage * scaleFactor);
        this.size = template.size;
        this.color = template.color;
        this.bodyColor = template.bodyColor;
        this.exp = template.exp;
        this.name = template.name;
        this.isBoss = true;
        this.abilities = template.abilities;
        this.abilityTimer = 120;
        this.currentAbility = null;
        this.abilityDuration = 0;
        this.bossType = bossType;
        this.phaseAngle = 0;
    }

    update(playerX, playerY) {
        this.animPhase += 0.05;
        this.phaseAngle += 0.02;
        this.hitFlash = Math.max(0, this.hitFlash - 1);
        this.knockbackX *= 0.9;
        this.knockbackY *= 0.9;

        this.abilityTimer--;
        if (this.abilityDuration > 0) {
            this.abilityDuration--;
        }

        const angle = Utils.angle(this.x, this.y, playerX, playerY);

        if (this.currentAbility === 'charge') {
            this.x += this.knockbackX + Math.cos(angle) * this.speed * 4;
            this.y += this.knockbackY + Math.sin(angle) * this.speed * 4;
        } else {
            this.x += this.knockbackX + Math.cos(angle) * this.speed;
            this.y += this.knockbackY + Math.sin(angle) * this.speed;
        }

        if (this.abilityDuration <= 0) {
            this.currentAbility = null;
        }
    }

    shouldUseAbility() {
        return this.abilityTimer <= 0 && !this.currentAbility;
    }

    useAbility(playerX, playerY) {
        const ability = this.abilities[Utils.randomInt(0, this.abilities.length - 1)];
        this.currentAbility = ability;
        this.abilityTimer = Utils.randomInt(120, 240);

        switch (ability) {
            case 'charge':
                this.abilityDuration = 30;
                return { type: 'charge' };
            case 'summon':
                this.abilityDuration = 10;
                return { type: 'summon', count: Utils.randomInt(3, 6) };
            case 'spiral':
                this.abilityDuration = 60;
                return { type: 'spiral', x: this.x, y: this.y };
            case 'teleport':
                this.abilityDuration = 10;
                return { type: 'teleport', targetX: playerX, targetY: playerY };
            case 'laser':
                this.abilityDuration = 90;
                return { type: 'laser', angle: Utils.angle(this.x, this.y, playerX, playerY) };
            default:
                return null;
        }
    }

    draw(ctx) {
        ctx.save();

        const pulse = Math.sin(this.animPhase) * 3;
        const outerGlow = this.size + 10 + pulse;

        ctx.shadowColor = this.color;
        ctx.shadowBlur = 30;

        ctx.fillStyle = `${this.bodyColor}44`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, outerGlow, 0, Math.PI * 2);
        ctx.fill();

        if (this.hitFlash > 0) {
            ctx.fillStyle = '#fff';
        } else {
            const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
            grad.addColorStop(0, this.color);
            grad.addColorStop(1, this.bodyColor);
            ctx.fillStyle = grad;
        }
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size + pulse, 0, Math.PI * 2);
        ctx.fill();

        const spikes = 8;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        for (let i = 0; i < spikes; i++) {
            const a = this.phaseAngle + (Math.PI * 2 / spikes) * i;
            const innerR = this.size + pulse;
            const outerR = innerR + 15 + Math.sin(this.animPhase + i) * 5;
            ctx.beginPath();
            ctx.moveTo(
                this.x + Math.cos(a) * innerR,
                this.y + Math.sin(a) * innerR
            );
            ctx.lineTo(
                this.x + Math.cos(a) * outerR,
                this.y + Math.sin(a) * outerR
            );
            ctx.stroke();
        }

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x - 10, this.y - 5, 6, 0, Math.PI * 2);
        ctx.arc(this.x + 10, this.y - 5, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(this.x - 10, this.y - 5, 3, 0, Math.PI * 2);
        ctx.arc(this.x + 10, this.y - 5, 3, 0, Math.PI * 2);
        ctx.fill();

        const barWidth = this.size * 3;
        const barHeight = 6;
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.size - 25;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
        ctx.fillStyle = '#ff2222';
        ctx.fillRect(barX, barY, barWidth * (this.hp / this.maxHp), barHeight);

        ctx.font = 'bold 12px Segoe UI';
        ctx.fillStyle = '#ff6666';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x, barY - 6);

        ctx.restore();
    }
}
