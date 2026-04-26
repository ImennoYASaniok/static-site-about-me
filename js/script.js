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

function initGamesPage() {
    const selector = document.querySelector('.game-selector');
    if (!selector) return;

    selector.querySelectorAll('[data-game]').forEach(button => {
        button.addEventListener('click', () => {
            selector.querySelector('.active')?.classList.remove('active');
            button.classList.add('active');
            switchGame(button.dataset.game);
        });
    });

    document.querySelector('#gameCanvas')?.addEventListener('click', handleCanvasClick);
    document.querySelector('#gameControls')?.addEventListener('click', handleControlButton);
    document.addEventListener('keydown', handleKeyPress);

    switchGame('snake');
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
        description.textContent = 'Управляй стрелками, ешь яблоки, увеличивайся и выживи как можно дольше.';
        controls.innerHTML = '<span>Стрелки ← ↑ ↓ →</span>';
        startSnake();
    } else if (name === 'dino') {
        title.textContent = 'Dino Run';
        description.textContent = 'Прыгай через препятствия. Используй пробел или стрелку вверх.';
        controls.innerHTML = '<span>Пробел / ↑</span>';
        startDino();
    } else if (name === 'life') {
        title.textContent = 'Жизнь';
        description.textContent = 'Нажми на клетки, чтобы включить или выключить их. Запусти симуляцию и наблюдай за эволюцией.';
        controls.innerHTML = '<button class="btn btn-secondary" data-action="toggle-life">Старт / Стоп</button><button class="btn btn-secondary" data-action="reset-life">Сброс</button>';
        startLife();
    } else if (name === 'minesweeper') {
        title.textContent = 'Сапёр';
        description.textContent = 'Открой все клетки без мин. ЛКМ — открыть, ПКМ — пометить флагом.';
        controls.innerHTML = '<button class="btn btn-secondary" data-action="reset-mines">Новая игра</button>';
        if (gameCanvas) gameCanvas.classList.add('hidden');
        minesContainer?.classList.remove('hidden');
        startMinesweeper();
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
        startLife();
    }

    if (action === 'reset-mines') {
        startMinesweeper();
    }
}

function handleCanvasClick(event) {
    if (currentGame !== 'life') return;
    const rect = event.target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const cellX = Math.floor(x / gameData.cellSize);
    const cellY = Math.floor(y / gameData.cellSize);
    if (cellX >= 0 && cellX < gameData.cols && cellY >= 0 && cellY < gameData.rows) {
        gameData.grid[cellY][cellX] = !gameData.grid[cellY][cellX];
        drawLife();
    }
}

function handleKeyPress(event) {
    if (!currentGame) return;
    if (currentGame === 'snake') {
        const mapping = {
            ArrowUp: [0, -1],
            ArrowDown: [0, 1],
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0]
        };
        if (mapping[event.key]) {
            const [dx, dy] = mapping[event.key];
            if (dx !== -gameData.direction[0] || dy !== -gameData.direction[1]) {
                gameData.direction = [dx, dy];
            }
        }
    }
    if (currentGame === 'dino' && (event.key === ' ' || event.key === 'ArrowUp')) {
        if (!gameData.jump) {
            gameData.jump = true;
            gameData.velocity = -12;
        }
    }
}

function startSnake() {
    gameData = {
        rows: 18,
        cols: 32,
        cellSize: 20,
        snake: [[8, 9], [7, 9], [6, 9]],
        direction: [1, 0],
        food: [14, 8]
    };
    drawSnake();
    gameLoop = setInterval(updateSnake, 120);
}

function updateSnake() {
    const head = [...gameData.snake[0]];
    head[0] += gameData.direction[0];
    head[1] += gameData.direction[1];
    const collision = head[0] < 0 || head[0] >= gameData.cols || head[1] < 0 || head[1] >= gameData.rows || gameData.snake.some(segment => segment[0] === head[0] && segment[1] === head[1]);
    if (collision) {
        startSnake();
        return;
    }
    gameData.snake.unshift(head);
    if (head[0] === gameData.food[0] && head[1] === gameData.food[1]) {
        placeFood();
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
    } while (gameData.snake.some(segment => segment[0] === x && segment[1] === y));
    gameData.food = [x, y];
}

function drawSnake() {
    if (!ctx) return;
    ctx.fillStyle = '#070408';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    gameData.snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? '#fff' : '#ff9500';
        ctx.fillRect(segment[0] * gameData.cellSize, segment[1] * gameData.cellSize, gameData.cellSize - 1, gameData.cellSize - 1);
    });
    ctx.fillStyle = '#ff5722';
    ctx.fillRect(gameData.food[0] * gameData.cellSize, gameData.food[1] * gameData.cellSize, gameData.cellSize - 1, gameData.cellSize - 1);
}

function startDino() {
    gameData = {
        x: 80,
        y: 224,
        baseY: 224,
        velocity: 0,
        jump: false,
        obstacles: [],
        frames: 0
    };
    drawDino();
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
    if (gameData.frames % 90 === 0) {
        gameData.obstacles.push({x: 700, width: 24, height: 42});
    }
    gameData.obstacles.forEach(obs => obs.x -= 6);
    gameData.obstacles = gameData.obstacles.filter(obs => obs.x > -50);
    const collision = gameData.obstacles.some(obs => obs.x < gameData.x + 30 && obs.x + obs.width > gameData.x && gameData.y + 32 > 260 - obs.height);
    if (collision) {
        startDino();
        return;
    }
    drawDino();
}

function drawDino() {
    if (!ctx) return;
    ctx.fillStyle = '#050207';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ff9a0b';
    ctx.fillRect(gameData.x, gameData.y, 30, 32);
    ctx.fillStyle = '#ff5e12';
    ctx.fillRect(0, 280, canvas.width, 4);
    gameData.obstacles.forEach(obs => ctx.fillRect(obs.x, 260 - obs.height, obs.width, obs.height));
}

function startLife() {
    gameData = {
        rows: 18,
        cols: 32,
        cellSize: 20,
        grid: Array.from({length: 18}, () => Array(32).fill(false)),
        running: false
    };
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
    gameData.grid = next;
    drawLife();
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
}

function startMinesweeper() {
    const rows = 8;
    const cols = 12;
    const mines = 18;
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
    gameData = {cells, rows, cols};
}

function revealCell(event) {
    const x = Number(event.target.dataset.x);
    const y = Number(event.target.dataset.y);
    const cell = gameData.cells[y][x];
    if (!cell || cell.flagged || cell.revealed) return;
    cell.revealed = true;
    cell.element.classList.add('revealed');
    cell.element.disabled = true;
    if (cell.mine) {
        cell.element.textContent = '💣';
        cell.element.style.backgroundColor = '#820000';
        revealAllMines();
        return;
    }
    const count = countMines(x, y);
    if (count) {
        cell.element.textContent = count;
    } else {
        floodReveal(x, y);
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
