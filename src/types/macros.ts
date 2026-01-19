import type { Ability, Skill } from './character';

// === DAMAGE ROLL ===

export interface DamageRoll {
  dice: string;        // "2d6", "1d8"
  bonus: number;       // flat bonus to add
  type: string;        // "slashing", "fire", "radiant"
  rerollOn?: number[]; // GWF: reroll 1s and 2s
}

// === CRIT BEHAVIOR ===

export type CritBehavior = 'double_dice' | 'max_plus_roll';

// === TYPED MACROS ===

export interface AttackMacro {
  id: string;
  name: string;               // "Longsword"
  toHit: number;              // +7
  damage: DamageRoll;         // { dice: "1d8", bonus: 5, type: "slashing" }
  versatileDamage?: DamageRoll; // Two-handed option
  range?: string;             // "5 ft" or "120 ft"
  tags: string[];             // ["melee", "finesse"]
  critBehavior: CritBehavior;
  notes?: string;             // Additional info shown on macro card
}

export interface SaveMacro {
  id: string;
  name: string;               // "Fireball"
  saveDC: number;
  saveAbility: Ability;
  damage?: DamageRoll;
  halfOnSave: boolean;
  notes?: string;
}

export interface CheckMacro {
  id: string;
  name: string;               // "Stealth"
  ability: Ability;
  skill?: Skill;
  bonus: number;              // Total modifier
  notes?: string;
}

// === Helpers ===

export function parseDiceString(dice: string): { count: number; sides: number } | null {
  const match = dice.match(/^(\d+)d(\d+)$/i);
  if (!match) return null;
  return {
    count: parseInt(match[1], 10),
    sides: parseInt(match[2], 10)
  };
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function formatDamageRoll(roll: DamageRoll): string {
  const bonus = roll.bonus !== 0 ? formatModifier(roll.bonus) : '';
  return `${roll.dice}${bonus} ${roll.type}`;
}

export function formatAttackMacro(macro: AttackMacro): string {
  return `${formatModifier(macro.toHit)} to hit, ${formatDamageRoll(macro.damage)}`;
}

// === Default macro creation helpers ===

export function createAttackMacro(
  name: string,
  toHit: number,
  damageDice: string,
  damageBonus: number,
  damageType: string,
  options?: Partial<AttackMacro>
): AttackMacro {
  return {
    id: crypto.randomUUID(),
    name,
    toHit,
    damage: {
      dice: damageDice,
      bonus: damageBonus,
      type: damageType
    },
    tags: [],
    critBehavior: 'double_dice',
    ...options
  };
}

export function createSaveMacro(
  name: string,
  saveDC: number,
  saveAbility: Ability,
  options?: Partial<SaveMacro>
): SaveMacro {
  return {
    id: crypto.randomUUID(),
    name,
    saveDC,
    saveAbility,
    halfOnSave: true,
    ...options
  };
}

export function createCheckMacro(
  name: string,
  ability: Ability,
  bonus: number,
  skill?: Skill
): CheckMacro {
  return {
    id: crypto.randomUUID(),
    name,
    ability,
    skill,
    bonus
  };
}
