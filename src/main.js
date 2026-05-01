
import './styles/main.scss';

const typedTextElement = document.querySelector('.typed');
const textData = typedTextElement ? typedTextElement.dataset.text.split('|') : [];
const typingSpeed = 80;
const pauseTime = 1400;
let currentText = '';
let currentIndex = 0;
let charIndex = 0;
let deleting = false;
let gameLoop = null;
let currentGame = null;
let gameData = {};
const canvas = document.querySelector('#gameCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

function getCanvasPoint(event) {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY
    };
}

document.addEventListener('DOMContentLoaded', () => {
    if (typedTextElement && textData.length) {
        updateText();
    }
    initGamesPage();
});

function updateText() {
    const fullText = textData[currentIndex] || '';
    if (!deleting) {
        currentText = fullText.slice(0, charIndex + 1);
        charIndex++;
        if (charIndex === fullText.length) {
            deleting = true;
            setTimeout(updateText, pauseTime);
            return;
        }
    } else {
        currentText = fullText.slice(0, charIndex - 1);
        charIndex--;
        if (charIndex === 0) {
            deleting = false;
            currentIndex = (currentIndex + 1) % textData.length;
        }
    }

    typedTextElement.textContent = currentText;
    setTimeout(updateText, deleting ? typingSpeed / 2 : typingSpeed);
}

function resetGame() {
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
    }
    currentGame = null;
    gameData = {};
}

function getBestScore(game) {
    if (!window.localStorage) return 0;
    return Number(localStorage.getItem(`bestScore_${game}`) || 0);
}

function saveBestScore(game, score) {
    if (!window.localStorage) return false;
    const best = getBestScore(game);
    if (score > best) {
        localStorage.setItem(`bestScore_${game}`, String(score));
        return true;
    }
    return false;
}

