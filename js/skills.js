/*
 * 7 Weapon Systems (each upgradable to Lv.5)
 * 1. Bullet   - 기본 총 (멀티샷, 관통)
 * 2. Missile  - 유도 미사일 (범위폭발)
 * 3. Laser    - 관통 레이저 빔
 * 4. Shield   - 회전 방패 (방어+접촉 데미지)
 * 5. Flame    - 근거리 화염방사
 * 6. Frost    - 빙결 오라 (감속+데미지)
 * 7. Thunder  - 체인 라이트닝
 *
 * Synergies (2-weapon combos):
 *  Bullet + Missile  -> "폭렬탄": 총알 명중 시 소형 폭발
 *  Bullet + Frost    -> "빙결탄": 총알이 적 감속
 *  Laser + Flame     -> "플라즈마": 레이저 폭이 커지고 화상 부여
 *  Laser + Thunder   -> "전자기 펄스": 레이저 적중 시 주변 연쇄 감전
 *  Shield + Frost    -> "빙결 방패": 방패 접촉 시 적 빙결
 *  Shield + Flame    -> "화염 방패": 방패 주변 화염 오라
 *  Missile + Thunder -> "번개 미사일": 미사일 폭발 시 번개 연쇄
 *  Flame + Frost     -> "증기 폭발": 화염+빙결 동시 적에게 추가 폭발
 *  Frost + Thunder   -> "빙뢰": 빙결된 적 번개 추가 데미지
 *  Missile + Flame   -> "네이팜": 미사일 폭발 지역에 지속 화염장
 */

