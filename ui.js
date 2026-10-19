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

    // ---- Scoreboard extras: time bar in the stage colour, low-time state ----
    const shell = document.querySelector('.game-shell');
    const timeFill = document.getElementById('timeFill');
    let lastTimeKey = '';

    function updateTimeBar() {
        const stage = STAGES[currentStage];
        const key = `${currentStage}:${timeLeft}`;
        if (key === lastTimeKey) return;
        const prev = lastTimeKey;
        lastTimeKey = key;

        const pct = Math.max(0, Math.min(1, timeLeft / stage.timeLimit)) * 100;
        // Refills (new stage / restart) snap; countdown slides.
        const refill = prev && Number(prev.split(':')[1]) < timeLeft;
        timeFill.style.transition = refill ? 'none' : '';
        timeFill.style.width = `${pct}%`;
        timeFill.style.backgroundColor = stage.color;
        shell.classList.toggle('low-time', timeLeft <= 5 && !gameOver && !gameWon);
    }

    // ---- Impact effects on the frog ----
    // Purely visual. Contact uses the game's own collision test; damage is
    // detected by watching playerHealth, which only game.js changes.
    const particles = [];
    const rings = [];
    const popups = [];
    let touching = new Set();
    let lastHealth = playerHealth;
    let damageAt = -1e9;
    let bumpAt = -1e9;

    // Red silhouette of the frog, used for the hit flash
    const tint = document.createElement('canvas');
    const tintCtx = tint.getContext('2d');
    function buildTint() {
        tint.width = player.width;
        tint.height = player.height;
        tintCtx.clearRect(0, 0, tint.width, tint.height);
        tintCtx.drawImage(playerImage, 0, 0, tint.width, tint.height);
        tintCtx.globalCompositeOperation = 'source-atop';
        tintCtx.fillStyle = '#ff4d4d';
        tintCtx.fillRect(0, 0, tint.width, tint.height);
        tintCtx.globalCompositeOperation = 'source-over';
    }
    if (playerImage.complete) buildTint(); else playerImage.addEventListener('load', buildTint);

    function burst(x, y, color, count, speed) {
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const v = speed * (0.4 + Math.random() * 0.8);
            particles.push({
                x0: x, y0: y,
                vx: Math.cos(a) * v,
                vy: Math.sin(a) * v,
                size: 3 + Math.random() * 4,
                rot: Math.random() * Math.PI,
                vr: (Math.random() - 0.5) * 0.3,
                color,
                born: performance.now(),
                life: 380 + Math.random() * 260
            });
        }
    }

    function playing() {
        return gameStarted && !gameOver && !gameWon && !isDeathAnimating;
    }

    function detectImpacts(now) {
        if (playerHealth < lastHealth && gameStarted) {
            const lost = Math.round(((lastHealth - playerHealth) / player.maxHealth) * 100);
            damageAt = now;
            rings.push({ x: player.x, y: player.y, born: now, life: 500, color: '248, 113, 113', max: 90 });
            burst(player.x, player.y, 'rgba(255, 90, 90, 0.95)', 14, 5);
            popups.push({ text: `−${lost}%`, x: player.x + 36, y: player.y - 46, born: now, life: 900 });
        }
        lastHealth = playerHealth;

        if (!playing()) {
            touching = new Set();
            return;
        }
        const now_touching = new Set();
        for (const block of blocks) {
            if (block.checkCollision(player.x, player.y, player.radius)) {
                now_touching.add(block);
                if (!touching.has(block)) {
                    const mx = (block.x + player.x) / 2;
                    const my = (block.y + player.y) / 2;
                    burst(mx, my, block.color, 6, 3);
                    rings.push({ x: mx, y: my, born: now, life: 320, color: '255, 255, 255', max: 34 });
                    bumpAt = now;
                }
            }
        }
        touching = now_touching;
    }

    function drawImpacts(now) {
        ctx.save();
        ctx.shadowColor = 'transparent';

        // red halo around the frog when health is lost
        const dt = now - damageAt;
        if (dt < 550 && playing()) {
            const a = 0.35 * (1 - dt / 550);
            const g = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, 150);
            g.addColorStop(0, `rgba(248, 113, 113, ${a})`);
            g.addColorStop(1, 'rgba(248, 113, 113, 0)');
            ctx.fillStyle = g;
            ctx.fillRect(player.x - 150, player.y - 150, 300, 300);
        }

        // frog flash: strong red on damage, faint on a plain bump
        if (playing() && tint.width) {
            let alpha = 0;
            if (dt < 450) alpha = 0.75 * (1 - dt / 450);
            else if (now - bumpAt < 160) alpha = 0.25 * (1 - (now - bumpAt) / 160);
            if (alpha > 0) {
                ctx.globalAlpha = alpha;
                ctx.drawImage(tint, player.x - player.width / 2, player.y - player.height / 2,
                              player.width, player.height);
                ctx.globalAlpha = 1;
            }
        }

        for (let i = rings.length - 1; i >= 0; i--) {
            const r = rings[i];
            const t = (now - r.born) / r.life;
            if (t >= 1) { rings.splice(i, 1); continue; }
            ctx.strokeStyle = `rgba(${r.color}, ${0.6 * (1 - t)})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(r.x, r.y, 8 + r.max * easeOut(t), 0, Math.PI * 2);
            ctx.stroke();
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            const t = (now - p.born) / p.life;
            if (t >= 1) { particles.splice(i, 1); continue; }
            // time-based so it looks the same however often draw() runs per frame
            const f = (now - p.born) / 16.67;
            const travel = (1 - Math.pow(0.92, f)) / 0.08;
            ctx.save();
            ctx.globalAlpha = 1 - t;
            ctx.translate(p.x0 + p.vx * travel, p.y0 + p.vy * travel);
            ctx.rotate(p.rot + p.vr * f);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = popups.length - 1; i >= 0; i--) {
            const p = popups[i];
            const t = (now - p.born) / p.life;
            if (t >= 1) { popups.splice(i, 1); continue; }
            ctx.globalAlpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
            ctx.font = display(700, 18);
            ctx.fillStyle = DANGER;
            ctx.fillText(p.text, p.x, p.y - 26 * easeOut(t));
        }
        ctx.restore();
    }

    // Run after game.js has drawn each frame. The original draw() runs unchanged.
    const drawGame = draw;
    draw = function () {
        drawGame();
        const now = performance.now();
        updateTimeBar();
        detectImpacts(now);
        if (gameOver || gameWon) {
            particles.length = 0;
            rings.length = 0;
            popups.length = 0;
            damageAt = -1e9;
            return;
        }
        drawImpacts(now);
    };

    // ---- Start screen preview: blocks drifting around the frog ----
    const demo = document.getElementById('demoCanvas');
    const dctx = demo.getContext('2d');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const DEMO_COLORS = [
        { color: 'hsla(200, 70%, 50%, 0.8)', chase: false },
        { color: 'hsla(200, 70%, 50%, 0.8)', chase: false },
        { color: 'hsla(120, 70%, 50%, 0.8)', chase: false },
        { color: 'hsla(30, 100%, 50%, 0.8)', chase: true },
        { color: 'hsla(0, 100%, 50%, 0.8)', chase: true }
    ];
    let demoBlocks = [];
    const demoSparks = [];
    let dw = 0;
    let dh = 0;

    function makeDemoBlock(w, h) {
        const kind = DEMO_COLORS[Math.floor(Math.random() * DEMO_COLORS.length)];
        const a = Math.random() * Math.PI * 2;
        const speed = 0.25 + Math.random() * 0.45;
        return {
            x: Math.random() * w,
            y: Math.random() * h,
            w: (30 + Math.random() * 40) * BLOCK_DRAW_SCALE,
            h: (20 + Math.random() * 30) * BLOCK_DRAW_SCALE,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            rot: Math.random() * Math.PI * 2,
            vr: (Math.random() - 0.5) * 0.01,
            color: kind.color,
            chase: kind.chase
        };
    }

    function sizeDemo() {
        const rect = demo.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (!rect.width || !rect.height) return false;
        if (rect.width !== dw || rect.height !== dh) {
            dw = rect.width;
            dh = rect.height;
            demo.width = Math.round(dw * dpr);
            demo.height = Math.round(dh * dpr);
            dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const count = Math.round(Math.min(26, Math.max(10, (dw * dh) / 26000)));
            demoBlocks = [];
            for (let i = 0; i < count; i++) {
                const b = makeDemoBlock(dw, dh);
                // keep the frog's spot clear at the start
                if (Math.hypot(b.x - dw / 2, b.y - dh / 2) < 140) b.x = (b.x + dw / 2) % dw;
                demoBlocks.push(b);
            }
        }
        return true;
    }

    function stepDemo() {
        const cx = dw / 2;
        const cy = dh / 2;
        for (const b of demoBlocks) {
            if (b.chase) {
                const dx = cx - b.x;
                const dy = cy - b.y;
                const d = Math.hypot(dx, dy) || 1;
                b.vx += (dx / d) * 0.012;
                b.vy += (dy / d) * 0.012;
            }
            const sp = Math.hypot(b.vx, b.vy);
            const max = b.chase ? 1.1 : 0.7;
            if (sp > max) { b.vx *= max / sp; b.vy *= max / sp; }
            b.x += b.vx;
            b.y += b.vy;
            b.rot += b.vr;

            // the frog shoves anything that gets too close
            const dx = b.x - cx;
            const dy = b.y - cy;
            const d = Math.hypot(dx, dy) || 1;
            if (d < 85) {
                b.vx = (dx / d) * 3.2;
                b.vy = (dy / d) * 3.2;
                for (let i = 0; i < 6; i++) {
                    const a = Math.random() * Math.PI * 2;
                    demoSparks.push({ x: b.x, y: b.y, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2,
                                      color: b.color, born: performance.now(), size: 3 + Math.random() * 3 });
                }
            }
            // ease back to drifting speed
            if (sp > max) { b.vx *= 0.985; b.vy *= 0.985; }

            const m = 60;
            if (b.x < -m) b.x = dw + m;
            if (b.x > dw + m) b.x = -m;
            if (b.y < -m) b.y = dh + m;
            if (b.y > dh + m) b.y = -m;
        }
    }

    function drawDemo() {
        dctx.clearRect(0, 0, dw, dh);
        for (const b of demoBlocks) {
            dctx.save();
            dctx.translate(b.x, b.y);
            dctx.rotate(b.rot);
            dctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
            dctx.shadowBlur = 12;
            dctx.shadowOffsetY = 4;
            dctx.fillStyle = b.color;
            dctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
            dctx.shadowColor = 'transparent';
            dctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
            dctx.lineWidth = 1;
            dctx.strokeRect(-b.w / 2 + 0.5, -b.h / 2 + 0.5, b.w - 1, b.h - 1);
            dctx.restore();
        }
        const now = performance.now();
        for (let i = demoSparks.length - 1; i >= 0; i--) {
            const s = demoSparks[i];
            const t = (now - s.born) / 500;
            if (t >= 1) { demoSparks.splice(i, 1); continue; }
            s.x += s.vx;
            s.y += s.vy;
            s.vx *= 0.93;
            s.vy *= 0.93;
            dctx.globalAlpha = 1 - t;
            dctx.fillStyle = s.color;
            dctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
            dctx.globalAlpha = 1;
        }
    }

    function demoLoop() {
        if (startScreen.style.display !== 'none' && sizeDemo()) {
            if (!reduceMotion) stepDemo();
            drawDemo();
        }
        requestAnimationFrame(demoLoop);
    }
    requestAnimationFrame(demoLoop);
})();
