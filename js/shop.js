const ShopUpgrades = [
    {
        id: 'maxHp',
        icon: '❤️',
        name: '최대 체력',
        description: (lvl) => `최대 HP +${(lvl + 1) * 10}`,
        maxLevel: 20,
        cost: (lvl) => 50 + lvl * 30,
        apply: (player, lvl) => {
            player.baseMaxHp = 100 + lvl * 10;
            player.maxHp = player.baseMaxHp;
        }
    },
    {
        id: 'attack',
        icon: '⚔️',
        name: '공격력',
        description: (lvl) => `기본 공격력 +${lvl + 1}`,
        maxLevel: 20,
        cost: (lvl) => 60 + lvl * 35,
        apply: (player, lvl) => {
            player.baseDamage = 10 + lvl * 2;
        }
    },
    {
        id: 'attackSpeed',
        icon: '💨',
        name: '공격 속도',
        description: (lvl) => `기본 공격속도 +${(lvl + 1) * 5}%`,
        maxLevel: 15,
        cost: (lvl) => 80 + lvl * 40,
        apply: (player, lvl) => {
            player.baseAttackCooldown = Math.max(10, 30 - lvl);
        }
    },
    {
        id: 'moveSpeed',
        icon: '👟',
        name: '이동 속도',
        description: (lvl) => `기본 이동속도 +${(lvl + 1) * 5}%`,
        maxLevel: 10,
        cost: (lvl) => 70 + lvl * 45,
        apply: (player, lvl) => {
            player.baseSpeed = 3 + lvl * 0.15;
        }
    },
    {
        id: 'expBonus',
        icon: '📖',
        name: '경험치 보너스',
        description: (lvl) => `획득 경험치 +${(lvl + 1) * 10}%`,
        maxLevel: 10,
        cost: (lvl) => 100 + lvl * 50,
        apply: (player, lvl) => {
            player.expMult = 1 + lvl * 0.1;
        }
    },
    {
        id: 'goldBonus',
        icon: '🪙',
        name: '골드 보너스',
        description: (lvl) => `획득 골드 +${(lvl + 1) * 10}%`,
        maxLevel: 10,
        cost: (lvl) => 120 + lvl * 60,
        apply: (player, lvl) => {
            player.goldMult = 1 + lvl * 0.1;
        }
    },
    {
        id: 'startLevel',
        icon: '🌟',
        name: '시작 레벨',
        description: (lvl) => `Lv.${lvl + 2}에서 시작`,
        maxLevel: 5,
        cost: (lvl) => 200 + lvl * 150,
        apply: (player, lvl) => {
            player.startLevel = 1 + lvl;
        }
    }
];

function renderShop() {
    const grid = document.getElementById('shop-grid');
    grid.innerHTML = '';
    const saveData = SaveManager.load();
    document.getElementById('shop-gold-amount').textContent = saveData.gold.toLocaleString();

    ShopUpgrades.forEach(upgrade => {
        const currentLevel = saveData.upgrades[upgrade.id] || 0;
        const isMaxed = currentLevel >= upgrade.maxLevel;
        const cost = isMaxed ? 0 : upgrade.cost(currentLevel);
        const canAfford = saveData.gold >= cost;

        const card = document.createElement('div');
        card.className = `shop-card ${isMaxed ? 'maxed' : ''} ${!canAfford && !isMaxed ? 'cant-afford' : ''}`;
        card.innerHTML = `
            <div class="shop-icon">${upgrade.icon}</div>
            <div class="shop-info">
                <div class="shop-name">${upgrade.name}</div>
                <div class="shop-desc">${isMaxed ? 'MAX' : upgrade.description(currentLevel)}</div>
                <div class="shop-level-bar">
                    ${Array.from({ length: upgrade.maxLevel }, (_, i) =>
                        `<div class="level-pip ${i < currentLevel ? 'filled' : ''}"></div>`
                    ).join('')}
                </div>
            </div>
            <div class="shop-cost ${isMaxed ? 'hidden' : ''}">
                <span class="gold-icon">🪙</span>
                <span>${cost}</span>
            </div>
        `;

        if (!isMaxed && canAfford) {
            card.addEventListener('click', () => {
                if (SaveManager.purchaseUpgrade(upgrade.id, cost)) {
                    renderShop();
                }
            });
        }
        grid.appendChild(card);
    });
}

function applyUpgradesToPlayer(player) {
    const saveData = SaveManager.load();
    ShopUpgrades.forEach(upgrade => {
        const lvl = saveData.upgrades[upgrade.id] || 0;
        if (lvl > 0) {
            upgrade.apply(player, lvl);
        }
    });
}