const WeaponDefinitions = {
    bullet: {
        icon: '🔫',
        name: '기본 총',
        maxLevel: 5,
        description: (lvl) => {
            const descs = [
                '투사체 2개 발사',
                '투사체 3개 + 관통 1',
                '투사체 4개 + 관통 1',
                '투사체 5개 + 관통 2',
                '투사체 6개 + 관통 2 + 공속 증가'
            ];
            return descs[lvl - 1] || descs[0];
        },
        apply: (player, lvl) => {
            player.weapons.bullet = lvl;
            player.projectileCount = 1 + lvl;
            player.pierceCount = lvl >= 2 ? (lvl >= 4 ? 2 : 1) : 0;
            if (lvl >= 5) player.attackSpeedMult = Math.max(player.attackSpeedMult, 1.3);
        }
    },
    missile: {
        icon: '🚀',
        name: '유도 미사일',
        maxLevel: 5,
        description: (lvl) => {
            const descs = [
                '유도 미사일 1발 (3초)',
                '유도 미사일 2발 (2.5초)',
                '유도 미사일 2발 + 폭발 범위 증가',
                '유도 미사일 3발 (2초)',
                '유도 미사일 4발 (1.5초) + 대폭발'
            ];
            return descs[lvl - 1] || descs[0];
        },
        apply: (player, lvl) => {
            player.weapons.missile = lvl;
            player.missileCount = [0, 1, 2, 2, 3, 4][lvl];
            player.missileCooldownMax = [0, 180, 150, 150, 120, 90][lvl];
            player.missileAoe = [0, 40, 40, 60, 60, 90][lvl];
        }
    },
    laser: {
        icon: '📡',
        name: '레이저',
        maxLevel: 5,
        description: (lvl) => {
            const descs = [
                '전방 레이저 빔 (1초간)',
                '레이저 데미지 증가',
                '레이저 폭 증가 + 관통',
                '레이저 2방향',
                '레이저 지속시간 2배 + 전방위'
            ];
            return descs[lvl - 1] || descs[0];
        },
        apply: (player, lvl) => {
            player.weapons.laser = lvl;
            player.laserLevel = lvl;
            player.laserCooldownMax = [0, 300, 270, 240, 210, 180][lvl];
            player.laserDuration = [0, 60, 60, 60, 60, 120][lvl];
            player.laserWidth = [0, 8, 10, 14, 14, 18][lvl];
            player.laserBeams = [0, 1, 1, 1, 2, 4][lvl];
        }
    },
    shield: {
        icon: '🛡️',
        name: '회전 방패',
        maxLevel: 5,
        description: (lvl) => {
            const descs = [
                '방패 구체 2개 (탄환 차단)',
                '방패 구체 3개',
                '방패 구체 4개 + 궤도 확대',
                '방패 구체 5개 + 데미지 증가',
                '방패 구체 6개 + 넉백 강화'
            ];
            return descs[lvl - 1] || descs[0];
        },
        apply: (player, lvl) => {
            player.weapons.shield = lvl;
            player.orbitalCount = [0, 2, 3, 4, 5, 6][lvl];
            if (lvl >= 3) player.orbitals.forEach(o => o.orbitRadius = 100);
            if (lvl >= 4) player.orbitalDamageMult = 1.5;
            if (lvl >= 5) player.orbitalKnockback = 5;
        }
    },
    flame: {
        icon: '🔥',
        name: '화염방사',
        maxLevel: 5,
        description: (lvl) => {
            const descs = [
                '전방 화염 방사 (2초 간격)',
                '화염 범위 증가',
                '화염 데미지 증가 + 화상',
                '화염 범위 대폭 증가',
                '360도 화염폭발 (1.5초 간격)'
            ];
            return descs[lvl - 1] || descs[0];
        },
        apply: (player, lvl) => {
            player.weapons.flame = lvl;
            player.flameLevel = lvl;
            player.flameCooldownMax = [0, 120, 110, 100, 90, 90][lvl];
            player.flameDuration = [0, 40, 45, 50, 55, 60][lvl];
            player.flameRange = [0, 80, 100, 110, 140, 160][lvl];
            player.flameAngle = lvl >= 5 ? Math.PI * 2 : (Math.PI * 0.4 + lvl * 0.1);
        }
    },
    frost: {
        icon: '❄️',
        name: '빙결 오라',
        maxLevel: 5,
        description: (lvl) => {
            const descs = [
                '주변 적 30% 감속',
                '감속 범위 + 효과 증가',
                '감속 50% + 초당 데미지',
                '빙결 범위 대폭 증가',
                '60% 감속 + 빙결 시 추가 데미지'
            ];
            return descs[lvl - 1] || descs[0];
        },
        apply: (player, lvl) => {
            player.weapons.frost = lvl;
            player.frostLevel = lvl;
            player.frostRange = [0, 80, 100, 120, 160, 200][lvl];
            player.frostSlow = [0, 0.3, 0.35, 0.5, 0.55, 0.6][lvl];
            player.frostDps = [0, 0, 0, 3, 5, 8][lvl];
        }
    },
    thunder: {
        icon: '⚡',
        name: '체인 라이트닝',
        maxLevel: 5,
        description: (lvl) => {
            const descs = [
                '번개 발사 (2회 연쇄)',
                '3회 연쇄 + 데미지 증가',
                '4회 연쇄 + 쿨타임 감소',
                '5회 연쇄 + 감전 효과',
                '6회 연쇄 + 2곳 동시 발사'
            ];
            return descs[lvl - 1] || descs[0];
        },
        apply: (player, lvl) => {
            player.weapons.thunder = lvl;
            player.lightningLevel = lvl;
            player.lightningChains = [0, 2, 3, 4, 5, 6][lvl];
            player.lightningCooldownMax = [0, 150, 140, 120, 110, 100][lvl];
            player.lightningTargets = lvl >= 5 ? 2 : 1;
        }
    }
};

