import { signal } from '@preact/signals';
import type { AttackRollResult, SaveRollResult, RollResult } from '../../utils/dice';

export interface HistoryEntry {
  result: AttackRollResult | SaveRollResult | RollResult;
  type: 'attack' | 'save' | 'check';
  label: string;
  timestamp: number;
}

const MAX_HISTORY = 10;

export const rollHistory = signal<HistoryEntry[]>([]);

export function addToHistory(entry: HistoryEntry) {
  const history = [...rollHistory.value];
  history.unshift(entry);
  if (history.length > MAX_HISTORY) {
    history.pop();
  }
  rollHistory.value = history;
}

export function clearHistory() {
  rollHistory.value = [];
}

export function getHistorySummary(entry: HistoryEntry): string {
  const { result, type } = entry;

  if (type === 'attack' && 'toHitRoll' in result) {
    const r = result as AttackRollResult;
    let text = `${r.toHitRoll.total}`;
    if (r.isCrit) text += '!';
    if (r.damageRoll) text += ` → ${r.damageRoll.total}`;
    return text;
  }

  if (type === 'save' && 'targetDC' in result) {
    const r = result as SaveRollResult;
    const icon = r.success ? '✓' : '✗';
    return `${r.roll.total} ${icon}`;
  }

  return String((result as RollResult).total);
}
