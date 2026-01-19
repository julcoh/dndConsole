import { signal, computed, effect, batch } from '@preact/signals';
import type { CharacterDefinition, CharacterSession } from '../types';
import { getRepository } from '../storage';
import { pushAction, canUndo, undo, type ActionLog } from './actionLog';

// === App State Signals ===

// Current character (definition + session)
export const currentDefinition = signal<CharacterDefinition | null>(null);
export const currentSession = signal<CharacterSession | null>(null);

// All available characters (for character picker)
export const allDefinitions = signal<CharacterDefinition[]>([]);

// Loading state
export const isLoading = signal(true);
export const loadError = signal<string | null>(null);

// UI state
export const theme = signal<'dark' | 'light'>('dark');

// Undo state
export const actionLog = signal<ActionLog>({ actions: [], pointer: -1 });

// === Computed Values ===

export const hasCharacter = computed(() => currentDefinition.value !== null);

export const characterName = computed(() => currentDefinition.value?.name ?? 'No Character');

export const totalLevel = computed(() => {
  const def = currentDefinition.value;
  if (!def) return 0;
  return def.classes.reduce((sum, c) => sum + c.level, 0);
});

export const proficiencyBonus = computed(() => {
  const level = totalLevel.value;
  return Math.floor((level - 1) / 4) + 2;
});

export const currentHP = computed(() => currentSession.value?.currentHP ?? 0);
export const maxHP = computed(() => currentDefinition.value?.maxHP ?? 0);
export const tempHP = computed(() => currentSession.value?.tempHP ?? 0);

export const hpPercentage = computed(() => {
  const max = maxHP.value;
  if (max === 0) return 100;
  return Math.round((currentHP.value / max) * 100);
});

export const isDowned = computed(() => currentSession.value?.isDowned ?? false);

export const canUndoAction = computed(() => canUndo(actionLog.value));

// === Actions ===

// Separate loading state for character list (doesn't affect main app loading)
export const isLoadingCharacterList = signal(false);

export async function loadAllCharacters(): Promise<void> {
  try {
    isLoadingCharacterList.value = true;
    const repo = getRepository();
    const definitions = await repo.getAllDefinitions();
    allDefinitions.value = definitions;
  } catch (error) {
    console.error('Failed to load character list:', error);
  } finally {
    isLoadingCharacterList.value = false;
  }
}

export async function loadCharacter(id: string): Promise<void> {
  try {
    isLoading.value = true;
    loadError.value = null;
    const repo = getRepository();

    const definition = await repo.getDefinition(id);
    if (!definition) {
      throw new Error('Character not found');
    }

    let session = await repo.getSession(id);
    if (!session) {
      // Create initial session
      session = createInitialSession(definition);
      await repo.saveSession(session);
    }

    batch(() => {
      currentDefinition.value = definition;
      currentSession.value = session;
      // Reset undo stack when switching characters
      actionLog.value = { actions: [], pointer: -1 };
    });
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Failed to load character';
  } finally {
    isLoading.value = false;
  }
}

export async function saveCurrentSession(): Promise<void> {
  const session = currentSession.value;
  if (!session) return;

  try {
    const repo = getRepository();
    await repo.saveSession(session);
  } catch (error) {
    console.error('Failed to save session:', error);
  }
}

// === Session Mutation Helpers ===

type SessionUpdater = (session: CharacterSession) => CharacterSession;

export function updateSession(updater: SessionUpdater, actionName: string): void {
  const session = currentSession.value;
  if (!session) return;

  // Store previous state for undo
  const previousSession = session;
  const newSession = updater(session);

  // Update action log
  actionLog.value = pushAction(actionLog.value, {
    name: actionName,
    previousSession,
    newSession
  });

  // Apply change
  currentSession.value = newSession;
}

export function undoLastAction(): void {
  const result = undo(actionLog.value);
  if (result) {
    actionLog.value = result.log;
    currentSession.value = result.restoredSession;
  }
}

// === HP Actions ===

