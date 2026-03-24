(() => {
    const canvas = document.getElementById('gameCanvas');
    const game = new Game(canvas);

    const joystickZone = document.getElementById('joystick-zone');
    const joystick = new VirtualJoystick(joystickZone);
    game.setJoystick(joystick);

    let currentChapterTab = 0;

    function updateGoldDisplays() {
        const gold = SaveManager.getGold();
        const formatted = gold.toLocaleString();
        const ids = ['title-gold-amount', 'stage-gold-amount', 'shop-gold-amount'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = formatted;
        });
    }

    function showScreen(screenId) {
        ['title-screen', 'stage-select-screen', 'shop-screen',
         'stage-clear-screen', 'game-over-screen', 'pause-screen', 'hud'
        ].forEach(id => document.getElementById(id).classList.add('hidden'));
        document.getElementById(screenId).classList.remove('hidden');
        updateGoldDisplays();
    }

    function renderChapterTabs() {
        const tabs = document.getElementById('chapter-tabs');
        tabs.innerHTML = '';
        ChapterData.forEach((ch, idx) => {
            const tab = document.createElement('button');
            tab.className = `chapter-tab ${idx === currentChapterTab ? 'active' : ''}`;
            tab.textContent = `${ch.icon} ${ch.name}`;

            const isUnlocked = idx === 0 || SaveManager.isStageUnlocked(idx, 0);
            if (!isUnlocked) {
                tab.classList.add('locked');
                tab.textContent = `🔒 ${ch.name}`;
            }

            tab.addEventListener('click', () => {
                if (!isUnlocked) return;
                currentChapterTab = idx;
                renderChapterTabs();
                renderStageGrid(idx);
            });
            tabs.appendChild(tab);
        });
    }

    function renderStageGrid(chapterIdx) {
        const chapter = ChapterData[chapterIdx];
        const grid = document.getElementById('stage-grid');
        grid.innerHTML = '';
        document.getElementById('chapter-title').textContent = `${chapter.icon} ${chapter.name}`;

        chapter.stages.forEach((stage, sIdx) => {
            const unlocked = SaveManager.isStageUnlocked(chapterIdx, sIdx);
            const stars = SaveManager.getStageStars(chapterIdx, sIdx);
            const card = document.createElement('div');
            card.className = `stage-card ${unlocked ? '' : 'locked'}`;

            const starsHtml = Array.from({ length: 3 }, (_, i) =>
                `<span class="star ${i < stars ? 'filled' : ''}">★</span>`
            ).join('');

            card.innerHTML = `
                <div class="stage-number">${sIdx + 1}</div>
                <div class="stage-name">${unlocked ? stage.name : '???'}</div>
                <div class="stage-stars">${starsHtml}</div>
                ${!unlocked ? '<div class="lock-overlay">🔒</div>' : ''}
            `;

            if (unlocked) {
                card.addEventListener('click', () => {
                    showStageDetail(chapterIdx, sIdx, stage);
                });
            }
            grid.appendChild(card);
        });
    }

    function showStageDetail(chapterIdx, stageIdx, stage) {
        const detail = document.getElementById('stage-detail');
        const content = document.getElementById('stage-detail-content');
        const stars = SaveManager.getStageStars(chapterIdx, stageIdx);

        const starsHtml = Array.from({ length: 3 }, (_, i) =>
            `<span class="star big ${i < stars ? 'filled' : ''}">★</span>`
        ).join('');

        content.innerHTML = `
            <h3>${stage.name}</h3>
            <div class="detail-stars">${starsHtml}</div>
            <div class="detail-info">
                <p>웨이브: ${stage.waves.length} + 보스</p>
                <p>보스: ${stage.boss.name}</p>
                <p>보상: 🪙 ${stage.goldReward}</p>
            </div>
            <div class="detail-buttons">
                <button class="btn-primary btn-start-stage">출격!</button>
                <button class="btn-secondary btn-close-detail">닫기</button>
            </div>
        `;

        content.querySelector('.btn-start-stage').addEventListener('click', () => {
            detail.classList.add('hidden');
            game.startStage(chapterIdx, stageIdx);
        });
        content.querySelector('.btn-close-detail').addEventListener('click', () => {
            detail.classList.add('hidden');
        });

        detail.classList.remove('hidden');
    }

    // Title screen buttons
    document.getElementById('btn-adventure').addEventListener('click', () => {
        showScreen('stage-select-screen');
        renderChapterTabs();
        renderStageGrid(currentChapterTab);
    });

    document.getElementById('btn-shop').addEventListener('click', () => {
        showScreen('shop-screen');
        renderShop();
    });

    // Back buttons
    document.getElementById('stage-back-btn').addEventListener('click', () => {
        showScreen('title-screen');
    });
    document.getElementById('shop-back-btn').addEventListener('click', () => {
        showScreen('title-screen');
    });

    // Pause
    document.getElementById('pause-btn').addEventListener('click', () => {
        game.pause();
    });
    document.getElementById('btn-resume').addEventListener('click', () => {
        game.resume();
    });
    document.getElementById('btn-quit').addEventListener('click', () => {
        game.quit();
    });

    // Stage clear buttons
    document.getElementById('btn-clear-next').addEventListener('click', () => {
        const nextStage = game.currentStage + 1;
        const nextChapter = game.currentChapter;
        if (getStage(nextChapter, nextStage)) {
            game.startStage(nextChapter, nextStage);
        } else if (getChapter(nextChapter + 1)) {
            game.startStage(nextChapter + 1, 0);
        }
    });
    document.getElementById('btn-clear-home').addEventListener('click', () => {
        showScreen('title-screen');
    });

    // Game over buttons
    document.getElementById('btn-retry').addEventListener('click', () => {
        game.startStage(game.currentChapter, game.currentStage);
    });
    document.getElementById('btn-gameover-home').addEventListener('click', () => {
        showScreen('title-screen');
    });

    // Initialize
    updateGoldDisplays();

    let lastTime = 0;
    const targetFPS = 60;
    const frameTime = 1000 / targetFPS;

    function gameLoop(timestamp) {
        const delta = timestamp - lastTime;
        if (delta >= frameTime) {
            lastTime = timestamp - (delta % frameTime);
            game.update();
            game.draw();
        }
        requestAnimationFrame(gameLoop);
    }
    requestAnimationFrame(gameLoop);
})();
