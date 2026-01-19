import { describe, it, expect, beforeEach } from 'vitest';
import { IndexedDBRepository } from './indexedDB';
import type { CharacterDefinition, CharacterSession } from '../types';

// Helper to create a minimal valid character definition
function createTestDefinition(id: string, name: string): CharacterDefinition {
  return {
    id,
    name,
    race: 'Human',
    classes: [{ name: 'Fighter', level: 1 }],
    background: 'Soldier',
    abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    savingThrowProficiencies: {
      str: 'none', dex: 'none', con: 'none',
      int: 'none', wis: 'none', cha: 'none'
    },
    skillProficiencies: {
      acrobatics: 'none', animalHandling: 'none', arcana: 'none',
      athletics: 'none', deception: 'none', history: 'none',
      insight: 'none', intimidation: 'none', investigation: 'none',
      medicine: 'none', nature: 'none', perception: 'none',
      performance: 'none', persuasion: 'none', religion: 'none',
      sleightOfHand: 'none', stealth: 'none', survival: 'none'
    },
    maxHP: 10,
    armorClass: 10,
    speed: 30,
    initiativeBonus: 0,
    resourceDefinitions: [],
    attackMacros: [],
    saveMacros: [],
    checkMacros: [],
    spells: [],
    equipment: [],
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    attunedItems: [],
    notes: '',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function createTestSession(definitionId: string): CharacterSession {
  return {
    id: `session-${definitionId}`,
    definitionId,
    currentHP: 10,
    tempHP: 0,
    deathSaves: { successes: 0, failures: 0 },
    isDowned: false,
    resourceCurrents: {},
    conditions: [],
    pinnedItems: [],
    lastModified: new Date().toISOString()
  };
}

describe('IndexedDBRepository', () => {
  let repo: IndexedDBRepository;

  beforeEach(() => {
    repo = new IndexedDBRepository();
  });

  describe('definitions', () => {
    it('saves and retrieves a definition', async () => {
      const def = createTestDefinition('char-1', 'Test Character');

      await repo.saveDefinition(def);
      const retrieved = await repo.getDefinition('char-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Character');
      expect(retrieved?.id).toBe('char-1');
    });

    it('returns undefined for non-existent definition', async () => {
      const result = await repo.getDefinition('non-existent');
      expect(result).toBeUndefined();
    });

    it('updates existing definition', async () => {
      const def = createTestDefinition('char-1', 'Original Name');
      await repo.saveDefinition(def);

      const updated = { ...def, name: 'Updated Name' };
      await repo.saveDefinition(updated);

      const retrieved = await repo.getDefinition('char-1');
      expect(retrieved?.name).toBe('Updated Name');
    });

    it('gets all definitions', async () => {
      await repo.saveDefinition(createTestDefinition('char-1', 'Character 1'));
      await repo.saveDefinition(createTestDefinition('char-2', 'Character 2'));
      await repo.saveDefinition(createTestDefinition('char-3', 'Character 3'));

      const all = await repo.getAllDefinitions();

      expect(all).toHaveLength(3);
      expect(all.map(d => d.name)).toContain('Character 1');
      expect(all.map(d => d.name)).toContain('Character 2');
      expect(all.map(d => d.name)).toContain('Character 3');
    });

    it('deletes definition and associated session', async () => {
      const def = createTestDefinition('char-1', 'Test');
      const session = createTestSession('char-1');

      await repo.saveDefinition(def);
      await repo.saveSession(session);

      await repo.deleteDefinition('char-1');

      expect(await repo.getDefinition('char-1')).toBeUndefined();
      expect(await repo.getSession('char-1')).toBeUndefined();
    });
  });

  describe('sessions', () => {
    it('saves and retrieves a session', async () => {
      const session = createTestSession('char-1');
      session.currentHP = 5;
      session.tempHP = 10;

      await repo.saveSession(session);
      const retrieved = await repo.getSession('char-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.currentHP).toBe(5);
      expect(retrieved?.tempHP).toBe(10);
    });

    it('returns undefined for non-existent session', async () => {
      const result = await repo.getSession('non-existent');
      expect(result).toBeUndefined();
    });

    it('updates existing session', async () => {
      const session = createTestSession('char-1');
      await repo.saveSession(session);

      const updated = { ...session, currentHP: 1, isDowned: true };
      await repo.saveSession(updated);

      const retrieved = await repo.getSession('char-1');
      expect(retrieved?.currentHP).toBe(1);
      expect(retrieved?.isDowned).toBe(true);
    });

    it('deletes session', async () => {
      const session = createTestSession('char-1');
      await repo.saveSession(session);

      await repo.deleteSession('char-1');

      expect(await repo.getSession('char-1')).toBeUndefined();
    });
  });

  describe('import/export', () => {
    it('exports character with definition and session', async () => {
      const def = createTestDefinition('char-1', 'Export Test');
      const session = createTestSession('char-1');

      await repo.saveDefinition(def);
      await repo.saveSession(session);

      const exported = await repo.exportCharacter('char-1');

      expect(exported).toBeDefined();
      expect(exported?.definition.name).toBe('Export Test');
      expect(exported?.session.definitionId).toBe('char-1');
    });

    it('returns undefined when exporting non-existent character', async () => {
      const result = await repo.exportCharacter('non-existent');
      expect(result).toBeUndefined();
    });

    it('imports character with definition and session', async () => {
      const def = createTestDefinition('import-1', 'Import Test');
      const session = createTestSession('import-1');

      await repo.importCharacter(def, session);

      const retrievedDef = await repo.getDefinition('import-1');
      const retrievedSession = await repo.getSession('import-1');

      expect(retrievedDef?.name).toBe('Import Test');
      expect(retrievedSession?.definitionId).toBe('import-1');
    });

    it('overwrites existing character on import', async () => {
      const def1 = createTestDefinition('char-1', 'Original');
      const session1 = createTestSession('char-1');
      await repo.importCharacter(def1, session1);

      const def2 = createTestDefinition('char-1', 'Imported');
      const session2 = { ...createTestSession('char-1'), currentHP: 999 };
      await repo.importCharacter(def2, session2);

      const retrievedDef = await repo.getDefinition('char-1');
      const retrievedSession = await repo.getSession('char-1');

      expect(retrievedDef?.name).toBe('Imported');
      expect(retrievedSession?.currentHP).toBe(999);
    });
  });

  describe('clear', () => {
    it('clears all data', async () => {
      await repo.saveDefinition(createTestDefinition('char-1', 'Test 1'));
      await repo.saveDefinition(createTestDefinition('char-2', 'Test 2'));
      await repo.saveSession(createTestSession('char-1'));
      await repo.saveSession(createTestSession('char-2'));

      await repo.clear();

      expect(await repo.getAllDefinitions()).toHaveLength(0);
      expect(await repo.getSession('char-1')).toBeUndefined();
      expect(await repo.getSession('char-2')).toBeUndefined();
    });
  });

  describe('timestamps', () => {
    it('updates updatedAt when saving definition', async () => {
      const def = createTestDefinition('char-1', 'Test');
      const originalUpdatedAt = def.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      await repo.saveDefinition(def);
      const retrieved = await repo.getDefinition('char-1');

      expect(retrieved?.updatedAt).not.toBe(originalUpdatedAt);
    });

    it('updates lastModified when saving session', async () => {
      const session = createTestSession('char-1');
      const originalModified = session.lastModified;

      await new Promise(resolve => setTimeout(resolve, 10));

      await repo.saveSession(session);
      const retrieved = await repo.getSession('char-1');

      expect(retrieved?.lastModified).not.toBe(originalModified);
    });
  });
});