function createGameUi() {
    const info = document.querySelector('.game-info');
    if (!info) return;
    if (!document.querySelector('.game-scoreboard')) {
        info.insertAdjacentHTML('beforeend', `
            <div class="game-scoreboard">
                <div class="game-score-item">Счёт: <span id="gameScoreValue">0</span></div>
                <div class="game-score-item">Лучший: <span id="gameBestScoreValue">0</span></div>
            </div>
        `);
    }
    if (!document.querySelector('.game-over-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'game-over-overlay hidden';
        overlay.innerHTML = `
            <div class="game-over-panel">
                <h2 id="gameOverTitle">Игра окончена</h2>
                <p id="gameOverText">Счёт: 0</p>
                <button class="btn btn-secondary" id="gameOverAction">Начать заново</button>
            </div>
        `;
        const gamePanel = document.querySelector('.game-panel');
        (gamePanel || document.body).appendChild(overlay);
    }
}

function updateScoreBoard(score) {
    const scoreValue = document.querySelector('#gameScoreValue');
    const bestValue = document.querySelector('#gameBestScoreValue');
    if (scoreValue) scoreValue.textContent = String(score || 0);
    if (bestValue) {
        const best = getBestScore(currentGame || document.body.dataset.game);
        bestValue.textContent = String(best);
    }
}

function setGameScore(score) {
    if (!gameData) return;
    gameData.score = score;
    updateScoreBoard(score);
}

function showGameOver(title, message, actionLabel, callback) {
    const overlay = document.querySelector('.game-over-overlay');
    if (!overlay) return;
    overlay.querySelector('#gameOverTitle').textContent = title;
    overlay.querySelector('#gameOverText').textContent = message;
    const button = overlay.querySelector('#gameOverAction');
    button.textContent = actionLabel;
    button.onclick = () => {
        hideGameOver();
        if (typeof callback === 'function') callback();
    };
    overlay.classList.remove('hidden');
}

function hideGameOver() {
    const overlay = document.querySelector('.game-over-overlay');
    if (!overlay) return;
    overlay.classList.add('hidden');
}

function loadSnakeSettings() {
    if (!window.localStorage) return null;
    try {
        const raw = localStorage.getItem('snakeSettings');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed;
    } catch {
        return null;
    }
}

function saveSnakeSettings(settings) {
    if (!window.localStorage) return;
    try {
        localStorage.setItem('snakeSettings', JSON.stringify(settings || {}));
    } catch {
        // ignore
    }
}

function getSnakeOptionsFromControls() {
    const wrapWalls = Boolean(document.querySelector('#snakeWrapToggle')?.checked);
    const foodCountRaw = Number(document.querySelector('#snakeFoodCountSelect')?.value || 1);
    const foodCount = Number.isFinite(foodCountRaw) ? Math.max(1, Math.min(10, foodCountRaw)) : 1;
    const snakeColor = String(document.querySelector('#snakeColorSelect')?.value || '#ff9500');
    const speedMode = String(document.querySelector('#snakeSpeedSelect')?.value || 'normal');
    const speedMs = speedMode === 'slow' ? 170 : speedMode === 'fast' ? 85 : 120;
    return {wrapWalls, foodCount, snakeColor, speedMs, showGrid: true};
}

function applySnakeSettingsToControls(settings) {
    if (!settings) return;
    const wrap = document.querySelector('#snakeWrapToggle');
    const food = document.querySelector('#snakeFoodCountSelect');
    const color = document.querySelector('#snakeColorSelect');
    const speed = document.querySelector('#snakeSpeedSelect');

    if (wrap && typeof settings.wrapWalls === 'boolean') wrap.checked = settings.wrapWalls;
    if (food && settings.foodCount != null) food.value = String(settings.foodCount);
    if (color && typeof settings.snakeColor === 'string') color.value = settings.snakeColor;
    if (speed && settings.speedMs != null) {
        const ms = Number(settings.speedMs);
        if (ms <= 100) speed.value = 'fast';
        else if (ms >= 150) speed.value = 'slow';
        else speed.value = 'normal';
    }
}

function initGamesPage() {
    const pageGame = document.body.dataset.game;
    const selector = document.querySelector('.game-selector');

    createGameUi();

    if (pageGame) {
        document.querySelector('#gameCanvas')?.addEventListener('click', handleCanvasClick);
        document.querySelector('#gameControls')?.addEventListener('click', handleControlButton);
        document.querySelector('#gameControls')?.addEventListener('change', handleControlChange);
        document.addEventListener('keydown', handleKeyPress);
        switchGame(pageGame);
        return;
    }

    if (!selector) return;

    selector.querySelectorAll('[data-game]').forEach(button => {
        button.addEventListener('click', () => {
            selector.querySelector('.active')?.classList.remove('active');
            button.classList.add('active');
            switchGame(button.dataset.game);
        });
    });

    if (!pageGame) {
        document.querySelector('#gameCanvas')?.addEventListener('click', handleCanvasClick);
        document.querySelector('#gameControls')?.addEventListener('click', handleControlButton);
        document.querySelector('#gameControls')?.addEventListener('change', handleControlChange);
        document.addEventListener('keydown', handleKeyPress);
        switchGame('snake');
    }
}

function switchGame(name) {
    resetGame();
    currentGame = name;

    const title = document.querySelector('#gameTitle');
    const description = document.querySelector('#gameDescription');
    const controls = document.querySelector('#gameControls');
    const minesContainer = document.querySelector('#minesweeperGrid');
    const gameCanvas = document.querySelector('#gameCanvas');

    if (!title || !description || !controls) return;

    controls.innerHTML = '';
    minesContainer?.classList.add('hidden');
    if (gameCanvas) gameCanvas.classList.remove('hidden');

    if (name === 'snake') {
        title.textContent = 'Змейка';
        description.textContent = 'Управляй WASD, ешь яблоки, увеличивайся и выживи как можно дольше.';
        controls.innerHTML = '<div class="game-control-row"><span>Управление: W A S D</span></div>' +
            '<div class="game-control-row">' +
            '<label><input type="checkbox" id="snakeWrapToggle"> Проходить сквозь стены</label>' +
            '</div>' +
            '<div class="game-control-row">' +
            '<label>Яблок: <select id="snakeFoodCountSelect">' +
            '<option value="1" selected>1</option>' +
            '<option value="2">2</option>' +
            '<option value="3">3</option>' +
            '<option value="4">4</option>' +
            '<option value="5">5</option>' +
            '</select></label>' +
            '</div>' +
            '<div class="game-control-row">' +
            '<label>Цвет: <select id="snakeColorSelect">' +
            '<option value="#ff9500" selected>Оранжевый</option>' +
            '<option value="#00e5ff">Голубой</option>' +
            '<option value="#a7ff00">Лайм</option>' +
            '<option value="#ff2d55">Розовый</option>' +
            '<option value="#ffffff">Белый</option>' +
            '</select></label>' +
            '</div>' +
            '<div class="game-control-row">' +
            '<label>Скорость: <select id="snakeSpeedSelect">' +
            '<option value="slow">Медленно</option>' +
            '<option value="normal" selected>Обычно</option>' +
            '<option value="fast">Быстро</option>' +
            '</select></label>' +
            '</div>';
        const saved = loadSnakeSettings();
        applySnakeSettingsToControls(saved);
        showGameOver(title.textContent, description.textContent, 'Играть', () => {
            const options = getSnakeOptionsFromControls();
            saveSnakeSettings(options);
            startSnake({rows: 18, cols: 32, ...options});
        });
    } else if (name === 'dino') {
        title.textContent = 'Dino Run';
        description.textContent = 'Прыгай через препятствия. Используй пробел или стрелку вверх.';
        controls.innerHTML = '<div class="game-control-row"><span>Управление: пробел / ↑</span></div>';
        showGameOver(title.textContent, description.textContent, 'Играть', () => startDino());
    } else if (name === 'life') {
        title.textContent = 'Жизнь';
        description.textContent = 'Нажми на клетки, чтобы включить или выключить их. Запусти симуляцию и наблюдай за эволюцией.';
        controls.innerHTML = '<div class="game-control-row">' +
            '<button class="btn btn-secondary" data-action="toggle-life">Старт / Стоп</button>' +
            '<button class="btn btn-secondary" data-action="reset-life">Сброс</button>' +
            '</div>' +
            '<div class="game-control-row">' +
            '<label>Размер поля: <select id="lifeSizeSelect">' +
            '<option value="12x20">12×20</option>' +
            '<option value="18x32" selected>18×32</option>' +
            '<option value="22x40">22×40</option>' +
            '</select></label>' +
            '<label><input type="checkbox" id="lifeGridToggle"> Сетка</label>' +
            '</div>';
        showGameOver(title.textContent, description.textContent, 'Играть', () => startLife());
    } else if (name === 'minesweeper') {
        title.textContent = 'Сапёр';
        description.textContent = 'Открой все клетки без мин. ЛКМ — открыть, ПКМ — пометить флагом.';
        controls.innerHTML = '<div class="game-control-row">' +
            '<button class="btn btn-secondary" data-action="reset-mines">Новая игра</button>' +
            '</div>' +
            '<div class="game-control-row">' +
            '<label>Размер поля: <select id="minesweeperSizeSelect">' +
            '<option value="8x12" selected>8×12</option>' +
            '<option value="10x14">10×14</option>' +
            '<option value="12x16">12×16</option>' +
            '</select></label>' +
            '</div>';
        if (gameCanvas) gameCanvas.classList.add('hidden');
        minesContainer?.classList.remove('hidden');
        showGameOver(title.textContent, description.textContent, 'Играть', () => startMinesweeper());
    }
}

function handleControlButton(event) {
    const action = event.target.dataset.action;
    if (!action) return;

    if (action === 'toggle-life') {
        gameData.running = !gameData.running;
        if (gameData.running) {
            gameLoop = setInterval(updateLife, 120);
        } else {
            clearInterval(gameLoop);
            gameLoop = null;
        }
    }

    if (action === 'reset-life') {
        clearInterval(gameLoop);
        gameLoop = null;
        hideGameOver();
        startLife();
    }

    if (action === 'reset-mines') {
        hideGameOver();
        startMinesweeper();
    }
}

function handleControlChange(event) {
    const target = event.target;
    if (target.id === 'lifeSizeSelect') {
        const [rows, cols] = target.value.split('x').map(Number);
        startLife({rows, cols, showGrid: gameData.showGrid});
    }
    if (target.id === 'lifeGridToggle') {
        gameData.showGrid = target.checked;
        drawLife();
    }
    if (target.id === 'minesweeperSizeSelect') {
        const [rows, cols] = target.value.split('x').map(Number);
        startMinesweeper({rows, cols});
    }
    if (currentGame === 'snake' && ['snakeWrapToggle', 'snakeFoodCountSelect', 'snakeColorSelect', 'snakeSpeedSelect'].includes(target.id)) {
        saveSnakeSettings(getSnakeOptionsFromControls());
    }
}

function handleCanvasClick(event) {
    if (currentGame !== 'life') return;
    const point = getCanvasPoint(event);
    if (!point) return;
    const cellX = Math.floor(point.x / gameData.cellSize);
    const cellY = Math.floor(point.y / gameData.cellSize);
    if (cellX >= 0 && cellX < gameData.cols && cellY >= 0 && cellY < gameData.rows) {
        gameData.grid[cellY][cellX] = !gameData.grid[cellY][cellX];
        drawLife();
    }
}

function handleKeyPress(event) {
    if (!currentGame) return;
    if (event.repeat) return;
    const key = String(event.key || '').toLowerCase();
    const code = String(event.code || '');
    let codeKey = '';
    if (code.startsWith('Key')) {
        codeKey = code.slice(3).toLowerCase();
    } else if (code.startsWith('Arrow')) {
        codeKey = code.toLowerCase();
    } else if (code === 'Space') {
        codeKey = ' ';
    }

    const controlKeys = currentGame === 'snake'
        ? ['w', 'a', 's', 'd']
        : ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '];
    if (controlKeys.includes(key) || (codeKey && controlKeys.includes(codeKey))) {
        event.preventDefault();
    }
    if (currentGame === 'snake') {
        const mapping = {
            w: [0, -1],
            s: [0, 1],
            a: [-1, 0],
            d: [1, 0]
        };
        if (gameData.nextDirection) return;
        const directionKey = mapping[key] || (codeKey ? mapping[codeKey] : null);
        if (!directionKey) return;
        const [dx, dy] = directionKey;
        const currentDir = gameData.nextDirection || gameData.direction || [1, 0];
        if (dx === -currentDir[0] && dy === -currentDir[1]) return;
        gameData.nextDirection = [dx, dy];
    } else if (currentGame === 'dino' && (event.code === 'Space' || event.key === 'ArrowUp')) {
        if (!gameData.jump) {
            gameData.jump = true;
            gameData.velocity = -12;
        }
    }
}

function startSnake(options = {}) {
    const rows = options.rows || 18;
    const cols = options.cols || 32;
    const cellSize = 20;
    const wrapWalls = Boolean(options.wrapWalls);
    const foodCountRaw = Number(options.foodCount || 1);
    const foodCount = Number.isFinite(foodCountRaw) ? Math.max(1, Math.min(10, foodCountRaw)) : 1;
    const snakeColor = String(options.snakeColor || '#ff9500');
    const speedMsRaw = Number(options.speedMs || 120);
    const speedMs = Number.isFinite(speedMsRaw) ? Math.max(45, Math.min(300, speedMsRaw)) : 120;
    if (canvas) {
        canvas.width = cols * cellSize;
        canvas.height = rows * cellSize;
    }
    gameData = {
        rows,
        cols,
        cellSize,
        snake: [[Math.floor(cols / 4), Math.floor(rows / 2)], [Math.floor(cols / 4) - 1, Math.floor(rows / 2)], [Math.floor(cols / 4) - 2, Math.floor(rows / 2)]],
        direction: [1, 0],
        foods: [],
        wrapWalls,
        foodCount,
        snakeColor,
        speedMs,
        showGrid: true,
        score: 0,
        best: getBestScore('snake'),
        gameOver: false
    };
    ensureSnakeFoods();
    setGameScore(0);
    hideGameOver();
    drawSnake();
    if (gameLoop) {
        clearInterval(gameLoop);
    }
    gameLoop = setInterval(updateSnake, gameData.speedMs);
}

function updateSnake() {
    if (gameData.nextDirection) {
        gameData.direction = gameData.nextDirection;
        gameData.nextDirection = null;
    }
    const head = [...gameData.snake[0]];
    head[0] += gameData.direction[0];
    head[1] += gameData.direction[1];

    if (gameData.wrapWalls) {
        head[0] = (head[0] + gameData.cols) % gameData.cols;
        head[1] = (head[1] + gameData.rows) % gameData.rows;
    } else {
        const wallCollision = head[0] < 0 || head[0] >= gameData.cols || head[1] < 0 || head[1] >= gameData.rows;
        if (wallCollision) {
            endGame('snake', gameData.snake.length - 3, false);
            return;
        }
    }

    const selfCollision = gameData.snake.some(segment => segment[0] === head[0] && segment[1] === head[1]);
    if (selfCollision) {
        endGame('snake', gameData.snake.length - 3, false);
        return;
    }
    gameData.snake.unshift(head);

    const eatenIndex = Array.isArray(gameData.foods)
        ? gameData.foods.findIndex(food => food[0] === head[0] && food[1] === head[1])
        : -1;
    if (eatenIndex >= 0) {
        gameData.foods.splice(eatenIndex, 1);
        ensureSnakeFoods();
    } else {
        gameData.snake.pop();
    }
    drawSnake();
}

function placeFood() {
    let x, y;
    do {
        x = Math.floor(Math.random() * gameData.cols);
        y = Math.floor(Math.random() * gameData.rows);
    } while (gameData.snake.some(segment => segment[0] === x && segment[1] === y) || (Array.isArray(gameData.foods) && gameData.foods.some(food => food[0] === x && food[1] === y)));
    return [x, y];
}

function ensureSnakeFoods() {
    if (!Array.isArray(gameData.foods)) gameData.foods = [];
    const target = Number.isFinite(gameData.foodCount) ? Math.max(1, Math.min(10, gameData.foodCount)) : 1;
    while (gameData.foods.length < target) {
        gameData.foods.push(placeFood());
    }
}

function drawSnake() {
    if (!ctx) return;
    ctx.fillStyle = '#070408';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (gameData.showGrid) {
        drawGrid(gameData.cellSize, gameData.cols, gameData.rows);
    }
    gameData.snake.forEach((segment, index) => {
        ctx.fillStyle = gameData.snakeColor || (index === 0 ? '#fff' : '#ff9500');
        ctx.fillRect(segment[0] * gameData.cellSize, segment[1] * gameData.cellSize, gameData.cellSize - 1, gameData.cellSize - 1);
    });
    ctx.fillStyle = '#ff5722';
    if (Array.isArray(gameData.foods)) {
        gameData.foods.forEach(food => {
            ctx.fillRect(food[0] * gameData.cellSize, food[1] * gameData.cellSize, gameData.cellSize - 1, gameData.cellSize - 1);
        });
    }
    setGameScore(gameData.snake.length - 3);
}

function drawGrid(cellSize, cols, rows) {
    if (!ctx) return;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= cols; x++) {
        ctx.beginPath();
        ctx.moveTo(x * cellSize, 0);
        ctx.lineTo(x * cellSize, rows * cellSize);
        ctx.stroke();
    }
    for (let y = 0; y <= rows; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * cellSize);
        ctx.lineTo(cols * cellSize, y * cellSize);
        ctx.stroke();
    }
}

