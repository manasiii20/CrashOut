const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const timerElement = document.getElementById('timer');
const scoreElement = document.getElementById('score');
const stageElement = document.querySelector('.stage');
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');

// Initialize sound manager
const soundManager = new SoundManager();

// Game timers
let spawnTimer = null;
let gameTimer = null;

// Game state
let gameStarted = false;
let endScreenMessageStart = 0;
let showSecondMessage = false;

// Stage configurations
const STAGES = [
    {
        number: 1,
        initialBlocks: 20,
        maxBlocks: 30,
        spawnInterval: 1000,
        speedMultiplier: 1.0,
        aggressiveBlockChance: 0.3,
        timeLimit: 30,
        color: '#4CAF50' // Green
    },
    {
        number: 2,
        initialBlocks: 25,
        maxBlocks: 35,
        spawnInterval: 900,
        speedMultiplier: 1.3,
        aggressiveBlockChance: 0.35,
        timeLimit: 25,
        color: '#2196F3' // Blue
    },
    {
        number: 3,
        initialBlocks: 32,
        maxBlocks: 42,
        spawnInterval: 800,
        speedMultiplier: 1.5,
        aggressiveBlockChance: 0.40,
        timeLimit: 20,
        color: '#FFC107' // Amber
    },
    {
        number: 4,
        initialBlocks: 40,
        maxBlocks: 50,
        spawnInterval: 700,
        speedMultiplier: 1.7,
        aggressiveBlockChance: 0.45,
        timeLimit: 15,
        color: '#FF5722' // Deep Orange
    },
    {
        number: 5,
        initialBlocks: 50,
        maxBlocks: 60,
        spawnInterval: 600,
        speedMultiplier: 2.0,
        aggressiveBlockChance: 0.50,
        timeLimit: 10,
        color: '#9C27B0' // Purple - Final Stage
    }
];

// Game variables
let currentStage = 0; // Index of current stage
let score = 0;
let timeLeft = STAGES[0].timeLimit;
let gameOver = false;
let gameWon = false;
let blocks = [];
let mouseX = 0;
let mouseY = 0;
let lastMouseX = 0;
let lastMouseY = 0;
let mouseSpeed = { x: 0, y: 0 };
let playerHealth = 10;
let invincibilityFrames = 0;
let isDeathAnimating = false;
let deathAnimationProgress = 0;
const DEATH_ANIMATION_DURATION = 120; // 2 seconds
const FINAL_BLOCK_COUNT = 100; // More blocks for the crushing effect
const INITIAL_BLOCK_COUNT = 50; // More initial blocks to fill screen
const MAX_BLOCKS = 60; // Maximum blocks allowed on screen
const MIN_BLOCK_DISTANCE = 80; // Minimum distance between blocks
const GAME_DURATION = 20;
const STOP_SPAWN_TIME = 2; // Changed from 5 to 2 seconds for more challenge
const INITIAL_SAFE_DISTANCE = 150; // Safe radius around player at start
const MOUSE_SENSITIVITY = 0.7; // Reduce mouse movement speed
const PUSH_POWER = 1.2; // Reduce push power from 2 to 1.2
const PLAYER_HIT_RADIUS = 30; // Damage zone around the frog's body (pushing still uses player.radius)
const HIT_DAMAGE = 0.5; // 5% of max health per hit
const HIT_INVINCIBILITY_FRAMES = 90; // Short safe window after each hit

// Load player image
const playerImage = new Image();
playerImage.src = "player.png";

// Player properties
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 15, // Keep this for collision detection
    color: '#00ff00', // Keep as fallback
    maxHealth: 10,
    width: 150,  // Tripled from 30 to 90
    height: 100  // Tripled from 30 to 90
};

