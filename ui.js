// Visual layer for CrashOut.
// Loaded after game.js and only replaces how things are drawn on the canvas.
// No game rules, timers, scoring or input handling live here. The restart
// button is drawn at exactly the same position/size game.js uses for clicks.

(function () {
    const DISPLAY = '"Product Sans", "Google Sans", "Inter", "Segoe UI", system-ui, Arial, sans-serif';
    const BODY = '"Inter", "Segoe UI", system-ui, Arial, sans-serif';
    const TEXT = '#f4f4f5';
    const MUTED = '#a1a1aa';
    const FAINT = '#71717a';
    const DANGER = '#f87171';
    const ACCENT = '#c5e886';
    const ACCENT_HOVER = '#d3f09e';

    // Same geometry as the click/hover checks in game.js
    const BUTTON_WIDTH = 140;
    const BUTTON_HEIGHT = 40;

    function display(weight, size) {
        return `${weight} ${size}px ${DISPLAY}`;
    }

    function body(weight, size) {
        return `${weight} ${size}px ${BODY}`;
    }

    function setSpacing(px) {
        if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`;
    }

    function roundedRect(x, y, w, h, r) {
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x, y, w, h, r);
        } else {
            ctx.rect(x, y, w, h);
        }
    }

    function dimBackground() {
        ctx.fillStyle = 'rgba(11, 11, 12, 0.86)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function text(str, x, y, style, color, spacing = 0) {
        ctx.font = style;
        ctx.fillStyle = color;
        setSpacing(spacing);
        ctx.fillText(str, x, y);
        setSpacing(0);
    }

    // ---- Blocks: same size, colour, rotation and scale, softer look ----
    Block.prototype.draw = function () {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotationAngle);

        if (this.isInDeathAnimation && this.currentScale) {
            ctx.scale(this.currentScale, this.currentScale);
        }

        const w = this.width;
        const h = this.height;
        const r = Math.min(6, w / 4, h / 4);

        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = this.color;
        roundedRect(-w / 2, -h / 2, w, h, r);
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1;
        roundedRect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1, r);
        ctx.stroke();

        ctx.restore();
    };

    // ---- Button ----
    drawRestartButton = function (color, label = 'Play Again') {
        const x = canvas.width / 2 - BUTTON_WIDTH / 2;
        const y = canvas.height / 2 + 80;

        const hovered = lastMouseX >= x && lastMouseX <= x + BUTTON_WIDTH &&
                        lastMouseY >= y && lastMouseY <= y + BUTTON_HEIGHT;

        ctx.fillStyle = hovered ? ACCENT_HOVER : ACCENT;
        roundedRect(x, y, BUTTON_WIDTH, BUTTON_HEIGHT, 12);
        ctx.fill();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        text(label, canvas.width / 2, y + BUTTON_HEIGHT / 2 + 1, display(700, 15), '#0b0b0c');
    };

    // ---- Stage clear / game complete ----
    drawGameWon = function () {
        dimBackground();

        const stage = STAGES[currentStage];
        const isLastStage = currentStage === STAGES.length - 1;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        text(`STAGE ${stage.number} OF ${STAGES.length}`, cx, cy - 120, display(700, 12), stage.color, 1.5);
        text(isLastStage ? 'You beat CrashOut' : 'Stage clear', cx, cy - 78, display(700, 40), TEXT, -1);

        // Stats
        const stats = [
            ['TIME', `${stage.timeLimit - timeLeft}s`],
            ['SCORE', `${score}`]
        ];
        stats.forEach(([label, value], i) => {
            const x = cx + (i === 0 ? -70 : 70);
            text(label, x, cy - 10, body(600, 11), FAINT, 1.2);
            text(value, x, cy + 20, display(700, 28), TEXT);
        });

        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(cx - 0.5, cy - 18, 1, 48);

        drawRestartButton(stage.color, isLastStage ? 'Play Again' : 'Next Stage');
    };

    // ---- Game over ----
    // Keeps the same message timing (endScreenMessageStart / showSecondMessage) as game.js.
    drawGameOver = function () {
        dimBackground();

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        text('GAME OVER', cx, cy - 135, display(700, 12), DANGER, 1.5);
        text(`${score}`, cx, cy - 90, display(700, 56), TEXT, -1);
        text('POINTS', cx, cy - 52, body(600, 11), FAINT, 1.2);

        if (endScreenMessageStart === 0) {
            endScreenMessageStart = Date.now();
        }

        text("The clutter you just cleared? That's your mind under pressure.", cx, cy + 5, body(500, 16), TEXT);

        const timeSinceEnd = Date.now() - endScreenMessageStart;
        if (timeSinceEnd >= 2000) {
            showSecondMessage = true;
        }

        if (showSecondMessage) {
            const opacity = Math.min(1, (timeSinceEnd - 2000) / 1000);
            text("Now that you've cleared the screen — let's clear your head.", cx, cy + 35,
                 body(400, 16), `rgba(161, 161, 170, ${opacity})`);
        }

        drawRestartButton(MUTED, 'Back to Menu');
    };
})();
