import { describe, it, expect } from 'vitest';
import {
  getAbilityModifier,
  formatModifier,
  getTotalLevel,
  getProficiencyBonus,
  getProficiencyMultiplier,
  getSkillBonus,
  getSaveBonus,
  getPassiveScore,
  SKILL_ABILITIES,
  SKILL_NAMES,
  ABILITY_NAMES
} from './derived';
import type { AbilityScores, CharacterClass } from '../types';

describe('derived utilities', () => {
  describe('getAbilityModifier', () => {
    it('calculates standard modifiers correctly', () => {
      expect(getAbilityModifier(1)).toBe(-5);
      expect(getAbilityModifier(2)).toBe(-4);
      expect(getAbilityModifier(3)).toBe(-4);
      expect(getAbilityModifier(8)).toBe(-1);
      expect(getAbilityModifier(9)).toBe(-1);
      expect(getAbilityModifier(10)).toBe(0);
      expect(getAbilityModifier(11)).toBe(0);
      expect(getAbilityModifier(12)).toBe(1);
      expect(getAbilityModifier(13)).toBe(1);
      expect(getAbilityModifier(14)).toBe(2);
      expect(getAbilityModifier(15)).toBe(2);
      expect(getAbilityModifier(16)).toBe(3);
      expect(getAbilityModifier(17)).toBe(3);
      expect(getAbilityModifier(18)).toBe(4);
      expect(getAbilityModifier(19)).toBe(4);
      expect(getAbilityModifier(20)).toBe(5);
    });

    it('handles extreme values', () => {
      expect(getAbilityModifier(30)).toBe(10);
      expect(getAbilityModifier(0)).toBe(-5);
    });
  });

  describe('formatModifier', () => {
    it('adds plus sign to positive numbers', () => {
      expect(formatModifier(5)).toBe('+5');
      expect(formatModifier(1)).toBe('+1');
      expect(formatModifier(10)).toBe('+10');
    });

    it('keeps minus sign for negative numbers', () => {
      expect(formatModifier(-3)).toBe('-3');
      expect(formatModifier(-1)).toBe('-1');
    });

    it('adds plus sign to zero', () => {
      expect(formatModifier(0)).toBe('+0');
    });
  });

  describe('getTotalLevel', () => {
    it('sums single class level', () => {
      const classes: CharacterClass[] = [
        { name: 'Fighter', level: 5 }
      ];
      expect(getTotalLevel(classes)).toBe(5);
    });

    it('sums multiclass levels', () => {
      const classes: CharacterClass[] = [
        { name: 'Fighter', level: 5 },
        { name: 'Wizard', level: 3 }
      ];
      expect(getTotalLevel(classes)).toBe(8);
    });

    it('handles empty classes array', () => {
      expect(getTotalLevel([])).toBe(0);
    });

    it('handles three-way multiclass', () => {
      const classes: CharacterClass[] = [
        { name: 'Fighter', level: 5 },
        { name: 'Rogue', level: 3 },
        { name: 'Cleric', level: 2 }
      ];
      expect(getTotalLevel(classes)).toBe(10);
    });
  });

  describe('getProficiencyBonus', () => {
    it('returns correct bonus for each tier', () => {
      // Levels 1-4: +2
      expect(getProficiencyBonus(1)).toBe(2);
      expect(getProficiencyBonus(4)).toBe(2);

      // Levels 5-8: +3
      expect(getProficiencyBonus(5)).toBe(3);
      expect(getProficiencyBonus(8)).toBe(3);

      // Levels 9-12: +4
      expect(getProficiencyBonus(9)).toBe(4);
      expect(getProficiencyBonus(12)).toBe(4);

      // Levels 13-16: +5
      expect(getProficiencyBonus(13)).toBe(5);
      expect(getProficiencyBonus(16)).toBe(5);

      // Levels 17-20: +6
      expect(getProficiencyBonus(17)).toBe(6);
      expect(getProficiencyBonus(20)).toBe(6);
    });
  });

  describe('getProficiencyMultiplier', () => {
    it('returns correct multipliers', () => {
      expect(getProficiencyMultiplier('none')).toBe(0);
      expect(getProficiencyMultiplier('proficient')).toBe(1);
      expect(getProficiencyMultiplier('expertise')).toBe(2);
    });
  });

  describe('getSkillBonus', () => {
    const scores: AbilityScores = {
      str: 10, // +0
      dex: 16, // +3
      con: 14, // +2
      int: 12, // +1
      wis: 18, // +4
      cha: 8   // -1
    };

    it('calculates unproficient skill bonus (ability mod only)', () => {
      // Stealth (DEX) with no proficiency
      expect(getSkillBonus(scores, 'stealth', 'none', 2)).toBe(3); // +3 DEX
    });

    it('calculates proficient skill bonus', () => {
      // Stealth (DEX) with proficiency at level 5 (+3 prof)
      expect(getSkillBonus(scores, 'stealth', 'proficient', 3)).toBe(6); // +3 DEX + 3 prof
    });

    it('calculates expertise skill bonus', () => {
      // Stealth (DEX) with expertise at level 5 (+3 prof)
      expect(getSkillBonus(scores, 'stealth', 'expertise', 3)).toBe(9); // +3 DEX + 6 (doubled)
    });

    it('uses correct ability for each skill', () => {
      // Athletics uses STR
      expect(getSkillBonus(scores, 'athletics', 'proficient', 2)).toBe(2); // +0 STR + 2 prof

      // Perception uses WIS
      expect(getSkillBonus(scores, 'perception', 'proficient', 2)).toBe(6); // +4 WIS + 2 prof

      // Deception uses CHA
      expect(getSkillBonus(scores, 'deception', 'proficient', 2)).toBe(1); // -1 CHA + 2 prof
    });
  });

  describe('getSaveBonus', () => {
    const scores: AbilityScores = {
      str: 10, // +0
      dex: 16, // +3
      con: 14, // +2
      int: 12, // +1
      wis: 18, // +4
      cha: 8   // -1
    };

    it('calculates unproficient save', () => {
      expect(getSaveBonus(scores, 'dex', 'none', 2)).toBe(3); // +3 DEX only
    });

    it('calculates proficient save', () => {
      expect(getSaveBonus(scores, 'dex', 'proficient', 3)).toBe(6); // +3 DEX + 3 prof
    });

    it('calculates expertise save (rare but exists)', () => {
      expect(getSaveBonus(scores, 'wis', 'expertise', 4)).toBe(12); // +4 WIS + 8 (doubled)
    });
  });

  describe('getPassiveScore', () => {
    const scores: AbilityScores = {
      str: 10,
      dex: 14,
      con: 12,
      int: 10,
      wis: 16, // +3
      cha: 8
    };

    it('calculates base passive (10 + skill bonus)', () => {
      // Passive Perception with WIS +3, proficient, prof bonus +2
      expect(getPassiveScore(scores, 'perception', 'proficient', 2)).toBe(15); // 10 + 3 + 2
    });

    it('adds 5 for advantage', () => {
      expect(getPassiveScore(scores, 'perception', 'proficient', 2, true, false)).toBe(20);
    });

    it('subtracts 5 for disadvantage', () => {
      expect(getPassiveScore(scores, 'perception', 'proficient', 2, false, true)).toBe(10);
    });

    it('cancels advantage and disadvantage', () => {
      expect(getPassiveScore(scores, 'perception', 'proficient', 2, true, true)).toBe(15);
    });
  });

  describe('constants', () => {
    it('has all skills mapped to abilities', () => {
      expect(Object.keys(SKILL_ABILITIES)).toHaveLength(18);
      expect(SKILL_ABILITIES.acrobatics).toBe('dex');
      expect(SKILL_ABILITIES.athletics).toBe('str');
      expect(SKILL_ABILITIES.arcana).toBe('int');
      expect(SKILL_ABILITIES.perception).toBe('wis');
      expect(SKILL_ABILITIES.persuasion).toBe('cha');
    });

    it('has display names for all skills', () => {
      expect(Object.keys(SKILL_NAMES)).toHaveLength(18);
      expect(SKILL_NAMES.animalHandling).toBe('Animal Handling');
      expect(SKILL_NAMES.sleightOfHand).toBe('Sleight of Hand');
    });

    it('has display names for all abilities', () => {
      expect(Object.keys(ABILITY_NAMES)).toHaveLength(6);
      expect(ABILITY_NAMES.str).toBe('Strength');
      expect(ABILITY_NAMES.dex).toBe('Dexterity');
    });
  });
});