// Block class
class Block {
    constructor(randomPosition = true) {
        const stage = STAGES[currentStage];
       
        // Make blocks more rectangular with varying sizes
        this.width = 30 + Math.random() * 40; // Width between 30-70
        this.height = 20 + Math.random() * 30; // Height between 20-50
       
        // Assign random speed category with stage multiplier
        const speedCategory = Math.random();
        let baseSpeed;
        if (speedCategory < 0.6) { // 60% slow blocks
            baseSpeed = 0.5 + Math.random() * 0.3; // 0.5-0.8
        } else if (speedCategory < 0.9) { // 30% medium blocks
            baseSpeed = 1.0 + Math.random() * 0.5; // 1.0-1.5
        } else { // 10% fast blocks
            baseSpeed = 1.8 + Math.random() * 0.4; // 1.8-2.2
        }
       
        // Apply stage speed multiplier
        this.speed = baseSpeed * stage.speedMultiplier;
        this.mass = 1;
        this.velocity = {
            x: (Math.random() - 0.5) * this.speed,
            y: (Math.random() - 0.5) * this.speed
        };

        // Determine if this block will be aggressive based on stage settings
        this.isAggressive = Math.random() < stage.aggressiveBlockChance;
       
        // Color based on speed and aggression
        let hue;
        if (this.isAggressive) {
            hue = this.speed < 0.8 * stage.speedMultiplier ? 0 : // Red for aggressive slow
                 this.speed < 1.5 * stage.speedMultiplier ? 30 : // Orange for aggressive medium
                 0; // Red for aggressive fast
            this.color = `hsla(${hue}, 100%, 50%, 0.8)`;
        } else {
            hue = this.speed < 0.8 * stage.speedMultiplier ? 200 : // Blue for passive slow
                 this.speed < 1.5 * stage.speedMultiplier ? 120 : // Green for passive medium
                 0; // Red for fast
            this.color = `hsla(${hue}, 70%, 50%, 0.8)`;
        }
       
        this.rotationAngle = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.02;
        this.targetUpdateTimer = 0;
       
        // Increase aggressive block speed
        if (this.isAggressive) {
            this.speed *= 1.2; // Make aggressive blocks 20% faster
        }
       
        if (randomPosition) {
            this.setupRandomPosition();
        }
    }

    setupRandomPosition() {
        let attempts = 0;
        let validPosition = false;
       
        while (!validPosition && attempts < 50) {
            this.x = this.width/2 + Math.random() * (canvas.width - this.width);
            this.y = this.height/2 + Math.random() * (canvas.height - this.height);
           
            // Check distance from player (for initial spawn)
            const distanceFromPlayer = Math.sqrt(
                Math.pow(this.x - player.x, 2) +
                Math.pow(this.y - player.y, 2)
            );
           
            // Check if block is too close to player or other blocks
            validPosition = distanceFromPlayer > INITIAL_SAFE_DISTANCE;
           
            if (validPosition) {
                // Only check other blocks if we passed the player distance check
                for (let block of blocks) {
                    const dx = this.x - block.x;
                    const dy = this.y - block.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < MIN_BLOCK_DISTANCE) {
                        validPosition = false;
                        break;
                    }
                }
            }
            attempts++;
        }
       