export function modifyHP(amount: number): void {
  const session = currentSession.value;

  // Check for concentration before modifying HP
  const isConcentrating = session?.concentratingOn != null;
  const damageTaken = amount < 0 ? Math.abs(amount) : 0;

  updateSession(sess => {
    let newHP = sess.currentHP + amount;
    let newTempHP = sess.tempHP;

    // Damage (negative amount)
    if (amount < 0) {
      const damage = Math.abs(amount);
      if (newTempHP > 0) {
        // Temp HP absorbs damage first
        const tempDamage = Math.min(newTempHP, damage);
        newTempHP -= tempDamage;
        newHP = sess.currentHP - (damage - tempDamage);
      }
    }

    // Clamp HP to valid range
    const def = currentDefinition.value;
    const maxHP = def?.maxHP ?? 0;
    newHP = Math.max(0, Math.min(maxHP, newHP));
    newTempHP = Math.max(0, newTempHP);

    // Auto-set isDowned when HP reaches 0
    const shouldBeDown = newHP === 0;
    const wasDown = sess.isDowned;

    // Break concentration if going down
    const shouldBreakConcentration = shouldBeDown && sess.concentratingOn;

    return {
      ...sess,
      currentHP: newHP,
      tempHP: newTempHP,
      isDowned: shouldBeDown,
      // Reset death saves when first going down
      deathSaves: shouldBeDown && !wasDown
        ? { successes: 0, failures: 0 }
        : sess.deathSaves,
      // Break concentration if going down
      concentratingOn: shouldBreakConcentration ? undefined : sess.concentratingOn,
      lastModified: new Date().toISOString()
    };
  }, `HP ${amount >= 0 ? '+' : ''}${amount}`);

  // Trigger concentration check after HP is modified (if was concentrating and took damage)
  if (isConcentrating && damageTaken > 0 && session?.concentratingOn) {
    const dc = Math.max(10, Math.floor(damageTaken / 2));
    pendingConcentrationCheck.value = {
      spellName: session.concentratingOn.spellName,
      dc
    };
  }
}

export function setHP(value: number): void {
  updateSession(session => {
    const def = currentDefinition.value;
    const maxHP = def?.maxHP ?? 0;
    const newHP = Math.max(0, Math.min(maxHP, value));
    const shouldBeDown = newHP === 0;
    const wasDown = session.isDowned;

    return {
      ...session,
      currentHP: newHP,
      isDowned: shouldBeDown,
      // Reset death saves when first going down
      deathSaves: shouldBeDown && !wasDown
        ? { successes: 0, failures: 0 }
        : session.deathSaves,
      lastModified: new Date().toISOString()
    };
  }, `Set HP to ${value}`);
}

export function setTempHP(value: number): void {
  updateSession(session => ({
    ...session,
    tempHP: Math.max(0, value),
    lastModified: new Date().toISOString()
  }), `Set Temp HP to ${value}`);
}

export function toggleDowned(): void {
  updateSession(session => ({
    ...session,
    isDowned: !session.isDowned,
    lastModified: new Date().toISOString()
  }), 'Toggle Downed');
}

// === Death Saves ===

export function addDeathSuccess(): void {
  updateSession(session => ({
    ...session,
    deathSaves: {
      ...session.deathSaves,
      successes: Math.min(3, session.deathSaves.successes + 1)
    },
    lastModified: new Date().toISOString()
  }), 'Death Save Success');
}

export function addDeathFailure(): void {
  updateSession(session => ({
    ...session,
    deathSaves: {
      ...session.deathSaves,
      failures: Math.min(3, session.deathSaves.failures + 1)
    },
    lastModified: new Date().toISOString()
  }), 'Death Save Failure');
}

export function resetDeathSaves(): void {
  updateSession(session => ({
    ...session,
    deathSaves: { successes: 0, failures: 0 },
    isDowned: false,
    lastModified: new Date().toISOString()
  }), 'Reset Death Saves');
}

// === Concentration ===

// Signal for pending concentration check (set when damage taken while concentrating)
export const pendingConcentrationCheck = signal<{ spellName: string; dc: number } | null>(null);

export function setConcentration(spellName: string): void {
  updateSession(session => ({
    ...session,
    concentratingOn: { spellName },
    lastModified: new Date().toISOString()
  }), `Concentrating on ${spellName}`);
}

export function breakConcentration(): void {
  updateSession(session => ({
    ...session,
    concentratingOn: undefined,
    lastModified: new Date().toISOString()
  }), 'Break Concentration');
  pendingConcentrationCheck.value = null;
}

export function dismissConcentrationCheck(): void {
  pendingConcentrationCheck.value = null;
}

// === Resource Actions ===

export function modifyResource(resourceId: string, amount: number): void {
  updateSession(session => {
    const def = currentDefinition.value;
    const resourceDef = def?.resourceDefinitions.find(r => r.id === resourceId);
    if (!resourceDef) return session;

    const current = session.resourceCurrents[resourceId] ?? resourceDef.maximum;
    const newValue = Math.max(0, Math.min(resourceDef.maximum, current + amount));

    return {
      ...session,
      resourceCurrents: {
        ...session.resourceCurrents,
        [resourceId]: newValue
      },
      lastModified: new Date().toISOString()
    };
  }, `${amount >= 0 ? 'Restore' : 'Use'} resource`);
}

