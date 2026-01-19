import { describe, it, expect } from 'vitest';
import {
  createActionLog,
  pushAction,
  canUndo,
  canRedo,
  undo,
  redo,
  getUndoDescription,
  getRedoDescription,
  getRecentActions,
  type Action
} from './actionLog';
import type { CharacterSession } from '../types';

// Helper to create minimal session objects for testing
function createSession(hp: number): CharacterSession {
  return {
    id: 'test-session',
    definitionId: 'test-def',
    currentHP: hp,
    tempHP: 0,
    deathSaves: { successes: 0, failures: 0 },
    isDowned: false,
    resourceCurrents: {},
    conditions: [],
    pinnedItems: [],
    lastModified: new Date().toISOString()
  };
}

describe('actionLog', () => {
  describe('createActionLog', () => {
    it('creates empty action log', () => {
      const log = createActionLog();
      expect(log.actions).toHaveLength(0);
      expect(log.pointer).toBe(-1);
    });
  });

  describe('pushAction', () => {
    it('adds action to empty log', () => {
      const log = createActionLog();
      const action: Action = {
        name: 'Damage -5',
        previousSession: createSession(50),
        newSession: createSession(45)
      };

      const newLog = pushAction(log, action);

      expect(newLog.actions).toHaveLength(1);
      expect(newLog.pointer).toBe(0);
      expect(newLog.actions[0].name).toBe('Damage -5');
      expect(newLog.actions[0].timestamp).toBeDefined();
    });

    it('adds action to existing log', () => {
      let log = createActionLog();
      log = pushAction(log, {
        name: 'Action 1',
        previousSession: createSession(50),
        newSession: createSession(45)
      });
      log = pushAction(log, {
        name: 'Action 2',
        previousSession: createSession(45),
        newSession: createSession(40)
      });

      expect(log.actions).toHaveLength(2);
      expect(log.pointer).toBe(1);
    });

    it('discards future actions after undo', () => {
      let log = createActionLog();

      // Add 3 actions
      log = pushAction(log, {
        name: 'Action 1',
        previousSession: createSession(50),
        newSession: createSession(45)
      });
      log = pushAction(log, {
        name: 'Action 2',
        previousSession: createSession(45),
        newSession: createSession(40)
      });
      log = pushAction(log, {
        name: 'Action 3',
        previousSession: createSession(40),
        newSession: createSession(35)
      });

      // Undo twice
      const undoResult1 = undo(log);
      const undoResult2 = undo(undoResult1!.log);
      log = undoResult2!.log;

      // Push new action - should discard Action 2 and 3
      log = pushAction(log, {
        name: 'New Action',
        previousSession: createSession(45),
        newSession: createSession(50)
      });

      expect(log.actions).toHaveLength(2);
      expect(log.actions[0].name).toBe('Action 1');
      expect(log.actions[1].name).toBe('New Action');
    });

    it('limits to 20 actions (trims oldest)', () => {
      let log = createActionLog();

      // Add 25 actions
      for (let i = 0; i < 25; i++) {
        log = pushAction(log, {
          name: `Action ${i}`,
          previousSession: createSession(100 - i),
          newSession: createSession(100 - i - 1)
        });
      }

      expect(log.actions).toHaveLength(20);
      expect(log.actions[0].name).toBe('Action 5'); // First 5 trimmed
      expect(log.actions[19].name).toBe('Action 24');
      expect(log.pointer).toBe(19);
    });
  });

  describe('canUndo / canRedo', () => {
    it('canUndo is false for empty log', () => {
      const log = createActionLog();
      expect(canUndo(log)).toBe(false);
    });

    it('canUndo is true after action', () => {
      let log = createActionLog();
      log = pushAction(log, {
        name: 'Action',
        previousSession: createSession(50),
        newSession: createSession(45)
      });
      expect(canUndo(log)).toBe(true);
    });

    it('canRedo is false initially', () => {
      let log = createActionLog();
      log = pushAction(log, {
        name: 'Action',
        previousSession: createSession(50),
        newSession: createSession(45)
      });
      expect(canRedo(log)).toBe(false);
    });

    it('canRedo is true after undo', () => {
      let log = createActionLog();
      log = pushAction(log, {
        name: 'Action',
        previousSession: createSession(50),
        newSession: createSession(45)
      });

      const result = undo(log);
      expect(canRedo(result!.log)).toBe(true);
    });

    it('canUndo is false after undoing all actions', () => {
      let log = createActionLog();
      log = pushAction(log, {
        name: 'Action',
        previousSession: createSession(50),
        newSession: createSession(45)
      });

      const result = undo(log);
      expect(canUndo(result!.log)).toBe(false);
    });
  });

  describe('undo', () => {
    it('returns null when nothing to undo', () => {
      const log = createActionLog();
      expect(undo(log)).toBeNull();
    });

    it('restores previous session state', () => {
      let log = createActionLog();
      const previousSession = createSession(50);
      const newSession = createSession(45);

      log = pushAction(log, {
        name: 'Damage',
        previousSession,
        newSession
      });

      const result = undo(log);

      expect(result).not.toBeNull();
      expect(result!.restoredSession.currentHP).toBe(50);
      expect(result!.log.pointer).toBe(-1);
    });

    it('handles multiple undos', () => {
      let log = createActionLog();

      log = pushAction(log, {
        name: 'Action 1',
        previousSession: createSession(50),
        newSession: createSession(45)
      });
      log = pushAction(log, {
        name: 'Action 2',
        previousSession: createSession(45),
        newSession: createSession(40)
      });
      log = pushAction(log, {
        name: 'Action 3',
        previousSession: createSession(40),
        newSession: createSession(35)
      });

      // Undo 3 times
      let result = undo(log);
      expect(result!.restoredSession.currentHP).toBe(40);

      result = undo(result!.log);
      expect(result!.restoredSession.currentHP).toBe(45);

      result = undo(result!.log);
      expect(result!.restoredSession.currentHP).toBe(50);

      // No more undos
      expect(undo(result!.log)).toBeNull();
    });
  });

  describe('redo', () => {
    it('returns null when nothing to redo', () => {
      let log = createActionLog();
      log = pushAction(log, {
        name: 'Action',
        previousSession: createSession(50),
        newSession: createSession(45)
      });
      expect(redo(log)).toBeNull();
    });

    it('restores next session state after undo', () => {
      let log = createActionLog();

      log = pushAction(log, {
        name: 'Damage',
        previousSession: createSession(50),
        newSession: createSession(45)
      });

      const undoResult = undo(log);
      const redoResult = redo(undoResult!.log);

      expect(redoResult).not.toBeNull();
      expect(redoResult!.restoredSession.currentHP).toBe(45);
      expect(redoResult!.log.pointer).toBe(0);
    });

    it('handles undo/redo chain', () => {
      let log = createActionLog();

      log = pushAction(log, {
        name: 'Action 1',
        previousSession: createSession(50),
        newSession: createSession(45)
      });
      log = pushAction(log, {
        name: 'Action 2',
        previousSession: createSession(45),
        newSession: createSession(40)
      });

      // Undo both
      let result = undo(log);
      result = undo(result!.log);

      // Redo both
      result = redo(result!.log);
      expect(result!.restoredSession.currentHP).toBe(45);

      result = redo(result!.log);
      expect(result!.restoredSession.currentHP).toBe(40);

      // No more redos
      expect(redo(result!.log)).toBeNull();
    });
  });

  describe('getUndoDescription / getRedoDescription', () => {
    it('returns null for empty log', () => {
      const log = createActionLog();
      expect(getUndoDescription(log)).toBeNull();
      expect(getRedoDescription(log)).toBeNull();
    });

    it('returns action name for undo', () => {
      let log = createActionLog();
      log = pushAction(log, {
        name: 'HP -5',
        previousSession: createSession(50),
        newSession: createSession(45)
      });

      expect(getUndoDescription(log)).toBe('HP -5');
    });

    it('returns action name for redo after undo', () => {
      let log = createActionLog();
      log = pushAction(log, {
        name: 'HP -5',
        previousSession: createSession(50),
        newSession: createSession(45)
      });

      const result = undo(log);
      expect(getRedoDescription(result!.log)).toBe('HP -5');
    });
  });

  describe('getRecentActions', () => {
    it('returns empty array for empty log', () => {
      const log = createActionLog();
      expect(getRecentActions(log)).toEqual([]);
    });

    it('returns recent actions in reverse order', () => {
      let log = createActionLog();

      log = pushAction(log, {
        name: 'Action 1',
        previousSession: createSession(50),
        newSession: createSession(45)
      });
      log = pushAction(log, {
        name: 'Action 2',
        previousSession: createSession(45),
        newSession: createSession(40)
      });
      log = pushAction(log, {
        name: 'Action 3',
        previousSession: createSession(40),
        newSession: createSession(35)
      });

      const recent = getRecentActions(log, 5);
      expect(recent).toHaveLength(3);
      expect(recent[0].name).toBe('Action 3'); // Most recent first
      expect(recent[1].name).toBe('Action 2');
      expect(recent[2].name).toBe('Action 1');
    });

    it('limits to specified count', () => {
      let log = createActionLog();

      for (let i = 0; i < 10; i++) {
        log = pushAction(log, {
          name: `Action ${i}`,
          previousSession: createSession(100 - i),
          newSession: createSession(100 - i - 1)
        });
      }

      const recent = getRecentActions(log, 3);
      expect(recent).toHaveLength(3);
      expect(recent[0].name).toBe('Action 9');
      expect(recent[1].name).toBe('Action 8');
      expect(recent[2].name).toBe('Action 7');
    });
  });
});
