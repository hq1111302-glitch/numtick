class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();

        this.WORLD_WIDTH = 2400;
        this.WORLD_HEIGHT = 2400;

        this.keys = {};
        this.state = 'menu'; // menu, playing, paused, levelup, gameover
        this.gameTime = 0;
        this.stage = 1;
        this.stageTimer = 0;
        this.stageDuration = 60 * 60; // 60 seconds per stage at 60fps
        this.bossSpawned = false;
        this.bossDefeated = false;

        this.player = new Player(this.WORLD_WIDTH / 2, this.WORLD_HEIGHT / 2);
        this.skillManager = new SkillManager();
        this.particleSystem = new ParticleSystem();

        this.enemies = [];
        this.projectiles = [];
        this.enemyProjectiles = [];
        this.lightningBolts = [];
        this.expOrbs = [];

        this.camera = { x: 0, y: 0 };
        this.spawnTimer = 0;
        this.spawnInterval = 60;
        this.difficultyMult = 1;

        this.screenShake = 0;
        this.screenShakeIntensity = 0;

        this._setupInput();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.screenW = this.canvas.width;
        this.screenH = this.canvas.height;
    }

    _setupInput() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    start() {
        this.state = 'playing';
        this.gameTime = 0;
        this.stage = 1;
        this.stageTimer = 0;
        this.bossSpawned = false;
        this.bossDefeated = false;
        this.enemies = [];
        this.projectiles = [];
        this.enemyProjectiles = [];
        this.lightningBolts = [];
        this.expOrbs = [];
        this.difficultyMult = 1;
        this.spawnInterval = 60;
        this.player.reset(this.WORLD_WIDTH / 2, this.WORLD_HEIGHT / 2);
        this.skillManager.reset();
        this.particleSystem.clear();
        this.updateUI();

        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('hud').style.display = 'flex';
    }

    update() {
        if (this.state !== 'playing') return;

        this.gameTime++;
        this.stageTimer++;

        this.difficultyMult = 1 + (this.gameTime / 3600) * 0.5 + (this.stage - 1) * 0.3;

        this.spawnInterval = Math.max(15, 60 - this.stage * 5 - Math.floor(this.gameTime / 600));

        this.player.update(this.keys, this.WORLD_WIDTH, this.WORLD_HEIGHT);

        this._updateCamera();
        this._handleSpawning();
        this._handleAutoAttack();
        this._handleLightning();
        this._updateProjectiles();
        this._updateEnemies();
        this._updateExpOrbs();
        this._checkCollisions();
        this._updateStageProgress();
        this.particleSystem.update();

        this._updateScreenShake();
        this.updateUI();

        if (this.player.hp <= 0) {
            this.gameOver();
        }
    }

    _updateCamera() {
        const targetX = this.player.x - this.screenW / 2;
        const targetY = this.player.y - this.screenH / 2;
        this.camera.x = Utils.lerp(this.camera.x, targetX, 0.1);
        this.camera.y = Utils.lerp(this.camera.y, targetY, 0.1);
        this.camera.x = Utils.clamp(this.camera.x, 0, this.WORLD_WIDTH - this.screenW);
        this.camera.y = Utils.clamp(this.camera.y, 0, this.WORLD_HEIGHT - this.screenH);
    }

    _handleSpawning() {
        this.spawnTimer++;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this._spawnEnemyWave();
        }
    }

    _spawnEnemyWave() {
        const count = Utils.randomInt(1, 2 + Math.floor(this.stage * 0.5));
        const spawnDist = Math.max(this.screenW, this.screenH) * 0.6;

        for (let i = 0; i < count; i++) {
            const pos = Utils.randomPointOnCircle(this.player.x, this.player.y, spawnDist + Utils.randomRange(0, 100));
            pos.x = Utils.clamp(pos.x, 20, this.WORLD_WIDTH - 20);
            pos.y = Utils.clamp(pos.y, 20, this.WORLD_HEIGHT - 20);

            const typeRoll = Math.random();
            let type;
            if (this.stage >= 3 && typeRoll < 0.05) type = 'exploder';
            else if (this.stage >= 2 && typeRoll < 0.15) type = 'ranged';
            else if (typeRoll < 0.25) type = 'tank';
            else if (typeRoll < 0.45) type = 'fast';
            else if (typeRoll < 0.6) type = 'swarm';
            else type = 'normal';

            this.enemies.push(new Enemy(pos.x, pos.y, type, this.difficultyMult));
        }
    }

    _handleAutoAttack() {
        if (!this.player.canShoot() || this.enemies.length === 0) return;

        let closest = null;
        let closestDist = Infinity;
        for (const e of this.enemies) {
            const d = Utils.distance(this.player.x, this.player.y, e.x, e.y);
            if (d < closestDist && d < 500) {
                closestDist = d;
                closest = e;
            }
        }

        if (closest) {
            const newProjectiles = this.player.shoot(closest.x, closest.y);
            this.projectiles.push(...newProjectiles);
        }
    }

    _handleLightning() {
        if (!this.player.canLightning() || this.enemies.length === 0) return;

        this.player.resetLightningCooldown();
        let closest = null;
        let closestDist = Infinity;
        for (const e of this.enemies) {
            const d = Utils.distance(this.player.x, this.player.y, e.x, e.y);
            if (d < closestDist && d < 400) {
                closestDist = d;
                closest = e;
            }
        }

        if (!closest) return;

        const damage = this.player.damage * 1.5;
        this._chainLightning(this.player.x, this.player.y, closest, damage, this.player.lightningLevel, new Set());
    }

    _chainLightning(fromX, fromY, target, damage, chainsLeft, hitSet) {
        if (!target || chainsLeft <= 0) return;

        this.lightningBolts.push(new LightningBolt(fromX, fromY, target.x, target.y, damage));
        target.takeDamage(damage);
        this.particleSystem.showDamage(target.x, target.y - target.size, Math.round(damage), '#88ccff');
        this.particleSystem.emitCircle(target.x, target.y, 6, 2, { color: '#88ccff', life: 15, size: 3 });
        hitSet.add(target);

        if (chainsLeft > 1) {
            let nextTarget = null;
            let nextDist = Infinity;
            for (const e of this.enemies) {
                if (hitSet.has(e) || !e.alive) continue;
                const d = Utils.distance(target.x, target.y, e.x, e.y);
                if (d < nextDist && d < 200) {
                    nextDist = d;
                    nextTarget = e;
                }
            }
            if (nextTarget) {
                this._chainLightning(target.x, target.y, nextTarget, damage * 0.8, chainsLeft - 1, hitSet);
            }
        }

        this._checkEnemyDeath(target);
    }

    _updateProjectiles() {
        this.projectiles = this.projectiles.filter(p => {
            p.update(this.enemies);
            if (p.x < -50 || p.x > this.WORLD_WIDTH + 50 ||
                p.y < -50 || p.y > this.WORLD_HEIGHT + 50) return false;
            return !p.isDead;
        });

        this.enemyProjectiles = this.enemyProjectiles.filter(p => {
            p.update([]);
            if (p.x < -50 || p.x > this.WORLD_WIDTH + 50 ||
                p.y < -50 || p.y > this.WORLD_HEIGHT + 50) return false;
            return !p.isDead;
        });

        this.lightningBolts = this.lightningBolts.filter(lb => {
            lb.update();
            return !lb.isDead;
        });
    }

    _updateEnemies() {
        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            enemy.update(this.player.x, this.player.y);

            if (enemy.canShoot && enemy.canShoot()) {
                const angle = Utils.angle(enemy.x, enemy.y, this.player.x, this.player.y);
                this.enemyProjectiles.push(new Projectile(enemy.x, enemy.y, angle, {
                    damage: enemy.damage,
                    speed: 4,
                    color: '#ff4466',
                    size: 5,
                    life: 180
                }));
                enemy.resetShootTimer();
            }

            if (enemy.isBoss && enemy.shouldUseAbility()) {
                const ability = enemy.useAbility(this.player.x, this.player.y);
                this._handleBossAbility(enemy, ability);
            }
        }

        this.enemies = this.enemies.filter(e => e.alive);
    }

    _handleBossAbility(boss, ability) {
        if (!ability) return;

        switch (ability.type) {
            case 'summon': {
                for (let i = 0; i < ability.count; i++) {
                    const pos = Utils.randomPointOnCircle(boss.x, boss.y, 80);
                    const types = ['normal', 'fast', 'swarm'];
                    const type = types[Utils.randomInt(0, types.length - 1)];
                    this.enemies.push(new Enemy(pos.x, pos.y, type, this.difficultyMult));
                }
                this.particleSystem.emitCircle(boss.x, boss.y, 20, 4, { color: boss.color, life: 30, size: 4 });
                break;
            }
            case 'spiral': {
                const count = 12;
                for (let i = 0; i < count; i++) {
                    const angle = (Math.PI * 2 / count) * i;
                    this.enemyProjectiles.push(new Projectile(boss.x, boss.y, angle, {
                        damage: boss.damage * 0.6,
                        speed: 3,
                        color: boss.color,
                        size: 6,
                        life: 150
                    }));
                }
                break;
            }
            case 'teleport': {
                this.particleSystem.emitCircle(boss.x, boss.y, 15, 3, { color: '#aa44ff', life: 20, size: 4 });
                const angle = Math.random() * Math.PI * 2;
                boss.x = ability.targetX + Math.cos(angle) * 150;
                boss.y = ability.targetY + Math.sin(angle) * 150;
                boss.x = Utils.clamp(boss.x, 60, this.WORLD_WIDTH - 60);
                boss.y = Utils.clamp(boss.y, 60, this.WORLD_HEIGHT - 60);
                this.particleSystem.emitCircle(boss.x, boss.y, 15, 3, { color: '#aa44ff', life: 20, size: 4 });
                break;
            }
            case 'charge': {
                this.shakeScreen(10, 5);
                break;
            }
            case 'laser': {
                const laserLen = 800;
                const segments = 20;
                for (let i = 0; i < segments; i++) {
                    const dist = (laserLen / segments) * (i + 1);
                    const lx = boss.x + Math.cos(ability.angle) * dist;
                    const ly = boss.y + Math.sin(ability.angle) * dist;
                    this.enemyProjectiles.push(new Projectile(lx, ly, ability.angle, {
                        damage: boss.damage * 0.3,
                        speed: 0.01,
                        color: '#ff0044',
                        size: 8,
                        life: 30
                    }));
                }
                this.shakeScreen(15, 8);
                break;
            }
        }
    }

    _updateExpOrbs() {
        this.expOrbs = this.expOrbs.filter(orb => {
            const gained = orb.update(this.player.x, this.player.y, this.player.magnetRange);
            if (gained > 0) {
                const leveledUp = this.player.addExp(gained);
                if (leveledUp) {
                    this._onLevelUp();
                }
                return false;
            }
            return orb.alive;
        });
    }

    _checkCollisions() {
        for (const proj of this.projectiles) {
            for (const enemy of this.enemies) {
                if (!enemy.alive) continue;
                if (Utils.circleCollision(proj.x, proj.y, proj.size, enemy.x, enemy.y, enemy.size)) {
                    enemy.takeDamage(proj.damage);
                    this.player.damageDealt += proj.damage;

                    const hitAngle = Utils.angle(proj.x, proj.y, enemy.x, enemy.y);
                    enemy.applyKnockback(hitAngle, proj.knockback);

                    this.particleSystem.showDamage(
                        enemy.x, enemy.y - enemy.size,
                        Math.round(proj.damage),
                        enemy.isBoss ? '#ffaa44' : '#fff'
                    );
                    this.particleSystem.emit(proj.x, proj.y, 4, {
                        color: proj.color, life: 15, size: 2, glow: true
                    });

                    if (proj.aoe > 0) {
                        this._handleAoE(proj.x, proj.y, proj.aoe, proj.damage * 0.5);
                    }

                    this._checkEnemyDeath(enemy);

                    proj.pierced++;
                    if (proj.pierced > proj.pierce) {
                        proj.life = 0;
                    }
                    break;
                }
            }
        }

        for (const orb of this.player.orbitals) {
            for (const enemy of this.enemies) {
                if (!enemy.alive) continue;
                if (!orb.canHit(enemy)) continue;
                if (Utils.circleCollision(orb.x, orb.y, orb.size, enemy.x, enemy.y, enemy.size)) {
                    const orbDamage = Math.round(this.player.damage * 0.8);
                    enemy.takeDamage(orbDamage);
                    orb.recordHit(enemy);
                    this.particleSystem.showDamage(enemy.x, enemy.y - enemy.size, orbDamage, '#88ccff');
                    this.particleSystem.emit(orb.x, orb.y, 3, { color: '#88ccff', life: 10, size: 2 });
                    this._checkEnemyDeath(enemy);
                }
            }
        }

        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            if (Utils.circleCollision(this.player.x, this.player.y, this.player.size,
                                       enemy.x, enemy.y, enemy.size)) {
                const dmg = this.player.takeDamage(enemy.damage);
                if (dmg > 0) {
                    const knockAngle = Utils.angle(enemy.x, enemy.y, this.player.x, this.player.y);
                    this.player.x += Math.cos(knockAngle) * 10;
                    this.player.y += Math.sin(knockAngle) * 10;
                    this.particleSystem.emit(this.player.x, this.player.y, 8, {
                        color: '#ff4444', life: 20, size: 3
                    });
                    this.shakeScreen(5, 3);
                }

                if (enemy.type === 'exploder' && enemy.exploding) {
                    this.particleSystem.emitCircle(enemy.x, enemy.y, 20, 5, {
                        color: '#ff4488', life: 25, size: 5, glow: true
                    });
                    enemy.alive = false;
                    this.shakeScreen(10, 6);
                }
            }
        }

        for (const proj of this.enemyProjectiles) {
            if (Utils.circleCollision(proj.x, proj.y, proj.size,
                                       this.player.x, this.player.y, this.player.size)) {
                const dmg = this.player.takeDamage(proj.damage);
                if (dmg > 0) {
                    this.particleSystem.emit(this.player.x, this.player.y, 6, {
                        color: '#ff4466', life: 15, size: 3
                    });
                    this.shakeScreen(3, 2);
                }
                proj.life = 0;
            }
        }
    }

    _handleAoE(x, y, radius, damage) {
        this.particleSystem.emitCircle(x, y, 15, 4, {
            color: '#ff8844', life: 20, size: 4, glow: true
        });
        this.shakeScreen(3, 2);

        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            const d = Utils.distance(x, y, enemy.x, enemy.y);
            if (d < radius + enemy.size) {
                const aoeDmg = Math.round(damage * (1 - d / (radius + enemy.size)));
                enemy.takeDamage(aoeDmg);
                this.particleSystem.showDamage(enemy.x, enemy.y - enemy.size, aoeDmg, '#ff8844');
                this._checkEnemyDeath(enemy);
            }
        }
    }

    _checkEnemyDeath(enemy) {
        if (!enemy.alive) {
            this.player.kills++;

            this.expOrbs.push(new ExpOrb(enemy.x, enemy.y, enemy.exp));

            this.particleSystem.emitCircle(enemy.x, enemy.y, 12, 3, {
                color: enemy.color, life: 25, size: 3, glow: true
            });

            if (enemy.isBoss) {
                this.bossDefeated = true;
                this.particleSystem.emitCircle(enemy.x, enemy.y, 40, 6, {
                    color: '#ffd700', life: 40, size: 5, glow: true
                });
                this.shakeScreen(20, 10);
                for (let i = 0; i < 5; i++) {
                    const pos = Utils.randomPointOnCircle(enemy.x, enemy.y, Utils.randomRange(10, 40));
                    this.expOrbs.push(new ExpOrb(pos.x, pos.y, Math.round(enemy.exp / 5)));
                }
            }

            if (enemy.type === 'exploder') {
                this._handleAoE(enemy.x, enemy.y, enemy.explodeRange || 60, enemy.damage);
            }
        }
    }

    _updateStageProgress() {
        if (this.stageTimer >= this.stageDuration && !this.bossSpawned) {
            this._spawnBoss();
        }

        if (this.bossDefeated) {
            this.stage++;
            this.stageTimer = 0;
            this.bossSpawned = false;
            this.bossDefeated = false;
            this.shakeScreen(5, 3);
        }
    }

    _spawnBoss() {
        this.bossSpawned = true;
        let bossType;
        if (this.stage >= 3) bossType = 'stage3';
        else if (this.stage >= 2) bossType = 'stage2';
        else bossType = 'stage1';

        const pos = Utils.randomPointOnCircle(this.player.x, this.player.y, 500);
        pos.x = Utils.clamp(pos.x, 80, this.WORLD_WIDTH - 80);
        pos.y = Utils.clamp(pos.y, 80, this.WORLD_HEIGHT - 80);

        const boss = new Boss(pos.x, pos.y, bossType, this.difficultyMult);
        this.enemies.push(boss);

        this._showBossWarning();
    }

    _showBossWarning() {
        const warning = document.getElementById('boss-warning');
        warning.classList.remove('hidden');
        this.shakeScreen(30, 4);
        setTimeout(() => warning.classList.add('hidden'), 2500);
    }

    _onLevelUp() {
        this.state = 'levelup';
        const choices = this.skillManager.getRandomChoices(3);
        this._showSkillSelection(choices);

        this.particleSystem.emitCircle(this.player.x, this.player.y, 24, 5, {
            color: '#ffd700', life: 30, size: 4, glow: true
        });
        document.getElementById('game-container').classList.add('level-up-flash');
        setTimeout(() => document.getElementById('game-container').classList.remove('level-up-flash'), 500);
    }

    _showSkillSelection(choices) {
        const container = document.getElementById('skill-options');
        container.innerHTML = '';

        choices.forEach(skill => {
            const card = document.createElement('div');
            card.className = 'skill-card';
            card.innerHTML = `
                <div class="skill-icon">${skill.icon}</div>
                <div class="skill-name">${skill.name}</div>
                <div class="skill-desc">${skill.description(skill.currentLevel + 1)}</div>
                <div class="skill-level">Lv.${skill.currentLevel} → Lv.${skill.currentLevel + 1}</div>
            `;
            card.addEventListener('click', () => {
                this.skillManager.upgrade(skill.id, this.player);
                document.getElementById('skill-selection').classList.add('hidden');
                this.state = 'playing';
            });
            container.appendChild(card);
        });

        document.getElementById('skill-selection').classList.remove('hidden');
    }

    shakeScreen(duration, intensity) {
        this.screenShake = duration;
        this.screenShakeIntensity = intensity;
    }

    _updateScreenShake() {
        if (this.screenShake > 0) {
            this.screenShake--;
        }
    }

    updateUI() {
        const hpPct = (this.player.hp / this.player.maxHp) * 100;
        document.getElementById('hp-bar').style.width = `${hpPct}%`;
        document.getElementById('hp-text').textContent = `${Math.round(this.player.hp)} / ${this.player.maxHp}`;

        const expPct = (this.player.exp / this.player.expToNext) * 100;
        document.getElementById('exp-bar').style.width = `${expPct}%`;
        document.getElementById('level-text').textContent = `Lv.${this.player.level}`;

        document.getElementById('kill-count').textContent = `처치: ${this.player.kills}`;
        document.getElementById('time-display').textContent = Utils.formatTime(this.gameTime / 60);
        document.getElementById('stage-display').textContent = `스테이지 ${this.stage}`;
    }

    gameOver() {
        this.state = 'gameover';
        const statsDiv = document.getElementById('game-over-stats');
        statsDiv.innerHTML = `
            <p>생존 시간: <span class="stat-highlight">${Utils.formatTime(this.gameTime / 60)}</span></p>
            <p>도달 스테이지: <span class="stat-highlight">${this.stage}</span></p>
            <p>적 처치: <span class="stat-highlight">${this.player.kills}</span></p>
            <p>총 데미지: <span class="stat-highlight">${this.player.damageDealt.toLocaleString()}</span></p>
            <p>최종 레벨: <span class="stat-highlight">${this.player.level}</span></p>
        `;
        document.getElementById('game-over-screen').classList.remove('hidden');
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.screenW, this.screenH);

        ctx.save();

        if (this.screenShake > 0) {
            const shakeX = (Math.random() - 0.5) * this.screenShakeIntensity * 2;
            const shakeY = (Math.random() - 0.5) * this.screenShakeIntensity * 2;
            ctx.translate(shakeX, shakeY);
        }

        ctx.translate(-this.camera.x, -this.camera.y);

        this._drawBackground(ctx);
        this.expOrbs.forEach(orb => orb.draw(ctx));
        this.enemies.forEach(e => e.draw(ctx));
        this.projectiles.forEach(p => p.draw(ctx));
        this.enemyProjectiles.forEach(p => p.draw(ctx));
        this.lightningBolts.forEach(lb => lb.draw(ctx));
        this.player.draw(ctx);
        this.particleSystem.draw(ctx);

        ctx.restore();

        this._drawMinimap(ctx);
    }

    _drawBackground(ctx) {
        const grad = ctx.createRadialGradient(
            this.WORLD_WIDTH / 2, this.WORLD_HEIGHT / 2, 200,
            this.WORLD_WIDTH / 2, this.WORLD_HEIGHT / 2, this.WORLD_WIDTH
        );
        grad.addColorStop(0, '#1e1e3a');
        grad.addColorStop(1, '#0a0a1e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT);

        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        const gridSize = 80;
        const startX = Math.floor(this.camera.x / gridSize) * gridSize;
        const startY = Math.floor(this.camera.y / gridSize) * gridSize;
        const endX = startX + this.screenW + gridSize;
        const endY = startY + this.screenH + gridSize;

        for (let x = startX; x <= endX; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
            ctx.stroke();
        }
        for (let y = startY; y <= endY; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
        }

        ctx.strokeStyle = 'rgba(255, 50, 50, 0.4)';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT);
    }

    _drawMinimap(ctx) {
        const mapSize = 120;
        const padding = 15;
        const mx = this.screenW - mapSize - padding;
        const my = this.screenH - mapSize - padding;
        const scaleX = mapSize / this.WORLD_WIDTH;
        const scaleY = mapSize / this.WORLD_HEIGHT;

        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.fillRect(mx, my, mapSize, mapSize);
        ctx.strokeRect(mx, my, mapSize, mapSize);

        ctx.fillStyle = '#4ecdc4';
        ctx.fillRect(mx + this.player.x * scaleX - 2, my + this.player.y * scaleY - 2, 4, 4);

        for (const e of this.enemies) {
            ctx.fillStyle = e.isBoss ? '#ff0000' : '#ff6666';
            const s = e.isBoss ? 3 : 1.5;
            ctx.fillRect(mx + e.x * scaleX - s / 2, my + e.y * scaleY - s / 2, s, s);
        }

        ctx.restore();
    }
}
