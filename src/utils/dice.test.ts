import { describe, it, expect, vi } from 'vitest';
import {
  parseDiceExpression,
  roll,
  rollD20,
  rollAttack,
  rollSave,
  formatRollResult,
  rollDice
} from './dice';

describe('dice utilities', () => {
  describe('parseDiceExpression', () => {
    it('parses valid dice expressions', () => {
      expect(parseDiceExpression('1d20')).toEqual({ count: 1, sides: 20 });
      expect(parseDiceExpression('2d6')).toEqual({ count: 2, sides: 6 });
      expect(parseDiceExpression('4d8')).toEqual({ count: 4, sides: 8 });
      expect(parseDiceExpression('10d10')).toEqual({ count: 10, sides: 10 });
    });

    it('handles case insensitivity', () => {
      expect(parseDiceExpression('1D20')).toEqual({ count: 1, sides: 20 });
      expect(parseDiceExpression('2D6')).toEqual({ count: 2, sides: 6 });
    });

    it('returns null for invalid expressions', () => {
      expect(parseDiceExpression('')).toBeNull();
      expect(parseDiceExpression('d20')).toBeNull();
      expect(parseDiceExpression('1d')).toBeNull();
      expect(parseDiceExpression('abc')).toBeNull();
      expect(parseDiceExpression('1d20+5')).toBeNull(); // modifier not part of dice
    });

    it('trims whitespace', () => {
      expect(parseDiceExpression('  1d20  ')).toEqual({ count: 1, sides: 20 });
    });
  });

  describe('rollDice', () => {
    it('returns correct number of dice', () => {
      const results = rollDice(3, 6);
      expect(results).toHaveLength(3);
    });

    it('returns values within valid range', () => {
      for (let i = 0; i < 100; i++) {
        const results = rollDice(1, 20);
        expect(results[0].result).toBeGreaterThanOrEqual(1);
        expect(results[0].result).toBeLessThanOrEqual(20);
      }
    });

    it('handles reroll mechanics (GWF)', () => {
      // Roll many times to verify reroll behavior
      let rerollCount = 0;
      for (let i = 0; i < 100; i++) {
        const results = rollDice(1, 6, [1, 2]);
        if (results[0].wasRerolled) {
          rerollCount++;
          expect(results[0].originalRoll).toBeDefined();
          expect([1, 2]).toContain(results[0].originalRoll);
        }
      }
      // With 1/3 chance to reroll, we should see some rerolls
      expect(rerollCount).toBeGreaterThan(0);
    });
  });

  describe('roll', () => {
    it('rolls dice and adds bonus', () => {
      const result = roll('1d20', 5);
      expect(result.total).toBe(result.dice[0].result + 5);
      expect(result.bonus).toBe(5);
      expect(result.expression).toBe('1d20');
    });

    it('handles zero bonus', () => {
      const result = roll('2d6', 0);
      const diceSum = result.dice.reduce((sum, d) => sum + d.result, 0);
      expect(result.total).toBe(diceSum);
    });

    it('handles negative bonus', () => {
      const result = roll('1d20', -2);
      expect(result.total).toBe(result.dice[0].result - 2);
    });

    it('returns empty dice for invalid expression', () => {
      const result = roll('invalid', 5);
      expect(result.dice).toHaveLength(0);
      expect(result.total).toBe(5); // just the bonus
    });
  });

  describe('rollD20', () => {
    it('returns single roll for normal', () => {
      const result = rollD20('normal');
      expect(result.rolls).toHaveLength(1);
      expect(result.result).toBe(result.rolls[0]);
    });

    it('returns two rolls for advantage, takes higher', () => {
      for (let i = 0; i < 50; i++) {
        const result = rollD20('advantage');
        expect(result.rolls).toHaveLength(2);
        expect(result.result).toBe(Math.max(...result.rolls));
      }
    });

    it('returns two rolls for disadvantage, takes lower', () => {
      for (let i = 0; i < 50; i++) {
        const result = rollD20('disadvantage');
        expect(result.rolls).toHaveLength(2);
        expect(result.result).toBe(Math.min(...result.rolls));
      }
    });
  });

  describe('rollAttack', () => {
    it('calculates to-hit correctly', () => {
      const result = rollAttack(
        7, // +7 to hit
        { dice: '1d8', bonus: 5, type: 'slashing' },
        'double_dice'
      );

      expect(result.toHitRoll.bonus).toBe(7);
      expect(result.toHitRoll.total).toBe(result.natural + 7);
    });

    it('detects critical hits (nat 20)', () => {
      // Mock Math.random to force a nat 20
      const mockRandom = vi.spyOn(Math, 'random');
      mockRandom.mockReturnValue(0.999); // Will give 20 on d20

      const result = rollAttack(
        5,
        { dice: '1d8', bonus: 3, type: 'slashing' },
        'double_dice'
      );

      expect(result.natural).toBe(20);
      expect(result.isCrit).toBe(true);
      expect(result.isFumble).toBe(false);

      mockRandom.mockRestore();
    });

    it('detects fumbles (nat 1)', () => {
      const mockRandom = vi.spyOn(Math, 'random');
      mockRandom.mockReturnValue(0); // Will give 1 on d20

      const result = rollAttack(
        5,
        { dice: '1d8', bonus: 3, type: 'slashing' },
        'double_dice'
      );

      expect(result.natural).toBe(1);
      expect(result.isFumble).toBe(true);
      expect(result.isCrit).toBe(false);

      mockRandom.mockRestore();
    });

    it('doubles dice on crit with double_dice behavior', () => {
      const mockRandom = vi.spyOn(Math, 'random');
      mockRandom.mockReturnValue(0.999); // nat 20

      const result = rollAttack(
        5,
        { dice: '2d6', bonus: 4, type: 'slashing' },
        'double_dice'
      );

      // Should have 4d6 on crit (doubled from 2d6)
      expect(result.damageRoll?.dice).toHaveLength(4);

      mockRandom.mockRestore();
    });

    it('includes damage type', () => {
      const result = rollAttack(
        5,
        { dice: '1d8', bonus: 3, type: 'fire' },
        'double_dice'
      );

      expect(result.damageType).toBe('fire');
    });
  });

  describe('rollSave', () => {
    it('determines success based on DC', () => {
      const mockRandom = vi.spyOn(Math, 'random');

      // Roll high - should succeed vs DC 15
      mockRandom.mockReturnValue(0.8); // ~17 on d20
      let result = rollSave(15, 0);
      expect(result.success).toBe(true);

      // Roll low - should fail vs DC 15
      mockRandom.mockReturnValue(0.2); // ~5 on d20
      result = rollSave(15, 0);
      expect(result.success).toBe(false);

      mockRandom.mockRestore();
    });

    it('applies save bonus', () => {
      const mockRandom = vi.spyOn(Math, 'random');
      mockRandom.mockReturnValue(0.5); // ~11 on d20

      // With +5 bonus, 11+5=16 should beat DC 15
      const result = rollSave(15, 5);
      expect(result.roll.total).toBe(result.natural + 5);
      expect(result.success).toBe(true);

      mockRandom.mockRestore();
    });

    it('calculates half damage on successful save', () => {
      const mockRandom = vi.spyOn(Math, 'random');
      mockRandom.mockReturnValue(0.999); // High roll - success

      const result = rollSave(
        10,
        5,
        { dice: '8d6', bonus: 0, type: 'fire' },
        true // halfOnSave
      );

      expect(result.success).toBe(true);
      expect(result.damage).toBeDefined();
      // Damage should be halved
      const fullDamage = result.damage!.dice.reduce((sum, d) => sum + d.result, 0);
      expect(result.damage!.total).toBe(Math.floor(fullDamage / 2));

      mockRandom.mockRestore();
    });

    it('applies full damage on failed save', () => {
      const mockRandom = vi.spyOn(Math, 'random');
      mockRandom.mockReturnValue(0); // Low roll - fail

      const result = rollSave(
        15,
        0,
        { dice: '8d6', bonus: 0, type: 'fire' },
        true
      );

      expect(result.success).toBe(false);
      expect(result.damage).toBeDefined();
      const fullDamage = result.damage!.dice.reduce((sum, d) => sum + d.result, 0);
      expect(result.damage!.total).toBe(fullDamage);

      mockRandom.mockRestore();
    });
  });

  describe('formatRollResult', () => {
    it('formats simple roll', () => {
      const result = {
        dice: [{ sides: 20, result: 15, wasRerolled: false }],
        bonus: 0,
        total: 15,
        expression: '1d20'
      };
      expect(formatRollResult(result)).toBe('15 (15)');
    });

    it('formats roll with bonus', () => {
      const result = {
        dice: [{ sides: 20, result: 15, wasRerolled: false }],
        bonus: 5,
        total: 20,
        expression: '1d20'
      };
      expect(formatRollResult(result)).toBe('20 (15+5)');
    });

    it('formats roll with negative bonus', () => {
      const result = {
        dice: [{ sides: 20, result: 15, wasRerolled: false }],
        bonus: -2,
        total: 13,
        expression: '1d20'
      };
      expect(formatRollResult(result)).toBe('13 (15-2)');
    });

    it('formats multiple dice', () => {
      const result = {
        dice: [
          { sides: 6, result: 4, wasRerolled: false },
          { sides: 6, result: 3, wasRerolled: false }
        ],
        bonus: 5,
        total: 12,
        expression: '2d6'
      };
      expect(formatRollResult(result)).toBe('12 (4+3+5)');
    });

    it('shows rerolled dice', () => {
      const result = {
        dice: [{ sides: 6, result: 5, wasRerolled: true, originalRoll: 1 }],
        bonus: 3,
        total: 8,
        expression: '1d6'
      };
      expect(formatRollResult(result)).toBe('8 (5(1→)+3)');
    });
  });
});