const SynergyDefinitions = [
    {
        id: 'explosive_rounds',
        weapons: ['bullet', 'missile'],
        name: '폭렬탄',
        icon: '💥',
        description: '총알 명중 시 소형 폭발',
        effect: (player) => { player.synergies.bulletExplosion = true; player.bulletExplosionRadius = 25; }
    },
    {
        id: 'frost_rounds',
        weapons: ['bullet', 'frost'],
        name: '빙결탄',
        icon: '🧊',
        description: '총알이 적을 감속',
        effect: (player) => { player.synergies.bulletSlow = true; player.bulletSlowAmount = 0.4; player.bulletSlowDuration = 90; }
    },
    {
        id: 'plasma_beam',
        weapons: ['laser', 'flame'],
        name: '플라즈마',
        icon: '🔮',
        description: '레이저가 두꺼워지고 화상 부여',
        effect: (player) => { player.synergies.plasmaLaser = true; player.laserWidth += 6; }
    },
    {
        id: 'emp',
        weapons: ['laser', 'thunder'],
        name: '전자기 펄스',
        icon: '⚡',
        description: '레이저 적중 시 주변 연쇄 감전',
        effect: (player) => { player.synergies.laserChain = true; }
    },
    {
        id: 'frost_shield',
        weapons: ['shield', 'frost'],
        name: '빙결 방패',
        icon: '🧊',
        description: '방패 접촉 시 적 빙결',
        effect: (player) => { player.synergies.shieldFreeze = true; }
    },
    {
        id: 'flame_shield',
        weapons: ['shield', 'flame'],
        name: '화염 방패',
        icon: '🔥',
        description: '방패 주변 화염 오라 데미지',
        effect: (player) => { player.synergies.shieldFlame = true; }
    },
    {
        id: 'thunder_missile',
        weapons: ['missile', 'thunder'],
        name: '번개 미사일',
        icon: '🌩️',
        description: '미사일 폭발 시 번개 연쇄',
        effect: (player) => { player.synergies.missileChain = true; }
    },
    {
        id: 'steam_explosion',
        weapons: ['flame', 'frost'],
        name: '증기 폭발',
        icon: '💨',
        description: '감속+화상 중인 적에게 추가 폭발',
        effect: (player) => { player.synergies.steamExplosion = true; }
    },
    {
        id: 'ice_thunder',
        weapons: ['frost', 'thunder'],
        name: '빙뢰',
        icon: '🌨️',
        description: '감속된 적에게 번개 추가 데미지',
        effect: (player) => { player.synergies.frostThunderBonus = true; player.frostThunderMult = 1.5; }
    },
    {
        id: 'napalm',
        weapons: ['missile', 'flame'],
        name: '네이팜',
        icon: '☄️',
        description: '미사일 폭발 지점에 지속 화염장',
        effect: (player) => { player.synergies.napalmField = true; }
    }
];

const PassiveUpgrades = {
    maxHp: {
        icon: '❤️', name: '최대 HP', maxLevel: 5,
        description: (lvl) => `최대 HP +${lvl * 20}`,
        apply: (player, lvl) => { player.maxHp = player.baseMaxHp + lvl * 20; player.hp = Math.min(player.hp + 20, player.maxHp); }
    },
    hpRegen: {
        icon: '💚', name: 'HP 재생', maxLevel: 5,
        description: (lvl) => `초당 HP ${lvl * 2} 회복`,
        apply: (player, lvl) => { player.hpRegen = lvl * 2; }
    },
    moveSpeed: {
        icon: '👟', name: '이동 속도', maxLevel: 3,
        description: (lvl) => `이동속도 +${lvl * 12}%`,
        apply: (player, lvl) => { player.moveSpeedMult = 1 + lvl * 0.12; }
    },
    magnet: {
        icon: '🧲', name: '경험치 자석', maxLevel: 3,
        description: (lvl) => `흡수 범위 +${lvl * 40}%`,
        apply: (player, lvl) => { player.magnetRange = 80 + lvl * 40; }
    },
    damage: {
        icon: '💪', name: '공격력', maxLevel: 5,
        description: (lvl) => `전체 공격력 +${lvl * 15}%`,
        apply: (player, lvl) => { player.damageMult = 1 + lvl * 0.15; }
    },
    attackSpeed: {
        icon: '⏩', name: '공격 속도', maxLevel: 5,
        description: (lvl) => `전체 공격속도 +${lvl * 12}%`,
        apply: (player, lvl) => { player.attackSpeedMult = Math.max(player.attackSpeedMult, 1 + lvl * 0.12); }
    }
};

const MAX_UPGRADES = 20;

class SkillManager {
    constructor() {
        this.weapons = {};
        this.passives = {};
        this.activeSynergies = new Set();
        this.upgradesUsed = 0;
    }

