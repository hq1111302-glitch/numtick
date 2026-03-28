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

        this.slowAmount = 0;
        this.slowTimer = 0;
        this.frosted = false;
        this.burning = false;
        this.burnTimer = 0;
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

        const slowMult = this.slowAmount > 0 ? (1 - this.slowAmount) : 1;
        this.x += (this.vx * slowMult) + this.knockbackX;
        this.y += (this.vy * slowMult) + this.knockbackY;

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
        const ex = this.x;
        const ey = this.y + bob;
        const s = this.size;
        const flash = this.hitFlash > 0;

        if (flash) { ctx.shadowColor = '#fff'; ctx.shadowBlur = 20; }
        else if (this.frosted) { ctx.shadowColor = '#88ddff'; ctx.shadowBlur = 12; }
        else if (this.burning) { ctx.shadowColor = '#ff6622'; ctx.shadowBlur = 12; }

        const bc = flash ? '#fff' : this.frosted ? '#88ccdd' : this.burning ? '#ff8855' : this.bodyColor;
        const fc = flash ? '#fff' : this.color;

        if (this.type === 'normal') {
            // alien grunt — round body + 3 eyes
            ctx.fillStyle = bc;
            ctx.beginPath();
            ctx.arc(ex, ey, s, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = fc;
            ctx.beginPath();
            ctx.arc(ex, ey, s * 0.7, 0, Math.PI * 2);
            ctx.fill();
            const ed = this.vx > 0 ? 2 : -2;
            for (let i = -1; i <= 1; i++) {
                ctx.fillStyle = '#ccff44';
                ctx.beginPath();
                ctx.arc(ex + ed + i * 5, ey - 3, 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#111';
                ctx.beginPath();
                ctx.arc(ex + ed + i * 5, ey - 3, 1.2, 0, Math.PI * 2);
                ctx.fill();
            }
            // antennae
            ctx.strokeStyle = fc;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(ex - 4, ey - s); ctx.lineTo(ex - 7, ey - s - 6);
            ctx.moveTo(ex + 4, ey - s); ctx.lineTo(ex + 7, ey - s - 6);
            ctx.stroke();
        } else if (this.type === 'fast') {
            // alien sprinter — elongated, 2 eyes, tail
            ctx.fillStyle = bc;
            ctx.beginPath();
            ctx.ellipse(ex, ey, s * 1.2, s * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = fc;
            ctx.beginPath();
            ctx.ellipse(ex + (this.vx > 0 ? 3 : -3), ey, s * 0.6, s * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
            const dir = this.vx > 0 ? 1 : -1;
            ctx.fillStyle = '#ffee00';
            ctx.beginPath();
            ctx.arc(ex + dir * 4 - 2, ey - 2, 2.5, 0, Math.PI * 2);
            ctx.arc(ex + dir * 4 + 3, ey - 2, 2.5, 0, Math.PI * 2);
            ctx.fill();
            // speed trail
            ctx.strokeStyle = `${this.color}66`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(ex - dir * s, ey);
            ctx.lineTo(ex - dir * s * 1.8, ey + Math.sin(this.animPhase * 3) * 4);
            ctx.stroke();
        } else if (this.type === 'tank') {
            // alien brute — armored hexagonal
            ctx.fillStyle = bc;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI * 2 / 6) * i - Math.PI / 6;
                const px = ex + Math.cos(a) * s;
                const py = ey + Math.sin(a) * s;
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = fc;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI * 2 / 6) * i - Math.PI / 6;
                const px = ex + Math.cos(a) * s * 0.65;
                const py = ey + Math.sin(a) * s * 0.65;
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            // single big eye
            ctx.fillStyle = '#ff2222';
            ctx.beginPath();
            ctx.arc(ex, ey - 2, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.arc(ex, ey - 2, 2.5, 0, Math.PI * 2);
            ctx.fill();
            // armor lines
            ctx.strokeStyle = `${this.color}88`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(ex - s * 0.5, ey - s * 0.3);
            ctx.lineTo(ex + s * 0.5, ey - s * 0.3);
            ctx.moveTo(ex - s * 0.5, ey + s * 0.3);
            ctx.lineTo(ex + s * 0.5, ey + s * 0.3);
            ctx.stroke();
        } else if (this.type === 'ranged') {
            // alien sniper — floating orb + tentacles
            ctx.fillStyle = bc;
            ctx.beginPath();
            ctx.arc(ex, ey - 3, s * 0.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = fc;
            ctx.beginPath();
            ctx.arc(ex, ey - 3, s * 0.55, 0, Math.PI * 2);
            ctx.fill();
            // single targeting eye
            ctx.fillStyle = '#00ffaa';
            ctx.beginPath();
            ctx.arc(ex, ey - 4, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#003322';
            ctx.beginPath();
            ctx.arc(ex + (this.vx > 0 ? 1 : -1), ey - 4, 1.5, 0, Math.PI * 2);
            ctx.fill();
            // tentacles
            ctx.strokeStyle = bc;
            ctx.lineWidth = 2;
            for (let i = -1; i <= 1; i++) {
                ctx.beginPath();
                ctx.moveTo(ex + i * 5, ey + s * 0.3);
                ctx.quadraticCurveTo(ex + i * 7, ey + s * 0.7 + Math.sin(this.animPhase + i) * 3, ex + i * 4, ey + s);
                ctx.stroke();
            }
        } else if (this.type === 'swarm') {
            // alien bug — small + wings
            ctx.fillStyle = bc;
            ctx.beginPath();
            ctx.ellipse(ex, ey, s, s * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = fc;
            ctx.beginPath();
            ctx.ellipse(ex + (this.vx > 0 ? 2 : -2), ey, s * 0.5, s * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            // wings
            const wingFlap = Math.sin(this.animPhase * 6) * 3;
            ctx.fillStyle = `${this.color}44`;
            ctx.beginPath();
            ctx.ellipse(ex - 3, ey - s * 0.5 - wingFlap, 4, 6, -0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(ex + 3, ey - s * 0.5 - wingFlap, 4, 6, 0.3, 0, Math.PI * 2);
            ctx.fill();
            // tiny eyes
            ctx.fillStyle = '#eeff00';
            ctx.beginPath();
            ctx.arc(ex - 2, ey - 1, 1.5, 0, Math.PI * 2);
            ctx.arc(ex + 2, ey - 1, 1.5, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'exploder') {
            // alien bomber — pulsing sphere with cracks
            const pulse = Math.sin(this.animPhase * 3) * 2;
            ctx.fillStyle = bc;
            ctx.beginPath();
            ctx.arc(ex, ey, s + pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = fc;
            ctx.beginPath();
            ctx.arc(ex, ey, (s + pulse) * 0.65, 0, Math.PI * 2);
            ctx.fill();
            // danger cracks
            ctx.strokeStyle = this.exploding ? '#ff0044' : '#ff448888';
            ctx.lineWidth = this.exploding ? 2 : 1;
            for (let i = 0; i < 4; i++) {
                const a = (Math.PI * 2 / 4) * i + this.animPhase * 0.5;
                ctx.beginPath();
                ctx.moveTo(ex, ey);
                ctx.lineTo(ex + Math.cos(a) * (s + pulse) * 0.9, ey + Math.sin(a) * (s + pulse) * 0.9);
                ctx.stroke();
            }
            // warning eye
            ctx.fillStyle = this.exploding ? '#ff0044' : '#ff8866';
            ctx.beginPath();
            ctx.arc(ex, ey, 3, 0, Math.PI * 2);
            ctx.fill();

            if (this.exploding) {
                ctx.strokeStyle = `rgba(255, 0, 68, ${0.3 + Math.sin(this.animPhase * 3) * 0.3})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(ex, ey, this.explodeRange, 0, Math.PI * 2);
                ctx.stroke();
            }
        } else {
            // fallback
            ctx.fillStyle = bc;
            ctx.beginPath();
            ctx.arc(ex, ey, s, 0, Math.PI * 2);
            ctx.fill();
        }

        // HP bar
        if (this.hp < this.maxHp) {
            const barW = s * 2;
            const barH = 4;
            const barX = ex - barW / 2;
            const barY = ey - s - 10;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.fillStyle = this.isBoss ? '#ff4444' : '#44ff44';
            ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), barH);
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
        const slowMult = this.slowAmount > 0 ? (1 - this.slowAmount * 0.5) : 1;
        const moveSpeed = this.speed * slowMult;

        if (this.currentAbility === 'charge') {
            this.x += this.knockbackX + Math.cos(angle) * moveSpeed * 4;
            this.y += this.knockbackY + Math.sin(angle) * moveSpeed * 4;
        } else {
            this.x += this.knockbackX + Math.cos(angle) * moveSpeed;
            this.y += this.knockbackY + Math.sin(angle) * moveSpeed;
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
        const bx = this.x;
        const by = this.y;
        const s = this.size;
        const pulse = Math.sin(this.animPhase) * 3;
        const flash = this.hitFlash > 0;

        // outer energy field
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 35;
        ctx.fillStyle = `${this.bodyColor}22`;
        ctx.beginPath();
        ctx.arc(bx, by, s + 15 + pulse, 0, Math.PI * 2);
        ctx.fill();

        // rotating energy ring
        ctx.strokeStyle = `${this.color}66`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(bx, by, s + 10 + pulse, this.phaseAngle, this.phaseAngle + Math.PI * 1.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(bx, by, s + 10 + pulse, this.phaseAngle + Math.PI, this.phaseAngle + Math.PI * 2.2);
        ctx.stroke();

        // main body — alien mothership / commander
        if (flash) {
            ctx.fillStyle = '#fff';
        } else {
            const grad = ctx.createRadialGradient(bx, by, 0, bx, by, s);
            grad.addColorStop(0, this.color);
            grad.addColorStop(0.6, this.bodyColor);
            grad.addColorStop(1, '#000');
            ctx.fillStyle = grad;
        }
        ctx.beginPath();
        ctx.arc(bx, by, s + pulse, 0, Math.PI * 2);
        ctx.fill();

        // armor plates
        ctx.strokeStyle = flash ? '#fff' : `${this.color}aa`;
        ctx.lineWidth = 2.5;
        const plates = 6;
        for (let i = 0; i < plates; i++) {
            const a = this.phaseAngle * 0.5 + (Math.PI * 2 / plates) * i;
            const r1 = (s + pulse) * 0.5;
            const r2 = (s + pulse) * 0.95;
            ctx.beginPath();
            ctx.arc(bx, by, r2, a - 0.2, a + 0.2);
            ctx.stroke();
        }

        // tentacles / appendages
        ctx.strokeStyle = flash ? '#fff' : this.bodyColor;
        ctx.lineWidth = 4;
        const tentacles = 6;
        for (let i = 0; i < tentacles; i++) {
            const a = this.phaseAngle + (Math.PI * 2 / tentacles) * i;
            const wave = Math.sin(this.animPhase * 2 + i * 1.5) * 8;
            const startR = s + pulse;
            const endR = startR + 20 + Math.sin(this.animPhase + i) * 5;
            const mx = bx + Math.cos(a) * (startR + endR) * 0.5 + Math.cos(a + Math.PI / 2) * wave * 0.5;
            const my = by + Math.sin(a) * (startR + endR) * 0.5 + Math.sin(a + Math.PI / 2) * wave * 0.5;
            ctx.beginPath();
            ctx.moveTo(bx + Math.cos(a) * startR, by + Math.sin(a) * startR);
            ctx.quadraticCurveTo(mx, my, bx + Math.cos(a) * endR + wave * Math.cos(a + 1), by + Math.sin(a) * endR + wave * Math.sin(a + 1));
            ctx.stroke();
            // tentacle tip glow
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(bx + Math.cos(a) * endR + wave * Math.cos(a + 1), by + Math.sin(a) * endR + wave * Math.sin(a + 1), 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // central eye
        const eyeGlow = Math.sin(this.animPhase * 2) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(255,255,255,${eyeGlow})`;
        ctx.beginPath();
        ctx.arc(bx, by - s * 0.15, s * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = flash ? '#fff' : '#ff0022';
        ctx.beginPath();
        ctx.arc(bx, by - s * 0.15, s * 0.18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(bx, by - s * 0.15, s * 0.08, 0, Math.PI * 2);
        ctx.fill();

        // side eyes
        ctx.fillStyle = `rgba(255,100,100,${eyeGlow})`;
        ctx.beginPath();
        ctx.arc(bx - s * 0.4, by, s * 0.12, 0, Math.PI * 2);
        ctx.arc(bx + s * 0.4, by, s * 0.12, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;

        // HP bar
        const barW = s * 3;
        const barH = 6;
        const barX = bx - barW / 2;
        const barY = by - s - 30;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
        ctx.fillStyle = '#ff2222';
        ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), barH);

        // name
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#ff6666';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, bx, barY - 6);

        ctx.restore();
    }
}
