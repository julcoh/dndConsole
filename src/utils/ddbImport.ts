import type {
  CharacterDefinition,
  CharacterSession,
  CharacterClass,
  AbilityScores,
  Ability,
  Skill,
  ProficiencyLevel,
  CharacterSpell
} from '../types';
import type { ResourceDefinition } from '../types/resources';
import type { AttackMacro } from '../types/macros';

// D&D Beyond API types (partial, based on what we need)
interface DDBCharacter {
  id: number;
  name: string;
  race: { fullName: string; baseName: string };
  classes: DDBClass[];
  background: { definition?: { name: string } };
  stats: DDBStat[];
  bonusStats: DDBStat[];
  overrideStats: DDBStat[];
  modifiers: {
    race: DDBModifier[];
    class: DDBModifier[];
    background: DDBModifier[];
    item: DDBModifier[];
    feat: DDBModifier[];
    condition: DDBModifier[];
  };
  baseHitPoints: number;
  bonusHitPoints: number;
  temporaryHitPoints: number;
  removedHitPoints: number;
  inventory: DDBItem[];
  currencies: { cp: number; sp: number; ep: number; gp: number; pp: number };
  spells: { race: DDBSpell[]; class: DDBSpell[]; item: DDBSpell[]; feat: DDBSpell[] };
  classSpells: DDBClassSpells[];
  actions: { race: DDBAction[]; class: DDBAction[]; feat: DDBAction[] };
  options: { race: DDBOption[]; class: DDBOption[]; feat: DDBOption[] };
  customItems: DDBCustomItem[];
  notes?: { personalPossessions?: string; otherNotes?: string };
}

interface DDBClass {
  definition: { name: string; hitDie: number };
  subclassDefinition?: { name: string };
  level: number;
}

interface DDBStat {
  id: number;
  value: number | null;
}

interface DDBModifier {
  type: string;
  subType: string;
  value: number | null;
  entityId?: number;
  entityTypeId?: number;
  friendlyTypeName?: string;
  friendlySubtypeName?: string;
}

interface DDBItem {
  id: number;
  definition: {
    name: string;
    type: string;
    armorClass?: number;
    damage?: { diceString: string };
    attackType?: number;
    fixedDamage?: number;
    damageType?: string;
    range?: number;
    longRange?: number;
  };
  equipped: boolean;
  isAttuned: boolean;
  quantity: number;
}

interface DDBSpell {
  definition: {
    id: number;
    name: string;
    level: number;
    ritual: boolean;
    concentration: boolean;
    school: string;
  };
  prepared: boolean;
  alwaysPrepared: boolean;
}

interface DDBClassSpells {
  spells: DDBSpell[];
}

interface DDBAction {
  name: string;
  description: string;
  snippet?: string;
}

interface DDBOption {
  definition: { name: string; description: string };
}

interface DDBCustomItem {
  name: string;
  description?: string;
  quantity: number;
}

// Stat ID mapping
const STAT_IDS: Record<number, Ability> = {
  1: 'str',
  2: 'dex',
  3: 'con',
  4: 'int',
  5: 'wis',
  6: 'cha'
};

// Skill mapping (DDB subType to our skill names)
const SKILL_MAP: Record<string, Skill> = {
  'acrobatics': 'acrobatics',
  'animal-handling': 'animalHandling',
  'arcana': 'arcana',
  'athletics': 'athletics',
  'deception': 'deception',
  'history': 'history',
  'insight': 'insight',
  'intimidation': 'intimidation',
  'investigation': 'investigation',
  'medicine': 'medicine',
  'nature': 'nature',
  'perception': 'perception',
  'performance': 'performance',
  'persuasion': 'persuasion',
  'religion': 'religion',
  'sleight-of-hand': 'sleightOfHand',
  'stealth': 'stealth',
  'survival': 'survival'
};

// Ability mapping for saves
const SAVE_MAP: Record<string, Ability> = {
  'strength-saving-throws': 'str',
  'dexterity-saving-throws': 'dex',
  'constitution-saving-throws': 'con',
  'intelligence-saving-throws': 'int',
  'wisdom-saving-throws': 'wis',
  'charisma-saving-throws': 'cha'
};

export function extractCharacterIdFromUrl(url: string): string | null {
  // Supports formats:
  // https://www.dndbeyond.com/characters/58542628
  // https://www.dndbeyond.com/characters/58542628/jBpxGh
  // https://dndbeyond.com/characters/58542628
  const match = url.match(/dndbeyond\.com\/characters\/(\d+)/);
  return match ? match[1] : null;
}

