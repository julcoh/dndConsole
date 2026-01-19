// === RESOURCES ===

export type ResourceCategory =
  | 'spell_slot'
  | 'pact_slot'
  | 'hit_dice'
  | 'class_feature'
  | 'item_charge'
  | 'custom';

export type RechargeOn = 'short_rest' | 'long_rest' | 'daily' | 'manual';

export type RechargeAmount = 'full' | 'half' | number;

export interface ResourceDefinition {
  id: string;
  name: string;                    // "1st Level Slots", "Ki Points"
  category: ResourceCategory;
  maximum: number;
  slotLevel?: number;              // For spell slots (1-9)
  dieType?: number;                // For hit dice (6, 8, 10, 12)
  rechargeOn: RechargeOn;
  rechargeAmount: RechargeAmount;
}

// === Helpers ===

export function calculateRechargeAmount(
  definition: ResourceDefinition,
  currentValue: number
): number {
  const { maximum, rechargeAmount } = definition;

  if (rechargeAmount === 'full') {
    return maximum;
  }

  if (rechargeAmount === 'half') {
    // Half rounded up, but at least 1
    const halfMax = Math.max(1, Math.ceil(maximum / 2));
    return Math.min(maximum, currentValue + halfMax);
  }

  if (typeof rechargeAmount === 'number') {
    return Math.min(maximum, currentValue + rechargeAmount);
  }

  return currentValue;
}

export function getResourcesForRest(
  definitions: ResourceDefinition[],
  restType: 'short' | 'long'
): ResourceDefinition[] {
  return definitions.filter(def => {
    if (restType === 'short') {
      return def.rechargeOn === 'short_rest';
    }
    // Long rest restores both short_rest and long_rest resources
    return def.rechargeOn === 'short_rest' ||
           def.rechargeOn === 'long_rest' ||
           def.rechargeOn === 'daily';
  });
}

// === Spell Slot Presets ===

export interface SpellSlotPreset {
  name: string;
  slots: Record<number, number>; // slot level -> count
  pactSlots?: { level: number; count: number };
}

export const CASTER_PRESETS: Record<string, SpellSlotPreset> = {
  full: {
    name: 'Full Caster',
    slots: {
      1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1
    }
  },
  half: {
    name: 'Half Caster',
    slots: {
      1: 4, 2: 3, 3: 3, 4: 3, 5: 2
    }
  },
  third: {
    name: 'Third Caster',
    slots: {
      1: 4, 2: 3, 3: 3, 4: 1
    }
  },
  warlock: {
    name: 'Warlock',
    slots: {},
    pactSlots: { level: 5, count: 4 }
  },
  artificer: {
    name: 'Artificer',
    slots: {
      1: 4, 2: 3, 3: 3, 4: 3, 5: 2
    }
  }
};

export function createSpellSlotResources(
  preset: SpellSlotPreset,
  _characterLevel: number
): ResourceDefinition[] {
  const resources: ResourceDefinition[] = [];

  // Standard spell slots
  for (const [levelStr, maxSlots] of Object.entries(preset.slots)) {
    const level = parseInt(levelStr, 10);
    resources.push({
      id: `spell_slot_${level}`,
      name: `${getOrdinal(level)} Level`,
      category: 'spell_slot',
      maximum: maxSlots,
      slotLevel: level,
      rechargeOn: 'long_rest',
      rechargeAmount: 'full'
    });
  }

  // Pact slots (recharge on short rest)
  if (preset.pactSlots) {
    resources.push({
      id: 'pact_slot',
      name: `Pact Slot (${getOrdinal(preset.pactSlots.level)})`,
      category: 'pact_slot',
      maximum: preset.pactSlots.count,
      slotLevel: preset.pactSlots.level,
      rechargeOn: 'short_rest',
      rechargeAmount: 'full'
    });
  }

  return resources;
}

function getOrdinal(n: number): string {
  const ordinals = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
  return ordinals[n] || `${n}th`;
}
