/* ==========================================================================
   NEON TETS - UI Controller & Canvas Renderer
   ========================================================================== */

// 1. Particle effect class for line clears
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = Math.random() * 4 + 2;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.8) * 10 - 2; // blast upwards
        this.alpha = 1.0;
        this.decay = Math.random() * 0.04 + 0.02;
        this.gravity = 0.25;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.alpha -= this.decay;
    }

    draw(ctx, isNeonTheme) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        if (isNeonTheme) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
        }
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// 2. Main Coordinator
document.addEventListener('DOMContentLoaded', () => {
    // Canvas & Context references
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    const holdCanvas = document.getElementById('hold-canvas');
    const holdCtx = holdCanvas.getContext('2d');
    
    const nextCanvas1 = document.getElementById('next-canvas-1');
    const nextCtx1 = nextCanvas1.getContext('2d');
    
    const nextCanvas2 = document.getElementById('next-canvas-2');
    const nextCtx2 = nextCanvas2.getContext('2d');
    
    const nextCanvas3 = document.getElementById('next-canvas-3');
    const nextCtx3 = nextCanvas3.getContext('2d');

    // UI Stat elements
    const scoreVal = document.getElementById('score');
    const levelVal = document.getElementById('level');
    const linesVal = document.getElementById('lines');
    
    // Modals
    const startModal = document.getElementById('start-modal');
    const pauseModal = document.getElementById('pause-modal');
    const gameOverModal = document.getElementById('game-over-modal');
    const themeModal = document.getElementById('theme-modal');
    
    // High Score listing
    const highScoresList = document.getElementById('high-scores-list');
    
    // Core Game Systems
    const game = new TetrisGame();
    let particles = [];
    
    // Timing variables for game loop
    let lastTime = 0;
    let softDropInterval = null; // for mobile button holding
    
    // Current Active CSS Theme State
    let activeTheme = 'neon';

    /* --------------------------------------------------------------------------
       Canvas Setup & Responsive Scaling
       -------------------------------------------------------------------------- */
    function resizeCanvas() {
        // Compute logical sizes based on device screen layout bounds
        const wrapper = canvas.parentElement;
        const rect = wrapper.getBoundingClientRect();
        
        // Match canvas logical size to render layout element dimensions (for sharp pixels)
        canvas.width = rect.width;
        canvas.height = rect.height;
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    /* --------------------------------------------------------------------------
       Rendering Helpers
       -------------------------------------------------------------------------- */
    function drawBlock(cContext, x, y, size, type, isGhost = false) {
        if (!type || type === 0) return;
        
        const color = TETROMINOES[type]?.color || 'grey';
        
        cContext.save();
        
        if (activeTheme === 'neon') {
            if (isGhost) {
                // Ghost wireframe look
                cContext.strokeStyle = color;
                cContext.lineWidth = 2;
                cContext.fillStyle = 'rgba(0, 0, 0, 0.4)';
                
                cContext.shadowColor = color;
                cContext.shadowBlur = 8;
                
                cContext.beginPath();
                cContext.rect(x + 2, y + 2, size - 4, size - 4);
                cContext.fill();
                cContext.stroke();
            } else {
                // High gloss glowing square block look
                cContext.fillStyle = color;
                cContext.shadowColor = color;
                cContext.shadowBlur = 12;
                
                // Draw filled rectangle
                cContext.beginPath();
                cContext.roundRect ? cContext.roundRect(x + 1, y + 1, size - 2, size - 2, 4) : cContext.rect(x + 1, y + 1, size - 2, size - 2);
                cContext.fill();
                
                // Accent reflection sheen line for glass effect
                cContext.shadowBlur = 0;
                cContext.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                cContext.lineWidth = 1.5;
                cContext.beginPath();
                cContext.moveTo(x + 4, y + size - 4);
                cContext.lineTo(x + 4, y + 4);
                cContext.lineTo(x + size - 4, y + 4);
                cContext.stroke();
            }
        } 
        else if (activeTheme === 'gameboy') {
            // Retro green LCD panel pixel styling
            const colorDark = 'var(--text-primary)';
            const colorLight = 'var(--bg-color-1)';
            
            cContext.fillStyle = colorDark;
            cContext.strokeStyle = colorDark;
            cContext.lineWidth = 2;
            
            if (isGhost) {
                // Simple dotted pattern look
                cContext.strokeStyle = colorDark;
                cContext.lineWidth = 1;
                cContext.setLineDash([2, 2]);
                cContext.beginPath();
                cContext.rect(x + 2, y + 2, size - 4, size - 4);
                cContext.stroke();
            } else {
                // Standard filled Gameboy brick with centered retro square pattern
                cContext.beginPath();
                cContext.rect(x + 1, y + 1, size - 2, size - 2);
                cContext.fill();
                
                cContext.fillStyle = colorLight;
                cContext.beginPath();
                cContext.rect(x + 4, y + 4, size - 8, size - 8);
                cContext.fill();
                
                cContext.fillStyle = colorDark;
                cContext.beginPath();
                cContext.rect(x + 7, y + 7, size - 14, size - 14);
                cContext.fill();
            }
        } 
        else if (activeTheme === 'pastel') {
            // Cute rounded candy pastel styles
            cContext.fillStyle = color;
            cContext.beginPath();
            
            if (cContext.roundRect) {
                cContext.roundRect(x + 1.5, y + 1.5, size - 3, size - 3, 6);
            } else {
                cContext.rect(x + 1, y + 1, size - 2, size - 2);
            }
            cContext.fill();
            
            if (isGhost) {
                cContext.strokeStyle = 'rgba(147, 112, 219, 0.4)';
                cContext.lineWidth = 2;
                cContext.stroke();
            } else {
                // Gentle border highlighting
                cContext.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                cContext.lineWidth = 1.5;
                cContext.stroke();
            }
        } 
        else if (activeTheme === 'minimal') {
            // High contrast elegant minimalist border frames
            cContext.strokeStyle = 'var(--text-primary)';
            cContext.lineWidth = 2;
            
            if (isGhost) {
                cContext.strokeStyle = 'var(--text-muted)';
                cContext.lineWidth = 1;
                cContext.setLineDash([4, 4]);
                cContext.beginPath();
                cContext.rect(x + 2, y + 2, size - 4, size - 4);
                cContext.stroke();
            } else {
                cContext.fillStyle = 'var(--panel-bg)';
                cContext.beginPath();
                cContext.rect(x + 1, y + 1, size - 2, size - 2);
                cContext.fill();
                cContext.stroke();
                
                // Dot in the center of locked block for minimal styling
                cContext.fillStyle = 'var(--text-primary)';
                cContext.beginPath();
                cContext.arc(x + size/2, y + size/2, 3, 0, Math.PI * 2);
                cContext.fill();
            }
        }
        
        cContext.restore();
    }

    /**
     * Draw current Tetris grid board
     */
    function renderBoard() {
        const blockSize = canvas.width / game.cols;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 1. Draw Grid Lines decoration (if not minimalist)
        if (activeTheme !== 'minimal') {
            ctx.save();
            ctx.strokeStyle = 'var(--board-grid)';
            ctx.lineWidth = 1;
            
            // vertical gridlines
            for (let c = 0; c <= game.cols; c++) {
                ctx.beginPath();
                ctx.moveTo(c * blockSize, 0);
                ctx.lineTo(c * blockSize, canvas.height);
                ctx.stroke();
            }
            
            // horizontal gridlines
            for (let r = 0; r <= game.rows; r++) {
                ctx.beginPath();
                ctx.moveTo(0, r * blockSize);
                ctx.lineTo(canvas.width, r * blockSize);
                ctx.stroke();
            }
            ctx.restore();
        }

        // 2. Draw Locked Grid Blocks
        for (let r = 0; r < game.rows; r++) {
            for (let c = 0; c < game.cols; c++) {
                if (game.grid[r][c] !== 0) {
                    drawBlock(ctx, c * blockSize, r * blockSize, blockSize, game.grid[r][c]);
                }
            }
        }

        // 3. Draw Active Floating Piece & Ghost projections
        if (game.currentPiece && game.isStarted) {
            const p = game.currentPiece;
            const ghostY = game.getGhostY();
            
            // Draw Ghost projection first (behind block)
            for (let r = 0; r < p.matrix.length; r++) {
                for (let c = 0; c < p.matrix[r].length; c++) {
                    if (p.matrix[r][c] !== 0) {
                        const blockY = ghostY + r;
                        const blockX = p.x + c;
                        
                        if (blockY >= 0) {
                            drawBlock(ctx, blockX * blockSize, blockY * blockSize, blockSize, p.type, true);
                        }
                    }
                }
            }

            // Draw Active Piece
            for (let r = 0; r < p.matrix.length; r++) {
                for (let c = 0; c < p.matrix[r].length; c++) {
                    if (p.matrix[r][c] !== 0) {
                        const blockY = p.y + r;
                        const blockX = p.x + c;
                        
                        if (blockY >= 0) {
                            drawBlock(ctx, blockX * blockSize, blockY * blockSize, blockSize, p.type);
                        }
                    }
                }
            }
        }

        // 4. Render and update particles
        particles = particles.filter(part => {
            part.update();
            part.draw(ctx, activeTheme === 'neon');
            return part.alpha > 0;
        });
    }

    /**
     * Helper to render centered shapes in small Side panels canvases
     */
    function renderPreviewBox(pContext, canvasRef, blockType) {
        pContext.clearRect(0, 0, canvasRef.width, canvasRef.height);
        if (!blockType) return;
        
        const shape = TETROMINOES[blockType].shape;
        const size = shape.length;
        
        // Scale block size to fit nice inside the preview canvas
        const padding = 15;
        const availableWidth = canvasRef.width - (padding * 2);
        const blockSize = availableWidth / (blockType === 'I' ? 4 : 3);
        
        // Matrix bounding dimensions for exact centering
        let minR = size, maxR = -1, minC = size, maxC = -1;
        for(let r = 0; r < size; r++) {
            for(let c = 0; c < size; c++) {
                if(shape[r][c] !== 0) {
                    if(r < minR) minR = r;
                    if(r > maxR) maxR = r;
                    if(c < minC) minC = c;
                    if(c > maxC) maxC = c;
                }
            }
        }
        
        const boundWidth = (maxC - minC + 1) * blockSize;
        const boundHeight = (maxR - minR + 1) * blockSize;
        
        // Exact starting coordinates to center bounds
        const startX = (canvasRef.width - boundWidth) / 2 - (minC * blockSize);
        const startY = (canvasRef.height - boundHeight) / 2 - (minR * blockSize);

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (shape[r][c] !== 0) {
                    drawBlock(
                        pContext, 
                        startX + c * blockSize, 
                        startY + r * blockSize, 
                        blockSize, 
                        blockType
                    );
                }
            }
        }
    }

    function renderSidePanels() {
        // 1. Draw Hold Canvas
        renderPreviewBox(holdCtx, holdCanvas, game.holdPiece);
        
        // 2. Draw Next canvases (Main first, then sub small 2 and 3)
        renderPreviewBox(nextCtx1, nextCanvas1, game.nextQueue[0]);
        renderPreviewBox(nextCtx2, nextCanvas2, game.nextQueue[1]);
        renderPreviewBox(nextCtx3, nextCanvas3, game.nextQueue[2]);
    }

    /**
     * Triggers canvas flash particles when lines are cleared
     */
    function triggerLineClearParticles(rowsCleared) {
        const blockSize = canvas.width / game.cols;
        rowsCleared.forEach(rowIdx => {
            const yCenter = (rowIdx * blockSize) + (blockSize / 2);
            for (let c = 0; c < game.cols; c++) {
                const xCenter = (c * blockSize) + (blockSize / 2);
                const blockType = game.grid[rowIdx][c] || 'I';
                const color = TETROMINOES[blockType]?.color || '#fff';
                
                // Spawn particles per cleared tile
                for (let i = 0; i < 4; i++) {
                    particles.push(new Particle(xCenter, yCenter, color));
                }
            }
        });
    }

    /**
     * Triggers nice canvas container screenshake animation
     */
    function triggerScreenShake(scale) {
        const wrapper = canvas.parentElement;
        wrapper.classList.remove('shake');
        void wrapper.offsetWidth; // trigger reflow
        wrapper.classList.add('shake');
        
        // Shake longer if level is heavy
        setTimeout(() => {
            wrapper.classList.remove('shake');
        }, scale * 20 + 100);
    }

    function updateStatsUI() {
        // Zero pad scoring for arcade styling
        scoreVal.textContent = String(game.score).padStart(6, '0');
        levelVal.textContent = game.level;
        linesVal.textContent = game.lines;
    }

    /* --------------------------------------------------------------------------
       Core Animation Frame Loop
       -------------------------------------------------------------------------- */
    function gameLoop(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const delta = timestamp - lastTime;
        
        if (game.isStarted && !game.isPaused && !game.isGameOver) {
            // Gravity Tick calculation
            if (timestamp - game.lastDropTime > game.dropInterval) {
                const prevLevel = game.level;
                
                // Trigger auto soft drop gravity
                const oldGrid = game.cloneMatrix(game.grid);
                const oldLines = game.lines;
                
                game.softDrop(); // this drops and also locks if hitting bottom
                
                // Check if rows cleared during gravity lockdown
                const linesDiff = game.lines - oldLines;
                if (linesDiff > 0) {
                    // Lines were cleared! Find which ones
                    const rowsToClear = [];
                    for (let r = 0; r < game.rows; r++) {
                        // Check empty vs old matrix grid rows
                        if (oldGrid[r].every(v => v !== 0)) {
                            rowsToClear.push(r);
                        }
                    }
                    
                    triggerLineClearParticles(rowsToClear);
                    triggerScreenShake(linesDiff * 2);
                }
                
                game.resetDropTimer();
            }
        }
        
        // Drawing phases
        renderBoard();
        renderSidePanels();
        updateStatsUI();

        // Check if game transition states require modal triggers
        if (game.isGameOver) {
            document.getElementById('final-score').textContent = game.score;
            
            // Check if user hit high scores leaderboards
            const records = game.getHighScores();
            const minRecord = records.length >= 5 ? records[records.length - 1].score : 0;
            const newRecordBox = document.getElementById('new-high-score-form');
            
            if (game.score > minRecord || records.length < 5) {
                newRecordBox.classList.remove('hidden');
            } else {
                newRecordBox.classList.add('hidden');
            }
            
            gameOverModal.classList.add('active');
        }

        requestAnimationFrame(gameLoop);
    }

    /* --------------------------------------------------------------------------
       Leaderboard Display
       -------------------------------------------------------------------------- */
    function populateHighScores() {
        const records = game.getHighScores();
        highScoresList.innerHTML = '';
        
        const medals = ['🥇', '🥈', '🥉', '4th', '5th'];
        
        records.forEach((rec, idx) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${medals[idx]} ${rec.name}</span>
                <span class="font-arcade">${rec.score}</span>
            `;
            highScoresList.appendChild(li);
        });
        
        // Pad empty ranks if new database
        for (let i = records.length; i < 3; i++) {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${medals[i]} ----</span>
                <span class="font-arcade">--</span>
            `;
            highScoresList.appendChild(li);
        }
    }
    
    populateHighScores();

    /* --------------------------------------------------------------------------
       Keyboard Events Controller
       -------------------------------------------------------------------------- */
    window.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key) && game.isStarted && !game.isPaused) {
            e.preventDefault(); // block page scrolls
        }
        
        if (game.isGameOver) return;

        switch (e.key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                game.moveLeft();
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                game.moveRight();
                break;
            case 'ArrowUp':
            case 'w':
            case 'W':
                game.rotate(1); // clockwise
                break;
            case 'z':
            case 'Z':
            case 'q':
            case 'Q':
                game.rotate(-1); // counter-clockwise
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                game.softDrop();
                break;
            case ' ':
                const dropDist = game.hardDrop();
                if (dropDist > 0) {
                    // Trigger particles at base grid where it locked down
                    const p = game.currentPiece;
                    if (p) {
                        const yCenter = (game.getGhostY() * (canvas.height/game.rows)) + 15;
                        triggerScreenShake(dropDist);
                    }
                }
                break;
            case 'c':
            case 'C':
            case 'Shift':
                game.holdSwap();
                break;
            case 'p':
            case 'P':
            case 'Escape':
                togglePauseHandler();
                break;
        }
    });

    /* --------------------------------------------------------------------------
       Modal Action Listeners
       -------------------------------------------------------------------------- */
    function togglePauseHandler() {
        if (!game.isStarted || game.isGameOver) return;
        const paused = game.togglePause();
        if (paused) {
            pauseModal.classList.add('active');
        } else {
            pauseModal.classList.remove('active');
        }
    }

    // GAME START
    document.getElementById('start-btn').addEventListener('click', () => {
        audio.init();
        audio.startBGM();
        startModal.classList.remove('active');
        game.reset();
        game.resetDropTimer();
        
        // Toast sound hint once
        const toast = document.getElementById('sound-toast');
        if (!audio.muted) {
            toast.classList.add('active');
            setTimeout(() => toast.classList.remove('active'), 2500);
        }
    });

    // PAUSE MENUS
    document.getElementById('resume-btn').addEventListener('click', () => {
        game.togglePause();
        pauseModal.classList.remove('active');
    });

    document.getElementById('restart-btn').addEventListener('click', () => {
        pauseModal.classList.remove('active');
        game.reset();
        audio.startBGM();
    });

    // GAME OVER ACTIONS
    document.getElementById('retry-btn').addEventListener('click', () => {
        // Save score name if achieves records
        if (!document.getElementById('new-high-score-form').classList.contains('hidden')) {
            game.saveHighScore();
        }
        gameOverModal.classList.remove('active');
        populateHighScores();
        game.reset();
        audio.startBGM();
    });

    document.getElementById('quit-btn').addEventListener('click', () => {
        if (!document.getElementById('new-high-score-form').classList.contains('hidden')) {
            game.saveHighScore();
        }
        gameOverModal.classList.remove('active');
        populateHighScores();
        startModal.classList.add('active');
    });

    /* --------------------------------------------------------------------------
       Theme Systems Control
       -------------------------------------------------------------------------- */
    const themeBtn = document.getElementById('theme-btn');
    const closeThemeBtn = document.getElementById('close-theme-btn');
    const themeOptButtons = document.querySelectorAll('.theme-opt-btn');
    
    themeBtn.addEventListener('click', () => {
        themeModal.classList.add('active');
        if (game.isStarted && !game.isPaused) {
            game.togglePause(); // auto pause when customizing themes
            pauseModal.classList.remove('active'); // hide pause screen
        }
    });
    
    closeThemeBtn.addEventListener('click', () => {
        themeModal.classList.remove('active');
        if (game.isStarted && game.isPaused) {
            game.togglePause(); // auto resume
        }
    });

    themeOptButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            themeOptButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const selTheme = btn.getAttribute('data-theme');
            activeTheme = selTheme;
            
            // Switch body classes
            document.body.className = `theme-${selTheme}`;
        });
    });

    /* --------------------------------------------------------------------------
       Audio Volume Toggle Controls
       -------------------------------------------------------------------------- */
    const soundBtn = document.getElementById('sound-btn');
    
    // Sync starting icon text
    soundBtn.textContent = audio.muted ? '🔇 OFF' : '🔊 ON';

    soundBtn.addEventListener('click', () => {
        const isMuted = audio.toggleMute();
        soundBtn.textContent = isMuted ? '🔇 OFF' : '🔊 ON';
        
        if (!isMuted && game.isStarted && !game.isPaused) {
            audio.startBGM();
        }
    });

    /* --------------------------------------------------------------------------
       Mobile Touchpad controls listeners mapping
       -------------------------------------------------------------------------- */
    
    // Helper to prevent zoom-taps doubleclicks
    function bindTouchAction(elemId, callback) {
        const btn = document.getElementById(elemId);
        if (!btn) return;
        
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (game.isStarted && !game.isPaused && !game.isGameOver) {
                callback();
            }
        });
    }

    bindTouchAction('ctrl-left', () => game.moveLeft());
    bindTouchAction('ctrl-right', () => game.moveRight());
    bindTouchAction('ctrl-rotate-cw', () => game.rotate(1));
    bindTouchAction('ctrl-rotate-ccw', () => game.rotate(-1));
    bindTouchAction('ctrl-hold', () => game.holdSwap());
    
    bindTouchAction('ctrl-hard', () => {
        const dropDist = game.hardDrop();
        if (dropDist > 0) {
            triggerScreenShake(dropDist);
        }
    });

    // Special soft drop binding for smooth continuous holding down
    const downBtn = document.getElementById('ctrl-down');
    if (downBtn) {
        downBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (game.isStarted && !game.isPaused && !game.isGameOver) {
                game.softDrop();
                
                // Continuous tick loop
                if (softDropInterval) clearInterval(softDropInterval);
                softDropInterval = setInterval(() => {
                    if (game.isStarted && !game.isPaused && !game.isGameOver) {
                        game.softDrop();
                    }
                }, 80);
            }
        });

        downBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (softDropInterval) {
                clearInterval(softDropInterval);
                softDropInterval = null;
            }
        });

        downBtn.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            if (softDropInterval) {
                clearInterval(softDropInterval);
                softDropInterval = null;
            }
        });
    }

    /* --------------------------------------------------------------------------
       Bootstrap game loops
       -------------------------------------------------------------------------- */
    requestAnimationFrame(gameLoop);
});
