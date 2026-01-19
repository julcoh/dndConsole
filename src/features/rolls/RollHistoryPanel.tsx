import { rollHistory, clearHistory, getHistorySummary, type HistoryEntry } from './rollHistory';
import { currentRoll } from './MacroButton';

export function RollHistoryPanel() {
  const history = rollHistory.value;

  if (history.length === 0) {
    return null;
  }

  const handleEntryClick = (entry: HistoryEntry) => {
    currentRoll.value = {
      result: entry.result,
      type: entry.type,
      label: entry.label
    };
  };

  return (
    <div class="roll-history">
      <div class="roll-history__header">
        <span class="roll-history__title">Recent Rolls</span>
        <button class="roll-history__clear" onClick={clearHistory}>Clear</button>
      </div>
      <div class="roll-history__list">
        {history.map((entry) => (
          <button
            key={entry.timestamp}
            class={`roll-history__entry roll-history__entry--${entry.type}`}
            onClick={() => handleEntryClick(entry)}
          >
            <span class="roll-history__label">{entry.label}</span>
            <span class="roll-history__result">{getHistorySummary(entry)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
