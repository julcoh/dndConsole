import type { ResourceDefinition } from './resources';
import type { AttackMacro, SaveMacro, CheckMacro } from './macros';
import type { ActiveCondition } from './conditions';

// === Core Types ===

export type Ability = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export type Skill =
  | 'acrobatics' | 'animalHandling' | 'arcana' | 'athletics'
  | 'deception' | 'history' | 'insight' | 'intimidation'
  | 'investigation' | 'medicine' | 'nature' | 'perception'
  | 'performance' | 'persuasion' | 'religion' | 'sleightOfHand'
  | 'stealth' | 'survival';

export type ProficiencyLevel = 'none' | 'proficient' | 'expertise';

export type AbilityScores = Record<Ability, number>;

export interface CharacterClass {
  name: string;
  subclass?: string;
  level: number;
}

export interface Currency {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}

export interface CharacterSpell {
  id: string;
  name: string;
  level: number;
  prepared: boolean;
  ritual?: boolean;
  concentration?: boolean;
  notes?: string;
}

// === DEFINITION (mostly static, edited in setup/sheet) ===

export interface CharacterDefinition {
  id: string;
  name: string;
  playerName?: string;
  race: string;
  classes: CharacterClass[];
  background: string;

  abilityScores: AbilityScores;
  // proficiencyBonus is DERIVED from total level

  savingThrowProficiencies: Record<Ability, ProficiencyLevel>;
  skillProficiencies: Record<Skill, ProficiencyLevel>;

  maxHP: number;
  armorClass: number;
  speed: number;
  initiativeBonus: number;

  spellcastingAbility?: Ability;
  spellSaveDC?: number;
  spellAttackBonus?: number;

  // Resource definitions (max values, recharge rules)
  resourceDefinitions: ResourceDefinition[];

  // Typed macros
  attackMacros: AttackMacro[];
  saveMacros: SaveMacro[];
  checkMacros: CheckMacro[];

  // Spell list (known/prepared)
  spells: CharacterSpell[];

  // Equipment (mostly reference)
  equipment: string[];
  currency: Currency;
  attunedItems: string[];

  notes: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// === SESSION (changes during play, affected by rest/undo) ===

export interface DeathSaves {
  successes: number; // 0-3
  failures: number;  // 0-3
}

export interface ConcentrationInfo {
  spellName: string;
  saveDC?: number;
}

export interface PinnedItem {
  id: string;
  type: 'resource' | 'attack' | 'save' | 'check' | 'spell' | 'condition';
  referenceId: string; // ID of the thing being pinned
  order: number;
}

export interface CharacterSession {
  id: string;
  definitionId: string; // Links to CharacterDefinition

  currentHP: number;
  tempHP: number;

  deathSaves: DeathSaves;
  isDowned: boolean; // Manual toggle (HP 0 can be transient)

  // Current resource values (keyed by resourceDefinition.id)
  resourceCurrents: Record<string, number>;

  // Active conditions with metadata
  conditions: ActiveCondition[];

  // Concentration
  concentratingOn?: ConcentrationInfo;

  // Pinned items for PlayView dashboard
  pinnedItems: PinnedItem[];

  lastModified: string;
}

// === Derived Values (computed, not stored) ===

export function getTotalLevel(classes: CharacterClass[]): number {
  return classes.reduce((sum, c) => sum + c.level, 0);
}

export function getProficiencyBonus(totalLevel: number): number {
  return Math.floor((totalLevel - 1) / 4) + 2;
}

export function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}