export async function fetchDDBCharacter(characterId: string): Promise<DDBCharacter> {
  const response = await fetch(
    `https://character-service.dndbeyond.com/character/v5/character/${characterId}`,
    {
      headers: {
        'Accept': 'application/json'
      }
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Character not found. Make sure the character is set to public sharing.');
    }
    if (response.status === 403) {
      throw new Error('Character is private. Enable public sharing on D&D Beyond.');
    }
    throw new Error(`Failed to fetch character: ${response.status}`);
  }

  const json = await response.json();

  if (!json.data) {
    throw new Error('Invalid response from D&D Beyond');
  }

  return json.data;
}

export function parseDDBCharacter(ddb: DDBCharacter): { definition: CharacterDefinition; session: CharacterSession } {
  // Calculate ability scores
  const abilityScores = calculateAbilityScores(ddb);

  // Get classes
  const classes = parseClasses(ddb);
  const totalLevel = classes.reduce((sum, c) => sum + c.level, 0);
  const profBonus = Math.floor((totalLevel - 1) / 4) + 2;

  // Get proficiencies
  const { savingThrowProficiencies, skillProficiencies } = parseProficiencies(ddb);

  // Calculate derived stats
  const dexMod = Math.floor((abilityScores.dex - 10) / 2);
  const conMod = Math.floor((abilityScores.con - 10) / 2);

  // Calculate AC
  const ac = calculateAC(ddb, abilityScores);

  // Calculate max HP
  const maxHP = ddb.baseHitPoints + ddb.bonusHitPoints;

  // Parse spells
  const spells = parseSpells(ddb);

  // Get spellcasting ability (based on class)
  const spellcastingAbility = getSpellcastingAbility(classes);
  const spellMod = spellcastingAbility ? Math.floor((abilityScores[spellcastingAbility] - 10) / 2) : 0;

  // Parse equipment and currency
  const { equipment, attunedItems } = parseEquipment(ddb);
  const currency = ddb.currencies;

  // Parse attack macros
  const attackMacros = parseAttackMacros(ddb, abilityScores, profBonus);

  // Create resource definitions (spell slots, class features)
  const resourceDefinitions = createResourceDefinitions(classes, totalLevel, conMod);

  // Calculate initiative bonus (DEX mod + any bonuses)
  let initiativeBonus = dexMod;
  // Check for initiative bonuses from modifiers
  for (const modType of Object.values(ddb.modifiers)) {
    for (const mod of modType) {
      if (mod.subType === 'initiative' && mod.value) {
        initiativeBonus += mod.value;
      }
    }
  }

  // Speed
  let speed = 30; // Default
  if (ddb.race.baseName.toLowerCase().includes('gnome')) speed = 25;
  if (ddb.race.baseName.toLowerCase().includes('dwarf')) speed = 25;
  if (ddb.race.baseName.toLowerCase().includes('halfling')) speed = 25;
  // Check for speed modifiers
  for (const modType of Object.values(ddb.modifiers)) {
    for (const mod of modType) {
      if (mod.subType === 'speed' && mod.value) {
        speed = mod.value;
      }
      if (mod.subType === 'innate-speed-walking' && mod.value) {
        speed = mod.value;
      }
    }
  }

  const definition: CharacterDefinition = {
    id: `ddb-${ddb.id}`,
    name: ddb.name,
    race: ddb.race.fullName,
    classes,
    background: ddb.background?.definition?.name || 'Unknown',
    abilityScores,
    savingThrowProficiencies,
    skillProficiencies,
    maxHP,
    armorClass: ac,
    speed,
    initiativeBonus,
    spellcastingAbility,
    spellSaveDC: spellcastingAbility ? 8 + profBonus + spellMod : undefined,
    spellAttackBonus: spellcastingAbility ? profBonus + spellMod : undefined,
    resourceDefinitions,
    attackMacros,
    saveMacros: [],
    checkMacros: [],
    spells,
    equipment,
    currency,
    attunedItems,
    notes: ddb.notes?.otherNotes || '',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Initialize resource currents
  const resourceCurrents: Record<string, number> = {};
  for (const resource of resourceDefinitions) {
    resourceCurrents[resource.id] = resource.maximum;
  }

  const session: CharacterSession = {
    id: crypto.randomUUID(),
    definitionId: definition.id,
    currentHP: maxHP - ddb.removedHitPoints,
    tempHP: ddb.temporaryHitPoints || 0,
    deathSaves: { successes: 0, failures: 0 },
    isDowned: (maxHP - ddb.removedHitPoints) <= 0,
    resourceCurrents,
    conditions: [],
    pinnedItems: [],
    lastModified: new Date().toISOString()
  };

  return { definition, session };
}

function calculateAbilityScores(ddb: DDBCharacter): AbilityScores {
  const scores: AbilityScores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };

  // Base stats
  for (const stat of ddb.stats) {
    const ability = STAT_IDS[stat.id];
    if (ability && stat.value !== null) {
      scores[ability] = stat.value;
    }
  }

  // Override stats (if set, use these instead)
  for (const stat of ddb.overrideStats) {
    const ability = STAT_IDS[stat.id];
    if (ability && stat.value !== null) {
      scores[ability] = stat.value;
    }
  }

  // Bonus stats
  for (const stat of ddb.bonusStats) {
    const ability = STAT_IDS[stat.id];
    if (ability && stat.value !== null) {
      scores[ability] += stat.value;
    }
  }

  // Racial and other bonuses from modifiers
  for (const modType of Object.values(ddb.modifiers)) {
    for (const mod of modType) {
      if (mod.type === 'bonus' && mod.value) {
        const ability = mod.subType?.replace('-score', '') as Ability;
        if (ability && scores[ability] !== undefined) {
          scores[ability] += mod.value;
        }
      }
    }
  }

  return scores;
}