function startDino(options = {}) {
    const width = options.width || 640;
    const height = options.height || 360;
    if (canvas) {
        canvas.width = width;
        canvas.height = height;
    }
    const baseY = height - 136;
    const groundY = height - 80;
    gameData = {
        x: 80,
        y: baseY,
        baseY,
        groundY,
        dinoWidth: 30,
        dinoHeight: 32,
        velocity: 0,
        jump: false,
        obstacles: [],
        frames: 0,
        distance: 0,
        speed: 6,
        showGrid: options.showGrid || false,
        score: 0,
        best: getBestScore('dino'),
        gameOver: false
    };
    setGameScore(0);
    hideGameOver();
    drawDino();
    if (gameLoop) {
        clearInterval(gameLoop);
    }
    gameLoop = setInterval(updateDino, 16);
}

function updateDino() {
    if (gameData.jump) {
        gameData.y += gameData.velocity;
        gameData.velocity += 0.6;
        if (gameData.y >= gameData.baseY) {
            gameData.y = gameData.baseY;
            gameData.jump = false;
            gameData.velocity = 0;
        }
    }
    gameData.frames++;
    gameData.distance++;
    gameData.score = Math.floor(gameData.distance / 10);
    setGameScore(gameData.score);
    gameData.speed = Math.min(14, 6 + Math.floor(gameData.distance / 1200));
    const spawnInterval = Math.max(60, 90 - Math.floor(gameData.distance / 2400));
    if (gameData.frames % spawnInterval === 0) {
        gameData.obstacles.push({x: canvas.width + 20, width: 24, height: 42});
    }
    gameData.obstacles.forEach(obs => obs.x -= gameData.speed);
    gameData.obstacles = gameData.obstacles.filter(obs => obs.x > -50);
    const collision = gameData.obstacles.some(obs => {
        const obstacleTop = gameData.groundY - obs.height;
        return obs.x < gameData.x + gameData.dinoWidth && obs.x + obs.width > gameData.x && gameData.y + gameData.dinoHeight > obstacleTop;
    });
    if (collision) {
        endGame('dino', gameData.score, false);
        return;
    }
    drawDino();
}

