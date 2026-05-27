import { Categories } from '../enums/Categories';
import type { ScorecardTemplateEntry } from '../config/scorecardTemplates';
import type {
    EngineEvent,
    EngineEventListener,
    ModifierKind,
    PuzzleConfig,
    PuzzleEngineCtx,
    PuzzleModifier,
    PuzzleResult,
} from './types';

// Minimal read shape the engine needs from the active player's scorecard.
// Pass `() => player.getScorecard()` from the game layer.
export type ScorecardReader = () => Partial<Record<Categories, { selected: boolean; value: number | null }>>;

// Force-write a score into the scorecard (selected = true). Used by Hot
// Potato when the fuse expires. Optional — engine ignores forceScore calls
// if not provided.
export type ScoreWriter = (category: Categories, value: number) => void;

export class PuzzleEngine {
    private modifiers: PuzzleModifier[] = [];
    private template: ScorecardTemplateEntry[] = [];
    private readScorecard: ScorecardReader;
    private writeScore: ScoreWriter | null;
    private targetScore: number = 0;
    private requiredEngagementCount: number = 0;
    private presentKinds: ModifierKind[] = [];
    private engagedKinds: Set<ModifierKind> = new Set();
    private pendingBonusCategory: Categories | null = null;
    private readonly ctx: PuzzleEngineCtx;
    private listeners: Set<EngineEventListener> = new Set();
    // Track which goals have already fired `engine:goalMet` so the chime
    // only plays on the transition turn, not every subsequent score.
    private goalMetEmitted = { score: false, engagement: false };

    constructor(readScorecard: ScorecardReader, writeScore: ScoreWriter | null = null) {
        this.readScorecard = readScorecard;
        this.writeScore = writeScore;
        // Build ctx once, but resolve template/modifier state lazily on
        // each access so it survives reassignment in initFromConfig.
        this.ctx = this.buildCtx();
    }

    initFromConfig(config: PuzzleConfig, template: ScorecardTemplateEntry[]): void {
        this.template = template;
        this.targetScore = config.targetScore;
        this.requiredEngagementCount = config.requiredEngagementCount;
        this.modifiers = config.build(template);
        // Snapshot the modifier kinds present at game start — once they're
        // consumed (ice melted, double exhausted) the modifier list won't
        // reflect what the puzzle originally contained.
        this.presentKinds = [...new Set(this.modifiers.map(m => m.kind))];
        this.engagedKinds = new Set();
        this.pendingBonusCategory = null;
        this.goalMetEmitted = { score: false, engagement: false };
        // Subscribers persist across initFromConfig (a restart): the UI
        // re-subscribes in onMounted only.
    }

    // Subscribe to engine lifecycle events. Returns an unsubscriber.
    on(listener: EngineEventListener): () => void {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }

    emit(event: EngineEvent): void {
        // Snapshot to tolerate listeners that unsubscribe from inside their
        // own handler.
        for (const l of [...this.listeners]) l(event);
    }

    // Called by the store after each score is applied + afterScore done.
    // Emits engine:goalMet at most once per goal kind, the turn it crosses.
    checkGoalMet(totalScore: number): void {
        const required = this.getRequiredEngagementCount();
        if (!this.goalMetEmitted.score && totalScore >= this.targetScore && this.targetScore > 0) {
            this.goalMetEmitted.score = true;
            this.emit({ type: 'engine:goalMet', kind: 'score' });
        }
        if (!this.goalMetEmitted.engagement && required > 0 && this.engagedKinds.size >= required) {
            this.goalMetEmitted.engagement = true;
            this.emit({ type: 'engine:goalMet', kind: 'engagement' });
        }
    }

    getPresentKinds(): ModifierKind[] {
        return this.presentKinds;
    }

    getEngagedKinds(): ModifierKind[] {
        return [...this.engagedKinds];
    }

    isKindEngaged(kind: ModifierKind): boolean {
        return this.engagedKinds.has(kind);
    }

    getTargetScore(): number {
        return this.targetScore;
    }

    getRequiredEngagementCount(): number {
        // Clamp to how many kinds the variant actually contains — a
        // requirement of 3 on a puzzle that only has 2 kinds is impossible.
        return Math.min(this.requiredEngagementCount, this.presentKinds.length);
    }

    getModifiers(): PuzzleModifier[] {
        return this.modifiers;
    }

    getModifierAt(category: Categories): PuzzleModifier | undefined {
        return this.modifiers.find(m => m.category === category);
    }

    getModifiersOfKind(kind: ModifierKind): PuzzleModifier[] {
        return this.modifiers.filter(m => m.kind === kind);
    }

    canScore(category: Categories): boolean {
        return this.modifiers.every(m => (m.canScore ? m.canScore(category) : true));
    }

