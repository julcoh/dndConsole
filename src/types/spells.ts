// Spell database types (for scraped data)

export interface SpellComponents {
  verbal: boolean;
  somatic: boolean;
  material: boolean;
  materials: string | null;
}

export interface SpellData {
  name: string;
  level: number;
  school: string;
  isRitual: boolean;
  isConcentration: boolean;
  castingTime: string;
  range: string;
  components: SpellComponents;
  duration: string;
  description: string;
  atHigherLevels: string | null;
  classes: string[];
  url?: string;
  source: string;
}

export interface SpellDatabase {
  version: number;
  scrapedAt: string;
  source: string;
  count: number;
  spells: SpellData[];
}

// School abbreviations for display
export const SCHOOL_ABBREV: Record<string, string> = {
  abjuration: 'Abj',
  conjuration: 'Con',
  divination: 'Div',
  enchantment: 'Enc',
  evocation: 'Evo',
  illusion: 'Ill',
  necromancy: 'Nec',
  transmutation: 'Tra'
};

// Level display text
export function getSpellLevelText(level: number): string {
  if (level === 0) return 'Cantrip';
  const suffix = ['st', 'nd', 'rd'][level - 1] || 'th';
  return `${level}${suffix} level`;
}

// Component abbreviation (V, S, M)
export function getComponentsAbbrev(components: SpellComponents): string {
  const parts: string[] = [];
  if (components.verbal) parts.push('V');
  if (components.somatic) parts.push('S');
  if (components.material) parts.push('M');
  return parts.join(', ');
}