        if (!validPosition) {
            // If no valid position found, try placing at edges, but still respect player safe zone
            this.setupPositionAtEdge();
        }
    }

    setupPositionAtEdge() {
        let attempts = 0;
        let validPosition = false;
       
        while (!validPosition && attempts < 20) {
            const side = Math.floor(Math.random() * 4);
            switch(side) {
                case 0: // top
                    this.x = Math.random() * canvas.width;
                    this.y = -this.height;
                    break;
                case 1: // right
                    this.x = canvas.width + this.width;
                    this.y = Math.random() * canvas.height;
                    break;
                case 2: // bottom
                    this.x = Math.random() * canvas.width;
                    this.y = canvas.height + this.height;
                    break;
                case 3: // left
                    this.x = -this.width;
                    this.y = Math.random() * canvas.height;
                    break;
            }
           
            // Check distance from player
            const distanceFromPlayer = Math.sqrt(
                Math.pow(this.x - player.x, 2) +
                Math.pow(this.y - player.y, 2)
            );
           
            validPosition = distanceFromPlayer > INITIAL_SAFE_DISTANCE;
            attempts++;
        }
       
        // Set initial velocity
        this.updateAttackVelocity();
    }

    updateAttackVelocity() {
        if (!this.isAggressive) return;
       
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
       
        // Calculate target velocity
        const targetVx = (dx / distance) * this.speed;
        const targetVy = (dy / distance) * this.speed;
       
        // Smoothly adjust current velocity towards target (lerp)
        this.velocity.x += (targetVx - this.velocity.x) * 0.1;
        this.velocity.y += (targetVy - this.velocity.y) * 0.1;
       
        // Add slight randomness to movement
        this.velocity.x += (Math.random() - 0.5) * 0.2;
        this.velocity.y += (Math.random() - 0.5) * 0.2;
       
        // Ensure speed doesn't exceed maximum
        const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        if (currentSpeed > this.speed) {
            const scale = this.speed / currentSpeed;
            this.velocity.x *= scale;
            this.velocity.y *= scale;
        }
    }

    update() {
        // Update rotation
        this.rotationAngle += this.rotationSpeed;
       
        if (this.isAggressive) {
            // Update targeting behavior every 30 frames (0.5 seconds)
            this.targetUpdateTimer++;
            if (this.targetUpdateTimer >= 30) {
                this.updateAttackVelocity();
                this.targetUpdateTimer = 0;
            }
        }
       
        // Update position
        this.x += this.velocity.x;
        this.y += this.velocity.y;

        // Remove block if it goes off screen
        if (this.x < -this.width ||
            this.x > canvas.width + this.width ||
            this.y < -this.height ||
            this.y > canvas.height + this.height) {
            score += 10;
            scoreElement.textContent = score;
            return true; // Block will be removed
        }

        return false;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotationAngle);
       
        // Apply scale if in death animation
        if (this.isInDeathAnimation && this.currentScale) {
            ctx.scale(this.currentScale, this.currentScale);
        }
       
        // Draw block with subtle shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 5;
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
       
        // Add subtle border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-this.width/2, -this.height/2, this.width, this.height);
       
        ctx.restore();
    }

    checkCollision(x, y, radius) {
        // Improved collision detection for rectangular blocks
        const dx = Math.abs(x - this.x);
        const dy = Math.abs(y - this.y);

        if (dx > (this.width/2 + radius)) { return false; }
        if (dy > (this.height/2 + radius)) { return false; }

        if (dx <= (this.width/2)) { return true; }
        if (dy <= (this.height/2)) { return true; }

        const cornerDistance = Math.pow(dx - this.width/2, 2) +
                             Math.pow(dy - this.height/2, 2);

        return cornerDistance <= Math.pow(radius, 2);
    }

    push(force, angle) {
        const pushPower = PUSH_POWER * 1.5; // Increased push power by 50%
        // Add mass-based resistance to pushing but with less impact
        const effectiveForce = force * pushPower / Math.sqrt(this.mass); // Square root of mass for less resistance
        this.velocity.x += Math.cos(angle) * effectiveForce;
        this.velocity.y += Math.sin(angle) * effectiveForce;
       
        // Increase maximum velocity for pushed blocks
        const maxSpeed = 12; // Increased from 8
        const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        if (currentSpeed > maxSpeed) {
            const scale = maxSpeed / currentSpeed;
            this.velocity.x *= scale;
            this.velocity.y *= scale;
        }
    }

    updateDeathAnimation(progress) {
        // Simple falling motion with slight acceleration
        this.velocity.y += 0.2;
        this.y += this.velocity.y;

        // Stop blocks at bottom of screen
        if (this.y > canvas.height - this.height/2) {
            this.y = canvas.height - this.height/2;
            this.velocity.y = 0;
        }
    }
}

// Add cursor handling for button hover
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
   
    if (gameOver || gameWon) {
        const buttonWidth = 140;
        const buttonHeight = 40;
        const buttonX = canvas.width/2 - buttonWidth/2;
        const buttonY = canvas.height/2 + 80;
       
        // Check if mouse is over button
        if (mouseX >= buttonX && mouseX <= buttonX + buttonWidth &&
            mouseY >= buttonY && mouseY <= buttonY + buttonHeight) {
            canvas.style.cursor = 'pointer';
        } else {
            canvas.style.cursor = 'default';
        }
    } else if (!gameStarted) {
        canvas.style.cursor = 'default';
    } else {
        canvas.style.cursor = 'none';
    }
});

