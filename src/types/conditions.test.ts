import { describe, it, expect } from 'vitest';
import {
  createCondition,
  findConditionInfo,
  decrementConditionRounds,
  isConditionExpired,
  STANDARD_CONDITIONS
} from './conditions';

describe('conditions', () => {
  describe('STANDARD_CONDITIONS', () => {
    it('has all 15 standard 5E conditions', () => {
      expect(STANDARD_CONDITIONS).toHaveLength(15);
    });

    it('includes common conditions', () => {
      const names = STANDARD_CONDITIONS.map(c => c.name);
      expect(names).toContain('Blinded');
      expect(names).toContain('Charmed');
      expect(names).toContain('Frightened');
      expect(names).toContain('Poisoned');
      expect(names).toContain('Prone');
      expect(names).toContain('Stunned');
      expect(names).toContain('Unconscious');
      expect(names).toContain('Exhaustion');
    });

    it('has effects for each condition', () => {
      for (const condition of STANDARD_CONDITIONS) {
        expect(condition.effects.length).toBeGreaterThan(0);
        expect(condition.description).toBeDefined();
      }
    });
  });

  describe('createCondition', () => {
    it('creates condition with just name', () => {
      const condition = createCondition('Poisoned');

      expect(condition.name).toBe('Poisoned');
      expect(condition.id).toBeDefined();
      expect(condition.source).toBeUndefined();
      expect(condition.ends).toBeUndefined();
      expect(condition.roundsRemaining).toBeUndefined();
    });

    it('creates condition with all options', () => {
      const condition = createCondition('Frightened', {
        source: 'Dragon Fear',
        ends: 'End of next turn',
        roundsRemaining: 3
      });

      expect(condition.name).toBe('Frightened');
      expect(condition.source).toBe('Dragon Fear');
      expect(condition.ends).toBe('End of next turn');
      expect(condition.roundsRemaining).toBe(3);
    });

    it('generates unique IDs', () => {
      const cond1 = createCondition('Poisoned');
      const cond2 = createCondition('Poisoned');

      expect(cond1.id).not.toBe(cond2.id);
    });
  });

  describe('findConditionInfo', () => {
    it('finds condition by exact name', () => {
      const info = findConditionInfo('Poisoned');

      expect(info).toBeDefined();
      expect(info?.name).toBe('Poisoned');
      expect(info?.description).toBe('Suffering from poison');
    });

    it('finds condition case-insensitively', () => {
      expect(findConditionInfo('poisoned')).toBeDefined();
      expect(findConditionInfo('POISONED')).toBeDefined();
      expect(findConditionInfo('PoIsOnEd')).toBeDefined();
    });

    it('returns undefined for unknown condition', () => {
      expect(findConditionInfo('Not A Condition')).toBeUndefined();
      expect(findConditionInfo('')).toBeUndefined();
    });

    it('returns effects array', () => {
      const info = findConditionInfo('Paralyzed');

      expect(info?.effects).toContain('Incapacitated, cannot move or speak');
      expect(info?.effects).toContain('Hits within 5 feet are automatic crits');
    });
  });

  describe('decrementConditionRounds', () => {
    it('decrements rounds when present', () => {
      const condition = createCondition('Stunned', { roundsRemaining: 3 });
      const updated = decrementConditionRounds(condition);

      expect(updated.roundsRemaining).toBe(2);
    });

    it('returns same condition when no rounds', () => {
      const condition = createCondition('Poisoned');
      const updated = decrementConditionRounds(condition);

      expect(updated).toEqual(condition);
    });

    it('returns same condition when rounds already 0', () => {
      const condition = createCondition('Stunned', { roundsRemaining: 0 });
      const updated = decrementConditionRounds(condition);

      expect(updated.roundsRemaining).toBe(0);
    });

    it('does not mutate original condition', () => {
      const condition = createCondition('Stunned', { roundsRemaining: 3 });
      const updated = decrementConditionRounds(condition);

      expect(condition.roundsRemaining).toBe(3);
      expect(updated.roundsRemaining).toBe(2);
    });

    it('preserves other properties', () => {
      const condition = createCondition('Frightened', {
        source: 'Dragon',
        ends: 'Save ends',
        roundsRemaining: 5
      });
      const updated = decrementConditionRounds(condition);

      expect(updated.source).toBe('Dragon');
      expect(updated.ends).toBe('Save ends');
      expect(updated.name).toBe('Frightened');
    });
  });

  describe('isConditionExpired', () => {
    it('returns false when no rounds tracking', () => {
      const condition = createCondition('Poisoned');
      expect(isConditionExpired(condition)).toBe(false);
    });

    it('returns false when rounds remaining', () => {
      const condition = createCondition('Stunned', { roundsRemaining: 2 });
      expect(isConditionExpired(condition)).toBe(false);
    });

    it('returns true when rounds is 0', () => {
      const condition = createCondition('Stunned', { roundsRemaining: 0 });
      expect(isConditionExpired(condition)).toBe(true);
    });

    it('returns true when rounds is negative (edge case)', () => {
      const condition = createCondition('Stunned', { roundsRemaining: -1 });
      expect(isConditionExpired(condition)).toBe(true);
    });
  });
});
