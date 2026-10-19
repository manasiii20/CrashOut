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

    const BLOCK_DRAW_SCALE = 0.88;

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

    // ---- Blocks: same size, colour, rotation and scale, with a soft shadow ----
    Block.prototype.draw = function () {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotationAngle);

        if (this.isInDeathAnimation && this.currentScale) {
            ctx.scale(this.currentScale, this.currentScale);
        }

        // Drawn slightly smaller than the block's real size (visual only).
        ctx.scale(BLOCK_DRAW_SCALE, BLOCK_DRAW_SCALE);

        const w = this.width;
        const h = this.height;

        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = this.color;
        ctx.fillRect(-w / 2, -h / 2, w, h);

        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1);

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
        text(label, canvas.width / 2, y + BUTTON_HEIGHT / 2 + 1, display(700, 14), '#0b0b0c');
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
        text(isLastStage ? 'You beat CrashOut' : 'Stage clear', cx, cy - 74, display(700, 32), TEXT, -0.5);

        // Stats
        const stats = [
            ['TIME', `${stage.timeLimit - timeLeft}s`],
            ['SCORE', `${score}`]
        ];
        stats.forEach(([label, value], i) => {
            const x = cx + (i === 0 ? -70 : 70);
            text(label, x, cy - 10, body(600, 11), FAINT, 1.2);
            text(value, x, cy + 18, display(700, 24), TEXT);
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
        text(`${score}`, cx, cy - 92, display(700, 44), TEXT, -0.5);
        text('POINTS', cx, cy - 60, body(600, 11), FAINT, 1.2);

        if (endScreenMessageStart === 0) {
            endScreenMessageStart = Date.now();
        }

        text("The clutter you just cleared? That's your mind under pressure.", cx, cy + 5, body(500, 15), TEXT);

        const timeSinceEnd = Date.now() - endScreenMessageStart;
        if (timeSinceEnd >= 2000) {
            showSecondMessage = true;
        }

        if (showSecondMessage) {
            const opacity = Math.min(1, (timeSinceEnd - 2000) / 1000);
            text("Now that you've cleared the screen — let's clear your head.", cx, cy + 35,
                 body(400, 15), `rgba(161, 161, 170, ${opacity})`);
        }

        drawRestartButton(MUTED, 'Back to Menu');
    };

    // ---- Health bar: animate changes instead of jumping ----
    // game.js rebuilds the stats bar (with the new health width) on every hit
    // and every second. This only animates the bar from the previously shown
    // value to the new one; it never changes the health value itself.
    const statsDiv = document.getElementById('gameStats');
    const FILL_MS = 600;     // bar slides to the new value
    const GHOST_DELAY = 350; // lost chunk lingers briefly...
    const GHOST_MS = 1200;   // ...then drains away
    let anim = { fillFrom: 100, ghostFrom: 100, target: 100, start: 0 };
    let running = false;

    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const easeInOut = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

    function widthsAt(now) {
        const e = now - anim.start;
        const f = Math.min(1, e / FILL_MS);
        const g = Math.min(1, Math.max(0, (e - GHOST_DELAY) / GHOST_MS));
        return {
            fill: anim.fillFrom + (anim.target - anim.fillFrom) * easeOut(f),
            ghost: anim.ghostFrom + (anim.target - anim.ghostFrom) * easeInOut(g),
            done: e >= GHOST_DELAY + GHOST_MS
        };
    }

    // Draws the current animation state onto whatever bar is on screen now.
    // Returns true once the animation has finished.
    function apply() {
        const fill = statsDiv.querySelector('.health-bar-fill');
        const w = widthsAt(performance.now());
        if (!fill) return w.done;
        const container = fill.parentElement;
        let ghost = container.querySelector('.health-ghost');

        if (w.done) {
            fill.style.width = `${anim.target}%`;
            if (ghost) ghost.remove();
            return true;
        }
        fill.style.transition = 'background-color 0.3s ease';
        fill.style.width = `${w.fill}%`;
        if (w.ghost > w.fill + 0.1) {
            if (!ghost) {
                ghost = document.createElement('div');
                ghost.className = 'health-ghost';
                container.appendChild(ghost);
            }
            ghost.style.width = `${w.ghost}%`;
        } else if (ghost) {
            ghost.remove();
        }
        return false;
    }

    function frame() {
        if (apply()) {
            running = false;
        } else {
            requestAnimationFrame(frame);
        }
    }

    function onStatsRebuilt() {
        const fill = statsDiv.querySelector('.health-bar-fill');
        if (!fill) return;
        const target = parseFloat(fill.style.width);
        if (isNaN(target)) return;

        if (target !== anim.target) {
            const now = performance.now();
            const current = running ? widthsAt(now) : { fill: anim.target, ghost: anim.target };
            anim = {
                fillFrom: current.fill,
                ghostFrom: Math.max(current.ghost, current.fill),
                target,
                start: now
            };
            if (target < current.fill) {
                fill.parentElement.classList.add('hit');
            }
        }

        // Paint immediately so the freshly rebuilt bar never flashes the final width.
        const done = apply();
        if (!done && !running) {
            running = true;
            requestAnimationFrame(frame);
        }
    }

    new MutationObserver(onStatsRebuilt).observe(statsDiv, { childList: true });
})();