    getWeaponLevel(id) { return this.weapons[id] || 0; }
    getPassiveLevel(id) { return this.passives[id] || 0; }
    getUpgradesRemaining() { return MAX_UPGRADES - this.upgradesUsed; }
    getTotalWeaponLevels() { return Object.values(this.weapons).reduce((s, v) => s + v, 0); }

    upgradeWeapon(id, player) {
        this.weapons[id] = (this.weapons[id] || 0) + 1;
        this.upgradesUsed++;
        WeaponDefinitions[id].apply(player, this.weapons[id]);
        this._checkSynergies(player);
    }

    upgradePassive(id, player) {
        this.passives[id] = (this.passives[id] || 0) + 1;
        this.upgradesUsed++;
        PassiveUpgrades[id].apply(player, this.passives[id]);
    }

    _checkSynergies(player) {
        for (const syn of SynergyDefinitions) {
            if (this.activeSynergies.has(syn.id)) continue;
            const [w1, w2] = syn.weapons;
            if ((this.weapons[w1] || 0) >= 1 && (this.weapons[w2] || 0) >= 1) {
                this.activeSynergies.add(syn.id);
                syn.effect(player);
            }
        }
    }

    getRandomChoices(count = 3) {
        if (this.upgradesUsed >= MAX_UPGRADES) return [];

        const pool = [];
        const focused = this.upgradesUsed >= 10;

        for (const [id, def] of Object.entries(WeaponDefinitions)) {
            const lvl = this.weapons[id] || 0;
            if (lvl >= def.maxLevel) continue;

            const isOwned = lvl > 0;
            let weight;
            if (focused) {
                weight = isOwned ? 4 : 0.6;
            } else {
                weight = isOwned ? 1.8 : 1.2;
            }

            pool.push({
                category: 'weapon', id, icon: def.icon, name: def.name,
                description: def.description(lvl + 1),
                currentLevel: lvl, maxLevel: def.maxLevel,
                weight, isNew: !isOwned
            });
        }

        for (const [id, def] of Object.entries(PassiveUpgrades)) {
            const lvl = this.passives[id] || 0;
            if (lvl >= def.maxLevel) continue;

            const isOwned = lvl > 0;
            pool.push({
                category: 'passive', id, icon: def.icon, name: def.name,
                description: def.description(lvl + 1),
                currentLevel: lvl, maxLevel: def.maxLevel,
                weight: focused ? (isOwned ? 1.5 : 0.5) : 0.8
            });
        }

        const pendingSynergies = SynergyDefinitions.filter(syn => {
            if (this.activeSynergies.has(syn.id)) return false;
            const [w1, w2] = syn.weapons;
            const l1 = this.weapons[w1] || 0;
            const l2 = this.weapons[w2] || 0;
            return (l1 >= 1 && l2 === 0) || (l2 >= 1 && l1 === 0);
        });

        for (const syn of pendingSynergies) {
            const [w1, w2] = syn.weapons;
            const missing = (this.weapons[w1] || 0) === 0 ? w1 : w2;
            const existing = pool.find(p => p.id === missing && p.category === 'weapon');
            if (existing) {
                existing.weight += focused ? 1 : 1.5;
                existing.synergyHint = syn.name;
            }
        }

        const choices = [];
        const remaining = [...pool];
        for (let i = 0; i < Math.min(count, remaining.length); i++) {
            const picked = Utils.pickWeighted(remaining);
            choices.push(picked);
            const idx = remaining.indexOf(picked);
            if (idx >= 0) remaining.splice(idx, 1);
        }

        return choices;
    }

    reapplyAll(player) {
        for (const [id, lvl] of Object.entries(this.weapons)) {
            if (lvl > 0) WeaponDefinitions[id].apply(player, lvl);
        }
        for (const [id, lvl] of Object.entries(this.passives)) {
            if (lvl > 0) PassiveUpgrades[id].apply(player, lvl);
        }
        this.activeSynergies.clear();
        this._checkSynergies(player);
    }

    getActiveSynergyList() {
        return SynergyDefinitions.filter(s => this.activeSynergies.has(s.id));
    }

    reset() {
        this.weapons = {};
        this.passives = {};
        this.activeSynergies = new Set();
        this.upgradesUsed = 0;
    }
}