function drawDino() {
    if (!ctx) return;
    ctx.fillStyle = '#050207';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (gameData.showGrid) {
        const cellSize = 40;
        drawGrid(cellSize, Math.floor(canvas.width / cellSize), Math.floor(canvas.height / cellSize));
    }
    ctx.fillStyle = '#ff9a0b';
    ctx.fillRect(gameData.x, gameData.y, gameData.dinoWidth, gameData.dinoHeight);
    ctx.fillStyle = '#ff5e12';
    ctx.fillRect(0, gameData.groundY, canvas.width, 4);
    gameData.obstacles.forEach(obs => ctx.fillRect(obs.x, gameData.groundY - obs.height, obs.width, obs.height));
}

function startLife(options = {}) {
    const rows = options.rows || 18;
    const cols = options.cols || 32;
    const cellSize = options.cellSize || Math.floor(640 / cols);
    if (canvas) {
        canvas.width = cols * cellSize;
        canvas.height = rows * cellSize;
    }
    gameData = {
        rows,
        cols,
        cellSize,
        grid: Array.from({length: rows}, () => Array(cols).fill(false)),
        running: false,
        showGrid: options.showGrid || false,
        generations: 0,
        score: 0,
        best: getBestScore('life'),
        gameOver: false
    };
    setGameScore(0);
    hideGameOver();
    drawLife();
}