// Existing gameplay mousemove handler
canvas.addEventListener('mousemove', (e) => {
    if (!gameStarted) return;
   
    const rect = canvas.getBoundingClientRect();
    lastMouseX = mouseX;
    lastMouseY = mouseY;
   
    const newMouseX = e.clientX - rect.left;
    const newMouseY = e.clientY - rect.top;
   
    mouseX += (newMouseX - mouseX) * MOUSE_SENSITIVITY;
    mouseY += (newMouseY - mouseY) * MOUSE_SENSITIVITY;
   
    mouseSpeed.x = (mouseX - lastMouseX) * MOUSE_SENSITIVITY;
    mouseSpeed.y = (mouseY - lastMouseY) * MOUSE_SENSITIVITY;
   
    player.x = mouseX;
    player.y = mouseY;

    const mouseSpeed2D = Math.sqrt(mouseSpeed.x * mouseSpeed.x + mouseSpeed.y * mouseSpeed.y);
    if (mouseSpeed2D > 0 && !gameOver && !gameWon) {
        blocks.forEach(block => {
            if (block.checkCollision(mouseX, mouseY, player.radius)) {
                const angle = Math.atan2(mouseSpeed.y, mouseSpeed.x);
                block.push(mouseSpeed2D, angle);
                soundManager.playPush(mouseSpeed2D);
            }
        });
    }
});

// Remove click event listener as it's no longer needed
canvas.removeEventListener('click', () => {});

// Game functions
function spawnBlock() {
    const stage = STAGES[currentStage];
   
    // Don't spawn in last 2 seconds or if game is over
    if (timeLeft <= STOP_SPAWN_TIME || gameOver || gameWon) {
        const statsDiv = document.getElementById('gameStats');
        if (timeLeft <= STOP_SPAWN_TIME && timeLeft > 0 && !gameOver && !gameWon) {
            statsDiv.innerHTML += ` | <span class="final-sprint">Final Sprint: ${timeLeft}s left!</span>`;
        }
        return;
    }
   
    if (blocks.length < stage.maxBlocks) {
        const block = new Block(false);
       
        // Choose a random side to spawn from
        const side = Math.floor(Math.random() * 4);
        switch(side) {
            case 0: // top
                block.x = Math.random() * canvas.width;
                block.y = -block.height;
                break;
            case 1: // right
                block.x = canvas.width + block.width;
                block.y = Math.random() * canvas.height;
                break;
            case 2: // bottom
                block.x = Math.random() * canvas.width;
                block.y = canvas.height + block.height;
                break;
            case 3: // left
                block.x = -block.width;
                block.y = Math.random() * canvas.height;
                break;
        }
       
        // Make more blocks aggressive
        block.isAggressive = Math.random() < 0.5;
       
        // Set initial velocity towards player for aggressive blocks
        if (block.isAggressive) {
            const dx = player.x - block.x;
            const dy = player.y - block.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            block.velocity.x = (dx / distance) * block.speed;
            block.velocity.y = (dy / distance) * block.speed;
        } else {
            // For non-aggressive blocks, set velocity towards center of screen
            const dx = canvas.width/2 - block.x;
            const dy = canvas.height/2 - block.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            block.velocity.x = (dx / distance) * block.speed;
            block.velocity.y = (dy / distance) * block.speed;
        }
       
        blocks.push(block);
    }
}

function checkCollisions() {
    if (isDeathAnimating) return;
   
    // Check for blocks that were removed (for destroy sound)
    const initialBlockCount = blocks.length;
    blocks = blocks.filter(block => !block.update());
    if (blocks.length < initialBlockCount) {
        soundManager.playDestroy(); // Play destroy sound when blocks are removed
    }

    if (invincibilityFrames > 0) {
        invincibilityFrames--;
        return;
    }

    for (let block of blocks) {
        if (block.checkCollision(player.x, player.y, PLAYER_HIT_RADIUS)) {
            // A hit counts when the block is moving into the frog. Blocks the
            // frog has just pushed are moving away from it and don't hurt.
            const dx = player.x - block.x;
            const dy = player.y - block.y;
            const movingTowardPlayer = (block.velocity.x * dx + block.velocity.y * dy) > 0;
           
            if (movingTowardPlayer) {
                playerHealth = Math.max(0, playerHealth - HIT_DAMAGE);
                soundManager.playDamage(); // Play damage sound
               
                invincibilityFrames = HIT_INVINCIBILITY_FRAMES;
                updateGameStats();
               
                if (playerHealth <= 0) {
                    startDeathAnimation();
                }
                break;
            }
        }
    }
}

