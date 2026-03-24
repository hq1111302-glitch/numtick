class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();

        this.WORLD_WIDTH = 1600;
        this.WORLD_HEIGHT = 1600;

        this.keys = {};
        this.joystick = null;
        this.state = 'menu';

        this.currentChapter = 0;
        this.currentStage = 0;
        this.stageConfig = null;
        this.chapterConfig = null;

        this.currentWave = 0;
        this.waveTimer = 0;
        this.waveEnemiesSpawned = 0;
        this.waveEnemiesTotal = 0;
        this.waveTotalKills = 0;
        this.waveActive = false;
        this.betweenWaves = false;
        this.betweenWaveTimer = 0;
        this.bossPhase = false;
        this.bossDefeated = false;

        this.gameTime = 0;
        this.goldEarned = 0;

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

    setJoystick(joystick) {
        this.joystick = joystick;
    }

    _setupInput() {
        window.addEventListener('keydown', (e) => { this.keys[e.code] = true; });
        window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    }

    startStage(chapterIdx, stageIdx) {
        this.currentChapter = chapterIdx;
        this.currentStage = stageIdx;
        this.chapterConfig = getChapter(chapterIdx);
        this.stageConfig = getStage(chapterIdx, stageIdx);
        if (!this.stageConfig || !this.chapterConfig) return;

        this.state = 'playing';
        this.gameTime = 0;
        this.goldEarned = 0;
        this.currentWave = 0;
        this.waveTimer = 0;
        this.waveEnemiesSpawned = 0;
        this.waveEnemiesTotal = 0;
        this.waveTotalKills = 0;
        this.waveActive = false;
        this.betweenWaves = true;
        this.betweenWaveTimer = 90;
        this.bossPhase = false;
        this.bossDefeated = false;

        this.enemies = [];
        this.projectiles = [];
        this.enemyProjectiles = [];
        this.lightningBolts = [];
        this.expOrbs = [];
        this.spawnTimer = 0;

        this.player.reset(this.WORLD_WIDTH / 2, this.WORLD_HEIGHT / 2);
        this.skillManager.reset();
        this.particleSystem.clear();

        applyUpgradesToPlayer(this.player);

        const startLvl = this.player.startLevel || 1;
        for (let i = 1; i < startLvl; i++) {
            this.player.level = i + 1;
            this.player.expToNext = Math.round(20 + this.player.level * 8 + Math.pow(this.player.level, 1.5) * 2);
        }

        this.player.hp = this.player.maxHp;

        this._hideAllScreens();
        document.getElementById('hud').classList.remove('hidden');
        this._showWaveAnnounce(1);
        this.updateUI();
    }

    _hideAllScreens() {
        ['title-screen', 'stage-select-screen', 'shop-screen', 'skill-selection',
         'stage-clear-screen', 'game-over-screen', 'pause-screen', 'boss-warning',
         'wave-announce'
        ].forEach(id => document.getElementById(id).classList.add('hidden'));
    }

    update() {
        if (this.state !== 'playing') return;

        this.gameTime++;

        const joyDir = this.joystick ? this.joystick.getDirection() : { x: 0, y: 0 };
        this.player.update(this.keys, this.WORLD_WIDTH, this.WORLD_HEIGHT, joyDir);

        this._updateCamera();
        this._handleWaveSystem();
        this._handleAutoAttack();
        this._handleLightning();
        this._updateProjectiles();
        this._updateEnemies();
        this._updateExpOrbs();
        this._checkCollisions();
        this.particleSystem.update();
        this._updateScreenShake();
        this.updateUI();

        if (this.player.hp <= 0) {
            this.onGameOver();
        }
    }

    _updateCamera() {
        const targetX = this.player.x - this.screenW / 2;
        const targetY = this.player.y - this.screenH / 2;
        this.camera.x = Utils.lerp(this.camera.x, targetX, 0.1);
        this.camera.y = Utils.lerp(this.camera.y, targetY, 0.1);
        this.camera.x = Utils.clamp(this.camera.x, 0, Math.max(0, this.WORLD_WIDTH - this.screenW));
        this.camera.y = Utils.clamp(this.camera.y, 0, Math.max(0, this.WORLD_HEIGHT - this.screenH));
    }

    _handleWaveSystem() {
        if (this.betweenWaves) {
            this.betweenWaveTimer--;
            if (this.betweenWaveTimer <= 0) {
                this.betweenWaves = false;
                this._startWave();
            }
            return;
        }

        if (!this.waveActive) return;

        this.waveTimer++;
        const waveDef = this._getCurrentWaveDef();
        if (!waveDef) return;

        const waveDuration = waveDef.duration * 60;
        const totalToSpawn = this._getWaveEnemyCount(waveDef);
        const spawnInterval = Math.max(8, Math.floor(waveDuration / (totalToSpawn + 1)));

        if (this.waveEnemiesSpawned < totalToSpawn && this.waveTimer % spawnInterval === 0) {
            this._spawnWaveEnemy(waveDef);
        }

        if (this.waveEnemiesSpawned >= totalToSpawn && this.enemies.length === 0) {
            this._endWave();
        }
    }

    _getCurrentWaveDef() {
        if (this.bossPhase) return null;
        if (!this.stageConfig) return null;
        return this.stageConfig.waves[this.currentWave] || null;
    }

    _getWaveEnemyCount(waveDef) {
        return waveDef.enemies.reduce((sum, e) => sum + e.count, 0);
    }

    _startWave() {
        this.waveActive = true;
        this.waveTimer = 0;
        this.waveEnemiesSpawned = 0;
        const waveDef = this._getCurrentWaveDef();
        this.waveEnemiesTotal = waveDef ? this._getWaveEnemyCount(waveDef) : 0;
    }

    _spawnWaveEnemy(waveDef) {
        const spawnDist = Math.max(this.screenW, this.screenH) * 0.55;
        const pool = [];
        waveDef.enemies.forEach(e => {
            for (let i = 0; i < e.count; i++) pool.push(e.type);
        });

        if (this.waveEnemiesSpawned >= pool.length) return;

        const type = pool[this.waveEnemiesSpawned];
        const pos = Utils.randomPointOnCircle(this.player.x, this.player.y, spawnDist + Utils.randomRange(0, 80));
        pos.x = Utils.clamp(pos.x, 30, this.WORLD_WIDTH - 30);
        pos.y = Utils.clamp(pos.y, 30, this.WORLD_HEIGHT - 30);

        const scaleFactor = 1 + this.currentChapter * 0.4 + this.currentStage * 0.1;
        this.enemies.push(new Enemy(pos.x, pos.y, type, scaleFactor));
        this.waveEnemiesSpawned++;
    }

    _endWave() {
        this.waveActive = false;
        this.currentWave++;

        if (this.currentWave >= this.stageConfig.waves.length) {
            this._startBossPhase();
        } else {
            this.betweenWaves = true;
            this.betweenWaveTimer = 120;
            this._showWaveAnnounce(this.currentWave + 1);
        }
    }

    _startBossPhase() {
        this.bossPhase = true;
        const bossConf = this.stageConfig.boss;
        const scaleFactor = 1 + this.currentChapter * 0.5 + this.currentStage * 0.15;

        const pos = Utils.randomPointOnCircle(this.player.x, this.player.y, 450);
        pos.x = Utils.clamp(pos.x, 80, this.WORLD_WIDTH - 80);
        pos.y = Utils.clamp(pos.y, 80, this.WORLD_HEIGHT - 80);

        const boss = new Boss(pos.x, pos.y, bossConf.type, scaleFactor);
        boss.name = bossConf.name;
        this.enemies.push(boss);

        const warning = document.getElementById('boss-warning');
        warning.classList.remove('hidden');
        this.shakeScreen(40, 5);
        setTimeout(() => warning.classList.add('hidden'), 2500);
    }

    _showWaveAnnounce(waveNum) {
        const announce = document.getElementById('wave-announce');
        const text = document.getElementById('wave-announce-text');
        text.textContent = `Wave ${waveNum} / ${this.stageConfig.waves.length}`;
        announce.classList.remove('hidden');
        setTimeout(() => announce.classList.add('hidden'), 1500);
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
                if (d < nextDist && d < 200) { nextDist = d; nextTarget = e; }
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
            return !(p.x < -50 || p.x > this.WORLD_WIDTH + 50 || p.y < -50 || p.y > this.WORLD_HEIGHT + 50 || p.isDead);
        });
        this.enemyProjectiles = this.enemyProjectiles.filter(p => {
            p.update([]);
            return !(p.x < -50 || p.x > this.WORLD_WIDTH + 50 || p.y < -50 || p.y > this.WORLD_HEIGHT + 50 || p.isDead);
        });
        this.lightningBolts = this.lightningBolts.filter(lb => { lb.update(); return !lb.isDead; });
    }

    _updateEnemies() {
        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            enemy.update(this.player.x, this.player.y);

            if (enemy.canShoot && enemy.canShoot()) {
                const angle = Utils.angle(enemy.x, enemy.y, this.player.x, this.player.y);
                this.enemyProjectiles.push(new Projectile(enemy.x, enemy.y, angle, {
                    damage: enemy.damage, speed: 4, color: '#ff4466', size: 5, life: 180
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
                    this.enemies.push(new Enemy(pos.x, pos.y, types[Utils.randomInt(0, 2)], 1 + this.currentChapter * 0.4));
                }
                this.particleSystem.emitCircle(boss.x, boss.y, 20, 4, { color: boss.color, life: 30, size: 4 });
                break;
            }
            case 'spiral': {
                for (let i = 0; i < 12; i++) {
                    const angle = (Math.PI * 2 / 12) * i;
                    this.enemyProjectiles.push(new Projectile(boss.x, boss.y, angle, {
                        damage: boss.damage * 0.6, speed: 3, color: boss.color, size: 6, life: 150
                    }));
                }
                break;
            }
            case 'teleport': {
                this.particleSystem.emitCircle(boss.x, boss.y, 15, 3, { color: '#aa44ff', life: 20, size: 4 });
                const angle = Math.random() * Math.PI * 2;
                boss.x = Utils.clamp(ability.targetX + Math.cos(angle) * 150, 60, this.WORLD_WIDTH - 60);
                boss.y = Utils.clamp(ability.targetY + Math.sin(angle) * 150, 60, this.WORLD_HEIGHT - 60);
                this.particleSystem.emitCircle(boss.x, boss.y, 15, 3, { color: '#aa44ff', life: 20, size: 4 });
                break;
            }
            case 'charge': { this.shakeScreen(10, 5); break; }
            case 'laser': {
                for (let i = 0; i < 20; i++) {
                    const dist = (800 / 20) * (i + 1);
                    this.enemyProjectiles.push(new Projectile(
                        boss.x + Math.cos(ability.angle) * dist,
                        boss.y + Math.sin(ability.angle) * dist,
                        ability.angle,
                        { damage: boss.damage * 0.3, speed: 0.01, color: '#ff0044', size: 8, life: 30 }
                    ));
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
                const actualGain = Math.round(gained * (this.player.expMult || 1));
                const leveledUp = this.player.addExp(actualGain);
                if (leveledUp) this._onLevelUp();
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
                    this.particleSystem.showDamage(enemy.x, enemy.y - enemy.size, Math.round(proj.damage), enemy.isBoss ? '#ffaa44' : '#fff');
                    this.particleSystem.emit(proj.x, proj.y, 4, { color: proj.color, life: 15, size: 2, glow: true });
                    if (proj.aoe > 0) this._handleAoE(proj.x, proj.y, proj.aoe, proj.damage * 0.5);
                    this._checkEnemyDeath(enemy);
                    proj.pierced++;
                    if (proj.pierced > proj.pierce) proj.life = 0;
                    break;
                }
            }
        }

        for (const orb of this.player.orbitals) {
            for (const enemy of this.enemies) {
                if (!enemy.alive || !orb.canHit(enemy)) continue;
                if (Utils.circleCollision(orb.x, orb.y, orb.size, enemy.x, enemy.y, enemy.size)) {
                    const orbDmg = Math.round(this.player.damage * 0.8);
                    enemy.takeDamage(orbDmg);
                    orb.recordHit(enemy);
                    this.particleSystem.showDamage(enemy.x, enemy.y - enemy.size, orbDmg, '#88ccff');
                    this._checkEnemyDeath(enemy);
                }
            }
        }

        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            if (Utils.circleCollision(this.player.x, this.player.y, this.player.size, enemy.x, enemy.y, enemy.size)) {
                const dmg = this.player.takeDamage(enemy.damage);
                if (dmg > 0) {
                    const knockAngle = Utils.angle(enemy.x, enemy.y, this.player.x, this.player.y);
                    this.player.x += Math.cos(knockAngle) * 10;
                    this.player.y += Math.sin(knockAngle) * 10;
                    this.particleSystem.emit(this.player.x, this.player.y, 8, { color: '#ff4444', life: 20, size: 3 });
                    this.shakeScreen(5, 3);
                }
                if (enemy.type === 'exploder' && enemy.exploding) {
                    this.particleSystem.emitCircle(enemy.x, enemy.y, 20, 5, { color: '#ff4488', life: 25, size: 5, glow: true });
                    enemy.alive = false;
                    this.shakeScreen(10, 6);
                }
            }
        }

        for (const proj of this.enemyProjectiles) {
            if (Utils.circleCollision(proj.x, proj.y, proj.size, this.player.x, this.player.y, this.player.size)) {
                const dmg = this.player.takeDamage(proj.damage);
                if (dmg > 0) {
                    this.particleSystem.emit(this.player.x, this.player.y, 6, { color: '#ff4466', life: 15, size: 3 });
                    this.shakeScreen(3, 2);
                }
                proj.life = 0;
            }
        }
    }

    _handleAoE(x, y, radius, damage) {
        this.particleSystem.emitCircle(x, y, 15, 4, { color: '#ff8844', life: 20, size: 4, glow: true });
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
            this.waveTotalKills++;
            this.expOrbs.push(new ExpOrb(enemy.x, enemy.y, enemy.exp));

            const goldDrop = Utils.randomInt(1, 3 + this.currentChapter);
            this.goldEarned += Math.round(goldDrop * (this.player.goldMult || 1));

            this.particleSystem.emitCircle(enemy.x, enemy.y, 12, 3, { color: enemy.color, life: 25, size: 3, glow: true });

            if (enemy.isBoss) {
                this.bossDefeated = true;
                this.particleSystem.emitCircle(enemy.x, enemy.y, 40, 6, { color: '#ffd700', life: 40, size: 5, glow: true });
                this.shakeScreen(20, 10);
                for (let i = 0; i < 5; i++) {
                    const pos = Utils.randomPointOnCircle(enemy.x, enemy.y, Utils.randomRange(10, 40));
                    this.expOrbs.push(new ExpOrb(pos.x, pos.y, Math.round(enemy.exp / 5)));
                }
                setTimeout(() => this.onStageClear(), 1500);
            }

            if (enemy.type === 'exploder') {
                this._handleAoE(enemy.x, enemy.y, enemy.explodeRange || 60, enemy.damage);
            }
        }
    }

    _onLevelUp() {
        this.state = 'levelup';
        const choices = this.skillManager.getRandomChoices(3);
        this._showSkillSelection(choices);
        this.particleSystem.emitCircle(this.player.x, this.player.y, 24, 5, { color: '#ffd700', life: 30, size: 4, glow: true });
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

    onStageClear() {
        this.state = 'clear';
        const timeSeconds = Math.round(this.gameTime / 60);
        const hpPercent = Math.round((this.player.hp / this.player.maxHp) * 100);
        const stars = calcStars(this.stageConfig, timeSeconds, hpPercent);
        const baseGold = this.stageConfig.goldReward;
        const totalGold = this.goldEarned + baseGold;

        SaveManager.clearStage(this.currentChapter, this.currentStage, stars, timeSeconds);
        SaveManager.addGold(totalGold);

        const clearScreen = document.getElementById('stage-clear-screen');
        document.getElementById('clear-title').textContent = '스테이지 클리어!';

        const starsDiv = document.getElementById('clear-stars');
        starsDiv.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const star = document.createElement('span');
            star.className = `clear-star ${i < stars ? 'filled' : ''}`;
            star.textContent = '★';
            star.style.animationDelay = `${i * 0.2}s`;
            starsDiv.appendChild(star);
        }

        document.getElementById('clear-stats').innerHTML = `
            <div class="clear-stat"><span class="label">시간</span><span class="value">${Utils.formatTime(timeSeconds)}</span></div>
            <div class="clear-stat"><span class="label">처치</span><span class="value">${this.player.kills}</span></div>
            <div class="clear-stat"><span class="label">잔여 HP</span><span class="value">${hpPercent}%</span></div>
            <div class="clear-stat"><span class="label">최종 레벨</span><span class="value">Lv.${this.player.level}</span></div>
        `;

        document.getElementById('clear-rewards').innerHTML = `
            <div class="reward-item"><span class="gold-icon">🪙</span> +${totalGold.toLocaleString()} 골드</div>
        `;

        const hasNext = getStage(this.currentChapter, this.currentStage + 1) ||
                        getChapter(this.currentChapter + 1);
        document.getElementById('btn-clear-next').style.display = hasNext ? '' : 'none';

        document.getElementById('hud').classList.add('hidden');
        clearScreen.classList.remove('hidden');
    }

    onGameOver() {
        this.state = 'gameover';
        const timeSeconds = Math.round(this.gameTime / 60);
        const partialGold = Math.round(this.goldEarned * 0.5);
        if (partialGold > 0) SaveManager.addGold(partialGold);

        document.getElementById('game-over-stats').innerHTML = `
            <p>생존 시간: <span class="stat-highlight">${Utils.formatTime(timeSeconds)}</span></p>
            <p>처치: <span class="stat-highlight">${this.player.kills}</span></p>
            <p>획득 골드: <span class="stat-highlight">🪙 ${partialGold}</span></p>
        `;
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('game-over-screen').classList.remove('hidden');
    }

    pause() {
        if (this.state === 'playing') {
            this.state = 'paused';
            document.getElementById('pause-screen').classList.remove('hidden');
        }
    }

    resume() {
        if (this.state === 'paused') {
            this.state = 'playing';
            document.getElementById('pause-screen').classList.add('hidden');
        }
    }

    quit() {
        this.state = 'menu';
        document.getElementById('pause-screen').classList.add('hidden');
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('title-screen').classList.remove('hidden');
    }

    shakeScreen(duration, intensity) {
        this.screenShake = duration;
        this.screenShakeIntensity = intensity;
    }

    _updateScreenShake() {
        if (this.screenShake > 0) this.screenShake--;
    }

    updateUI() {
        const hpPct = (this.player.hp / this.player.maxHp) * 100;
        document.getElementById('hp-bar').style.width = `${hpPct}%`;
        document.getElementById('hp-text').textContent = `${Math.round(this.player.hp)} / ${this.player.maxHp}`;

        const expPct = (this.player.exp / this.player.expToNext) * 100;
        document.getElementById('exp-bar').style.width = `${expPct}%`;
        document.getElementById('level-text').textContent = `Lv.${this.player.level}`;

        document.getElementById('kill-count').textContent = `${this.player.kills}`;
        document.getElementById('gold-ingame').textContent = `${this.goldEarned}`;
        document.getElementById('time-display').textContent = Utils.formatTime(this.gameTime / 60);

        const totalWaves = this.stageConfig ? this.stageConfig.waves.length : 5;
        const displayWave = Math.min(this.currentWave + 1, totalWaves);
        document.getElementById('wave-display').textContent =
            this.bossPhase ? 'BOSS!' : `Wave ${displayWave}/${totalWaves}`;

        const wavePct = this.bossPhase ? 100 : (this.currentWave / totalWaves) * 100;
        document.getElementById('wave-progress-bar').style.width = `${wavePct}%`;
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.screenW, this.screenH);
        ctx.save();

        if (this.screenShake > 0) {
            ctx.translate(
                (Math.random() - 0.5) * this.screenShakeIntensity * 2,
                (Math.random() - 0.5) * this.screenShakeIntensity * 2
            );
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
    }

    _drawBackground(ctx) {
        const c = this.chapterConfig || { bgColor1: '#1e1e3a', bgColor2: '#0a0a1e', gridColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,50,50,0.4)' };

        const grad = ctx.createRadialGradient(
            this.WORLD_WIDTH / 2, this.WORLD_HEIGHT / 2, 200,
            this.WORLD_WIDTH / 2, this.WORLD_HEIGHT / 2, this.WORLD_WIDTH
        );
        grad.addColorStop(0, c.bgColor1);
        grad.addColorStop(1, c.bgColor2);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT);

        ctx.strokeStyle = c.gridColor;
        ctx.lineWidth = 1;
        const gridSize = 80;
        const startX = Math.floor(this.camera.x / gridSize) * gridSize;
        const startY = Math.floor(this.camera.y / gridSize) * gridSize;
        const endX = startX + this.screenW + gridSize;
        const endY = startY + this.screenH + gridSize;
        for (let x = startX; x <= endX; x += gridSize) {
            ctx.beginPath(); ctx.moveTo(x, startY); ctx.lineTo(x, endY); ctx.stroke();
        }
        for (let y = startY; y <= endY; y += gridSize) {
            ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(endX, y); ctx.stroke();
        }

        ctx.strokeStyle = c.borderColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT);
    }
}
