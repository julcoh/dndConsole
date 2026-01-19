import { openDB, type IDBPDatabase } from 'idb';
import type { CharacterDefinition, CharacterSession } from '../types';
import type { CharacterRepository } from './repository';
import { StorageUnavailableError, StorageError, isIndexedDBAvailable } from './repository';

// === Database Schema ===

const DB_NAME = 'dnd-console';
const DB_VERSION = 1;

interface DndConsoleDB {
  definitions: CharacterDefinition;
  sessions: CharacterSession;
}

// === IndexedDB Implementation ===

export class IndexedDBRepository implements CharacterRepository {
  private dbPromise: Promise<IDBPDatabase<DndConsoleDB>> | null = null;

  private async getDB(): Promise<IDBPDatabase<DndConsoleDB>> {
    if (!isIndexedDBAvailable()) {
      throw new StorageUnavailableError();
    }

    if (!this.dbPromise) {
      this.dbPromise = openDB<DndConsoleDB>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion, _newVersion) {
          // Version 1: Initial schema
          if (oldVersion < 1) {
            // Definitions store
            const defStore = db.createObjectStore('definitions', { keyPath: 'id' });
            defStore.createIndex('by-name', 'name');
            defStore.createIndex('by-updated', 'updatedAt');

            // Sessions store
            const sessStore = db.createObjectStore('sessions', { keyPath: 'definitionId' });
            sessStore.createIndex('by-modified', 'lastModified');
          }

          // Future migrations go here:
          // if (oldVersion < 2) { ... }
        },
        blocked() {
          console.warn('Database upgrade blocked - close other tabs');
        },
        blocking() {
          console.warn('This connection is blocking a database upgrade');
        },
        terminated() {
          console.error('Database connection terminated unexpectedly');
        }
      });
    }

    return this.dbPromise;
  }

  // === Definition Methods ===

  async getAllDefinitions(): Promise<CharacterDefinition[]> {
    try {
      const db = await this.getDB();
      return db.getAllFromIndex('definitions', 'by-updated');
    } catch (error) {
      throw new StorageError('getAllDefinitions', error as Error);
    }
  }

  async getDefinition(id: string): Promise<CharacterDefinition | undefined> {
    try {
      const db = await this.getDB();
      return db.get('definitions', id);
    } catch (error) {
      throw new StorageError('getDefinition', error as Error);
    }
  }

  async saveDefinition(definition: CharacterDefinition): Promise<void> {
    try {
      const db = await this.getDB();
      await db.put('definitions', {
        ...definition,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      throw new StorageError('saveDefinition', error as Error);
    }
  }

  async deleteDefinition(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(['definitions', 'sessions'], 'readwrite');
      await Promise.all([
        tx.objectStore('definitions').delete(id),
        tx.objectStore('sessions').delete(id),
        tx.done
      ]);
    } catch (error) {
      throw new StorageError('deleteDefinition', error as Error);
    }
  }

  // === Session Methods ===

  async getSession(definitionId: string): Promise<CharacterSession | undefined> {
    try {
      const db = await this.getDB();
      return db.get('sessions', definitionId);
    } catch (error) {
      throw new StorageError('getSession', error as Error);
    }
  }

  async saveSession(session: CharacterSession): Promise<void> {
    try {
      const db = await this.getDB();
      await db.put('sessions', {
        ...session,
        lastModified: new Date().toISOString()
      });
    } catch (error) {
      throw new StorageError('saveSession', error as Error);
    }
  }

  async deleteSession(definitionId: string): Promise<void> {
    try {
      const db = await this.getDB();
      await db.delete('sessions', definitionId);
    } catch (error) {
      throw new StorageError('deleteSession', error as Error);
    }
  }

  // === Bulk Operations ===

  async exportCharacter(id: string): Promise<{ definition: CharacterDefinition; session: CharacterSession } | undefined> {
    try {
      const definition = await this.getDefinition(id);
      if (!definition) return undefined;

      const session = await this.getSession(id);
      if (!session) return undefined;

      return { definition, session };
    } catch (error) {
      throw new StorageError('exportCharacter', error as Error);
    }
  }

  async importCharacter(definition: CharacterDefinition, session: CharacterSession): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(['definitions', 'sessions'], 'readwrite');

      await Promise.all([
        tx.objectStore('definitions').put(definition),
        tx.objectStore('sessions').put(session),
        tx.done
      ]);
    } catch (error) {
      throw new StorageError('importCharacter', error as Error);
    }
  }

  // === Utilities ===

  async clear(): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(['definitions', 'sessions'], 'readwrite');
      await Promise.all([
        tx.objectStore('definitions').clear(),
        tx.objectStore('sessions').clear(),
        tx.done
      ]);
    } catch (error) {
      throw new StorageError('clear', error as Error);
    }
  }
}

// === Singleton Instance ===

let repositoryInstance: IndexedDBRepository | null = null;

export function getRepository(): IndexedDBRepository {
  if (!repositoryInstance) {
    repositoryInstance = new IndexedDBRepository();
  }
  return repositoryInstance;
}