function updateTimer() {
    if (!gameOver && !gameWon) {
        timeLeft--;
        timerElement.textContent = timeLeft;
       
        if (timeLeft <= 0) {
            // When time runs out, check if there are any blocks left
            if (blocks.length === 0) {
                // Player cleared all blocks in time - Victory!
                gameWon = true;
                soundManager.playVictory();
            } else {
                // Blocks remain when time ran out - Game Over
                startDeathAnimation();
                gameOver = true;
                soundManager.playGameOver();
            }
        }
    }
}

function resetGame() {
    // Clear existing timers
    if (spawnTimer) clearInterval(spawnTimer);
    if (gameTimer) clearInterval(gameTimer);
   
    // Reset game state
    currentStage = 0;
    score = 0;
    timeLeft = STAGES[currentStage].timeLimit;
    gameOver = false;
    gameWon = false;
    blocks = [];
    playerHealth = player.maxHealth;
    invincibilityFrames = 0;
    isDeathAnimating = false;
    deathAnimationProgress = 0;
    endScreenMessageStart = 0;
    showSecondMessage = false;
   
    // Initialize blocks for new game
    initializeBlocks();
   
    // Update display
    updateGameStats();
    stageElement.textContent = `STAGE ${STAGES[currentStage].number}`;
    stageElement.style.color = STAGES[currentStage].color;
   
    // Set up new timers
    spawnTimer = setInterval(spawnBlock, STAGES[currentStage].spawnInterval);
    gameTimer = setInterval(() => {
        updateTimer();
        updateGameStats();
    }, 1000);
}

function drawGameWon() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
   
    const stage = STAGES[currentStage];
    const isLastStage = currentStage === STAGES.length - 1;
   
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
   
    // Victory text in stage color
    ctx.fillStyle = stage.color;
    ctx.font = '36px "Segoe UI", Arial, sans-serif';
    ctx.fillText(isLastStage ? 'GAME COMPLETE!' : 'STAGE CLEAR!', canvas.width/2, canvas.height/2 - 40);
   
    // Stage completion text
    ctx.font = '20px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#CCCCCC';
    ctx.fillText(`Stage ${stage.number} Complete!`, canvas.width/2, canvas.height/2);
    ctx.fillText(`Time: ${stage.timeLimit - timeLeft}s`, canvas.width/2, canvas.height/2 + 30);
    ctx.fillText(`Score: ${score}`, canvas.width/2, canvas.height/2 + 60);
   
    // Draw restart/continue button
    drawRestartButton(stage.color, isLastStage ? 'Play Again' : 'Next Stage');
}

function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
   
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
   
    // Game over text in red
    ctx.fillStyle = '#ff4444';
    ctx.font = '36px "Segoe UI", Arial, sans-serif';
    ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 80);
   
    ctx.font = '20px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#CCCCCC';
    ctx.fillText(`Score: ${score}`, canvas.width/2, canvas.height/2 - 40);

    // Initialize the end screen message timer if not set
    if (endScreenMessageStart === 0) {
        endScreenMessageStart = Date.now();
    }

    // First message appears immediately
    ctx.font = '24px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText("The clutter just you cleared? That's your mind under pressure.", canvas.width/2, canvas.height/2 + 20);

    // Second message appears after 2 seconds (changed from 4)
    const timeSinceEnd = Date.now() - endScreenMessageStart;
    if (timeSinceEnd >= 2000) { // Changed from 4000 to 2000
        showSecondMessage = true;
    }

    if (showSecondMessage) {
        const opacity = Math.min(1, (timeSinceEnd - 2000) / 1000); // Changed from 4000 to 2000
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.fillText("Now that you've cleared the screen — let's clear your head.", canvas.width/2, canvas.height/2 + 60);
    }
}

function drawRestartButton(color, text = 'Play Again') {
    const buttonWidth = 140;
    const buttonHeight = 40;
    const buttonX = canvas.width/2 - buttonWidth/2;
    const buttonY = canvas.height/2 + 80;

    // Get mouse position for hover effect
    const rect = canvas.getBoundingClientRect();
    const mouseX = lastMouseX;
    const mouseY = lastMouseY;
   
    // Check if mouse is over button
    const isHovered = mouseX >= buttonX && mouseX <= buttonX + buttonWidth &&
                     mouseY >= buttonY && mouseY <= buttonY + buttonHeight;

    // Draw button background with color-based transparency
    ctx.fillStyle = isHovered ?
        `${color}55` :  // 33% opacity when hovered
        `${color}33`;   // 20% opacity when not hovered
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
   
    // Draw button border
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
   
    // Draw button text
    ctx.fillStyle = color;
    ctx.font = '16px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width/2, buttonY + buttonHeight/2);
}

