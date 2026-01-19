import type { ActiveCondition } from '../../types';
import { findConditionInfo, decrementConditionRounds } from '../../types';
import { currentSession, updateSession } from '../../state';

interface ConditionBadgeProps {
  condition: ActiveCondition;
  onRemove?: () => void;
  showDetails?: boolean;
}

export function ConditionBadge({ condition, onRemove, showDetails = false }: ConditionBadgeProps) {
  const info = findConditionInfo(condition.name);

  const handleDecrement = () => {
    if (condition.roundsRemaining === undefined) return;

    updateSession(session => ({
      ...session,
      conditions: session.conditions.map(c =>
        c.id === condition.id ? decrementConditionRounds(c) : c
      ),
      lastModified: new Date().toISOString()
    }), 'Decrement condition rounds');
  };

  return (
    <div class="condition-badge">
      <div class="condition-badge__header">
        <span class="condition-badge__name">{condition.name}</span>
        {condition.roundsRemaining !== undefined && (
          <button
            class="condition-badge__rounds"
            onClick={handleDecrement}
            title="Click to decrement"
          >
            {condition.roundsRemaining}r
          </button>
        )}
        {onRemove && (
          <button class="condition-badge__remove" onClick={onRemove} title="Remove">
            ×
          </button>
        )}
      </div>

      {condition.source && (
        <div class="condition-badge__source">{condition.source}</div>
      )}

      {condition.ends && (
        <div class="condition-badge__ends">{condition.ends}</div>
      )}

      {showDetails && info && (
        <div class="condition-badge__effects">
          {info.effects.map((effect, i) => (
            <div key={i} class="condition-badge__effect">• {effect}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ConcentrationBadge() {
  const session = currentSession.value;
  if (!session?.concentratingOn) return null;

  const handleBreak = () => {
    updateSession(sess => ({
      ...sess,
      concentratingOn: undefined,
      lastModified: new Date().toISOString()
    }), 'Break concentration');
  };

  return (
    <div class="concentration-badge">
      <span class="concentration-badge__icon">◉</span>
      <span class="concentration-badge__spell">{session.concentratingOn.spellName}</span>
      <button class="concentration-badge__break" onClick={handleBreak} title="Break concentration">
        ×
      </button>
    </div>
  );
}
