// Cell-anchored animation helpers for puzzle modifier events.
//
// Each function takes a `Categories` value and resolves the originating
// cell via `[data-category="<value>"]`. Animations spawn transient DOM
// nodes positioned over (or flying between) cells. All visuals honor
// `prefers-reduced-motion: reduce` — when set, helpers short-circuit and
// skip the animation entirely.

import type { Categories } from '../enums/Categories';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function reducedMotion(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function cellRect(category: Categories): DOMRect | null {
    if (typeof document === 'undefined') return null;
    const el = document.querySelector<HTMLElement>(`[data-category="${category}"]`);
    return el ? el.getBoundingClientRect() : null;
}

function ensureFxLayer(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    let layer = document.getElementById('cell-fx-layer');
    if (!layer) {
        layer = document.createElement('div');
        layer.id = 'cell-fx-layer';
        layer.style.position = 'fixed';
        layer.style.inset = '0';
        layer.style.pointerEvents = 'none';
        layer.style.zIndex = '900';
        document.body.appendChild(layer);
    }
    return layer;
}

function fade(el: HTMLElement, durationMs: number): void {
    window.setTimeout(() => el.remove(), durationMs);
}

// ---- Ice melt ----
// White-cyan flash on the cell + a handful of "ice fragments" tumbling down.
export function showIceMelt(category: Categories): void {
    if (reducedMotion()) return;
    const rect = cellRect(category);
    const layer = ensureFxLayer();
    if (!rect || !layer) return;

    const flash = document.createElement('div');
    flash.className = 'cell-fx-flash cell-fx-flash-ice';
    Object.assign(flash.style, positionOver(rect));
    layer.appendChild(flash);
    fade(flash, 700);

    const fragmentCount = 6;
    for (let i = 0; i < fragmentCount; i++) {
        const frag = document.createElement('div');
        frag.className = 'cell-fx-ice-fragment';
        const startX = rect.left + rect.width / 2 + (Math.random() - 0.5) * rect.width * 0.6;
        const startY = rect.top + rect.height / 2;
        const driftX = (Math.random() - 0.5) * 60;
        const driftY = rect.height * 0.8 + Math.random() * 30;
        const rot = (Math.random() - 0.5) * 360;
        frag.style.left = `${startX}px`;
        frag.style.top = `${startY}px`;
        frag.style.setProperty('--ice-dx', `${driftX}px`);
        frag.style.setProperty('--ice-dy', `${driftY}px`);
        frag.style.setProperty('--ice-rot', `${rot}deg`);
        frag.style.animationDelay = `${i * 30}ms`;
        layer.appendChild(frag);
        fade(frag, 900);
    }
}

// ---- Flying multiplier relocation ----
// Transient chip flies from old cell to new cell over ~450ms.
export function showFlyingRelocate(from: Categories, to: Categories, multiplier: number): void {
    if (reducedMotion()) return;
    const fromRect = cellRect(from);
    const toRect = cellRect(to);
    const layer = ensureFxLayer();
    if (!fromRect || !toRect || !layer) return;

    const chip = document.createElement('div');
    chip.className = 'cell-fx-flying-chip';
    chip.textContent = `×${multiplier}`;
    const startX = fromRect.left + fromRect.width / 2;
    const startY = fromRect.top + fromRect.height / 2;
    const endX = toRect.left + toRect.width / 2;
    const endY = toRect.top + toRect.height / 2;
    chip.style.left = `${startX}px`;
    chip.style.top = `${startY}px`;
    chip.style.setProperty('--fx-tx', `${endX - startX}px`);
    chip.style.setProperty('--fx-ty', `${endY - startY}px`);
    layer.appendChild(chip);
    fade(chip, 550);
}

// ---- Hot Potato armed ----
// Red pulse on the cell + screen-edge vignette pulse.
export function showHotPotatoArmed(category: Categories): void {
    if (reducedMotion()) return;
    const rect = cellRect(category);
    const layer = ensureFxLayer();
    if (!rect || !layer) return;

    const flash = document.createElement('div');
    flash.className = 'cell-fx-flash cell-fx-flash-bomb-arm';
    Object.assign(flash.style, positionOver(rect));
    layer.appendChild(flash);
    fade(flash, 800);

    const vignette = document.createElement('div');
    vignette.className = 'cell-fx-vignette';
    layer.appendChild(vignette);
    fade(vignette, 700);
}

// ---- Hot Potato defuse ----
// Green flash + small "snap" particles.
export function showHotPotatoDefuse(category: Categories): void {
    if (reducedMotion()) return;
    const rect = cellRect(category);
    const layer = ensureFxLayer();
    if (!rect || !layer) return;
    const flash = document.createElement('div');
    flash.className = 'cell-fx-flash cell-fx-flash-defuse';
    Object.assign(flash.style, positionOver(rect));
    layer.appendChild(flash);
    fade(flash, 600);
}

// ---- Hot Potato expire ----
// Orange-red flash + particle explosion + subtle screen shake.
export function showHotPotatoExpire(category: Categories): void {
    if (reducedMotion()) return;
    const rect = cellRect(category);
    const layer = ensureFxLayer();
    if (!rect || !layer) return;

    const flash = document.createElement('div');
    flash.className = 'cell-fx-flash cell-fx-flash-expire';
    Object.assign(flash.style, positionOver(rect));
    layer.appendChild(flash);
    fade(flash, 800);

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    for (let i = 0; i < 8; i++) {
        const p = document.createElement('div');
        p.className = 'cell-fx-bomb-particle';
        const angle = (i / 8) * Math.PI * 2;
        const distance = 50 + Math.random() * 30;
        p.style.left = `${cx}px`;
        p.style.top = `${cy}px`;
        p.style.setProperty('--fx-tx', `${Math.cos(angle) * distance}px`);
        p.style.setProperty('--fx-ty', `${Math.sin(angle) * distance}px`);
        layer.appendChild(p);
        fade(p, 700);
    }

    // Brief column shake — applied to #app so the gradient bg stays still.
    const app = document.getElementById('app');
    if (app) {
        app.classList.add('cell-fx-shake');
        window.setTimeout(() => app.classList.remove('cell-fx-shake'), 300);
    }
}

// ---- Multiplier Bubble pop ----
// Pop ring at source + chip-fly to each target.
export function showBubblePop(from: Categories, targets: Categories[]): void {
    if (reducedMotion()) return;
    const fromRect = cellRect(from);
    const layer = ensureFxLayer();
    if (!fromRect || !layer) return;

    const ring = document.createElement('div');
    ring.className = 'cell-fx-bubble-ring';
    const cx = fromRect.left + fromRect.width / 2;
    const cy = fromRect.top + fromRect.height / 2;
    ring.style.left = `${cx}px`;
    ring.style.top = `${cy}px`;
    layer.appendChild(ring);
    fade(ring, 600);

    targets.forEach((target, i) => {
        const tRect = cellRect(target);
        if (!tRect) return;
        const tx = tRect.left + tRect.width / 2 - cx;
        const ty = tRect.top + tRect.height / 2 - cy;
        const chip = document.createElement('div');
        chip.className = 'cell-fx-bubble-chip';
        chip.textContent = '×2';
        chip.style.left = `${cx}px`;
        chip.style.top = `${cy}px`;
        chip.style.setProperty('--fx-tx', `${tx}px`);
        chip.style.setProperty('--fx-ty', `${ty}px`);
        chip.style.animationDelay = `${i * 80}ms`;
        layer.appendChild(chip);
        fade(chip, 800 + i * 80);
    });
}

// ---- Looping multiplier change ----
// Light coin flip on the cell badge.
export function showLoopingChange(category: Categories, atPeak: boolean): void {
    if (reducedMotion()) return;
    const rect = cellRect(category);
    const layer = ensureFxLayer();
    if (!rect || !layer) return;
    if (atPeak) {
        const flash = document.createElement('div');
        flash.className = 'cell-fx-flash cell-fx-flash-loop-peak';
        Object.assign(flash.style, positionOver(rect));
        layer.appendChild(flash);
        fade(flash, 600);
    }
}

// ---- Looping category cycle ----
// Short emerald flip flash on the slot when the active category rotates.
export function showLoopingCategoryCycle(category: Categories): void {
    if (reducedMotion()) return;
    const rect = cellRect(category);
    const layer = ensureFxLayer();
    if (!rect || !layer) return;
    const flash = document.createElement('div');
    flash.className = 'cell-fx-flash cell-fx-flash-loop-category';
    Object.assign(flash.style, positionOver(rect));
    layer.appendChild(flash);
    fade(flash, 550);
}

// ---- Looping category applied ----
// `raw → <ActiveCat> = +final` popup above the cell when the substitution lands.
export function showLoopingCategoryApplied(
    category: Categories,
    raw: number,
    final: number,
    active: Categories,
): void {
    const rect = cellRect(category);
    const layer = ensureFxLayer();
    if (!rect || !layer) return;
    const wrap = document.createElement('div');
    wrap.className = 'cell-fx-score-breakdown cell-fx-score-breakdown-cycle';
    wrap.style.left = `${rect.left + rect.width / 2}px`;
    wrap.style.top  = `${rect.top}px`;
    if (reducedMotion()) {
        wrap.innerHTML = `<span class="cell-fx-final">+${final}</span>`;
    } else {
        // Compact category label for the substitution
        const label = activeShortLabel(active);
        wrap.innerHTML = `
            <span class="cell-fx-raw">${raw}</span>
            <span class="cell-fx-mult">as ${label}</span>
            <span class="cell-fx-final">+${final}</span>
        `;
    }
    layer.appendChild(wrap);
    fade(wrap, 1300);
}

function activeShortLabel(c: Categories): string {
    const map: Record<string, string> = {
        'Ones': '1s', 'Twos': '2s', 'Threes': '3s', 'Fours': '4s', 'Fives': '5s', 'Sixes': '6s',
        'Three of a Kind': '3K', 'Four of a Kind': '4K', 'Full House': 'FH',
        'Small Straight': 'SS', 'Large Straight': 'LS', 'Yahtzee': 'Y', 'Chance': 'CH',
    };
    return map[c as unknown as string] ?? String(c);
}

// ---- Bonus turn banner shimmer ----
// Glow on the bonus-eligible cell.
export function showBonusTurnGlow(category: Categories): void {
    if (reducedMotion()) return;
    const rect = cellRect(category);
    const layer = ensureFxLayer();
    if (!rect || !layer) return;
    const flash = document.createElement('div');
    flash.className = 'cell-fx-flash cell-fx-flash-bonus';
    Object.assign(flash.style, positionOver(rect));
    layer.appendChild(flash);
    fade(flash, 900);
}

// ---- Score breakdown popup ----
// `raw × mult = +final` anchored above the cell, fades + scales.
export function showScoreBreakdown(
    category: Categories,
    raw: number,
    multiplier: number,
    final: number,
): void {
    const rect = cellRect(category);
    const layer = ensureFxLayer();
    if (!rect || !layer) return;
    const wrap = document.createElement('div');
    wrap.className = 'cell-fx-score-breakdown';
    wrap.style.left = `${rect.left + rect.width / 2}px`;
    wrap.style.top  = `${rect.top}px`;
    if (reducedMotion()) {
        // Skip the equation theater — just show the final value briefly.
        wrap.innerHTML = `<span class="cell-fx-final">+${final}</span>`;
    } else {
        wrap.innerHTML = `
            <span class="cell-fx-raw">${raw}</span>
            <span class="cell-fx-mult">×${multiplier}</span>
            <span class="cell-fx-final">+${final}</span>
        `;
    }
    layer.appendChild(wrap);
    fade(wrap, 1200);
}

// ---- Goal-met flash on the goals panel ----
export function showGoalMet(): void {
    if (typeof document === 'undefined') return;
    const panel = document.querySelector<HTMLElement>('.puzzle-goals');
    if (!panel) return;
    panel.classList.remove('cell-fx-goal-met');
    // Reflow + re-add so consecutive calls re-trigger the animation.
    void panel.offsetWidth;
    panel.classList.add('cell-fx-goal-met');
    window.setTimeout(() => panel.classList.remove('cell-fx-goal-met'), 1200);
}

// ---- Score commit: dice fly into the scored cell ----
// Cause-and-effect animation when a player banks a score. The five rolled
// dice in #dice-container are deep-cloned into #cell-fx-layer, lift off
// staggered (~50ms each), tumble + glide + shrink into the target cell
// (~700ms total), then a tier-colored "+score" banner rises from the cell
// with a particle burst.
//
// Reduced motion: skip the flight + particles, just show a small "+score"
// chip on the cell (mirrors showScoreBreakdown's reduced-motion branch).
const PARTICLE_COLORS = [
    '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FF69B4', '#9B59B6', '#3498DB', '#2ECC71', '#F1C40F',
];

type ScoreTier = 'high' | 'mid' | 'norm';

function tierFor(score: number): ScoreTier {
    if (score >= 50) return 'high';
    if (score >= 30) return 'mid';
    return 'norm';
}

export function showScoreCellFlight(category: Categories, score: number): void {
    if (typeof document === 'undefined') return;
    const cellEl = document.querySelector<HTMLElement>(`[data-category="${category}"]`);
    const layer = ensureFxLayer();
    if (!cellEl || !layer) return;
    const cellRect = cellEl.getBoundingClientRect();
    const tier = tierFor(score);

    if (reducedMotion()) {
        showScoreBanner(cellRect, score, tier, layer, /*delay*/ 0);
        return;
    }

    const diceEls = Array.from(
        document.querySelectorAll<HTMLElement>('#dice-container .die'),
    );
    // Snapshot every rect BEFORE appending clones so a layout reflow can't
    // shift later measurements.
    const dieRects = diceEls.map(el => el.getBoundingClientRect());

    const targetX = cellRect.left + cellRect.width / 2;
    const targetY = cellRect.top + cellRect.height / 2;

    diceEls.forEach((dieEl, i) => {
        const dieRect = dieRects[i];
        const clone = dieEl.cloneNode(true) as HTMLElement;
        clone.classList.remove('roll', 'held');
        clone.classList.add('die-flight');
        clone.style.position = 'fixed';
        clone.style.left = `${dieRect.left}px`;
        clone.style.top = `${dieRect.top}px`;
        clone.style.width = `${dieRect.width}px`;
        clone.style.height = `${dieRect.height}px`;
        clone.style.margin = '0';
        clone.style.removeProperty('--roll-dur');
        const dieCenterX = dieRect.left + dieRect.width / 2;
        const dieCenterY = dieRect.top + dieRect.height / 2;
        clone.style.setProperty('--fly-tx', `${targetX - dieCenterX}px`);
        clone.style.setProperty('--fly-ty', `${targetY - dieCenterY}px`);
        clone.style.setProperty('--fly-rx', `${i % 2 ? 360 : -360}deg`);
        clone.style.setProperty('--fly-ry', `${i % 2 ? -540 : 540}deg`);
        clone.style.animationDelay = `${i * 50}ms`;
        layer.appendChild(clone);
        fade(clone, 750 + i * 50);
    });

    // Banner + particles fire as the dice land (~700ms after the first
    // lift-off). Stagger-aware: the last die touches at ~700 + 4*50 = 900.
    showScoreBanner(cellRect, score, tier, layer, 700);
    spawnScoreParticles(cellRect, tier, layer, 720);
}

export function showScoreZeroChip(category: Categories): void {
    if (typeof document === 'undefined') return;
    const cellEl = document.querySelector<HTMLElement>(`[data-category="${category}"]`);
    const layer = ensureFxLayer();
    if (!cellEl || !layer) return;
    const rect = cellEl.getBoundingClientRect();
    const chip = document.createElement('div');
    chip.className = 'cell-fx-score-zero';
    chip.textContent = '—';
    chip.style.left = `${rect.left + rect.width / 2}px`;
    chip.style.top = `${rect.top + rect.height / 2}px`;
    layer.appendChild(chip);
    fade(chip, 900);
}

function showScoreBanner(
    cellRect: DOMRect,
    score: number,
    tier: ScoreTier,
    layer: HTMLElement,
    delayMs: number,
): void {
    const banner = document.createElement('div');
    banner.className = `cell-fx-score-banner tier-${tier}`;
    banner.textContent = `+${score}`;
    banner.style.left = `${cellRect.left + cellRect.width / 2}px`;
    banner.style.top = `${cellRect.top}px`;
    banner.style.animationDelay = `${delayMs}ms`;
    layer.appendChild(banner);
    fade(banner, delayMs + 1100);
}

function spawnScoreParticles(
    cellRect: DOMRect,
    tier: ScoreTier,
    layer: HTMLElement,
    delayMs: number,
): void {
    if (reducedMotion()) return;
    const cx = cellRect.left + cellRect.width / 2;
    const cy = cellRect.top + cellRect.height / 2;
    const count = tier === 'high' ? 18 : 12;
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = `cell-fx-score-particle tier-${tier}`;
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
        const distance = 60 + Math.random() * (tier === 'high' ? 70 : 40);
        p.style.left = `${cx}px`;
        p.style.top = `${cy}px`;
        p.style.backgroundColor =
            PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
        p.style.setProperty('--fx-tx', `${Math.cos(angle) * distance}px`);
        p.style.setProperty('--fx-ty', `${Math.sin(angle) * distance}px`);
        p.style.animationDelay = `${delayMs}ms`;
        layer.appendChild(p);
        fade(p, delayMs + 800);
    }
}

// ---- Internals ----

function positionOver(rect: DOMRect): Partial<CSSStyleDeclaration> {
    return {
        left:   `${rect.left}px`,
        top:    `${rect.top}px`,
        width:  `${rect.width}px`,
        height: `${rect.height}px`,
    };
}