function parseClasses(ddb: DDBCharacter): CharacterClass[] {
  return ddb.classes.map(c => ({
    name: c.definition.name,
    subclass: c.subclassDefinition?.name,
    level: c.level
  }));
}

function parseProficiencies(ddb: DDBCharacter): {
  savingThrowProficiencies: Record<Ability, ProficiencyLevel>;
  skillProficiencies: Record<Skill, ProficiencyLevel>;
} {
  const savingThrowProficiencies: Record<Ability, ProficiencyLevel> = {
    str: 'none', dex: 'none', con: 'none', int: 'none', wis: 'none', cha: 'none'
  };

  const skillProficiencies: Record<Skill, ProficiencyLevel> = {
    acrobatics: 'none', animalHandling: 'none', arcana: 'none', athletics: 'none',
    deception: 'none', history: 'none', insight: 'none', intimidation: 'none',
    investigation: 'none', medicine: 'none', nature: 'none', perception: 'none',
    performance: 'none', persuasion: 'none', religion: 'none', sleightOfHand: 'none',
    stealth: 'none', survival: 'none'
  };

  // Check all modifier sources
  for (const modType of Object.values(ddb.modifiers)) {
    for (const mod of modType) {
      // Saving throw proficiencies
      if (mod.type === 'proficiency') {
        const saveAbility = SAVE_MAP[mod.subType];
        if (saveAbility) {
          savingThrowProficiencies[saveAbility] = 'proficient';
        }

        // Skill proficiencies
        const skill = SKILL_MAP[mod.subType];
        if (skill) {
          skillProficiencies[skill] = 'proficient';
        }
      }

      // Expertise
      if (mod.type === 'expertise') {
        const skill = SKILL_MAP[mod.subType];
        if (skill) {
          skillProficiencies[skill] = 'expertise';
        }
      }

      // Half proficiency (like Jack of All Trades) - we treat as none since we don't support it
    }
  }

  return { savingThrowProficiencies, skillProficiencies };
}

function calculateAC(ddb: DDBCharacter, abilityScores: AbilityScores): number {
  let baseAC = 10;
  let dexBonus = Math.floor((abilityScores.dex - 10) / 2);
  let maxDexBonus = Infinity;
  let hasArmor = false;
  let shieldBonus = 0;

  // Find equipped armor and shield
  for (const item of ddb.inventory) {
    if (!item.equipped) continue;

    const def = item.definition;
    if (def.armorClass) {
      if (def.type === 'Shield') {
        shieldBonus = def.armorClass;
      } else {
        hasArmor = true;
        baseAC = def.armorClass;

        // Determine armor type and max dex bonus
        const armorType = def.type?.toLowerCase() || '';
        if (armorType.includes('heavy') || def.name?.toLowerCase().includes('plate') ||
            def.name?.toLowerCase().includes('chain mail') || def.name?.toLowerCase().includes('splint')) {
          maxDexBonus = 0;
        } else if (armorType.includes('medium') || def.name?.toLowerCase().includes('half plate') ||
                   def.name?.toLowerCase().includes('breastplate') || def.name?.toLowerCase().includes('scale')) {
          maxDexBonus = 2;
        }
      }
    }
  }

  // Calculate final AC
  const effectiveDex = Math.min(dexBonus, maxDexBonus);
  let ac = baseAC + (hasArmor && maxDexBonus === 0 ? 0 : effectiveDex) + shieldBonus;

  // Check for AC bonuses from modifiers (magic items, features, etc.)
  for (const modType of Object.values(ddb.modifiers)) {
    for (const mod of modType) {
      if (mod.type === 'bonus' && mod.subType === 'armor-class' && mod.value) {
        ac += mod.value;
      }
    }
  }

  return ac;
}

