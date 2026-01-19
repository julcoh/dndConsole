import type { DamageRoll, CritBehavior } from '../types';

// === Roll Result Types ===

export interface DieResult {
  sides: number;
  result: number;
  wasRerolled: boolean;
  originalRoll?: number;
}

export interface RollResult {
  dice: DieResult[];
  bonus: number;
  total: number;
  expression: string;
}

export interface AttackRollResult {
  toHitRoll: RollResult;
  natural: number;
  isCrit: boolean;
  isFumble: boolean;
  damageRoll?: RollResult;
  damageType?: string;
}

// === Core Rolling Functions ===

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

export function rollDice(
  count: number,
  sides: number,
  rerollOn?: number[]
): DieResult[] {
  const results: DieResult[] = [];

  for (let i = 0; i < count; i++) {
    let roll = rollDie(sides);
    let wasRerolled = false;
    let originalRoll: number | undefined;

    // Great Weapon Fighting style: reroll 1s and 2s (once)
    if (rerollOn && rerollOn.includes(roll)) {
      originalRoll = roll;
      roll = rollDie(sides);
      wasRerolled = true;
    }

    results.push({
      sides,
      result: roll,
      wasRerolled,
      originalRoll
    });
  }

  return results;
}

export function parseDiceExpression(expression: string): { count: number; sides: number } | null {
  const match = expression.trim().match(/^(\d+)d(\d+)$/i);
  if (!match) return null;
  return {
    count: parseInt(match[1], 10),
    sides: parseInt(match[2], 10)
  };
}

export function roll(expression: string, bonus: number = 0, rerollOn?: number[]): RollResult {
  const parsed = parseDiceExpression(expression);
  if (!parsed) {
    // Invalid expression, return 0
    return {
      dice: [],
      bonus,
      total: bonus,
      expression
    };
  }

  const dice = rollDice(parsed.count, parsed.sides, rerollOn);
  const diceTotal = dice.reduce((sum, d) => sum + d.result, 0);

  return {
    dice,
    bonus,
    total: diceTotal + bonus,
    expression
  };
}

// === D20 Rolling ===

export type AdvantageState = 'normal' | 'advantage' | 'disadvantage';

export function rollD20(advantage: AdvantageState = 'normal'): { result: number; rolls: number[] } {
  if (advantage === 'normal') {
    const result = rollDie(20);
    return { result, rolls: [result] };
  }

  const roll1 = rollDie(20);
  const roll2 = rollDie(20);

  if (advantage === 'advantage') {
    return { result: Math.max(roll1, roll2), rolls: [roll1, roll2] };
  } else {
    return { result: Math.min(roll1, roll2), rolls: [roll1, roll2] };
  }
}

// === Attack Rolling ===

export function rollAttack(
  toHitBonus: number,
  damage: DamageRoll,
  critBehavior: CritBehavior = 'double_dice',
  advantage: AdvantageState = 'normal'
): AttackRollResult {
  // Roll to hit
  const d20 = rollD20(advantage);
  const natural = d20.result;
  const isCrit = natural === 20;
  const isFumble = natural === 1;

  const toHitRoll: RollResult = {
    dice: [{ sides: 20, result: natural, wasRerolled: false }],
    bonus: toHitBonus,
    total: natural + toHitBonus,
    expression: '1d20'
  };

  // Roll damage (even on miss, for convenience)
  const parsed = parseDiceExpression(damage.dice);
  if (!parsed) {
    return { toHitRoll, natural, isCrit, isFumble };
  }

  let damageCount = parsed.count;
  let damageBonus = damage.bonus;

  // Handle crits
  if (isCrit) {
    if (critBehavior === 'double_dice') {
      damageCount *= 2;
    } else if (critBehavior === 'max_plus_roll') {
      // Roll normal, then add max dice value
      const normalDamage = rollDice(parsed.count, parsed.sides, damage.rerollOn);
      const maxDamage = parsed.count * parsed.sides;
      const diceTotal = normalDamage.reduce((sum, d) => sum + d.result, 0);

      return {
        toHitRoll,
        natural,
        isCrit,
        isFumble,
        damageRoll: {
          dice: normalDamage,
          bonus: damageBonus + maxDamage,
          total: diceTotal + damageBonus + maxDamage,
          expression: `${damage.dice}+${maxDamage}(max)`
        },
        damageType: damage.type
      };
    }
  }

  const damageDice = rollDice(damageCount, parsed.sides, damage.rerollOn);
  const diceTotal = damageDice.reduce((sum, d) => sum + d.result, 0);

  return {
    toHitRoll,
    natural,
    isCrit,
    isFumble,
    damageRoll: {
      dice: damageDice,
      bonus: damageBonus,
      total: diceTotal + damageBonus,
      expression: isCrit ? `${damageCount}d${parsed.sides}` : damage.dice
    },
    damageType: damage.type
  };
}

// === Save Rolling ===

export interface SaveRollResult {
  roll: RollResult;
  natural: number;
  targetDC: number;
  success: boolean;
  damage?: RollResult;
  damageType?: string;
}

export function rollSave(
  saveDC: number,
  saveBonus: number,
  damage?: DamageRoll,
  halfOnSave: boolean = true,
  advantage: AdvantageState = 'normal'
): SaveRollResult {
  const d20 = rollD20(advantage);
  const natural = d20.result;
  const total = natural + saveBonus;
  const success = total >= saveDC;

  const rollResult: RollResult = {
    dice: [{ sides: 20, result: natural, wasRerolled: false }],
    bonus: saveBonus,
    total,
    expression: '1d20'
  };

  let damageRoll: RollResult | undefined;
  let damageType: string | undefined;

  if (damage) {
    const fullDamage = roll(damage.dice, damage.bonus, damage.rerollOn);

    if (success && halfOnSave) {
      damageRoll = {
        ...fullDamage,
        total: Math.floor(fullDamage.total / 2)
      };
    } else if (!success) {
      damageRoll = fullDamage;
    }
    // If success and !halfOnSave, no damage

    damageType = damage.type;
  }

  return {
    roll: rollResult,
    natural,
    targetDC: saveDC,
    success,
    damage: damageRoll,
    damageType
  };
}

// === Formatting ===

export function formatRollResult(result: RollResult): string {
  const diceStr = result.dice.map(d => {
    if (d.wasRerolled) {
      return `${d.result}(${d.originalRoll}→)`;
    }
    return String(d.result);
  }).join('+');

  if (result.bonus === 0) {
    return `${result.total} (${diceStr})`;
  }

  const bonusStr = result.bonus >= 0 ? `+${result.bonus}` : String(result.bonus);
  return `${result.total} (${diceStr}${bonusStr})`;
}

export function formatAttackResult(result: AttackRollResult): string {
  let output = `To Hit: ${formatRollResult(result.toHitRoll)}`;

  if (result.isCrit) {
    output += ' CRIT!';
  } else if (result.isFumble) {
    output += ' Fumble!';
  }

  if (result.damageRoll) {
    output += `\nDamage: ${formatRollResult(result.damageRoll)} ${result.damageType}`;
  }

  return output;
}