    // Apply modifier score transforms to a raw score (e.g., Flying Multiplier
    // doubles when on-target). Called once per scoring attempt. Passes ctx
    // so modifiers can emit "applied" events with the raw/final breakdown
    // for cell-anchored score animations.
    applyScore(category: Categories, rawScore: number): number {
        return this.modifiers.reduce(
            (score, m) => (m.transformScore ? m.transformScore(category, score, this.ctx) : score),
            rawScore
        );
    }

    afterScore(category: Categories, finalScore: number): void {
        // Snapshot the list so a modifier removing itself mid-iteration
        // doesn't skip subsequent ones.
        const snapshot = [...this.modifiers];
        for (const m of snapshot) {
            m.onAfterScore?.(category, finalScore, this.ctx);
        }
    }

    onTurnEnd(): void {
        const snapshot = [...this.modifiers];
        for (const m of snapshot) {
            m.onTurnEnd?.(this.ctx);
        }
    }

    // Returns the category whose next score should be summed onto the
    // existing slot value (Double Category bonus turn), and clears the
    // pending state. Returns null if no bonus is queued.
    consumePendingBonusCategory(): Categories | null {
        const pending = this.pendingBonusCategory;
        this.pendingBonusCategory = null;
        return pending;
    }

    // Non-consuming peek: which category (if any) currently has a queued
    // bonus turn. Used by selectCategory/UI to restrict input.
    getPendingBonusCategory(): Categories | null {
        return this.pendingBonusCategory;
    }

    hasPendingBonusFor(category: Categories): boolean {
        return this.pendingBonusCategory === category;
    }

    getResult(totalScore: number): PuzzleResult {
        const scoreMet = totalScore >= this.targetScore;
        const required = this.getRequiredEngagementCount();
        const engagementMet = this.engagedKinds.size >= required;
        return {
            status: scoreMet && engagementMet ? 'win' : 'lose',
            totalScore,
            targetScore: this.targetScore,
            scoreMet,
            requiredEngagementCount: required,
            presentKinds: this.presentKinds,
            engagedKinds: [...this.engagedKinds],
            engagementMet,
        };
    }

    private buildCtx(): PuzzleEngineCtx {
        const engine = this;
        return {
            get template() {
                return engine.template;
            },
            scoredCategories: () => {
                const scorecard = engine.readScorecard();
                const scored = new Set<Categories>();
                for (const [cat, entry] of Object.entries(scorecard)) {
                    if (entry?.selected) scored.add(cat as Categories);
                }
                return scored;
            },
            removeModifier: (modifier) => {
                // Match by (kind, category) rather than reference: when the
                // engine lives inside Pinia state, `modifier` is a reactive
                // Proxy while engine.modifiers holds the raw objects, so a
                // `===` check would never match. V1 places at most one
                // modifier per (kind, category) pair, so this is unambiguous.
                engine.modifiers = engine.modifiers.filter(
                    m => !(m.kind === modifier.kind && m.category === modifier.category)
                );
            },
            relocateModifier: (modifier, newCategory) => {
                const scored = engine.ctx.scoredCategories();
                if (scored.has(newCategory)) return;
                const sameSlot = (m: PuzzleModifier) =>
                    m.kind === modifier.kind && m.category === modifier.category;
                const conflict = engine.modifiers.some(
                    m => !sameSlot(m) && m.kind === modifier.kind && m.category === newCategory
                );
                if (conflict) return;
                // Mutate via the raw instance so the lookup we just did still
                // identifies the same modifier on the next call.
                const target = engine.modifiers.find(sameSlot);
                if (target) target.category = newCategory;
            },
            pickRandomUnscored: (kind, exclude) => {
                const scored = engine.ctx.scoredCategories();
                const taken = new Set(
                    engine.modifiers.filter(m => m.kind === kind).map(m => m.category)
                );
                const candidates = engine.template
                    .map(entry => entry.category)
                    .filter(cat => !scored.has(cat) && !taken.has(cat) && cat !== exclude);
                if (candidates.length === 0) return null;
                return candidates[Math.floor(Math.random() * candidates.length)];
            },
            requestBonusTurn: (category) => {
                engine.pendingBonusCategory = category;
                engine.emit({ type: 'engine:bonusTurn', category });
            },
            markEngaged: (kind) => {
                engine.engagedKinds.add(kind);
            },
            forceScore: (category, value) => {
                engine.writeScore?.(category, value);
            },
            addModifiers: (mods) => {
                if (mods.length === 0) return;
                engine.modifiers = [...engine.modifiers, ...mods];
                // Keep presentKinds in sync — Multiplier Bubbles scatters
                // flying chips at runtime, which should still count toward
                // the engagement progress display.
                for (const m of mods) {
                    if (!engine.presentKinds.includes(m.kind)) {
                        engine.presentKinds = [...engine.presentKinds, m.kind];
                    }
                }
            },
            emit: (event) => {
                engine.emit(event);
            },
        };
    }
}