function parseSpells(ddb: DDBCharacter): CharacterSpell[] {
  const spells: CharacterSpell[] = [];
  const seenSpells = new Set<string>();

  // Helper to add spell
  const addSpell = (spell: DDBSpell) => {
    const key = spell.definition.name.toLowerCase();
    if (seenSpells.has(key)) return;
    seenSpells.add(key);

    spells.push({
      id: `spell-${spell.definition.id}`,
      name: spell.definition.name,
      level: spell.definition.level,
      prepared: spell.prepared || spell.alwaysPrepared,
      ritual: spell.definition.ritual,
      concentration: spell.definition.concentration
    });
  };

  // Class spells
  for (const classSpells of ddb.classSpells || []) {
    for (const spell of classSpells.spells || []) {
      addSpell(spell);
    }
  }

  // Race spells
  for (const spell of ddb.spells?.race || []) {
    addSpell(spell);
  }

  // Feat spells
  for (const spell of ddb.spells?.feat || []) {
    addSpell(spell);
  }

  // Item spells
  for (const spell of ddb.spells?.item || []) {
    addSpell(spell);
  }

  // Sort by level, then name
  spells.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

  return spells;
}

function getSpellcastingAbility(classes: CharacterClass[]): Ability | undefined {
  // Determine spellcasting ability from class
  for (const c of classes) {
    const className = c.name.toLowerCase();
    if (['wizard', 'artificer'].includes(className)) return 'int';
    if (['cleric', 'druid', 'ranger'].includes(className)) return 'wis';
    if (['bard', 'paladin', 'sorcerer', 'warlock'].includes(className)) return 'cha';
  }
  return undefined;
}

function parseEquipment(ddb: DDBCharacter): { equipment: string[]; attunedItems: string[] } {
  const equipment: string[] = [];
  const attunedItems: string[] = [];

  for (const item of ddb.inventory) {
    const name = item.quantity > 1
      ? `${item.definition.name} (${item.quantity})`
      : item.definition.name;

    equipment.push(name);

    if (item.isAttuned) {
      attunedItems.push(item.definition.name);
    }
  }

  // Add custom items
  for (const item of ddb.customItems || []) {
    const name = item.quantity > 1
      ? `${item.name} (${item.quantity})`
      : item.name;
    equipment.push(name);
  }

  return { equipment, attunedItems };
}

function parseAttackMacros(ddb: DDBCharacter, abilityScores: AbilityScores, profBonus: number): AttackMacro[] {
  const macros: AttackMacro[] = [];
  const strMod = Math.floor((abilityScores.str - 10) / 2);
  const dexMod = Math.floor((abilityScores.dex - 10) / 2);

  for (const item of ddb.inventory) {
    if (!item.equipped) continue;

    const def = item.definition;
    if (!def.damage?.diceString) continue;

    // Parse damage dice
    const diceMatch = def.damage.diceString.match(/(\d+)d(\d+)/);
    if (!diceMatch) continue;

    const numDice = parseInt(diceMatch[1], 10);
    const dieSize = parseInt(diceMatch[2], 10);

    // Determine attack ability
    const isFinesse = def.name?.toLowerCase().includes('finesse') ||
                      ['dagger', 'rapier', 'shortsword', 'scimitar'].some(w =>
                        def.name?.toLowerCase().includes(w));
    const isRanged = def.attackType === 2 || (def.range && def.range > 10);

    let attackMod = profBonus;
    let damageMod = 0;

    if (isRanged || (isFinesse && dexMod > strMod)) {
      attackMod += dexMod;
      damageMod = dexMod;
    } else {
      attackMod += strMod;
      damageMod = strMod;
    }

    // Build tags
    const tags: string[] = [];
    if (isRanged) tags.push('ranged');
    else tags.push('melee');
    if (isFinesse) tags.push('finesse');

    macros.push({
      id: `attack-${item.id}`,
      name: def.name,
      toHit: attackMod,
      damage: {
        dice: `${numDice}d${dieSize}`,
        bonus: damageMod,
        type: def.damageType || 'slashing'
      },
      tags,
      critBehavior: 'double_dice'
    });
  }

  return macros;
}