// Handle stage progression
function handleStageComplete() {
    // Clear existing timers
    if (spawnTimer) clearInterval(spawnTimer);
    if (gameTimer) clearInterval(gameTimer);
   
    if (currentStage < STAGES.length - 1) {
        currentStage++;
        timeLeft = STAGES[currentStage].timeLimit;
        blocks = [];
        initializeBlocks();
        updateGameStats();
       
        // Update stage display
        stageElement.textContent = `STAGE ${STAGES[currentStage].number}`;
        stageElement.style.color = STAGES[currentStage].color;
       
        // Set up new timers with correct intervals for the new stage
        spawnTimer = setInterval(spawnBlock, STAGES[currentStage].spawnInterval);
        gameTimer = setInterval(() => {
            updateTimer();
            updateGameStats();
        }, 1000);
       
        soundManager.playVictory();
    } else {
        // Player has completed all stages
        gameWon = true;
        soundManager.playVictory();
    }
}

// Update click handler
canvas.addEventListener('click', (e) => {
    if (!gameStarted) return;
   
    if (gameOver || gameWon) {
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
       
        const buttonWidth = 140;
        const buttonHeight = 40;
        const buttonX = canvas.width/2 - buttonWidth/2;
        const buttonY = canvas.height/2 + 80;
       
        if (clickX >= buttonX && clickX <= buttonX + buttonWidth &&
            clickY >= buttonY && clickY <= buttonY + buttonHeight) {
            if (gameWon && currentStage < STAGES.length - 1) {
                handleStageComplete();
                gameWon = false;
            } else {
                // Show start screen again when returning to first stage
                if (gameOver || (gameWon && currentStage === STAGES.length - 1)) {
                    gameStarted = false;
                    startScreen.style.display = 'flex';
                } else {
                    resetGame();
                }
            }
        }
    }
});

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
   
    // Draw blocks
    blocks.forEach(block => {
        block.draw();
    });
   
    if (isDeathAnimating) {
        deathAnimationProgress++;
        const progress = deathAnimationProgress / DEATH_ANIMATION_DURATION;
       
        blocks.forEach(block => {
            block.updateDeathAnimation(progress);
        });

        // Draw player getting crushed
        if (deathAnimationProgress < DEATH_ANIMATION_DURATION * 0.8) {
            const crushProgress = deathAnimationProgress / DEATH_ANIMATION_DURATION;
            const yOffset = crushProgress * 200;
            const scale = 1 - crushProgress * 0.7;
           
            // Draw crushed player image
            ctx.drawImage(
                playerImage,
                player.x - (player.width * scale)/2,
                player.y + yOffset - (player.height * scale)/2,
                player.width * scale,
                player.height * scale
            );
        }

        // Add screen shake when blocks hit bottom
        if (deathAnimationProgress > DEATH_ANIMATION_DURATION * 0.3) {
            ctx.save();
            const shake = (Math.random() - 0.5) * 8;
            ctx.translate(shake, shake);
            ctx.restore();
        }

        // Draw "GAME OVER" text during death animation
        if (deathAnimationProgress > DEATH_ANIMATION_DURATION * 0.5) {
            const textOpacity = Math.min(1, (deathAnimationProgress - DEATH_ANIMATION_DURATION * 0.5) / (DEATH_ANIMATION_DURATION * 0.5));
            ctx.fillStyle = `rgba(255, 255, 255, ${textOpacity})`;
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2);
        }

        if (deathAnimationProgress >= DEATH_ANIMATION_DURATION) {
            gameOver = true;
            isDeathAnimating = false;
        }
    } else if (!gameOver) {
        // Draw player with image
        if (invincibilityFrames > 0 && invincibilityFrames % 10 < 5) {
            ctx.globalAlpha = 0.5; // Flash effect during invincibility
        }
        ctx.drawImage(
            playerImage,
            player.x - player.width/2,
            player.y - player.height/2,
            player.width,
            player.height
        );
        ctx.globalAlpha = 1.0; // Reset transparency
    }
   
    if (gameOver && !isDeathAnimating) {
        drawGameOver();
    } else if (gameWon) {
        drawGameWon();
    }
}

