(() => {
    const canvas = document.getElementById('gameCanvas');
    const game = new Game(canvas);

    document.getElementById('start-btn').addEventListener('click', () => {
        game.start();
    });

    document.getElementById('restart-btn').addEventListener('click', () => {
        game.start();
    });

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