function createResourceDefinitions(classes: CharacterClass[], _totalLevel: number, conMod: number): ResourceDefinition[] {
  const resources: ResourceDefinition[] = [];

  // Hit dice
  for (const c of classes) {
    resources.push({
      id: `hit-dice-${c.name.toLowerCase()}`,
      name: `Hit Dice (d${getHitDie(c.name)})`,
      maximum: c.level,
      rechargeOn: 'long_rest',
      rechargeAmount: Math.max(1, Math.floor(c.level / 2)),
      category: 'hit_dice',
      dieType: getHitDie(c.name)
    });
  }

  // Spell slots (if spellcaster)
  const casterLevel = calculateCasterLevel(classes);
  if (casterLevel > 0) {
    const slots = getSpellSlots(casterLevel);
    for (let level = 1; level <= 9; level++) {
      if (slots[level] > 0) {
        resources.push({
          id: `spell-slot-${level}`,
          name: `${getOrdinal(level)} Level Slots`,
          maximum: slots[level],
          rechargeOn: 'long_rest',
          rechargeAmount: 'full',
          category: 'spell_slot'
        });
      }
    }
  }

  // Class-specific resources
  for (const c of classes) {
    const className = c.name.toLowerCase();

    if (className === 'artificer' && c.level >= 7) {
      resources.push({
        id: 'flash-of-genius',
        name: 'Flash of Genius',
        maximum: Math.floor((c.level >= 7 ? Math.max(1, conMod) : 0)),
        rechargeOn: 'long_rest',
        rechargeAmount: 'full',
        category: 'class_feature'
      });
    }

    // Add other class features as needed
  }

  return resources;
}

function getHitDie(className: string): number {
  const hitDice: Record<string, number> = {
    'barbarian': 12,
    'fighter': 10, 'paladin': 10, 'ranger': 10,
    'bard': 8, 'cleric': 8, 'druid': 8, 'monk': 8, 'rogue': 8, 'warlock': 8, 'artificer': 8,
    'sorcerer': 6, 'wizard': 6
  };
  return hitDice[className.toLowerCase()] || 8;
}

function calculateCasterLevel(classes: CharacterClass[]): number {
  let casterLevel = 0;

  for (const c of classes) {
    const className = c.name.toLowerCase();
    // Full casters
    if (['bard', 'cleric', 'druid', 'sorcerer', 'wizard'].includes(className)) {
      casterLevel += c.level;
    }
    // Half casters
    else if (['paladin', 'ranger', 'artificer'].includes(className)) {
      casterLevel += Math.floor(c.level / 2);
    }
    // Third casters (Eldritch Knight, Arcane Trickster)
    // Would need subclass info
  }

  return casterLevel;
}

function getSpellSlots(casterLevel: number): Record<number, number> {
  // Standard spell slot progression
  const table: Record<number, number[]> = {
    1: [2, 0, 0, 0, 0, 0, 0, 0, 0],
    2: [3, 0, 0, 0, 0, 0, 0, 0, 0],
    3: [4, 2, 0, 0, 0, 0, 0, 0, 0],
    4: [4, 3, 0, 0, 0, 0, 0, 0, 0],
    5: [4, 3, 2, 0, 0, 0, 0, 0, 0],
    6: [4, 3, 3, 0, 0, 0, 0, 0, 0],
    7: [4, 3, 3, 1, 0, 0, 0, 0, 0],
    8: [4, 3, 3, 2, 0, 0, 0, 0, 0],
    9: [4, 3, 3, 3, 1, 0, 0, 0, 0],
    10: [4, 3, 3, 3, 2, 0, 0, 0, 0],
    11: [4, 3, 3, 3, 2, 1, 0, 0, 0],
    12: [4, 3, 3, 3, 2, 1, 0, 0, 0],
    13: [4, 3, 3, 3, 2, 1, 1, 0, 0],
    14: [4, 3, 3, 3, 2, 1, 1, 0, 0],
    15: [4, 3, 3, 3, 2, 1, 1, 1, 0],
    16: [4, 3, 3, 3, 2, 1, 1, 1, 0],
    17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
    18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
    19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
    20: [4, 3, 3, 3, 3, 2, 2, 1, 1]
  };

  const slots = table[Math.min(casterLevel, 20)] || table[1];
  const result: Record<number, number> = {};
  for (let i = 0; i < 9; i++) {
    result[i + 1] = slots[i];
  }
  return result;
}

function getOrdinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}
