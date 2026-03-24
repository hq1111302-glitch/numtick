const SkillDefinitions = {
    multishot: {
        icon: '🔫',
        name: '멀티샷',
        maxLevel: 5,
        description: (lvl) => `투사체 ${1 + lvl}개 발사`,
        effect: (player, lvl) => { player.projectileCount = 1 + lvl; }
    },
    attackSpeed: {
        icon: '⚡',
        name: '공격 속도',
        maxLevel: 5,
        description: (lvl) => `공격 속도 ${lvl * 15}% 증가`,
        effect: (player, lvl) => { player.attackSpeedMult = 1 + lvl * 0.15; }
    },
    damage: {
        icon: '💥',
        name: '공격력 강화',
        maxLevel: 5,
        description: (lvl) => `공격력 ${lvl * 20}% 증가`,
        effect: (player, lvl) => { player.damageMult = 1 + lvl * 0.2; }
    },
    pierce: {
        icon: '🏹',
        name: '관통',
        maxLevel: 3,
        description: (lvl) => `투사체가 적 ${lvl}마리 관통`,
        effect: (player, lvl) => { player.pierceCount = lvl; }
    },
    orbital: {
        icon: '🛡️',
        name: '회전 구체',
        maxLevel: 5,
        description: (lvl) => `회전하는 구체 ${lvl}개 소환`,
        effect: (player, lvl) => { player.orbitalCount = lvl; }
    },
    hpRegen: {
        icon: '💚',
        name: 'HP 재생',
        maxLevel: 5,
        description: (lvl) => `초당 HP ${lvl * 2} 회복`,
        effect: (player, lvl) => { player.hpRegen = lvl * 2; }
    },
    maxHp: {
        icon: '❤️',
        name: '최대 HP',
        maxLevel: 5,
        description: (lvl) => `최대 HP ${lvl * 20} 증가`,
        effect: (player, lvl) => {
            const oldMax = player.baseMaxHp;
            player.maxHp = player.baseMaxHp + lvl * 20;
            player.hp += player.maxHp - oldMax;
        }
    },
    moveSpeed: {
        icon: '👟',
        name: '이동 속도',
        maxLevel: 3,
        description: (lvl) => `이동 속도 ${lvl * 12}% 증가`,
        effect: (player, lvl) => { player.moveSpeedMult = 1 + lvl * 0.12; }
    },
    homing: {
        icon: '🎯',
        name: '유도탄',
        maxLevel: 3,
        description: (lvl) => `투사체가 적을 추적 (강도: ${lvl})`,
        effect: (player, lvl) => { player.homingLevel = lvl; }
    },
    lightning: {
        icon: '⚡',
        name: '체인 라이트닝',
        maxLevel: 5,
        description: (lvl) => `${lvl * 3}초마다 번개 발사 (${lvl}회 연쇄)`,
        effect: (player, lvl) => {
            player.lightningLevel = lvl;
            player.lightningCooldownMax = Math.max(60, 180 - lvl * 30);
        }
    },
    aoe: {
        icon: '💣',
        name: '폭발탄',
        maxLevel: 3,
        description: (lvl) => `투사체 명중시 범위 ${30 + lvl * 15} 폭발`,
        effect: (player, lvl) => { player.aoeRadius = 30 + lvl * 15; }
    },
    magnet: {
        icon: '🧲',
        name: '경험치 자석',
        maxLevel: 3,
        description: (lvl) => `경험치 흡수 범위 ${lvl * 40}% 증가`,
        effect: (player, lvl) => { player.magnetRange = 80 + lvl * 40; }
    }
};

class SkillManager {
    constructor() {
        this.skills = {};
    }

    getLevel(skillId) {
        return this.skills[skillId] || 0;
    }

    upgrade(skillId, player) {
        if (!this.skills[skillId]) this.skills[skillId] = 0;
        this.skills[skillId]++;
        const def = SkillDefinitions[skillId];
        if (def && def.effect) {
            def.effect(player, this.skills[skillId]);
        }
    }

    getRandomChoices(count = 3) {
        const available = Object.entries(SkillDefinitions)
            .filter(([id, def]) => (this.skills[id] || 0) < def.maxLevel)
            .map(([id, def]) => ({
                id,
                ...def,
                currentLevel: this.skills[id] || 0
            }));

        const choices = [];
        const pool = [...available];
        for (let i = 0; i < Math.min(count, pool.length); i++) {
            const idx = Utils.randomInt(0, pool.length - 1);
            choices.push(pool.splice(idx, 1)[0]);
        }
        return choices;
    }

    reapplyAll(player) {
        for (const [id, level] of Object.entries(this.skills)) {
            const def = SkillDefinitions[id];
            if (def && def.effect && level > 0) {
                def.effect(player, level);
            }
        }
    }

    reset() {
        this.skills = {};
    }
}