function updateLife() {
    const next = gameData.grid.map(row => [...row]);
    for (let y = 0; y < gameData.rows; y++) {
        for (let x = 0; x < gameData.cols; x++) {
            const count = countNeighbors(x, y);
            next[y][x] = gameData.grid[y][x] ? count === 2 || count === 3 : count === 3;
        }
    }
    const allDead = next.every(row => row.every(cell => !cell));
    const stable = next.every((row, y) => row.every((cell, x) => cell === gameData.grid[y][x]));
    gameData.grid = next;
    gameData.generations += 1;
    setGameScore(gameData.generations);
    drawLife();
    if (allDead || stable) {
        endGame('life', gameData.generations, allDead ? false : true);
    }
}

function countNeighbors(x, y) {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < gameData.cols && ny >= 0 && ny < gameData.rows && gameData.grid[ny][nx]) {
                count++;
            }
        }
    }
    return count;
}

function drawLife() {
    if (!ctx) return;
    ctx.fillStyle = '#050208';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < gameData.rows; y++) {
        for (let x = 0; x < gameData.cols; x++) {
            if (gameData.grid[y][x]) {
                ctx.fillStyle = '#ff9f16';
                ctx.fillRect(x * gameData.cellSize, y * gameData.cellSize, gameData.cellSize - 1, gameData.cellSize - 1);
            }
        }
    }
    if (gameData.showGrid) {
        drawGrid(gameData.cellSize, gameData.cols, gameData.rows);
    }
}

