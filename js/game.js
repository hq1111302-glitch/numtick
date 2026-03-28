class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();

        // infinite map — no fixed world size

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

        this.isEndless = false;
        this.endlessWave = 0;
        this.endlessDifficulty = 1;
        this._cachedEndlessWave = null;
        this._cachedEndlessWaveIdx = -1;

        this.gameTime = 0;
        this.goldEarned = 0;

        this.player = new Player(0, 0);
        this.skillManager = new SkillManager();
        this.particleSystem = new ParticleSystem();

        this.enemies = [];
        this.projectiles = [];
        this.enemyProjectiles = [];
        this.lightningBolts = [];
        this.expOrbs = [];
        this.flameFields = [];

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

    setJoystick(joystick) { this.joystick = joystick; }

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

        this.isEndless = !!this.stageConfig.isEndless;
        this.endlessWave = 0;
        this.endlessDifficulty = 1;
        this._cachedEndlessWave = null;
        this._cachedEndlessWaveIdx = -1;

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
        this.flameFields = [];
        this.spawnTimer = 0;

        this.player.reset(0, 0);
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
        ['title-screen','stage-select-screen','shop-screen','skill-selection',
         'stage-clear-screen','game-over-screen','pause-screen','boss-warning','wave-announce'
        ].forEach(id => document.getElementById(id).classList.add('hidden'));
    }

    // ==================== UPDATE ====================
    update() {
        if (this.state !== 'playing') return;
        this.gameTime++;

        const joyDir = this.joystick ? this.joystick.getDirection() : { x: 0, y: 0 };
        this.player.update(this.keys, Infinity, Infinity, joyDir);

        this._updateCamera();
        this._handleWaveSystem();
        this._handleAutoAttack();
        this._handleMissiles();
        this._handleLaser();
        this._handleFlame();
        this._handleFrost();
        this._handleLightning();
        this._updateProjectiles();
        this._updateEnemies();
        this._updateExpOrbs();
        this._updateFlameFields();
        this._checkCollisions();
        this.particleSystem.update();
        this._updateScreenShake();
        this.updateUI();

        if (this.player.hp <= 0) this.onGameOver();
    }

    _updateCamera() {
        const tx = this.player.x - this.screenW / 2;
        const ty = this.player.y - this.screenH / 2;
        this.camera.x = Utils.lerp(this.camera.x, tx, 0.1);
        this.camera.y = Utils.lerp(this.camera.y, ty, 0.1);
    }

    // ==================== WAVE SYSTEM ====================
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
        if (!waveDef && !this.bossPhase) return;

        if (this.bossPhase) {
            if (this.bossDefeated && this.isEndless) {
                this.bossPhase = false;
                this.bossDefeated = false;
                this.endlessWave++;
                this.endlessDifficulty += 0.2;
                this.betweenWaves = true;
                this.betweenWaveTimer = 120;
                this._showWaveAnnounce(`∞ ${this.endlessWave + 1}`);
            }
            return;
        }

        const totalToSpawn = this._getWaveEnemyCount(waveDef);
        const waveDuration = waveDef.duration * 60;
        const spawnInterval = Math.max(3, Math.floor(waveDuration / (totalToSpawn + 1)));

        if (this.waveEnemiesSpawned < totalToSpawn && this.waveTimer % spawnInterval === 0) {
            const batchSize = Math.min(5, totalToSpawn - this.waveEnemiesSpawned);
            for (let i = 0; i < batchSize; i++) this._spawnWaveEnemy(waveDef);
        }

        if (this.waveEnemiesSpawned >= totalToSpawn && this.enemies.length === 0) {
            this._endWave();
        }
    }

    _getCurrentWaveDef() {
        if (this.bossPhase) return null;
        if (!this.stageConfig) return null;

        if (this.isEndless && this.currentWave >= this.stageConfig.waves.length) {
            if (this._cachedEndlessWaveIdx !== this.endlessWave) {
                this._cachedEndlessWave = this._generateEndlessWave();
                this._cachedEndlessWaveIdx = this.endlessWave;
            }
            return this._cachedEndlessWave;
        }
        return this.stageConfig.waves[this.currentWave] || null;
    }

    _generateEndlessWave() {
        const d = this.endlessDifficulty;
        const budget = Math.round(120 + this.endlessWave * 30 * d);
        const enemies = [];
        const types = ['normal','fast','tank','ranged','swarm','exploder'];
        let remaining = budget;
        const costs = { normal:1, fast:1.2, tank:3, ranged:2, swarm:0.5, exploder:2.5 };

        while (remaining > 0) {
            const t = types[Math.floor(Math.random() * types.length)];
            const c = costs[t];
            const max = Math.floor(remaining / c);
            if (max <= 0) break;
            const count = Utils.randomInt(1, Math.min(max, 20));
            enemies.push({ type: t, count });
            remaining -= count * c;
        }
        return { enemies, duration: 25 + this.endlessWave * 2 };
    }

    _getWaveEnemyCount(waveDef) {
        return waveDef.enemies.reduce((s, e) => s + e.count, 0);
    }

    _startWave() {
        this.waveActive = true;
        this.waveTimer = 0;
        this.waveEnemiesSpawned = 0;
        const waveDef = this._getCurrentWaveDef();
        this.waveEnemiesTotal = waveDef ? this._getWaveEnemyCount(waveDef) : 0;
    }

    _spawnWaveEnemy(waveDef) {
        const dist = Math.max(this.screenW, this.screenH) * 0.55;
        const pool = [];
        waveDef.enemies.forEach(e => { for (let i = 0; i < e.count; i++) pool.push(e.type); });
        if (this.waveEnemiesSpawned >= pool.length) return;

        const type = pool[this.waveEnemiesSpawned];
        const pos = Utils.randomPointOnCircle(this.player.x, this.player.y, dist + Utils.randomRange(0, 80));

        const sf = 1 + this.currentChapter * 0.4 + this.currentStage * 0.1 + (this.isEndless ? this.endlessDifficulty * 0.3 : 0);
        this.enemies.push(new Enemy(pos.x, pos.y, type, sf));
        this.waveEnemiesSpawned++;
    }

    _endWave() {
        this.waveActive = false;
        this.currentWave++;

        const totalWaves = this.stageConfig.waves.length;

        if (this.isEndless) {
            if (this.currentWave >= totalWaves && (this.endlessWave + 1) % 5 === 0) {
                this._startBossPhase();
            } else if (this.currentWave >= totalWaves) {
                this.endlessWave++;
                this.endlessDifficulty += 0.15;
                this.currentWave = totalWaves;
                this.betweenWaves = true;
                this.betweenWaveTimer = 120;
                this._showWaveAnnounce(`∞ ${this.endlessWave + 1}`);
            } else {
                this.betweenWaves = true;
                this.betweenWaveTimer = 120;
                this._showWaveAnnounce(this.currentWave + 1);
            }
        } else {
            if (this.currentWave >= totalWaves) {
                this._startBossPhase();
            } else {
                this.betweenWaves = true;
                this.betweenWaveTimer = 120;
                this._showWaveAnnounce(this.currentWave + 1);
            }
        }
    }

    _startBossPhase() {
        this.bossPhase = true;
        this.bossDefeated = false;
        const bossConf = this.stageConfig.boss;
        const sf = 1 + this.currentChapter * 0.5 + this.currentStage * 0.15 + (this.isEndless ? this.endlessDifficulty * 0.5 : 0);
        const pos = Utils.randomPointOnCircle(this.player.x, this.player.y, 450);
        const boss = new Boss(pos.x, pos.y, bossConf.type, sf);
        boss.name = bossConf.name + (this.isEndless ? ` (×${Math.floor(this.endlessDifficulty * 10) / 10})` : '');
        this.enemies.push(boss);

        const warning = document.getElementById('boss-warning');
        warning.classList.remove('hidden');
        this.shakeScreen(40, 5);
        setTimeout(() => warning.classList.add('hidden'), 2500);
    }

    _showWaveAnnounce(waveLabel) {
        const el = document.getElementById('wave-announce');
        document.getElementById('wave-announce-text').textContent =
            typeof waveLabel === 'string' ? `Wave ${waveLabel}` : `Wave ${waveLabel} / ${this.stageConfig.waves.length}`;
        el.classList.remove('hidden');
        setTimeout(() => el.classList.add('hidden'), 1500);
    }

    // ==================== WEAPON HANDLERS ====================
    _handleAutoAttack() {
        if (!this.player.canShoot() || this.enemies.length === 0) return;
        const closest = this._findClosest(500);
        if (closest) {
            const projs = this.player.shoot(closest.x, closest.y);
            this.projectiles.push(...projs);
        }
    }

    _handleMissiles() {
        if (!this.player.canMissile() || this.enemies.length === 0) return;
        this.player.resetMissileCooldown();

        const targets = this._findClosestN(this.player.missileCount, 600);
        for (const t of targets) {
            const angle = Utils.angle(this.player.x, this.player.y, t.x, t.y);
            this.projectiles.push(new Projectile(this.player.x, this.player.y, angle, {
                damage: Math.round(this.player.damage * 1.2),
                speed: 5,
                homing: true,
                homingStrength: 0.06,
                aoe: this.player.missileAoe,
                color: '#ff6644',
                size: 6,
                trailLength: 8,
                life: 180,
                isMissile: true,
                knockback: 4
            }));
        }
    }

    _handleLaser() {
        if (this.player.laserActive > 0) return;
        if (!this.player.canLaser() || this.enemies.length === 0) return;

        const closest = this._findClosest(600);
        if (!closest) return;

        this.player.resetLaserCooldown();
        this.player.laserActive = this.player.laserDuration;
        this.player.laserAngle = Utils.angle(this.player.x, this.player.y, closest.x, closest.y);
    }

    _handleFlame() {
        if (this.player.flameActive > 0) return;
        if (!this.player.canFlame() || this.enemies.length === 0) return;

        const closest = this._findClosest(this.player.flameRange + 50);
        if (!closest) return;

        this.player.resetFlameCooldown();
        this.player.flameActive = this.player.flameDuration;
    }

    _handleFrost() {
        if (this.player.frostLevel <= 0) return;
        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            const d = Utils.distance(this.player.x, this.player.y, enemy.x, enemy.y);
            if (d < this.player.frostRange) {
                enemy.slowAmount = this.player.frostSlow;
                enemy.slowTimer = 30;
                enemy.frosted = true;

                if (this.player.frostDps > 0 && this.gameTime % 30 === 0) {
                    const dmg = Math.round(this.player.frostDps * this.player.damageMult);
                    enemy.takeDamage(dmg);
                    this.particleSystem.showDamage(enemy.x, enemy.y - enemy.size, dmg, '#88ddff');
                    this._checkEnemyDeath(enemy);
                }

                if (this.player.synergies.steamExplosion && enemy.burning && enemy.frosted) {
                    const steamDmg = Math.round(this.player.damage * 0.5);
                    enemy.takeDamage(steamDmg);
                    this.particleSystem.emitCircle(enemy.x, enemy.y, 10, 3, { color: '#aaeeff', life: 15, size: 3 });
                    this.particleSystem.showDamage(enemy.x, enemy.y - enemy.size - 10, steamDmg, '#aaeeff');
                    enemy.burning = false;
                    enemy.frosted = false;
                    this._checkEnemyDeath(enemy);
                }
            }
        }
    }

    _handleLightning() {
        if (!this.player.canLightning() || this.enemies.length === 0) return;
        this.player.resetLightningCooldown();

        const targets = this._findClosestN(this.player.lightningTargets, 400);
        for (const t of targets) {
            const dmg = this.player.damage * 1.5;
            this._chainLightning(this.player.x, this.player.y, t, dmg, this.player.lightningChains, new Set());
        }
    }

    _chainLightning(fromX, fromY, target, damage, chainsLeft, hitSet) {
        if (!target || chainsLeft <= 0) return;

        let finalDmg = damage;
        if (this.player.synergies.frostThunderBonus && target.frosted) {
            finalDmg *= this.player.frostThunderMult || 1.5;
        }

        this.lightningBolts.push(new LightningBolt(fromX, fromY, target.x, target.y, finalDmg));
        target.takeDamage(finalDmg);
        this.particleSystem.showDamage(target.x, target.y - target.size, Math.round(finalDmg), '#88ccff');
        this.particleSystem.emitCircle(target.x, target.y, 6, 2, { color: '#88ccff', life: 15, size: 3 });
        hitSet.add(target);

        if (chainsLeft > 1) {
            let next = null, nd = Infinity;
            for (const e of this.enemies) {
                if (hitSet.has(e) || !e.alive) continue;
                const d = Utils.distance(target.x, target.y, e.x, e.y);
                if (d < nd && d < 200) { nd = d; next = e; }
            }
            if (next) this._chainLightning(target.x, target.y, next, finalDmg * 0.8, chainsLeft - 1, hitSet);
        }
        this._checkEnemyDeath(target);
    }

    _findClosest(range) {
        let closest = null, cd = Infinity;
        for (const e of this.enemies) {
            if (!e.alive) continue;
            const d = Utils.distance(this.player.x, this.player.y, e.x, e.y);
            if (d < cd && d < range) { cd = d; closest = e; }
        }
        return closest;
    }

    _findClosestN(n, range) {
        const sorted = this.enemies
            .filter(e => e.alive && Utils.distance(this.player.x, this.player.y, e.x, e.y) < range)
            .sort((a, b) => Utils.distance(this.player.x, this.player.y, a.x, a.y) - Utils.distance(this.player.x, this.player.y, b.x, b.y));
        return sorted.slice(0, n);
    }

    // ==================== UPDATES ====================
    _updateProjectiles() {
        const cullDist = Math.max(this.screenW, this.screenH) + 200;
        this.projectiles = this.projectiles.filter(p => {
            p.update(this.enemies);
            if (p.isDead) return false;
            return Utils.distance(p.x, p.y, this.player.x, this.player.y) < cullDist;
        });
        this.enemyProjectiles = this.enemyProjectiles.filter(p => {
            p.update([]);
            if (p.isDead) return false;
            return Utils.distance(p.x, p.y, this.player.x, this.player.y) < cullDist;
        });
        this.lightningBolts = this.lightningBolts.filter(lb => { lb.update(); return !lb.isDead; });
    }

    _updateEnemies() {
        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;

            if (enemy.slowTimer > 0) {
                enemy.slowTimer--;
            } else {
                enemy.slowAmount = 0;
                enemy.frosted = false;
            }
            if (enemy.burnTimer > 0) {
                enemy.burnTimer--;
                if (this.gameTime % 20 === 0) {
                    const burnDmg = Math.round(this.player.damage * 0.15);
                    enemy.takeDamage(burnDmg);
                    this.particleSystem.showDamage(enemy.x, enemy.y - enemy.size, burnDmg, '#ff8844');
                    this._checkEnemyDeath(enemy);
                }
            } else {
                enemy.burning = false;
            }

            enemy.update(this.player.x, this.player.y);

            if (enemy.canShoot && enemy.canShoot()) {
                const angle = Utils.angle(enemy.x, enemy.y, this.player.x, this.player.y);
                this.enemyProjectiles.push(new Projectile(enemy.x, enemy.y, angle, {
                    damage: enemy.damage, speed: 4, color: '#ff4466', size: 5, life: 180
                }));
                enemy.resetShootTimer();
            }
            if (enemy.isBoss && enemy.shouldUseAbility()) {
                this._handleBossAbility(enemy, enemy.useAbility(this.player.x, this.player.y));
            }
        }
        const despawnDist = Math.max(this.screenW, this.screenH) * 1.5;
        this.enemies = this.enemies.filter(e => {
            if (!e.alive) return false;
            if (Utils.distance(e.x, e.y, this.player.x, this.player.y) > despawnDist && !e.isBoss) return false;
            return true;
        });
    }

    _handleBossAbility(boss, ability) {
        if (!ability) return;
        switch (ability.type) {
            case 'summon': {
                for (let i = 0; i < ability.count; i++) {
                    const pos = Utils.randomPointOnCircle(boss.x, boss.y, 80);
                    const types = ['normal','fast','swarm'];
                    this.enemies.push(new Enemy(pos.x, pos.y, types[Utils.randomInt(0,2)], 1 + this.currentChapter * 0.4));
                }
                this.particleSystem.emitCircle(boss.x, boss.y, 20, 4, { color: boss.color, life: 30, size: 4 });
                break;
            }
            case 'spiral': {
                for (let i = 0; i < 12; i++) {
                    const a = (Math.PI * 2 / 12) * i;
                    this.enemyProjectiles.push(new Projectile(boss.x, boss.y, a, {
                        damage: boss.damage * 0.6, speed: 3, color: boss.color, size: 6, life: 150
                    }));
                }
                break;
            }
            case 'teleport': {
                this.particleSystem.emitCircle(boss.x, boss.y, 15, 3, { color: '#aa44ff', life: 20, size: 4 });
                const a = Math.random() * Math.PI * 2;
                boss.x = ability.targetX + Math.cos(a) * 150;
                boss.y = ability.targetY + Math.sin(a) * 150;
                this.particleSystem.emitCircle(boss.x, boss.y, 15, 3, { color: '#aa44ff', life: 20, size: 4 });
                break;
            }
            case 'charge': this.shakeScreen(10, 5); break;
            case 'laser': {
                for (let i = 0; i < 20; i++) {
                    const d = (800 / 20) * (i + 1);
                    this.enemyProjectiles.push(new Projectile(
                        boss.x + Math.cos(ability.angle) * d,
                        boss.y + Math.sin(ability.angle) * d,
                        ability.angle, { damage: boss.damage * 0.3, speed: 0.01, color: '#ff0044', size: 8, life: 30 }
                    ));
                }
                this.shakeScreen(15, 8);
                break;
            }
        }
    }

    _updateExpOrbs() {
        const orbCullDist = Math.max(this.screenW, this.screenH) * 1.2;
        this.expOrbs = this.expOrbs.filter(orb => {
            if (Utils.distance(orb.x, orb.y, this.player.x, this.player.y) > orbCullDist) return false;
            const gained = orb.update(this.player.x, this.player.y, this.player.magnetRange);
            if (gained > 0) {
                const actual = Math.round(gained * (this.player.expMult || 1));
                if (this.player.addExp(actual)) this._onLevelUp();
                return false;
            }
            return orb.alive;
        });
    }

    _updateFlameFields() {
        this.flameFields = this.flameFields.filter(f => {
            f.life--;
            if (this.gameTime % 15 === 0) {
                for (const enemy of this.enemies) {
                    if (!enemy.alive) continue;
                    if (Utils.distance(f.x, f.y, enemy.x, enemy.y) < f.radius + enemy.size) {
                        const dmg = Math.round(this.player.damage * 0.2);
                        enemy.takeDamage(dmg);
                        enemy.burning = true;
                        enemy.burnTimer = 60;
                        this._checkEnemyDeath(enemy);
                    }
                }
            }
            return f.life > 0;
        });
    }

    // ==================== COLLISIONS ====================
    _checkCollisions() {
        this._checkBulletCollisions();
        this._checkOrbitalCollisions();
        this._checkLaserCollisions();
        this._checkFlameCollisions();
        this._checkEnemyContactCollisions();
        this._checkEnemyProjectileCollisions();
    }

    _checkBulletCollisions() {
        for (const proj of this.projectiles) {
            for (const enemy of this.enemies) {
                if (!enemy.alive) continue;
                if (!Utils.circleCollision(proj.x, proj.y, proj.size, enemy.x, enemy.y, enemy.size)) continue;

                enemy.takeDamage(proj.damage);
                this.player.damageDealt += proj.damage;
                enemy.applyKnockback(Utils.angle(proj.x, proj.y, enemy.x, enemy.y), proj.knockback);
                this.particleSystem.showDamage(enemy.x, enemy.y - enemy.size, Math.round(proj.damage), enemy.isBoss ? '#ffaa44' : '#fff');
                this.particleSystem.emit(proj.x, proj.y, 4, { color: proj.color, life: 15, size: 2, glow: true });

                if (proj.aoe > 0) {
                    this._handleAoE(proj.x, proj.y, proj.aoe, proj.damage * 0.5);
                    if (proj.isMissile && this.player.synergies.missileChain) {
                        const nearby = this._findClosest(200);
                        if (nearby && nearby !== enemy) {
                            this._chainLightning(proj.x, proj.y, nearby, proj.damage * 0.3, 2, new Set());
                        }
                    }
                    if (proj.isMissile && this.player.synergies.napalmField) {
                        this.flameFields.push({ x: proj.x, y: proj.y, radius: proj.aoe * 0.8, life: 180 });
                    }
                }

                if (this.player.synergies.bulletExplosion && !proj.isMissile) {
                    this._handleAoE(proj.x, proj.y, this.player.bulletExplosionRadius || 25, proj.damage * 0.3);
                }
                if (this.player.synergies.bulletSlow && !proj.isMissile) {
                    enemy.slowAmount = this.player.bulletSlowAmount || 0.4;
                    enemy.slowTimer = this.player.bulletSlowDuration || 90;
                    enemy.frosted = true;
                }

                this._checkEnemyDeath(enemy);
                proj.pierced++;
                if (proj.pierced > proj.pierce) proj.life = 0;
                break;
            }
        }
    }

    _checkOrbitalCollisions() {
        for (const orb of this.player.orbitals) {
            for (const enemy of this.enemies) {
                if (!enemy.alive || !orb.canHit(enemy)) continue;
                if (!Utils.circleCollision(orb.x, orb.y, orb.size, enemy.x, enemy.y, enemy.size)) continue;

                const orbDmg = Math.round(this.player.damage * 0.8 * this.player.orbitalDamageMult);
                enemy.takeDamage(orbDmg);
                enemy.applyKnockback(Utils.angle(orb.x, orb.y, enemy.x, enemy.y), this.player.orbitalKnockback);
                orb.recordHit(enemy);
                this.particleSystem.showDamage(enemy.x, enemy.y - enemy.size, orbDmg, '#88ccff');

                if (this.player.synergies.shieldFreeze) {
                    enemy.slowAmount = 0.6;
                    enemy.slowTimer = 60;
                    enemy.frosted = true;
                }
                if (this.player.synergies.shieldFlame) {
                    enemy.burning = true;
                    enemy.burnTimer = 90;
                }
                this._checkEnemyDeath(enemy);
            }
        }
    }

    _checkLaserCollisions() {
        if (this.player.laserActive <= 0) return;
        const p = this.player;
        const beamCount = p.laserBeams;

        for (let b = 0; b < beamCount; b++) {
            const angle = beamCount === 1 ? p.laserAngle :
                          beamCount === 2 ? p.laserAngle + (b === 0 ? 0 : Math.PI) :
                          p.laserAngle + (Math.PI * 2 / beamCount) * b;

            const len = 800;
            const dmgPerTick = Math.round(p.damage * 0.4);
            const width = p.laserWidth + (this.player.synergies.plasmaLaser ? 6 : 0);

            if (this.gameTime % 6 === 0) {
                for (const enemy of this.enemies) {
                    if (!enemy.alive) continue;
                    const ex = enemy.x - p.x;
                    const ey = enemy.y - p.y;
                    const proj = ex * Math.cos(angle) + ey * Math.sin(angle);
                    if (proj < 0 || proj > len) continue;
                    const perp = Math.abs(-ex * Math.sin(angle) + ey * Math.cos(angle));
                    if (perp < width + enemy.size) {
                        enemy.takeDamage(dmgPerTick);
                        this.particleSystem.showDamage(enemy.x, enemy.y - enemy.size, dmgPerTick, '#ff4444');

                        if (this.player.synergies.plasmaLaser) {
                            enemy.burning = true;
                            enemy.burnTimer = 60;
                        }
                        if (this.player.synergies.laserChain) {
                            const nearby = this.enemies.find(e => e !== enemy && e.alive &&
                                Utils.distance(enemy.x, enemy.y, e.x, e.y) < 100);
                            if (nearby) {
                                const chainDmg = Math.round(dmgPerTick * 0.3);
                                nearby.takeDamage(chainDmg);
                                this.lightningBolts.push(new LightningBolt(enemy.x, enemy.y, nearby.x, nearby.y, chainDmg));
                                this._checkEnemyDeath(nearby);
                            }
                        }
                        this._checkEnemyDeath(enemy);
                    }
                }
            }
        }
    }

    _checkFlameCollisions() {
        if (this.player.flameActive <= 0) return;
        if (this.gameTime % 8 !== 0) return;

        const p = this.player;
        const facing = Math.atan2(p.vy || 0, p.vx || 0) || (p.facing > 0 ? 0 : Math.PI);
        const halfAngle = p.flameAngle / 2;

        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            const d = Utils.distance(p.x, p.y, enemy.x, enemy.y);
            if (d > p.flameRange) continue;

            if (p.flameAngle < Math.PI * 1.5) {
                const a = Utils.angle(p.x, p.y, enemy.x, enemy.y);
                let diff = a - facing;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                if (Math.abs(diff) > halfAngle) continue;
            }

            const dmg = Math.round(p.damage * 0.35);
            enemy.takeDamage(dmg);
            enemy.burning = true;
            enemy.burnTimer = 90;
            this.particleSystem.showDamage(enemy.x, enemy.y - enemy.size, dmg, '#ff8844');
            this._checkEnemyDeath(enemy);
        }
    }

    _checkEnemyContactCollisions() {
        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            if (!Utils.circleCollision(this.player.x, this.player.y, this.player.size, enemy.x, enemy.y, enemy.size)) continue;
            const dmg = this.player.takeDamage(enemy.damage);
            if (dmg > 0) {
                const ka = Utils.angle(enemy.x, enemy.y, this.player.x, this.player.y);
                this.player.x += Math.cos(ka) * 10;
                this.player.y += Math.sin(ka) * 10;
                this.particleSystem.emit(this.player.x, this.player.y, 8, { color: '#ff4444', life: 20, size: 3 });
                this.shakeScreen(5, 3);
            }
            if (enemy.type === 'exploder' && enemy.exploding) {
                this.particleSystem.emitCircle(enemy.x, enemy.y, 20, 5, { color: '#ff4488', life: 25, size: 5, glow: true });
                enemy.takeDamage(enemy.hp);
                this._checkEnemyDeath(enemy);
                this.shakeScreen(10, 6);
            }
        }
    }

    _checkEnemyProjectileCollisions() {
        for (const proj of this.enemyProjectiles) {
            if (proj.life <= 0) continue;

            let blocked = false;
            for (const orb of this.player.orbitals) {
                if (Utils.circleCollision(proj.x, proj.y, proj.size, orb.x, orb.y, orb.size + 4)) {
                    proj.life = 0;
                    blocked = true;
                    this.particleSystem.emitCircle(proj.x, proj.y, 6, 3, { color: '#88ccff', life: 12, size: 2, glow: true });
                    this.particleSystem.showDamage(proj.x, proj.y - 10, '막음!', '#88ccff');
                    break;
                }
            }
            if (blocked) continue;

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
        if (!enemy.alive && !enemy._deathHandled) {
            enemy._deathHandled = true;
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
                    const p = Utils.randomPointOnCircle(enemy.x, enemy.y, Utils.randomRange(10, 40));
                    this.expOrbs.push(new ExpOrb(p.x, p.y, Math.round(enemy.exp / 5)));
                }
                if (!this.isEndless) {
                    setTimeout(() => this.onStageClear(), 1500);
                }
            }
            if (enemy.type === 'exploder') {
                this._handleAoE(enemy.x, enemy.y, enemy.explodeRange || 60, enemy.damage);
            }
        }
    }

    // ==================== LEVEL UP ====================
    _onLevelUp() {
        const choices = this.skillManager.getRandomChoices(3);
        if (choices.length === 0) return;

        this.state = 'levelup';
        this._showSkillSelection(choices);
        this.particleSystem.emitCircle(this.player.x, this.player.y, 24, 5, { color: '#ffd700', life: 30, size: 4, glow: true });
    }

    _showSkillSelection(choices) {
        const container = document.getElementById('skill-options');
        container.innerHTML = '';

        const remaining = this.skillManager.getUpgradesRemaining();
        const used = this.skillManager.upgradesUsed;
        const urgencyClass = remaining <= 3 ? 'urgent' : remaining <= 7 ? 'warning' : '';
        const slotInfo = document.createElement('div');
        slotInfo.className = `weapon-slot-info ${urgencyClass}`;
        slotInfo.innerHTML = `강화 <strong>${used}</strong>/${MAX_UPGRADES} — 남은 선택 <strong>${remaining}</strong>회`;
        container.appendChild(slotInfo);

        choices.forEach(choice => {
            const card = document.createElement('div');
            card.className = 'skill-card';
            const synergyBadge = choice.synergyHint ?
                `<div class="synergy-badge">→ ${choice.synergyHint}</div>` : '';
            const newBadge = choice.isNew ? '<span class="new-badge">NEW</span>' : '';
            card.innerHTML = `
                <div class="skill-icon">${choice.icon}</div>
                <div class="skill-info">
                    <div class="skill-name">${choice.name} ${newBadge}</div>
                    <div class="skill-desc">${choice.description}</div>
                    <div class="skill-level">Lv.${choice.currentLevel} → Lv.${choice.currentLevel + 1}</div>
                    ${synergyBadge}
                </div>
            `;
            card.addEventListener('click', () => {
                const prevSynCount = this.skillManager.activeSynergies.size;

                if (choice.category === 'weapon') {
                    this.skillManager.upgradeWeapon(choice.id, this.player);
                } else {
                    this.skillManager.upgradePassive(choice.id, this.player);
                }

                if (this.skillManager.activeSynergies.size > prevSynCount) {
                    const synergies = this.skillManager.getActiveSynergyList();
                    this._showSynergyNotification(synergies[synergies.length - 1]);
                }

                document.getElementById('skill-selection').classList.add('hidden');
                this.state = 'playing';
            });
            container.appendChild(card);
        });
        document.getElementById('skill-selection').classList.remove('hidden');
    }

    _showSynergyNotification(synergy) {
        const el = document.getElementById('wave-announce');
        document.getElementById('wave-announce-text').textContent = `${synergy.icon} ${synergy.name} 발동!`;
        el.classList.remove('hidden');
        setTimeout(() => el.classList.add('hidden'), 2000);
    }

    // ==================== STAGE END ====================
    onStageClear() {
        this.state = 'clear';
        const timeSec = Math.round(this.gameTime / 60);
        const hpPct = Math.round((this.player.hp / this.player.maxHp) * 100);
        const stars = calcStars(this.stageConfig, timeSec, hpPct);
        const totalGold = this.goldEarned + this.stageConfig.goldReward;

        SaveManager.clearStage(this.currentChapter, this.currentStage, stars, timeSec);
        SaveManager.addGold(totalGold);

        document.getElementById('clear-title').textContent = '스테이지 클리어!';
        const starsDiv = document.getElementById('clear-stars');
        starsDiv.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const s = document.createElement('span');
            s.className = `clear-star ${i < stars ? 'filled' : ''}`;
            s.textContent = '★';
            s.style.animationDelay = `${i * 0.2}s`;
            starsDiv.appendChild(s);
        }

        const synList = this.skillManager.getActiveSynergyList();
        const synHtml = synList.length > 0 ? `<div class="clear-stat" style="grid-column:1/-1"><span class="label">발동 시너지</span><span class="value" style="font-size:13px">${synList.map(s => `${s.icon}${s.name}`).join(' ')}</span></div>` : '';

        document.getElementById('clear-stats').innerHTML = `
            <div class="clear-stat"><span class="label">시간</span><span class="value">${Utils.formatTime(timeSec)}</span></div>
            <div class="clear-stat"><span class="label">처치</span><span class="value">${this.player.kills}</span></div>
            <div class="clear-stat"><span class="label">잔여 HP</span><span class="value">${hpPct}%</span></div>
            <div class="clear-stat"><span class="label">최종 레벨</span><span class="value">Lv.${this.player.level}</span></div>
            ${synHtml}
        `;
        document.getElementById('clear-rewards').innerHTML = `<div class="reward-item"><span class="gold-icon">🪙</span> +${totalGold.toLocaleString()} 골드</div>`;

        const hasNext = getStage(this.currentChapter, this.currentStage + 1) || getChapter(this.currentChapter + 1);
        document.getElementById('btn-clear-next').style.display = hasNext ? '' : 'none';

        document.getElementById('hud').classList.add('hidden');
        document.getElementById('stage-clear-screen').classList.remove('hidden');
    }

    onGameOver() {
        this.state = 'gameover';
        const timeSec = Math.round(this.gameTime / 60);
        const partialGold = Math.round(this.goldEarned * 0.5);
        if (partialGold > 0) SaveManager.addGold(partialGold);

        const endlessInfo = this.isEndless ? `<p>무한 웨이브: <span class="stat-highlight">${this.endlessWave + 1}</span></p>` : '';

        document.getElementById('game-over-stats').innerHTML = `
            <p>생존 시간: <span class="stat-highlight">${Utils.formatTime(timeSec)}</span></p>
            <p>처치: <span class="stat-highlight">${this.player.kills}</span></p>
            ${endlessInfo}
            <p>획득 골드: <span class="stat-highlight">🪙 ${partialGold}</span></p>
        `;
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('game-over-screen').classList.remove('hidden');
    }

    pause() { if (this.state === 'playing') { this.state = 'paused'; document.getElementById('pause-screen').classList.remove('hidden'); } }
    resume() { if (this.state === 'paused') { this.state = 'playing'; document.getElementById('pause-screen').classList.add('hidden'); } }
    quit() { this.state = 'menu'; document.getElementById('pause-screen').classList.add('hidden'); document.getElementById('hud').classList.add('hidden'); document.getElementById('title-screen').classList.remove('hidden'); }

    shakeScreen(d, i) { this.screenShake = d; this.screenShakeIntensity = i; }
    _updateScreenShake() { if (this.screenShake > 0) this.screenShake--; }

    updateUI() {
        document.getElementById('hp-bar').style.width = `${(this.player.hp / this.player.maxHp) * 100}%`;
        document.getElementById('hp-text').textContent = `${Math.round(this.player.hp)} / ${this.player.maxHp}`;
        document.getElementById('exp-bar').style.width = `${(this.player.exp / this.player.expToNext) * 100}%`;
        document.getElementById('level-text').textContent = `Lv.${this.player.level}`;
        document.getElementById('kill-count').textContent = `${this.player.kills}`;
        document.getElementById('gold-ingame').textContent = `${this.goldEarned}`;
        document.getElementById('time-display').textContent = Utils.formatTime(this.gameTime / 60);

        const totalWaves = this.stageConfig ? this.stageConfig.waves.length : 5;
        if (this.isEndless) {
            document.getElementById('wave-display').textContent = this.bossPhase ? 'BOSS!' : `∞ Wave ${this.endlessWave + 1}`;
            document.getElementById('wave-progress-bar').style.width = '100%';
        } else {
            const dw = Math.min(this.currentWave + 1, totalWaves);
            document.getElementById('wave-display').textContent = this.bossPhase ? 'BOSS!' : `Wave ${dw}/${totalWaves}`;
            document.getElementById('wave-progress-bar').style.width = `${(this.bossPhase ? 100 : (this.currentWave / totalWaves) * 100)}%`;
        }
    }

    // ==================== DRAW ====================
    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.screenW, this.screenH);
        ctx.save();

        if (this.screenShake > 0) {
            ctx.translate((Math.random()-0.5)*this.screenShakeIntensity*2, (Math.random()-0.5)*this.screenShakeIntensity*2);
        }
        ctx.translate(-this.camera.x, -this.camera.y);

        this._drawBackground(ctx);
        this._drawFlameFields(ctx);
        this.expOrbs.forEach(o => o.draw(ctx));
        this._drawFrostAura(ctx);
        this.enemies.forEach(e => e.draw(ctx));
        this.projectiles.forEach(p => p.draw(ctx));
        this.enemyProjectiles.forEach(p => p.draw(ctx));
        this.lightningBolts.forEach(l => l.draw(ctx));
        this._drawLaserBeams(ctx);
        this._drawFlameEffect(ctx);
        this.player.draw(ctx);
        this.particleSystem.draw(ctx);

        ctx.restore();

        this._drawMinimap(this.ctx);
    }

    _drawMinimap(ctx) {
        const mapSize = 110;
        const padding = 12;
        const mx = this.screenW - mapSize - padding;
        const my = this.screenH - mapSize - padding;
        const viewRange = 800;
        const scale = mapSize / (viewRange * 2);

        ctx.save();
        ctx.globalAlpha = 0.65;

        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath();
        ctx.arc(mx + mapSize / 2, my + mapSize / 2, mapSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(mx + mapSize / 2, my + mapSize / 2, mapSize / 2, 0, Math.PI * 2);
        ctx.clip();

        const centerX = mx + mapSize / 2;
        const centerY = my + mapSize / 2;

        for (const e of this.enemies) {
            const dx = (e.x - this.player.x) * scale;
            const dy = (e.y - this.player.y) * scale;
            if (Math.abs(dx) > mapSize / 2 || Math.abs(dy) > mapSize / 2) continue;
            ctx.fillStyle = e.isBoss ? '#ff0000' : '#ff6666';
            const s = e.isBoss ? 4 : 2;
            ctx.beginPath();
            ctx.arc(centerX + dx, centerY + dy, s, 0, Math.PI * 2);
            ctx.fill();
        }

        for (const orb of this.expOrbs) {
            const dx = (orb.x - this.player.x) * scale;
            const dy = (orb.y - this.player.y) * scale;
            if (Math.abs(dx) > mapSize / 2 || Math.abs(dy) > mapSize / 2) continue;
            ctx.fillStyle = '#44ff88';
            ctx.fillRect(centerX + dx - 1, centerY + dy - 1, 2, 2);
        }

        ctx.fillStyle = '#4ecdc4';
        ctx.shadowColor = '#4ecdc4';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();
    }

    _drawBackground(ctx) {
        const c = this.chapterConfig || { bgColor1:'#1e1e3a', bgColor2:'#0a0a1e', gridColor:'rgba(255,255,255,0.03)' };

        const cx = this.player.x;
        const cy = this.player.y;
        const halfW = this.screenW / 2 + 100;
        const halfH = this.screenH / 2 + 100;
        const left = cx - halfW;
        const top = cy - halfH;
        const right = cx + halfW;
        const bottom = cy + halfH;

        const g = ctx.createRadialGradient(cx, cy, 100, cx, cy, Math.max(halfW, halfH));
        g.addColorStop(0, c.bgColor1);
        g.addColorStop(1, c.bgColor2);
        ctx.fillStyle = g;
        ctx.fillRect(left, top, right - left, bottom - top);

        ctx.strokeStyle = c.gridColor;
        ctx.lineWidth = 1;
        const gs = 80;
        const sx = Math.floor(left / gs) * gs;
        const sy = Math.floor(top / gs) * gs;
        for (let x = sx; x <= right; x += gs) {
            ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke();
        }
        for (let y = sy; y <= bottom; y += gs) {
            ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
        }
    }

    _drawFrostAura(ctx) {
        if (this.player.frostLevel <= 0) return;
        ctx.save();
        ctx.globalAlpha = 0.08 + Math.sin(this.gameTime * 0.05) * 0.03;
        const g = ctx.createRadialGradient(this.player.x, this.player.y, 0, this.player.x, this.player.y, this.player.frostRange);
        g.addColorStop(0, 'rgba(100,200,255,0.3)');
        g.addColorStop(1, 'rgba(100,200,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(this.player.x, this.player.y, this.player.frostRange, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(100,200,255,0.2)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
    }

    _drawLaserBeams(ctx) {
        if (this.player.laserActive <= 0) return;
        const p = this.player;
        const beams = p.laserBeams;
        const alpha = Math.min(1, p.laserActive / 10);

        for (let b = 0; b < beams; b++) {
            const angle = beams === 1 ? p.laserAngle :
                          beams === 2 ? p.laserAngle + (b === 0 ? 0 : Math.PI) :
                          p.laserAngle + (Math.PI*2/beams)*b;

            const len = 800;
            const w = p.laserWidth + (this.player.synergies.plasmaLaser ? 6 : 0);
            const ex = p.x + Math.cos(angle)*len;
            const ey = p.y + Math.sin(angle)*len;

            ctx.save();
            ctx.globalAlpha = alpha * 0.3;
            ctx.strokeStyle = this.player.synergies.plasmaLaser ? '#ff44ff' : '#ff2222';
            ctx.lineWidth = w * 3;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(ex, ey); ctx.stroke();

            ctx.globalAlpha = alpha * 0.7;
            ctx.strokeStyle = this.player.synergies.plasmaLaser ? '#ff88ff' : '#ff4444';
            ctx.lineWidth = w;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(ex, ey); ctx.stroke();

            ctx.globalAlpha = alpha;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = w * 0.3;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(ex, ey); ctx.stroke();
            ctx.restore();
        }
    }

    _drawFlameEffect(ctx) {
        if (this.player.flameActive <= 0) return;
        const p = this.player;
        const facing = Math.atan2(p.vy||0, p.vx||0) || (p.facing > 0 ? 0 : Math.PI);
        const alpha = Math.min(1, p.flameActive / 10) * 0.4;
        const halfAngle = p.flameAngle / 2;

        ctx.save();
        ctx.globalAlpha = alpha;
        const g = ctx.createRadialGradient(p.x, p.y, 5, p.x, p.y, p.flameRange);
        g.addColorStop(0, 'rgba(255,200,50,0.6)');
        g.addColorStop(0.5, 'rgba(255,100,20,0.3)');
        g.addColorStop(1, 'rgba(255,50,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        if (p.flameAngle >= Math.PI * 1.5) {
            ctx.arc(p.x, p.y, p.flameRange, 0, Math.PI*2);
        } else {
            ctx.moveTo(p.x, p.y);
            ctx.arc(p.x, p.y, p.flameRange, facing - halfAngle, facing + halfAngle);
            ctx.closePath();
        }
        ctx.fill();
        ctx.restore();
    }

    _drawFlameFields(ctx) {
        for (const f of this.flameFields) {
            const alpha = Math.min(0.3, f.life / 60 * 0.3);
            ctx.save();
            ctx.globalAlpha = alpha;
            const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius);
            g.addColorStop(0, 'rgba(255,120,20,0.5)');
            g.addColorStop(1, 'rgba(255,60,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.radius, 0, Math.PI*2);
            ctx.fill();
            ctx.restore();
        }
    }
}
