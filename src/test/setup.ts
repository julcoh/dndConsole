import 'fake-indexeddb/auto';
import { vi } from 'vitest';

// Mock crypto.randomUUID for consistent test IDs
let uuidCounter = 0;
vi.stubGlobal('crypto', {
  randomUUID: () => `test-uuid-${++uuidCounter}`
});

// Reset UUID counter before each test
beforeEach(() => {
  uuidCounter = 0;
});

// Clean up IndexedDB between tests
afterEach(async () => {
  const databases = await indexedDB.databases();
  for (const db of databases) {
    if (db.name) {
      indexedDB.deleteDatabase(db.name);
    }
  }
});