function startMinesweeper(options = {}) {
    const rows = options.rows || 8;
    const cols = options.cols || 12;
    const mines = options.mines || Math.max(18, Math.floor(rows * cols * 0.2));
    const container = document.querySelector('#minesweeperGrid');
    if (!container) return;

    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    const cells = Array.from({length: rows}, () => Array(cols));
    const mineMap = Array.from({length: rows}, () => Array(cols).fill(false));
    let placed = 0;
    while (placed < mines) {
        const x = Math.floor(Math.random() * cols);
        const y = Math.floor(Math.random() * rows);
        if (!mineMap[y][x]) {
            mineMap[y][x] = true;
            placed++;
        }
    }

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const button = document.createElement('button');
            button.className = 'game-cell';
            button.dataset.x = x;
            button.dataset.y = y;
            button.addEventListener('click', revealCell);
            button.addEventListener('contextmenu', flagCell);
            container.appendChild(button);
            cells[y][x] = {
                element: button,
                mine: mineMap[y][x],
                revealed: false,
                flagged: false
            };
        }
    }
    gameData = {cells, rows, cols, mines, revealedCount: 0, totalSafe: rows * cols - mines, score: 0, best: getBestScore('minesweeper'), gameOver: false};
    setGameScore(0);
    hideGameOver();
}

