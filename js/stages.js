const ChapterData = [
    {
        name: '수풀 숲',
        icon: '🌲',
        bgColor1: '#1a2e1a',
        bgColor2: '#0a1a0a',
        gridColor: 'rgba(100,200,100,0.04)',
        borderColor: 'rgba(100,200,100,0.3)',
        stages: [
            {
                name: '숲의 입구',
                waves: [
                    { enemies: [{ type: 'normal', count: 5 }], duration: 20 },
                    { enemies: [{ type: 'normal', count: 8 }, { type: 'fast', count: 2 }], duration: 25 },
                    { enemies: [{ type: 'normal', count: 6 }, { type: 'swarm', count: 6 }], duration: 25 },
                    { enemies: [{ type: 'normal', count: 10 }, { type: 'fast', count: 5 }], duration: 30 },
                    { enemies: [{ type: 'tank', count: 2 }, { type: 'normal', count: 8 }], duration: 30 },
                ],
                boss: { type: 'forest_guardian', name: '숲의 수호자' },
                recommendLevel: 1,
                goldReward: 50,
                starThresholds: { time: 120, hpPercent: 80 }
            },
            {
                name: '깊은 숲',
                waves: [
                    { enemies: [{ type: 'normal', count: 8 }, { type: 'fast', count: 3 }], duration: 20 },
                    { enemies: [{ type: 'swarm', count: 12 }], duration: 25 },
                    { enemies: [{ type: 'normal', count: 10 }, { type: 'tank', count: 2 }], duration: 25 },
                    { enemies: [{ type: 'fast', count: 8 }, { type: 'swarm', count: 8 }], duration: 30 },
                    { enemies: [{ type: 'tank', count: 4 }, { type: 'normal', count: 12 }], duration: 35 },
                ],
                boss: { type: 'forest_guardian', name: '늙은 나무정령' },
                recommendLevel: 3,
                goldReward: 80,
                starThresholds: { time: 150, hpPercent: 70 }
            },
            {
                name: '거미굴',
                waves: [
                    { enemies: [{ type: 'swarm', count: 15 }], duration: 20 },
                    { enemies: [{ type: 'swarm', count: 10 }, { type: 'fast', count: 5 }], duration: 25 },
                    { enemies: [{ type: 'ranged', count: 4 }, { type: 'swarm', count: 10 }], duration: 25 },
                    { enemies: [{ type: 'fast', count: 10 }, { type: 'ranged', count: 5 }], duration: 30 },
                    { enemies: [{ type: 'swarm', count: 20 }, { type: 'tank', count: 3 }], duration: 30 },
                ],
                boss: { type: 'forest_guardian', name: '여왕 거미' },
                recommendLevel: 5,
                goldReward: 120,
                starThresholds: { time: 160, hpPercent: 60 }
            },
            {
                name: '독버섯 지대',
                waves: [
                    { enemies: [{ type: 'normal', count: 10 }, { type: 'exploder', count: 2 }], duration: 25 },
                    { enemies: [{ type: 'exploder', count: 4 }, { type: 'fast', count: 6 }], duration: 25 },
                    { enemies: [{ type: 'ranged', count: 5 }, { type: 'tank', count: 3 }], duration: 30 },
                    { enemies: [{ type: 'exploder', count: 5 }, { type: 'swarm', count: 15 }], duration: 30 },
                    { enemies: [{ type: 'tank', count: 5 }, { type: 'ranged', count: 5 }, { type: 'exploder', count: 3 }], duration: 35 },
                ],
                boss: { type: 'forest_guardian', name: '독버섯 대왕' },
                recommendLevel: 7,
                goldReward: 160,
                starThresholds: { time: 180, hpPercent: 50 }
            },
            {
                name: '숲의 심장',
                waves: [
                    { enemies: [{ type: 'tank', count: 5 }, { type: 'ranged', count: 5 }], duration: 25 },
                    { enemies: [{ type: 'fast', count: 15 }, { type: 'exploder', count: 3 }], duration: 30 },
                    { enemies: [{ type: 'swarm', count: 25 }], duration: 25 },
                    { enemies: [{ type: 'tank', count: 6 }, { type: 'ranged', count: 6 }, { type: 'fast', count: 6 }], duration: 35 },
                    { enemies: [{ type: 'exploder', count: 6 }, { type: 'tank', count: 6 }, { type: 'swarm', count: 15 }], duration: 35 },
                ],
                boss: { type: 'stage1', name: '어둠의 장군' },
                recommendLevel: 10,
                goldReward: 250,
                starThresholds: { time: 200, hpPercent: 40 }
            }
        ]
    },
    {
        name: '사막 유적',
        icon: '🏜️',
        bgColor1: '#2e2418',
        bgColor2: '#1a140a',
        gridColor: 'rgba(200,180,100,0.04)',
        borderColor: 'rgba(200,180,100,0.3)',
        stages: [
            {
                name: '모래 평원',
                waves: [
                    { enemies: [{ type: 'fast', count: 10 }], duration: 20 },
                    { enemies: [{ type: 'normal', count: 12 }, { type: 'fast', count: 5 }], duration: 25 },
                    { enemies: [{ type: 'ranged', count: 6 }, { type: 'fast', count: 8 }], duration: 30 },
                    { enemies: [{ type: 'tank', count: 5 }, { type: 'ranged', count: 5 }, { type: 'normal', count: 8 }], duration: 30 },
                    { enemies: [{ type: 'fast', count: 15 }, { type: 'exploder', count: 4 }], duration: 35 },
                ],
                boss: { type: 'stage2', name: '사막의 전갈왕' },
                recommendLevel: 12,
                goldReward: 300,
                starThresholds: { time: 180, hpPercent: 50 }
            },
            {
                name: '오아시스',
                waves: [
                    { enemies: [{ type: 'swarm', count: 20 }, { type: 'ranged', count: 3 }], duration: 25 },
                    { enemies: [{ type: 'tank', count: 6 }, { type: 'normal', count: 10 }], duration: 25 },
                    { enemies: [{ type: 'ranged', count: 8 }, { type: 'fast', count: 8 }], duration: 30 },
                    { enemies: [{ type: 'exploder', count: 6 }, { type: 'swarm', count: 15 }], duration: 30 },
                    { enemies: [{ type: 'tank', count: 8 }, { type: 'ranged', count: 8 }], duration: 35 },
                ],
                boss: { type: 'stage2', name: '물의 정령' },
                recommendLevel: 15,
                goldReward: 350,
                starThresholds: { time: 190, hpPercent: 45 }
            },
            {
                name: '고대 무덤',
                waves: [
                    { enemies: [{ type: 'tank', count: 8 }, { type: 'exploder', count: 3 }], duration: 25 },
                    { enemies: [{ type: 'ranged', count: 8 }, { type: 'swarm', count: 15 }], duration: 30 },
                    { enemies: [{ type: 'exploder', count: 8 }, { type: 'fast', count: 10 }], duration: 30 },
                    { enemies: [{ type: 'tank', count: 10 }, { type: 'ranged', count: 8 }], duration: 35 },
                    { enemies: [{ type: 'swarm', count: 30 }, { type: 'exploder', count: 5 }], duration: 35 },
                ],
                boss: { type: 'stage2', name: '미라 파라오' },
                recommendLevel: 18,
                goldReward: 400,
                starThresholds: { time: 200, hpPercent: 40 }
            },
            {
                name: '피라미드 내부',
                waves: [
                    { enemies: [{ type: 'ranged', count: 10 }, { type: 'tank', count: 5 }], duration: 30 },
                    { enemies: [{ type: 'exploder', count: 8 }, { type: 'fast', count: 12 }], duration: 30 },
                    { enemies: [{ type: 'swarm', count: 25 }, { type: 'ranged', count: 8 }], duration: 30 },
                    { enemies: [{ type: 'tank', count: 10 }, { type: 'exploder', count: 6 }, { type: 'normal', count: 10 }], duration: 35 },
                    { enemies: [{ type: 'fast', count: 20 }, { type: 'ranged', count: 10 }, { type: 'tank', count: 5 }], duration: 40 },
                ],
                boss: { type: 'stage2', name: '스핑크스' },
                recommendLevel: 20,
                goldReward: 500,
                starThresholds: { time: 220, hpPercent: 35 }
            },
            {
                name: '태양의 방',
                waves: [
                    { enemies: [{ type: 'tank', count: 10 }, { type: 'ranged', count: 10 }], duration: 30 },
                    { enemies: [{ type: 'swarm', count: 30 }, { type: 'exploder', count: 5 }], duration: 30 },
                    { enemies: [{ type: 'fast', count: 20 }, { type: 'tank', count: 8 }], duration: 35 },
                    { enemies: [{ type: 'ranged', count: 12 }, { type: 'exploder', count: 8 }, { type: 'swarm', count: 15 }], duration: 35 },
                    { enemies: [{ type: 'tank', count: 12 }, { type: 'fast', count: 15 }, { type: 'exploder', count: 8 }], duration: 40 },
                ],
                boss: { type: 'stage2', name: '폭풍의 마왕' },
                recommendLevel: 25,
                goldReward: 700,
                starThresholds: { time: 240, hpPercent: 30 }
            }
        ]
    },
    {
        name: '화산 지대',
        icon: '🌋',
        bgColor1: '#2e1818',
        bgColor2: '#1a0a0a',
        gridColor: 'rgba(255,100,50,0.04)',
        borderColor: 'rgba(255,100,50,0.3)',
        stages: [
            {
                name: '용암 지대',
                waves: [
                    { enemies: [{ type: 'exploder', count: 8 }, { type: 'fast', count: 10 }], duration: 25 },
                    { enemies: [{ type: 'tank', count: 10 }, { type: 'ranged', count: 8 }], duration: 30 },
                    { enemies: [{ type: 'swarm', count: 30 }, { type: 'exploder', count: 6 }], duration: 30 },
                    { enemies: [{ type: 'ranged', count: 12 }, { type: 'tank', count: 8 }, { type: 'fast', count: 10 }], duration: 35 },
                    { enemies: [{ type: 'exploder', count: 10 }, { type: 'swarm', count: 20 }, { type: 'tank', count: 8 }], duration: 40 },
                ],
                boss: { type: 'stage3', name: '화염 거인' },
                recommendLevel: 28,
                goldReward: 800,
                starThresholds: { time: 220, hpPercent: 40 }
            },
            {
                name: '잿더미 골짜기',
                waves: [
                    { enemies: [{ type: 'fast', count: 20 }, { type: 'ranged', count: 8 }], duration: 30 },
                    { enemies: [{ type: 'tank', count: 12 }, { type: 'exploder', count: 6 }], duration: 30 },
                    { enemies: [{ type: 'swarm', count: 35 }, { type: 'fast', count: 10 }], duration: 30 },
                    { enemies: [{ type: 'ranged', count: 15 }, { type: 'exploder', count: 8 }, { type: 'tank', count: 6 }], duration: 35 },
                    { enemies: [{ type: 'tank', count: 15 }, { type: 'ranged', count: 12 }, { type: 'fast', count: 12 }], duration: 40 },
                ],
                boss: { type: 'stage3', name: '잿빛 드래곤' },
                recommendLevel: 32,
                goldReward: 1000,
                starThresholds: { time: 240, hpPercent: 35 }
            },
            {
                name: '마그마 동굴',
                waves: [
                    { enemies: [{ type: 'exploder', count: 10 }, { type: 'tank', count: 8 }], duration: 30 },
                    { enemies: [{ type: 'swarm', count: 40 }, { type: 'ranged', count: 10 }], duration: 30 },
                    { enemies: [{ type: 'fast', count: 25 }, { type: 'exploder', count: 8 }], duration: 35 },
                    { enemies: [{ type: 'tank', count: 15 }, { type: 'ranged', count: 12 }, { type: 'swarm', count: 15 }], duration: 35 },
                    { enemies: [{ type: 'exploder', count: 12 }, { type: 'fast', count: 20 }, { type: 'tank', count: 10 }], duration: 40 },
                ],
                boss: { type: 'stage3', name: '용암 골렘' },
                recommendLevel: 35,
                goldReward: 1200,
                starThresholds: { time: 250, hpPercent: 30 }
            },
            {
                name: '불의 신전',
                waves: [
                    { enemies: [{ type: 'ranged', count: 15 }, { type: 'exploder', count: 8 }], duration: 30 },
                    { enemies: [{ type: 'tank', count: 15 }, { type: 'fast', count: 15 }], duration: 35 },
                    { enemies: [{ type: 'swarm', count: 40 }, { type: 'exploder', count: 10 }], duration: 35 },
                    { enemies: [{ type: 'ranged', count: 15 }, { type: 'tank', count: 12 }, { type: 'exploder', count: 8 }], duration: 40 },
                    { enemies: [{ type: 'fast', count: 25 }, { type: 'ranged', count: 15 }, { type: 'tank', count: 12 }], duration: 40 },
                ],
                boss: { type: 'stage3', name: '불의 사제' },
                recommendLevel: 38,
                goldReward: 1500,
                starThresholds: { time: 260, hpPercent: 25 }
            },
            {
                name: '화산 정상',
                waves: [
                    { enemies: [{ type: 'tank', count: 15 }, { type: 'ranged', count: 15 }], duration: 30 },
                    { enemies: [{ type: 'exploder', count: 12 }, { type: 'swarm', count: 30 }], duration: 35 },
                    { enemies: [{ type: 'fast', count: 30 }, { type: 'exploder', count: 10 }], duration: 35 },
                    { enemies: [{ type: 'tank', count: 15 }, { type: 'ranged', count: 15 }, { type: 'fast', count: 15 }], duration: 40 },
                    { enemies: [{ type: 'swarm', count: 40 }, { type: 'tank', count: 15 }, { type: 'exploder', count: 12 }], duration: 45 },
                ],
                boss: { type: 'stage3', name: '최종 보스: 카오스' },
                recommendLevel: 42,
                goldReward: 2000,
                starThresholds: { time: 280, hpPercent: 20 }
            }
        ]
    }
];

function getChapter(chapterIdx) {
    return ChapterData[chapterIdx] || null;
}

function getStage(chapterIdx, stageIdx) {
    const chapter = ChapterData[chapterIdx];
    if (!chapter) return null;
    return chapter.stages[stageIdx] || null;
}

function calcStars(stageConfig, timeSeconds, hpPercent) {
    let stars = 1;
    if (hpPercent >= stageConfig.starThresholds.hpPercent) stars++;
    if (timeSeconds <= stageConfig.starThresholds.time) stars++;
    return stars;
}
