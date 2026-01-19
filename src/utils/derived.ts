import type { Ability, Skill, AbilityScores, CharacterClass, ProficiencyLevel } from '../types';

// === Ability Scores ===

export function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : String(mod);
}

export function getAbilityMod(scores: AbilityScores, ability: Ability): number {
  return getAbilityModifier(scores[ability]);
}

// === Proficiency ===

export function getTotalLevel(classes: CharacterClass[]): number {
  return classes.reduce((sum, c) => sum + c.level, 0);
}

export function getProficiencyBonus(totalLevel: number): number {
  return Math.floor((totalLevel - 1) / 4) + 2;
}

export function getProficiencyMultiplier(level: ProficiencyLevel): number {
  switch (level) {
    case 'none': return 0;
    case 'proficient': return 1;
    case 'expertise': return 2;
  }
}

// === Skills ===

export const SKILL_ABILITIES: Record<Skill, Ability> = {
  acrobatics: 'dex',
  animalHandling: 'wis',
  arcana: 'int',
  athletics: 'str',
  deception: 'cha',
  history: 'int',
  insight: 'wis',
  intimidation: 'cha',
  investigation: 'int',
  medicine: 'wis',
  nature: 'int',
  perception: 'wis',
  performance: 'cha',
  persuasion: 'cha',
  religion: 'int',
  sleightOfHand: 'dex',
  stealth: 'dex',
  survival: 'wis'
};

export const SKILL_NAMES: Record<Skill, string> = {
  acrobatics: 'Acrobatics',
  animalHandling: 'Animal Handling',
  arcana: 'Arcana',
  athletics: 'Athletics',
  deception: 'Deception',
  history: 'History',
  insight: 'Insight',
  intimidation: 'Intimidation',
  investigation: 'Investigation',
  medicine: 'Medicine',
  nature: 'Nature',
  perception: 'Perception',
  performance: 'Performance',
  persuasion: 'Persuasion',
  religion: 'Religion',
  sleightOfHand: 'Sleight of Hand',
  stealth: 'Stealth',
  survival: 'Survival'
};

export const ABILITY_NAMES: Record<Ability, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma'
};

export const ABILITY_ABBREVIATIONS: Record<Ability, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA'
};

export function getSkillBonus(
  scores: AbilityScores,
  skill: Skill,
  proficiencyLevel: ProficiencyLevel,
  proficiencyBonus: number
): number {
  const ability = SKILL_ABILITIES[skill];
  const abilityMod = getAbilityModifier(scores[ability]);
  const profMult = getProficiencyMultiplier(proficiencyLevel);
  return abilityMod + (proficiencyBonus * profMult);
}

export function getSaveBonus(
  scores: AbilityScores,
  ability: Ability,
  proficiencyLevel: ProficiencyLevel,
  proficiencyBonus: number
): number {
  const abilityMod = getAbilityModifier(scores[ability]);
  const profMult = getProficiencyMultiplier(proficiencyLevel);
  return abilityMod + (proficiencyBonus * profMult);
}

// === Initiative ===

export function getInitiativeBonus(
  scores: AbilityScores,
  additionalBonus: number = 0
): number {
  return getAbilityModifier(scores.dex) + additionalBonus;
}

// === Passive Checks ===

export function getPassiveScore(
  scores: AbilityScores,
  skill: Skill,
  proficiencyLevel: ProficiencyLevel,
  proficiencyBonus: number,
  hasAdvantage: boolean = false,
  hasDisadvantage: boolean = false
): number {
  let base = 10 + getSkillBonus(scores, skill, proficiencyLevel, proficiencyBonus);

  if (hasAdvantage && !hasDisadvantage) {
    base += 5;
  } else if (hasDisadvantage && !hasAdvantage) {
    base -= 5;
  }

  return base;
}

// Convenience functions for simpler component usage
export function getSaveModifier(
  abilityScore: number,
  proficiency: ProficiencyLevel,
  profBonus: number
): number {
  const abilityMod = getAbilityModifier(abilityScore);
  const profMult = getProficiencyMultiplier(proficiency);
  return abilityMod + (profBonus * profMult);
}

export function getSkillModifier(
  abilityScore: number,
  proficiency: ProficiencyLevel,
  profBonus: number
): number {
  const abilityMod = getAbilityModifier(abilityScore);
  const profMult = getProficiencyMultiplier(proficiency);
  return abilityMod + (profBonus * profMult);
}