function revealCell(event) {
    const x = Number(event.target.dataset.x);
    const y = Number(event.target.dataset.y);
    const cell = gameData.cells[y][x];
    if (!cell || cell.flagged || cell.revealed || gameData.gameOver) return;
    cell.revealed = true;
    cell.element.classList.add('revealed');
    cell.element.disabled = true;
    if (cell.mine) {
        cell.element.textContent = '💣';
        cell.element.style.backgroundColor = '#820000';
        revealAllMines();
        endGame('minesweeper', gameData.revealedCount, false);
        return;
    }
    gameData.revealedCount += 1;
    setGameScore(gameData.revealedCount);
    const count = countMines(x, y);
    if (count) {
        cell.element.textContent = count;
    } else {
        floodReveal(x, y);
    }
    if (gameData.revealedCount >= gameData.totalSafe) {
        endGame('minesweeper', gameData.revealedCount, true);
    }
}

function flagCell(event) {
    event.preventDefault();
    const x = Number(event.target.dataset.x);
    const y = Number(event.target.dataset.y);
    const cell = gameData.cells[y][x];
    if (!cell || cell.revealed) return;
    cell.flagged = !cell.flagged;
    event.target.textContent = cell.flagged ? '⚑' : '';
}

function countMines(x, y) {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < gameData.cols && ny >= 0 && ny < gameData.rows && gameData.cells[ny][nx].mine) {
                count++;
            }
        }
    }
    return count;
}

function floodReveal(x, y) {
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < gameData.cols && ny >= 0 && ny < gameData.rows) {
                const cell = gameData.cells[ny][nx];
                if (cell && !cell.revealed && !cell.flagged && !cell.mine) {
                    cell.revealed = true;
                    gameData.revealedCount += 1;
                    setGameScore(gameData.revealedCount);
                    cell.element.classList.add('revealed');
                    cell.element.disabled = true;
                    const count = countMines(nx, ny);
                    cell.element.textContent = count || '';
                    if (!count) {
                        floodReveal(nx, ny);
                    }
                }
            }
        }
    }
}

function revealAllMines() {
    for (let y = 0; y < gameData.rows; y++) {
        for (let x = 0; x < gameData.cols; x++) {
            const cell = gameData.cells[y][x];
            if (cell.mine) {
                cell.element.textContent = '💣';
                cell.element.classList.add('revealed');
            }
            cell.element.disabled = true;
        }
    }
}

function endGame(game, score, success) {
    if (!gameData) return;
    gameData.gameOver = true;
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
    }
    const isBest = saveBestScore(game, score);
    const best = getBestScore(game);
    let title = success ? 'Победа' : 'Игра окончена';
    let message = success
        ? `Вы выиграли! Счёт: ${score}. Лучший: ${best}.`
        : `Счёт: ${score}. Лучший: ${best}.`;
    if (game === 'life' && !success) {
        title = 'Конец симуляции';
        message = `Состояние стабильно или все клетки погибли. Поколений: ${score}. Лучший: ${best}.`;
    }
    if (isBest) {
        message += ' Новый рекорд!';
    }
    showGameOver(title, message, 'Играть заново', () => {
        if (game === 'snake') {
            const options = getSnakeOptionsFromControls();
            saveSnakeSettings(options);
            startSnake({rows: gameData.rows, cols: gameData.cols, ...options});
        }
        if (game === 'dino') startDino({width: canvas.width, height: canvas.height, showGrid: gameData.showGrid});
        if (game === 'life') startLife({rows: gameData.rows, cols: gameData.cols, showGrid: gameData.showGrid});
        if (game === 'minesweeper') startMinesweeper({rows: gameData.rows, cols: gameData.cols, mines: gameData.mines});
    });
}
