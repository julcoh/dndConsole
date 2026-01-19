import { signal, computed } from '@preact/signals';
import type { SpellData } from '../../types/spells';
import { currentDefinition, currentSession, modifyResource, setConcentration } from '../../state';
import spellData from '../../data/spells.json';

// Spell database loaded from JSON
export const spellDatabase = signal<SpellData[]>(spellData.spells);
export const spellDatabaseLoaded = signal(true);
export const spellDatabaseError = signal<string | null>(null);

// Load spell database (now synchronous since we import directly)
export async function loadSpellDatabase(): Promise<void> {
  // Data is already loaded via import
  return;
}

// Get character's known/available spells
export const characterSpells = computed(() => {
  const def = currentDefinition.value;
  if (!def) return [];
  return def.spells;
});

// Get spell data for character's spells
export const characterSpellData = computed(() => {
  const charSpells = characterSpells.value;
  const database = spellDatabase.value;

  if (!charSpells.length || !database.length) return [];

  return charSpells.map(cs => {
    const spellData = database.find(s => s.name.toLowerCase() === cs.name.toLowerCase());
    return {
      ...cs,
      data: spellData || null
    };
  });
});

// Get spells filtered by class (for browsing)
export function getSpellsForClass(className: string): SpellData[] {
  return spellDatabase.value.filter(spell =>
    spell.classes.some(c => c.toLowerCase() === className.toLowerCase())
  );
}

// Check if character can cast a spell at a given level
export function canCastSpell(spellLevel: number): boolean {
  const def = currentDefinition.value;
  const session = currentSession.value;

  if (!def || !session) return false;

  // Cantrips can always be cast
  if (spellLevel === 0) return true;

  // Check spell slots
  const slotResource = def.resourceDefinitions.find(
    r => r.category === 'spell_slot' && r.name.includes(`${spellLevel}`)
  );

  if (!slotResource) return false;

  const currentSlots = session.resourceCurrents[slotResource.id] || 0;
  return currentSlots > 0;
}

// Cast a spell (consume slot)
export function castSpell(spellName: string, slotLevel: number): void {
  const def = currentDefinition.value;

  if (!def || slotLevel === 0) return;

  // Find the spell slot resource for this level
  const slotResource = def.resourceDefinitions.find(
    r => r.category === 'spell_slot' && r.name.toLowerCase().includes(`${slotLevel}`)
  );

  if (!slotResource) return;

  // Use the resource (negative to consume)
  modifyResource(slotResource.id, -1);

  // Check if this spell requires concentration
  const spellData = spellDatabase.value.find(
    s => s.name.toLowerCase() === spellName.toLowerCase()
  );

  if (spellData?.isConcentration) {
    // Set concentration on this spell
    setConcentration(spellName);
  }
}

// Toggle spell prepared state
export function toggleSpellPrepared(spellName: string): void {
  // This would update the character definition
  // For now, we'll need to integrate with the storage layer
  console.log(`Toggle prepared: ${spellName}`);
}
