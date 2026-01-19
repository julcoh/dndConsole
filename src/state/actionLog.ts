import type { CharacterSession } from '../types';

// === Action Types ===

export interface Action {
  name: string;
  previousSession: CharacterSession;
  newSession: CharacterSession;
  timestamp?: string;
}

export interface ActionLog {
  actions: Action[];
  pointer: number; // Index of current state (-1 = no actions)
}

// === Constants ===

const MAX_UNDO_STACK = 20;

// === Action Log Functions ===

export function createActionLog(): ActionLog {
  return {
    actions: [],
    pointer: -1
  };
}

export function pushAction(log: ActionLog, action: Action): ActionLog {
  // When pushing a new action, discard any "future" actions (if we've undone)
  const newActions = log.actions.slice(0, log.pointer + 1);

  // Add the new action with timestamp
  newActions.push({
    ...action,
    timestamp: new Date().toISOString()
  });

  // Trim to max size (remove oldest)
  while (newActions.length > MAX_UNDO_STACK) {
    newActions.shift();
  }

  return {
    actions: newActions,
    pointer: newActions.length - 1
  };
}

export function canUndo(log: ActionLog): boolean {
  return log.pointer >= 0;
}

export function canRedo(log: ActionLog): boolean {
  return log.pointer < log.actions.length - 1;
}

export function undo(log: ActionLog): { log: ActionLog; restoredSession: CharacterSession } | null {
  if (!canUndo(log)) return null;

  const action = log.actions[log.pointer];

  return {
    log: {
      ...log,
      pointer: log.pointer - 1
    },
    restoredSession: action.previousSession
  };
}

export function redo(log: ActionLog): { log: ActionLog; restoredSession: CharacterSession } | null {
  if (!canRedo(log)) return null;

  const nextAction = log.actions[log.pointer + 1];

  return {
    log: {
      ...log,
      pointer: log.pointer + 1
    },
    restoredSession: nextAction.newSession
  };
}

export function getUndoDescription(log: ActionLog): string | null {
  if (!canUndo(log)) return null;
  return log.actions[log.pointer].name;
}

export function getRedoDescription(log: ActionLog): string | null {
  if (!canRedo(log)) return null;
  return log.actions[log.pointer + 1].name;
}

export function getRecentActions(log: ActionLog, count: number = 5): Action[] {
  const start = Math.max(0, log.pointer - count + 1);
  const end = log.pointer + 1;
  return log.actions.slice(start, end).reverse();
}
