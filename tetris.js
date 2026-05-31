/* ==========================================================================
   NEON TETS - Core Game Engine
   ========================================================================== */

// 1. Tetromino Shapes & Rotations definitions
// Standard Tetris Guideline color-coding and layouts
const TETROMINOES = {
    'I': {
        shape: [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        color: 'var(--color-i)'
    },
    'O': {
        shape: [
            [1, 1],
            [1, 1]
        ],
        color: 'var(--color-o)'
    },
    'T': {
        shape: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: 'var(--color-t)'
    },
    'S': {
        shape: [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ],
        color: 'var(--color-s)'
    },
    'Z': {
        shape: [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ],
        color: 'var(--color-z)'
    },
    'J': {
        shape: [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: 'var(--color-j)'
    },
    'L': {
        shape: [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: 'var(--color-l)'
    }
};

class TetrisGame {
    constructor() {
        this.cols = 10;
        this.rows = 20;
        this.grid = this.createEmptyGrid();
        
        // Game variables
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.combo = -1; // Modern combo system (-1 means no active combo)
        this.isGameOver = false;
        this.isPaused = false;
        this.isStarted = false;
        
        // Piece systems
        this.bag = [];
        this.currentPiece = null;
        this.holdPiece = null;
        this.canHold = true;
        this.nextQueue = [];
        
        // Gravity & speed configs
        this.lastDropTime = 0;
        this.dropInterval = 1000; // time in ms
    }

    createEmptyGrid() {
        return Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
    }

    /**
     * Resets game states to start fresh
     */
    reset() {
        this.grid = this.createEmptyGrid();
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.combo = -1;
        this.isGameOver = false;
        this.isPaused = false;
        this.isStarted = true;
        this.bag = [];
        this.holdPiece = null;
        this.canHold = true;
        
        // Populate Next Queue (needs 3 pieces minimum)
        this.nextQueue = [];
        for (let i = 0; i < 3; i++) {
            this.nextQueue.push(this.pullFromBag());
        }
        
        this.spawnPiece();
        this.updateSpeed();
        audio.updateTempoForLevel(this.level);
    }

    /**
     * Random 7-Bag generation system
     * Guarantees fair piece distributions by shuffling one set of each piece
     */
    pullFromBag() {
        if (this.bag.length === 0) {
            this.bag = Object.keys(TETROMINOES);
            // Fisher-Yates Shuffle
            for (let i = this.bag.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
            }
        }
        return this.bag.pop();
    }

    /**
     * Spawns next piece from next queue
     */
    spawnPiece() {
        const type = this.nextQueue.shift();
        this.nextQueue.push(this.pullFromBag());
        
        const config = TETROMINOES[type];
        
        // Spawn centered at row 0 (or slightly hidden top offset depending on grid bounds)
        this.currentPiece = {
            type: type,
            matrix: this.cloneMatrix(config.shape),
            color: config.color,
            x: Math.floor((this.cols - config.shape[0].length) / 2),
            y: type === 'I' ? -1 : 0 // center perfectly
        };
        
        this.canHold = true;
        
        // Collision check right at spawn = game over
        if (this.checkCollision(this.currentPiece.x, this.currentPiece.y, this.currentPiece.matrix)) {
            this.isGameOver = true;
            this.isStarted = false;
            audio.playGameOver();
            this.saveHighScore();
        }
    }

    /**
     * Swap current piece into hold queue
     */
    holdSwap() {
        if (!this.canHold || this.isPaused || this.isGameOver || !this.isStarted) return;
        
        audio.playHold();
        
        const currentType = this.currentPiece.type;
        
        if (this.holdPiece === null) {
            // Hold is empty, put active piece there and spawn new
            this.holdPiece = currentType;
            this.spawnPiece();
        } else {
            // Swap hold piece with active piece
            const prevHold = this.holdPiece;
            this.holdPiece = currentType;
            
            const config = TETROMINOES[prevHold];
            this.currentPiece = {
                type: prevHold,
                matrix: this.cloneMatrix(config.shape),
                color: config.color,
                x: Math.floor((this.cols - config.shape[0].length) / 2),
                y: prevHold === 'I' ? -1 : 0
            };
        }
        
        this.canHold = false;
    }

    cloneMatrix(matrix) {
        return matrix.map(row => [...row]);
    }

    /**
     * Checks collision with walls, bottom floor, or locked blocks
     */
    checkCollision(x, y, matrix) {
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c] !== 0) {
                    const nextX = x + c;
                    const nextY = y + r;
                    
                    // Allow pieces to rotate above top row grid screen offset, but block sideways/bottom bounds
                    if (nextX < 0 || nextX >= this.cols || nextY >= this.rows) {
                        return true;
                    }
                    
                    if (nextY >= 0 && this.grid[nextY][nextX] !== 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /* --------------------------------------------------------------------------
       Player Moves Actions
       -------------------------------------------------------------------------- */
    moveLeft() {
        if (this.isPaused || this.isGameOver || !this.isStarted) return;
        if (!this.checkCollision(this.currentPiece.x - 1, this.currentPiece.y, this.currentPiece.matrix)) {
            this.currentPiece.x--;
            audio.playMove();
            return true;
        }
        return false;
    }

    moveRight() {
        if (this.isPaused || this.isGameOver || !this.isStarted) return;
        if (!this.checkCollision(this.currentPiece.x + 1, this.currentPiece.y, this.currentPiece.matrix)) {
            this.currentPiece.x++;
            audio.playMove();
            return true;
        }
        return false;
    }

    /**
     * Soft drop drops piece by 1 grid cell, adds 1 pt
     */
    softDrop() {
        if (this.isPaused || this.isGameOver || !this.isStarted) return;
        if (!this.checkCollision(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.matrix)) {
            this.currentPiece.y++;
            this.score += 1;
            audio.playMove();
            this.resetDropTimer();
            return true;
        }
        this.lockPiece();
        return false;
    }

    /**
     * Hard drop drops piece straight to ghost Y instantly, locks down, awards 2 pts per row
     */
    hardDrop() {
        if (this.isPaused || this.isGameOver || !this.isStarted) return 0;
        
        const startY = this.currentPiece.y;
        const ghostY = this.getGhostY();
        const dropDist = ghostY - startY;
        
        this.currentPiece.y = ghostY;
        this.score += dropDist * 2;
        
        this.lockPiece();
        audio.playDrop();
        
        return dropDist; // return drop distance for screen shake scale trigger
    }

    /**
     * SRS Kick Rotation algorithm
     * Tries default rotation first. If collision, kicks around offsets to snap.
     */
    rotate(dir = 1) { // 1 = clockwise, -1 = counter-clockwise
        if (this.isPaused || this.isGameOver || !this.isStarted || this.currentPiece.type === 'O') return;
        
        const matrix = this.currentPiece.matrix;
        const size = matrix.length;
        const rotated = Array.from({ length: size }, () => Array(size).fill(0));
        
        // Perform matrix transpose and reversal rotation
        if (dir === 1) { // CW
            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    rotated[c][size - 1 - r] = matrix[r][c];
                }
            }
        } else { // CCW
            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    rotated[size - 1 - c][r] = matrix[r][c];
                }
            }
        }

        // Standard kick test sequences (wall kick / floor kick offsets)
        const kickOffsets = [
            [0, 0],   // Original
            [-1, 0],  // Kick left 1
            [1, 0],   // Kick right 1
            [0, -1],  // Kick up 1 (floor kick)
            [-1, -1], // Kick left 1, up 1
            [1, -1],  // Kick right 1, up 1
            [-2, 0],  // Kick left 2 (mainly for I piece kicks)
            [2, 0],   // Kick right 2
            [0, -2]   // Kick up 2
        ];

        for (let i = 0; i < kickOffsets.length; i++) {
            const dx = kickOffsets[i][0];
            const dy = kickOffsets[i][1];
            
            if (!this.checkCollision(this.currentPiece.x + dx, this.currentPiece.y + dy, rotated)) {
                this.currentPiece.matrix = rotated;
                this.currentPiece.x += dx;
                this.currentPiece.y += dy;
                audio.playRotate();
                return true;
            }
        }
        return false;
    }

    /**
     * Compute projection ghost Y-coordinate
     */
    getGhostY() {
        let tempY = this.currentPiece.y;
        while (!this.checkCollision(this.currentPiece.x, tempY + 1, this.currentPiece.matrix)) {
            tempY++;
        }
        return tempY;
    }

    /**
     * Lock piece down, copy blocks to grid, check clears and level ups
     */
    lockPiece() {
        const p = this.currentPiece;
        for (let r = 0; r < p.matrix.length; r++) {
            for (let c = 0; c < p.matrix[r].length; c++) {
                if (p.matrix[r][c] !== 0) {
                    const blockY = p.y + r;
                    const blockX = p.x + c;
                    
                    // Safely write to grid (ignoring above screen limits)
                    if (blockY >= 0 && blockY < this.rows && blockX >= 0 && blockX < this.cols) {
                        this.grid[blockY][blockX] = p.type; // store tetromino code
                    }
                }
            }
        }

        // Lock sound
        audio.playDrop();
        
        // Trigger Line Clears
        const clearedRows = this.clearLines();
        
        // Spawn new piece
        this.spawnPiece();
    }

    /**
     * Clears full rows, handles modern score scoring multipliers & level gains
     */
    clearLines() {
        let linesClearedNow = 0;
        const clearedIndexes = [];

        for (let r = this.rows - 1; r >= 0; r--) {
            if (this.grid[r].every(val => val !== 0)) {
                linesClearedNow++;
                clearedIndexes.push(r);
            }
        }

        if (linesClearedNow > 0) {
            // Delete rows in reverse order to keep indices aligned
            clearedIndexes.forEach(rowIndex => {
                this.grid.splice(rowIndex, 1);
                // Insert blank row at top
                this.grid.unshift(Array(this.cols).fill(0));
            });

            this.combo++;
            
            // Score calculations based on standard guideline values
            let baseScore = 0;
            switch (linesClearedNow) {
                case 1:
                    baseScore = 100;
                    audio.playLineClear();
                    break;
                case 2:
                    baseScore = 300;
                    audio.playLineClear();
                    break;
                case 3:
                    baseScore = 500;
                    audio.playLineClear();
                    break;
                case 4: // TETRIS!
                    baseScore = 800;
                    audio.playTetris();
                    break;
            }

            // Award scores with level multipliers
            this.score += baseScore * this.level;
            
            // Combo points
            if (this.combo > 0) {
                this.score += 50 * this.combo * this.level;
            }

            // Update stats
            this.lines += linesClearedNow;
            
            // Level progress (10 lines cleared per level up)
            const newLevel = Math.floor(this.lines / 10) + 1;
            if (newLevel > this.level) {
                this.level = newLevel;
                audio.playLevelUp();
                audio.updateTempoForLevel(this.level);
                this.updateSpeed();
            }
        } else {
            this.combo = -1; // Reset combos
        }

        return {
            count: linesClearedNow,
            rows: clearedIndexes
        };
    }

    /**
     * Calculates dropping gravity speed interval based on Level
     */
    updateSpeed() {
        // Standard exponential drop curve
        // level 1: 1000ms, level 10: ~100ms
        this.dropInterval = Math.max(1000 - (this.level - 1) * 90, 50);
    }

    resetDropTimer() {
        this.lastDropTime = performance.now();
    }

    togglePause() {
        if (!this.isStarted || this.isGameOver) return;
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            audio.stopBGM();
        } else {
            audio.startBGM();
            this.resetDropTimer();
        }
        return this.isPaused;
    }

    /* --------------------------------------------------------------------------
       Leaderboard scores persistence
       -------------------------------------------------------------------------- */
    saveHighScore() {
        const playerName = document.getElementById('player-name-input').value.trim() || 'PLAYER';
        const rawScores = localStorage.getItem('neon_tets_highscores');
        let highScores = [];
        
        if (rawScores) {
            try {
                highScores = JSON.parse(rawScores);
            } catch(e) {
                highScores = [];
            }
        }

        highScores.push({ name: playerName.toUpperCase(), score: this.score, date: new Date().toLocaleDateString() });
        // Sort descending
        highScores.sort((a, b) => b.score - a.score);
        // Truncate to top 5
        highScores = highScores.slice(0, 5);
        
        localStorage.setItem('neon_tets_highscores', JSON.stringify(highScores));
    }

    getHighScores() {
        const rawScores = localStorage.getItem('neon_tets_highscores');
        if (rawScores) {
            try {
                return JSON.parse(rawScores);
            } catch(e) {
                return [];
            }
        }
        // Default seed leaderboard data
        return [
            { name: 'ANTIGRAV', score: 10000 },
            { name: 'GEMINI', score: 5000 },
            { name: 'RETRO', score: 2500 }
        ];
    }
}
