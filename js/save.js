const SaveManager = {
    SAVE_KEY: 'numtick_save',

    defaultData() {
        return {
            gold: 0,
            stagesCleared: {},
            stageStars: {},
            stageBestTime: {},
            upgrades: {
                maxHp: 0,
                attack: 0,
                attackSpeed: 0,
                moveSpeed: 0,
                expBonus: 0,
                goldBonus: 0,
                startLevel: 0
            },
            totalKills: 0,
            totalPlayTime: 0
        };
    },

    load() {
        try {
            const raw = localStorage.getItem(this.SAVE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                const defaults = this.defaultData();
                for (const key of Object.keys(defaults)) {
                    if (data[key] === undefined) data[key] = defaults[key];
                }
                for (const key of Object.keys(defaults.upgrades)) {
                    if (data.upgrades[key] === undefined) data.upgrades[key] = 0;
                }
                return data;
            }
        } catch (e) {
            console.warn('Save load failed:', e);
        }
        return this.defaultData();
    },

    save(data) {
        try {
            localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('Save failed:', e);
        }
    },

    addGold(amount) {
        const data = this.load();
        data.gold += amount;
        this.save(data);
        return data.gold;
    },

    getGold() {
        return this.load().gold;
    },

    clearStage(chapterIdx, stageIdx, stars, time) {
        const data = this.load();
        const key = `${chapterIdx}-${stageIdx}`;
        data.stagesCleared[key] = true;
        const prevStars = data.stageStars[key] || 0;
        if (stars > prevStars) data.stageStars[key] = stars;
        const prevTime = data.stageBestTime[key] || Infinity;
        if (time < prevTime) data.stageBestTime[key] = time;
        this.save(data);
        return data;
    },

    isStageUnlocked(chapterIdx, stageIdx) {
        if (chapterIdx === 0 && stageIdx === 0) return true;
        const data = this.load();
        if (stageIdx > 0) {
            return !!data.stagesCleared[`${chapterIdx}-${stageIdx - 1}`];
        }
        const prevChapter = chapterIdx - 1;
        const prevChapterLastStage = 4;
        return !!data.stagesCleared[`${prevChapter}-${prevChapterLastStage}`];
    },

    getStageStars(chapterIdx, stageIdx) {
        const data = this.load();
        return data.stageStars[`${chapterIdx}-${stageIdx}`] || 0;
    },

    getUpgrade(id) {
        return this.load().upgrades[id] || 0;
    },

    purchaseUpgrade(id, cost) {
        const data = this.load();
        if (data.gold < cost) return false;
        data.gold -= cost;
        data.upgrades[id] = (data.upgrades[id] || 0) + 1;
        this.save(data);
        return true;
    },

    resetAll() {
        localStorage.removeItem(this.SAVE_KEY);
    }
};