// Update the game stats display
function updateGameStats() {
    const stage = STAGES[currentStage];
    const healthPercent = (playerHealth / player.maxHealth) * 100;
   
    // Update stage display with current stage color
    stageElement.textContent = `STAGE ${stage.number}`;
    stageElement.style.color = stage.color;
    stageElement.style.borderColor = `${stage.color}33`; // 20% opacity border
    stageElement.style.backgroundColor = `${stage.color}11`; // 7% opacity background
   
    // Update health bar color based on health percentage
    const healthBar = document.querySelector('.health-bar-fill');
    healthBar.style.width = `${healthPercent}%`;
    healthBar.style.backgroundColor = healthPercent > 60 ? '#2ecc71' :
                                    healthPercent > 30 ? '#f1c40f' :
                                    '#e74c3c';
   
    // Update score and timer
    scoreElement.textContent = score;
    timerElement.textContent = timeLeft;
   
    // Update stats container
    const statsDiv = document.getElementById('gameStats');
    let statsHTML = `
        <span class="stage" style="color: ${stage.color}; border-color: ${stage.color}33; background-color: ${stage.color}11;">STAGE ${stage.number}</span>
        <span class="stat-divider">|</span>
        <span class="timer">Time: <span id="timer">${timeLeft}</span>s</span>
        <span class="stat-divider">|</span>
        <span class="score">Score: <span id="score">${score}</span></span>
        <span class="stat-divider">|</span>
        <div class="health-bar">
            Health:
            <div class="health-bar-container">
                <div class="health-bar-fill" style="width: ${healthPercent}%; background: ${
                    healthPercent > 60 ? '#2ecc71' :
                    healthPercent > 30 ? '#f1c40f' :
                    '#e74c3c'
                };"></div>
            </div>
        </div>
    `;
   
    // Add Final Sprint indicator if needed
    if (timeLeft <= STOP_SPAWN_TIME && timeLeft > 0 && !gameOver && !gameWon) {
        statsHTML += `<span class="stat-divider">|</span><span class="final-sprint">Final Sprint: ${timeLeft}s left!</span>`;
    }
   
    statsDiv.innerHTML = statsHTML;
}

// Game loop
function gameLoop() {
    if (gameStarted) {
        if (!gameOver && !gameWon) {
            checkCollisions();
        }
        draw();
    }
    requestAnimationFrame(gameLoop);
}

// Simplify the initializeBlocks function
function initializeBlocks() {
    blocks = [];
    // Add all blocks at once
    for (let i = 0; i < STAGES[currentStage].initialBlocks; i++) {
        const block = new Block(true);
        blocks.push(block);
    }
}

// Initialize game
function initializeGame() {
    // Set canvas size
    canvas.width = 800;
    canvas.height = 600;
   
    // Hide start screen
    startScreen.style.display = 'none';
   
    // Initial setup
    resetGame();
   
    // Start the game loop
    gameLoop();
   
    // Start game state
    gameStarted = true;
}

// Start screen handling
startButton.addEventListener('click', () => {
    // Start the game when button is clicked
    initializeGame();
});

// Move startDeathAnimation outside of Block class and modify it
function startDeathAnimation() {
    if (isDeathAnimating) return; // Prevent multiple death animations
   
    isDeathAnimating = true;
    deathAnimationProgress = 0;
    soundManager.playGameOver(); // Play game over sound
   
    // Store player's final position
    const finalPlayerX = player.x;
    const finalPlayerY = player.y;
   
    // Clear existing blocks
    blocks = [];
   
    // Create a wall of blocks above the player
    for (let i = 0; i < FINAL_BLOCK_COUNT; i++) {
        const block = new Block();
        // Position blocks in rows above the player
        const row = Math.floor(i / 10);
        const col = i % 10;
        block.x = (canvas.width / 11) * (col + 1);
        block.y = -100 - (row * 60); // Stack blocks above the screen
        block.velocity = { x: 0, y: 2 }; // Initial falling speed
        block.width = canvas.width / 10; // Make blocks wider
        block.height = 40;
        block.rotationAngle = 0;
        blocks.push(block);
    }
}