const ChapterData = [];

const ChapterThemes = [
    { name: '수풀 숲',      icon: '🌲', bgColor1: '#1a2e1a', bgColor2: '#0a1a0a', gridColor: 'rgba(100,200,100,0.04)', borderColor: 'rgba(100,200,100,0.3)' },
    { name: '고블린 동굴',  icon: '🕳️', bgColor1: '#1e1e2e', bgColor2: '#0a0a18', gridColor: 'rgba(150,130,200,0.04)', borderColor: 'rgba(150,130,200,0.3)' },
    { name: '사막 유적',    icon: '🏜️', bgColor1: '#2e2418', bgColor2: '#1a140a', gridColor: 'rgba(200,180,100,0.04)', borderColor: 'rgba(200,180,100,0.3)' },
    { name: '독늪 지대',    icon: '🧪', bgColor1: '#1a2e20', bgColor2: '#0a1a0e', gridColor: 'rgba(100,230,80,0.04)',  borderColor: 'rgba(100,230,80,0.3)' },
    { name: '얼음 산맥',    icon: '🏔️', bgColor1: '#1a2030', bgColor2: '#0a1020', gridColor: 'rgba(150,200,255,0.04)', borderColor: 'rgba(150,200,255,0.3)' },
    { name: '해적 항구',    icon: '⚓', bgColor1: '#1e2428', bgColor2: '#0e1418', gridColor: 'rgba(100,180,200,0.04)', borderColor: 'rgba(100,180,200,0.3)' },
    { name: '화산 지대',    icon: '🌋', bgColor1: '#2e1818', bgColor2: '#1a0a0a', gridColor: 'rgba(255,100,50,0.04)',  borderColor: 'rgba(255,100,50,0.3)' },
    { name: '어둠의 성',    icon: '🏰', bgColor1: '#1a1028', bgColor2: '#0a0818', gridColor: 'rgba(180,80,255,0.04)',  borderColor: 'rgba(180,80,255,0.3)' },
    { name: '하늘 신전',    icon: '⛅', bgColor1: '#18202e', bgColor2: '#0c1020', gridColor: 'rgba(200,220,255,0.04)', borderColor: 'rgba(200,220,255,0.3)' },
    { name: '카오스 차원',  icon: '🌀', bgColor1: '#200a1a', bgColor2: '#100010', gridColor: 'rgba(255,50,150,0.04)', borderColor: 'rgba(255,50,150,0.3)' },
];

const StageNames = [
    ['숲의 입구','깊은 숲','거미굴','독버섯 지대','숲의 심장'],
    ['동굴 입구','광석 갱도','지하 호수','고블린 마을','고블린 왕좌'],
    ['모래 평원','오아시스','고대 무덤','피라미드 내부','태양의 방'],
    ['독안개 숲','독버섯 늪','부식의 강','독거미 소굴','독룡의 둥지'],
    ['설원 고개','빙하 동굴','눈보라 봉우리','얼음 미궁','빙결 왕좌'],
    ['항구 마을','난파선 해안','해적 요새','암초 미궁','해적왕의 배'],
    ['용암 지대','잿더미 골짜기','마그마 동굴','불의 신전','화산 정상'],
    ['외벽 성문','지하 감옥','마법 도서관','악마의 시험장','어둠의 왕좌'],
    ['구름 다리','바람의 통로','번개 시험장','천공 정원','신의 알현실'],
    ['균열 입구','뒤틀린 공간','카오스 회랑','차원의 틈','최종 결전'],
];

const BossNames = [
    ['숲의 수호자','나무 정령','여왕 거미','독버섯 대왕','숲의 대장군'],
    ['광부 두목','수정 골렘','지하 크라켄','고블린 장군','고블린 킹'],
    ['사막 전갈왕','모래 골렘','미라 파라오','스핑크스','태양신 라'],
    ['독 두꺼비','독안개 정령','부식 슬라임','독거미 여왕','독룡 벤노사'],
    ['설인 추장','빙하 정령','블리자드 늑대','얼음 마녀','빙결의 왕'],
    ['해적 선장','크라켄 새끼','산호 골렘','심해어인','해적왕 블랙비어드'],
    ['화염 거인','잿빛 드래곤','용암 골렘','불의 사제','화산 대마왕'],
    ['어둠 기사','감옥 워든','마법사 의회','악마 시험관','암흑 대공'],
    ['바람 정령','천둥 독수리','번개 원소','천공 수호자','대천사장'],
    ['차원 감시자','혼돈의 그림자','카오스 드래곤','차원의 균열','최종 보스: 카오스'],
];

const EnemyTypePool = ['normal', 'fast', 'tank', 'ranged', 'swarm', 'exploder'];

function generateWaves(chapterIdx, stageIdx) {
    const difficulty = chapterIdx * 5 + stageIdx;
    const waves = [];
    const waveCount = 5;

    for (let w = 0; w < waveCount; w++) {
        const enemies = [];
        const waveScale = 1 + w * 0.5;
        const totalBudget = Math.round((40 + difficulty * 10 + w * 12) * waveScale);

        const costs = { normal: 1, fast: 1.2, tank: 3, ranged: 2, swarm: 0.5, exploder: 2.5 };

        let budget = totalBudget;
        const availableTypes = EnemyTypePool.filter(t => {
            if (t === 'ranged' && difficulty < 3) return false;
            if (t === 'exploder' && difficulty < 6) return false;
            if (t === 'tank' && difficulty < 1) return false;
            return true;
        });

        const typeCounts = {};
        while (budget > 0 && availableTypes.length > 0) {
            const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
            const cost = costs[type];
            const maxAfford = Math.floor(budget / cost);
            if (maxAfford <= 0) break;
            const count = Math.min(maxAfford, Utils.randomInt(1, Math.max(1, Math.ceil(maxAfford * 0.6))));
            typeCounts[type] = (typeCounts[type] || 0) + count;
            budget -= count * cost;
        }

        for (const [type, count] of Object.entries(typeCounts)) {
            if (count > 0) enemies.push({ type, count });
        }

        if (enemies.length === 0) {
            enemies.push({ type: 'normal', count: 5 + difficulty });
        }

        waves.push({
            enemies,
            duration: 20 + w * 3 + Math.floor(difficulty * 0.5)
        });
    }

    return waves;
}

function getBossType(chapterIdx) {
    if (chapterIdx <= 2) return 'stage1';
    if (chapterIdx <= 5) return 'stage2';
    return 'stage3';
}

(function buildChapterData() {
    for (let c = 0; c < 10; c++) {
        const theme = ChapterThemes[c];
        const stages = [];

        for (let s = 0; s < 5; s++) {
            const globalStage = c * 5 + s;
            const isLast = (c === 9 && s === 4);

            stages.push({
                name: StageNames[c][s],
                waves: generateWaves(c, s),
                boss: {
                    type: getBossType(c),
                    name: BossNames[c][s]
                },
                recommendLevel: 1 + globalStage * 2,
                goldReward: Math.round(50 + globalStage * 30 + Math.pow(globalStage, 1.3) * 5),
                starThresholds: {
                    time: 120 + globalStage * 4,
                    hpPercent: Math.max(15, 80 - globalStage * 1.2)
                },
                isEndless: isLast
            });
        }

        ChapterData.push({
            name: theme.name,
            icon: theme.icon,
            bgColor1: theme.bgColor1,
            bgColor2: theme.bgColor2,
            gridColor: theme.gridColor,
            borderColor: theme.borderColor,
            stages
        });
    }
})();

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
