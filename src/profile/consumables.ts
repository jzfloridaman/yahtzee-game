import { GameVariant } from '../enums/GameVariant';
import type { PlayerProfile } from './types';

export type ConsumableId =
    | 'extraRoll'
    | 'freshReroll'
    | 'revealBestCell'
    | 'reCycleLooping'
    | 'convertToYahtzee';

// Predicate input shape — what the UI knows about the current game when
// deciding whether to show a consumable button.
export interface ConsumableAvailableArgs {
    rollsLeft: number;
    newRoll: boolean;
    variant: GameVariant;
    hasLooping: boolean;
    hasUnscoredCells: boolean;
    yahtzeeUnscored: boolean;
    isPlayerTurn: boolean;
    isOnlineMultiplayer: boolean;
}

export interface ConsumableDef {
    id: ConsumableId;
    name: string;
    description: string;
    icon: string;
    cost: number;
    maxStack: number;
    available(args: ConsumableAvailableArgs): boolean;
}

export const CONSUMABLES: ConsumableDef[] = [
    {
        id: 'extraRoll',
        name: 'Extra Roll',
        description: 'Grants you one more roll attempt this turn (after you\'ve used all 3).',
        icon: 'fa-dice',
        cost: 30,
        maxStack: 99,
        available: ({ rollsLeft, newRoll, isPlayerTurn, isOnlineMultiplayer }) =>
            isPlayerTurn && !isOnlineMultiplayer && !newRoll && rollsLeft === 0,
    },
    {
        id: 'freshReroll',
        name: 'Fresh Re-Roll',
        description: 'Un-holds every die and grants one new roll.',
        icon: 'fa-arrows-rotate',
        cost: 50,
        maxStack: 99,
        available: ({ rollsLeft, newRoll, isPlayerTurn, isOnlineMultiplayer }) =>
            isPlayerTurn && !isOnlineMultiplayer && !newRoll && rollsLeft <= 1,
    },
    {
        id: 'revealBestCell',
        name: 'Score Sense',
        description: 'Highlights the unscored cell where these dice score the most for 3 seconds.',
        icon: 'fa-magnifying-glass-chart',
        cost: 25,
        maxStack: 99,
        available: ({ newRoll, hasUnscoredCells, isPlayerTurn, isOnlineMultiplayer }) =>
            isPlayerTurn && !isOnlineMultiplayer && !newRoll && hasUnscoredCells,
    },
    {
        id: 'reCycleLooping',
        name: 'Re-Cycle',
        description: 'Advances a Looping Category slot by +1 immediately. Tap the target slot after using.',
        icon: 'fa-rotate-right',
        cost: 40,
        maxStack: 99,
        available: ({ variant, hasLooping, isPlayerTurn, isOnlineMultiplayer }) =>
            isPlayerTurn && !isOnlineMultiplayer && variant === GameVariant.Puzzle && hasLooping,
    },
    {
        id: 'convertToYahtzee',
        name: 'Lucky Charm',
        description: 'Your next Yahtzee selection is treated as a Yahtzee (50 + bonus rules).',
        icon: 'fa-clover',
        cost: 100,
        maxStack: 5,
        available: ({ yahtzeeUnscored, isPlayerTurn, isOnlineMultiplayer, newRoll }) =>
            isPlayerTurn && !isOnlineMultiplayer && !newRoll && yahtzeeUnscored,
    },
];

export function getConsumable(id: ConsumableId): ConsumableDef | undefined {
    return CONSUMABLES.find(c => c.id === id);
}

// ---- Pure ops over a PlayerProfile ----

export function canAfford(profile: PlayerProfile, cost: number): boolean {
    return profile.coins >= cost;
}

export function inventoryCount(profile: PlayerProfile, id: ConsumableId): number {
    return profile.inventory[id] ?? 0;
}

export interface BuyResult {
    ok: boolean;
    profile: PlayerProfile;
    reason?: 'unknown' | 'insufficient' | 'maxStack';
}

export function buyConsumable(profile: PlayerProfile, id: ConsumableId): BuyResult {
    const def = getConsumable(id);
    if (!def) return { ok: false, profile, reason: 'unknown' };
    if (!canAfford(profile, def.cost)) return { ok: false, profile, reason: 'insufficient' };
    const current = inventoryCount(profile, id);
    if (current >= def.maxStack) return { ok: false, profile, reason: 'maxStack' };
    return {
        ok: true,
        profile: {
            ...profile,
            coins: profile.coins - def.cost,
            inventory: { ...profile.inventory, [id]: current + 1 },
        },
    };
}

export interface ConsumeResult {
    ok: boolean;
    profile: PlayerProfile;
}

export function consumeConsumable(profile: PlayerProfile, id: ConsumableId): ConsumeResult {
    const current = inventoryCount(profile, id);
    if (current <= 0) return { ok: false, profile };
    return {
        ok: true,
        profile: {
            ...profile,
            inventory: { ...profile.inventory, [id]: current - 1 },
        },
    };
}

export interface ShopListing {
    def: ConsumableDef;
    owned: number;
    affordable: boolean;
    atMax: boolean;
}

export function shopListing(profile: PlayerProfile): ShopListing[] {
    return CONSUMABLES.map(def => ({
        def,
        owned: inventoryCount(profile, def.id),
        affordable: canAfford(profile, def.cost),
        atMax: inventoryCount(profile, def.id) >= def.maxStack,
    }));
}
