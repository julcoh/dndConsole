import type { CharacterDefinition, CharacterSession } from '../types';

// === Repository Interface ===

export interface CharacterRepository {
  // Definition CRUD
  getAllDefinitions(): Promise<CharacterDefinition[]>;
  getDefinition(id: string): Promise<CharacterDefinition | undefined>;
  saveDefinition(definition: CharacterDefinition): Promise<void>;
  deleteDefinition(id: string): Promise<void>;

  // Session CRUD
  getSession(definitionId: string): Promise<CharacterSession | undefined>;
  saveSession(session: CharacterSession): Promise<void>;
  deleteSession(definitionId: string): Promise<void>;

  // Bulk operations
  exportCharacter(id: string): Promise<{ definition: CharacterDefinition; session: CharacterSession } | undefined>;
  importCharacter(definition: CharacterDefinition, session: CharacterSession): Promise<void>;

  // Utilities
  clear(): Promise<void>;
}

// === Storage Availability Check ===

export function isIndexedDBAvailable(): boolean {
  try {
    // Check if indexedDB is defined
    if (typeof indexedDB === 'undefined') {
      return false;
    }
    // Try to open a test database
    const testRequest = indexedDB.open('__test__');
    testRequest.onerror = () => {};
    testRequest.onsuccess = () => {
      indexedDB.deleteDatabase('__test__');
    };
    return true;
  } catch {
    return false;
  }
}

// === Error Types ===

export class StorageUnavailableError extends Error {
  constructor() {
    super(
      'IndexedDB is not available. This app requires IndexedDB to store your character data. ' +
      'Please ensure you are using a modern browser and that private/incognito mode is disabled.'
    );
    this.name = 'StorageUnavailableError';
  }
}

export class StorageError extends Error {
  cause?: Error;

  constructor(operation: string, cause?: Error) {
    super(`Storage operation failed: ${operation}`);
    this.name = 'StorageError';
    this.cause = cause;
  }
}