// === Condition Actions ===

export function endTurn(): void {
  updateSession(session => {
    // Decrement rounds for all conditions that have roundsRemaining
    const updatedConditions = session.conditions
      .map(condition => {
        if (condition.roundsRemaining === undefined || condition.roundsRemaining <= 0) {
          return condition;
        }
        return {
          ...condition,
          roundsRemaining: condition.roundsRemaining - 1
        };
      })
      // Remove expired conditions
      .filter(condition =>
        condition.roundsRemaining === undefined || condition.roundsRemaining > 0
      );

    return {
      ...session,
      conditions: updatedConditions,
      lastModified: new Date().toISOString()
    };
  }, 'End Turn');
}

// === Spell Actions ===

export async function toggleSpellPrepared(spellName: string): Promise<void> {
  const def = currentDefinition.value;
  if (!def) return;

  // Find the spell in the character's spell list
  const spellIndex = def.spells.findIndex(
    s => s.name.toLowerCase() === spellName.toLowerCase()
  );

  if (spellIndex === -1) return;

  // Create updated spells array
  const updatedSpells = [...def.spells];
  updatedSpells[spellIndex] = {
    ...updatedSpells[spellIndex],
    prepared: !updatedSpells[spellIndex].prepared
  };

  // Update the definition
  const updatedDef: CharacterDefinition = {
    ...def,
    spells: updatedSpells,
    updatedAt: new Date().toISOString()
  };

  // Save to storage
  try {
    const repo = getRepository();
    await repo.saveDefinition(updatedDef);
    currentDefinition.value = updatedDef;
  } catch (error) {
    console.error('Failed to toggle spell prepared:', error);
  }
}

// === Currency Actions ===

export async function updateCurrency(currency: { cp: number; sp: number; ep: number; gp: number; pp: number }): Promise<void> {
  const def = currentDefinition.value;
  if (!def) return;

  const updatedDef: CharacterDefinition = {
    ...def,
    currency,
    updatedAt: new Date().toISOString()
  };

  try {
    const repo = getRepository();
    await repo.saveDefinition(updatedDef);
    currentDefinition.value = updatedDef;
  } catch (error) {
    console.error('Failed to update currency:', error);
  }
}

// === Equipment Actions ===

export async function updateEquipment(equipment: string[]): Promise<void> {
  const def = currentDefinition.value;
  if (!def) return;

  const updatedDef: CharacterDefinition = {
    ...def,
    equipment,
    updatedAt: new Date().toISOString()
  };

  try {
    const repo = getRepository();
    await repo.saveDefinition(updatedDef);
    currentDefinition.value = updatedDef;
  } catch (error) {
    console.error('Failed to update equipment:', error);
  }
}

export async function updateAttunedItems(attunedItems: string[]): Promise<void> {
  const def = currentDefinition.value;
  if (!def) return;

  const updatedDef: CharacterDefinition = {
    ...def,
    attunedItems,
    updatedAt: new Date().toISOString()
  };

  try {
    const repo = getRepository();
    await repo.saveDefinition(updatedDef);
    currentDefinition.value = updatedDef;
  } catch (error) {
    console.error('Failed to update attuned items:', error);
  }
}

// === Helpers ===

function createInitialSession(definition: CharacterDefinition): CharacterSession {
  // Initialize all resources to their maximum
  const resourceCurrents: Record<string, number> = {};
  for (const resource of definition.resourceDefinitions) {
    resourceCurrents[resource.id] = resource.maximum;
  }

  return {
    id: crypto.randomUUID(),
    definitionId: definition.id,
    currentHP: definition.maxHP,
    tempHP: 0,
    deathSaves: { successes: 0, failures: 0 },
    isDowned: false,
    resourceCurrents,
    conditions: [],
    pinnedItems: [],
    lastModified: new Date().toISOString()
  };
}

// === Auto-save Effect ===

let saveTimeout: number | undefined;

effect(() => {
  // Track session changes
  const session = currentSession.value;
  if (!session) return;

  // Debounced save
  clearTimeout(saveTimeout);
  saveTimeout = window.setTimeout(() => {
    saveCurrentSession();
  }, 1000);
});

// === Theme Effect ===

effect(() => {
  document.documentElement.classList.toggle('theme-light', theme.value === 'light');
});
