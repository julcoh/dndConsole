import { signal } from '@preact/signals';
import type { AdvantageState } from '../../utils/dice';

// Global advantage state - affects all d20 rolls
export const globalAdvantage = signal<AdvantageState>('normal');

// Cycle through advantage states
export function cycleAdvantage(): void {
  const current = globalAdvantage.value;
  if (current === 'normal') {
    globalAdvantage.value = 'advantage';
  } else if (current === 'advantage') {
    globalAdvantage.value = 'disadvantage';
  } else {
    globalAdvantage.value = 'normal';
  }
}

// Set specific advantage state
export function setAdvantage(state: AdvantageState): void {
  globalAdvantage.value = state;
}

// Reset to normal after a roll (optional behavior)
export function resetAdvantage(): void {
  globalAdvantage.value = 'normal';
}
