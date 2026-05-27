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

// ---- Internals ----

function positionOver(rect: DOMRect): Partial<CSSStyleDeclaration> {
    return {
        left:   `${rect.left}px`,
        top:    `${rect.top}px`,
        width:  `${rect.width}px`,
        height: `${rect.height}px`,
    };
}
