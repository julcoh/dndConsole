import type { CharacterDefinition, CharacterSession } from '../types';

// Sample character for testing: Tolvis the Hobgoblin Artificer

export const TOLVIS_DEFINITION: CharacterDefinition = {
  id: 'tolvis-001',
  name: 'Tolvis',
  playerName: 'Sample Player',
  race: 'Hobgoblin',
  classes: [{ name: 'Artificer', subclass: 'Armorer', level: 12 }],
  background: 'Guild Artisan',

  abilityScores: {
    str: 10,
    dex: 16,
    con: 16,
    int: 20,
    wis: 14,
    cha: 10
  },

  savingThrowProficiencies: {
    str: 'none',
    dex: 'none',
    con: 'proficient',
    int: 'proficient',
    wis: 'none',
    cha: 'none'
  },

  skillProficiencies: {
    acrobatics: 'none',
    animalHandling: 'none',
    arcana: 'proficient',
    athletics: 'none',
    deception: 'none',
    history: 'proficient',
    insight: 'proficient',
    intimidation: 'none',
    investigation: 'proficient',
    medicine: 'none',
    nature: 'none',
    perception: 'proficient',
    performance: 'none',
    persuasion: 'proficient',
    religion: 'none',
    sleightOfHand: 'none',
    stealth: 'none',
    survival: 'none'
  },

  maxHP: 76,
  armorClass: 22,
  speed: 35,
  initiativeBonus: 3,

  spellcastingAbility: 'int',
  spellSaveDC: 17,
  spellAttackBonus: 9,

  resourceDefinitions: [
    // Spell slots (Artificer is half-caster)
    { id: 'spell_slot_1', name: '1st Level', category: 'spell_slot', maximum: 4, slotLevel: 1, rechargeOn: 'long_rest', rechargeAmount: 'full' },
    { id: 'spell_slot_2', name: '2nd Level', category: 'spell_slot', maximum: 3, slotLevel: 2, rechargeOn: 'long_rest', rechargeAmount: 'full' },
    { id: 'spell_slot_3', name: '3rd Level', category: 'spell_slot', maximum: 3, slotLevel: 3, rechargeOn: 'long_rest', rechargeAmount: 'full' },

    // Class features
    { id: 'flash_of_genius', name: 'Flash of Genius', category: 'class_feature', maximum: 5, rechargeOn: 'long_rest', rechargeAmount: 'full' },
    { id: 'spell_storing_item', name: 'Spell-Storing Item', category: 'class_feature', maximum: 10, rechargeOn: 'long_rest', rechargeAmount: 'full' },

    // Hit dice
    { id: 'hit_dice_d8', name: 'Hit Dice (d8)', category: 'hit_dice', maximum: 12, dieType: 8, rechargeOn: 'long_rest', rechargeAmount: 'half' }
  ],

  attackMacros: [
    {
      id: 'thunder_gauntlets',
      name: 'Thunder Gauntlets',
      toHit: 9,
      damage: { dice: '1d8', bonus: 5, type: 'thunder' },
      range: '5 ft',
      tags: ['melee', 'armor'],
      critBehavior: 'double_dice',
      notes: 'Target has disadvantage attacking others'
    },
    {
      id: 'lightning_launcher',
      name: 'Lightning Launcher',
      toHit: 9,
      damage: { dice: '1d6', bonus: 5, type: 'lightning' },
      range: '90/300 ft',
      tags: ['ranged', 'armor'],
      critBehavior: 'double_dice',
      notes: 'Once per turn: +1d6 lightning'
    }
  ],

  saveMacros: [
    {
      id: 'web_spell',
      name: 'Web',
      saveDC: 17,
      saveAbility: 'dex',
      halfOnSave: false,
      notes: 'Restrained on failed save'
    }
  ],

  checkMacros: [
    {
      id: 'arcana_check',
      name: 'Arcana',
      ability: 'int',
      skill: 'arcana',
      bonus: 9
    },
    {
      id: 'investigation_check',
      name: 'Investigation',
      ability: 'int',
      skill: 'investigation',
      bonus: 9
    },
    {
      id: 'perception_check',
      name: 'Perception',
      ability: 'wis',
      skill: 'perception',
      bonus: 6
    }
  ],

  spells: [
    { id: 's1', name: 'Mending', level: 0, prepared: true },
    { id: 's2', name: 'Fire Bolt', level: 0, prepared: true },
    { id: 's3', name: 'Guidance', level: 0, prepared: true },
    { id: 's4', name: 'Cure Wounds', level: 1, prepared: true },
    { id: 's5', name: 'Faerie Fire', level: 1, prepared: true },
    { id: 's6', name: 'Web', level: 2, prepared: true, concentration: true },
    { id: 's7', name: 'Heat Metal', level: 2, prepared: true, concentration: true },
    { id: 's8', name: 'Haste', level: 3, prepared: true, concentration: true },
    { id: 's9', name: 'Fly', level: 3, prepared: true, concentration: true }
  ],

  equipment: [
    'Arcane Armor (Plate)',
    'Bag of Holding',
    'Alchemy Supplies',
    "Smith's Tools"
  ],

  currency: { cp: 0, sp: 15, ep: 0, gp: 234, pp: 5 },

  attunedItems: [
    'Cloak of Protection',
    'Gauntlets of Ogre Power',
    'Arcane Armor'
  ],

  notes: 'Armorer Artificer focused on battlefield control and support.',

  version: 1,
  createdAt: '2026-01-05T00:00:00.000Z',
  updatedAt: '2026-01-05T00:00:00.000Z'
};

export const TOLVIS_SESSION: CharacterSession = {
  id: 'tolvis-session-001',
  definitionId: 'tolvis-001',

  currentHP: 63,
  tempHP: 16,

  deathSaves: { successes: 0, failures: 0 },
  isDowned: false,

  resourceCurrents: {
    'spell_slot_1': 2,
    'spell_slot_2': 3,
    'spell_slot_3': 1,
    'flash_of_genius': 4,
    'spell_storing_item': 7,
    'hit_dice_d8': 10
  },

  conditions: [
    {
      id: 'cond-1',
      name: 'Haste',
      source: 'Self-cast',
      ends: 'Concentration',
      roundsRemaining: undefined
    }
  ],

  concentratingOn: {
    spellName: 'Haste',
    saveDC: 17
  },

  pinnedItems: [
    { id: 'pin-1', type: 'attack', referenceId: 'thunder_gauntlets', order: 0 },
    { id: 'pin-2', type: 'attack', referenceId: 'lightning_launcher', order: 1 },
    { id: 'pin-3', type: 'resource', referenceId: 'flash_of_genius', order: 2 },
    { id: 'pin-4', type: 'resource', referenceId: 'spell_slot_3', order: 3 }
  ],

  lastModified: '2026-01-05T00:00:00.000Z'
};

// Helper to initialize the sample character in the database
export async function initializeSampleCharacter(): Promise<void> {
  const { getRepository } = await import('../storage');
  const repo = getRepository();

  const existing = await repo.getDefinition(TOLVIS_DEFINITION.id);
  if (!existing) {
    await repo.importCharacter(TOLVIS_DEFINITION, TOLVIS_SESSION);
  }
}
