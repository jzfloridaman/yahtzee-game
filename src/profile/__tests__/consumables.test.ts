import {
    CONSUMABLES,
    buyConsumable,
    canAfford,
    consumeConsumable,
    getConsumable,
    inventoryCount,
    shopListing,
} from '../consumables';
import { emptyProfile } from '../rewards';
import { GameVariant } from '../../enums/GameVariant';

const NOW = new Date('2026-05-28T12:00:00Z');

describe('consumable definitions', () => {
    test('5 consumables ship in the starter set', () => {
        expect(CONSUMABLES).toHaveLength(5);
    });

    test('every consumable has a unique id, name, icon, and cost', () => {
        const ids = new Set<string>();
        for (const c of CONSUMABLES) {
            expect(c.id).toBeTruthy();
            expect(c.name).toBeTruthy();
            expect(c.icon).toBeTruthy();
            expect(c.cost).toBeGreaterThan(0);
            expect(ids.has(c.id)).toBe(false);
            ids.add(c.id);
        }
    });
});

describe('buyConsumable', () => {
    test('insufficient coins → ok=false, profile unchanged', () => {
        const p = emptyProfile(NOW);
        const result = buyConsumable(p, 'extraRoll');
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('insufficient');
        expect(result.profile).toBe(p);
    });

    test('successful buy debits coins and adds to inventory', () => {
        const p = { ...emptyProfile(NOW), coins: 100 };
        const result = buyConsumable(p, 'extraRoll');
        expect(result.ok).toBe(true);
        expect(result.profile.coins).toBe(70);
        expect(result.profile.inventory.extraRoll).toBe(1);
    });

    test('respects maxStack', () => {
        const p = {
            ...emptyProfile(NOW),
            coins: 1000,
            inventory: { convertToYahtzee: 5 },  // maxStack for convertToYahtzee = 5
        };
        const result = buyConsumable(p, 'convertToYahtzee');
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('maxStack');
    });

    test('unknown id → ok=false', () => {
        const result = buyConsumable(emptyProfile(NOW), 'nope' as any);
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('unknown');
    });
});

describe('consumeConsumable', () => {
    test('empty inventory → ok=false', () => {
        const p = emptyProfile(NOW);
        const result = consumeConsumable(p, 'extraRoll');
        expect(result.ok).toBe(false);
        expect(result.profile).toBe(p);
    });

    test('decrements count on success', () => {
        const p = { ...emptyProfile(NOW), inventory: { extraRoll: 2 } };
        const result = consumeConsumable(p, 'extraRoll');
        expect(result.ok).toBe(true);
        expect(result.profile.inventory.extraRoll).toBe(1);
    });
});

describe('round-trip', () => {
    test('addCoins(100) → buy(30) → 70 left + 1 owned', () => {
        const p = { ...emptyProfile(NOW), coins: 100 };
        const after = buyConsumable(p, 'extraRoll').profile;
        expect(after.coins).toBe(70);
        expect(inventoryCount(after, 'extraRoll')).toBe(1);
        const used = consumeConsumable(after, 'extraRoll').profile;
        expect(inventoryCount(used, 'extraRoll')).toBe(0);
    });
});

describe('availability predicates', () => {
    const base = {
        rollsLeft: 2,
        newRoll: false,
        variant: GameVariant.Puzzle,
        hasLooping: true,
        hasUnscoredCells: true,
        yahtzeeUnscored: true,
        isPlayerTurn: true,
        isOnlineMultiplayer: false,
    };
    test('online MP disables all consumables', () => {
        const args = { ...base, isOnlineMultiplayer: true };
        for (const c of CONSUMABLES) {
            expect(c.available(args)).toBe(false);
        }
    });
    test('extraRoll only after rolls exhausted', () => {
        const def = getConsumable('extraRoll')!;
        expect(def.available({ ...base, rollsLeft: 2 })).toBe(false);
        expect(def.available({ ...base, rollsLeft: 0 })).toBe(true);
    });
    test('reCycleLooping requires Puzzle variant + has looping', () => {
        const def = getConsumable('reCycleLooping')!;
        expect(def.available({ ...base, variant: GameVariant.Rainbow })).toBe(false);
        expect(def.available({ ...base, hasLooping: false })).toBe(false);
        expect(def.available(base)).toBe(true);
    });
});

describe('shopListing', () => {
    test('returns one entry per consumable with owned/affordable flags', () => {
        const p = { ...emptyProfile(NOW), coins: 30, inventory: { extraRoll: 2 } };
        const listings = shopListing(p);
        expect(listings).toHaveLength(CONSUMABLES.length);
        const extra = listings.find(l => l.def.id === 'extraRoll')!;
        expect(extra.owned).toBe(2);
        expect(extra.affordable).toBe(true);
        const lucky = listings.find(l => l.def.id === 'convertToYahtzee')!;
        expect(lucky.affordable).toBe(false);
    });
});

test('canAfford trivial', () => {
    expect(canAfford({ ...emptyProfile(NOW), coins: 30 }, 30)).toBe(true);
    expect(canAfford({ ...emptyProfile(NOW), coins: 29 }, 30)).toBe(false);
});
