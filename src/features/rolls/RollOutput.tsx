import type { AttackRollResult, SaveRollResult, RollResult } from '../../utils/dice';

interface RollOutputProps {
  result: AttackRollResult | SaveRollResult | RollResult;
  type: 'attack' | 'save' | 'check' | 'damage';
  label: string;
  onCopy?: () => void;
  onClose?: () => void;
}

export function RollOutput({ result, type, label, onCopy, onClose }: RollOutputProps) {
  const isAttack = type === 'attack' && 'toHitRoll' in result;
  const isSave = type === 'save' && 'targetDC' in result;

  return (
    <div class={`roll-output roll-output--${type}`}>
      <div class="roll-output__header">
        <span class="roll-output__label">{label}</span>
        <div class="roll-output__actions">
          {onCopy && (
            <button class="roll-output__btn" onClick={onCopy} title="Copy">
              📋
            </button>
          )}
          {onClose && (
            <button class="roll-output__btn" onClick={onClose} title="Close">
              ×
            </button>
          )}
        </div>
      </div>

      {isAttack && <AttackOutput result={result as AttackRollResult} />}
      {isSave && <SaveOutput result={result as SaveRollResult} />}
      {!isAttack && !isSave && <SimpleRollOutput result={result as RollResult} />}
    </div>
  );
}

function AttackOutput({ result }: { result: AttackRollResult }) {
  const { toHitRoll, natural, isCrit, isFumble, damageRoll, damageType } = result;

  return (
    <div class="roll-output__body">
      <div class="roll-output__line">
        <span class="roll-output__key">To Hit:</span>
        <span class={`roll-output__value ${isCrit ? 'roll-output__value--crit' : ''} ${isFumble ? 'roll-output__value--fumble' : ''}`}>
          {toHitRoll.total}
        </span>
        <span class="roll-output__breakdown">
          ({natural} + {toHitRoll.bonus})
        </span>
        {isCrit && <span class="roll-output__tag roll-output__tag--crit">CRIT!</span>}
        {isFumble && <span class="roll-output__tag roll-output__tag--fumble">FUMBLE</span>}
      </div>

      {damageRoll && (
        <div class="roll-output__line">
          <span class="roll-output__key">Damage:</span>
          <span class={`roll-output__value ${isCrit ? 'roll-output__value--crit' : ''}`}>
            {damageRoll.total}
          </span>
          <span class="roll-output__breakdown">
            ({formatDice(damageRoll)})
          </span>
          <span class="roll-output__type">{damageType}</span>
        </div>
      )}
    </div>
  );
}

function SaveOutput({ result }: { result: SaveRollResult }) {
  const { roll, natural, targetDC, success, damage, damageType } = result;

  return (
    <div class="roll-output__body">
      <div class="roll-output__line">
        <span class="roll-output__key">Save vs DC {targetDC}:</span>
        <span class={`roll-output__value ${success ? 'roll-output__value--success' : 'roll-output__value--fail'}`}>
          {roll.total}
        </span>
        <span class="roll-output__breakdown">
          ({natural} + {roll.bonus})
        </span>
        <span class={`roll-output__tag ${success ? 'roll-output__tag--success' : 'roll-output__tag--fail'}`}>
          {success ? 'SUCCESS' : 'FAILED'}
        </span>
      </div>

      {damage && (
        <div class="roll-output__line">
          <span class="roll-output__key">Damage{success ? ' (half)' : ''}:</span>
          <span class="roll-output__value">{damage.total}</span>
          <span class="roll-output__type">{damageType}</span>
        </div>
      )}
    </div>
  );
}

function SimpleRollOutput({ result }: { result: RollResult }) {
  return (
    <div class="roll-output__body">
      <div class="roll-output__line">
        <span class="roll-output__value roll-output__value--large">{result.total}</span>
        <span class="roll-output__breakdown">
          ({formatDice(result)})
        </span>
      </div>
    </div>
  );
}

function formatDice(roll: RollResult): string {
  const parts: string[] = [];

  for (const die of roll.dice) {
    if (die.wasRerolled) {
      parts.push(`${die.result}(${die.originalRoll}→)`);
    } else {
      parts.push(String(die.result));
    }
  }

  if (roll.bonus !== 0) {
    parts.push(roll.bonus > 0 ? `+${roll.bonus}` : String(roll.bonus));
  }

  return parts.join(' + ');
}

// Utility to format roll for clipboard
export function formatRollForClipboard(
  result: AttackRollResult | SaveRollResult | RollResult,
  _type: string,
  label: string
): string {
  if ('toHitRoll' in result) {
    const r = result as AttackRollResult;
    let text = `${label}: ${r.toHitRoll.total} to hit`;
    if (r.isCrit) text += ' (CRIT!)';
    if (r.isFumble) text += ' (Fumble)';
    if (r.damageRoll) {
      text += `, ${r.damageRoll.total} ${r.damageType} damage`;
    }
    return text;
  }

  if ('targetDC' in result) {
    const r = result as SaveRollResult;
    let text = `${label}: ${r.roll.total} vs DC ${r.targetDC} (${r.success ? 'Success' : 'Failed'})`;
    if (r.damage) {
      text += `, ${r.damage.total} ${r.damageType} damage`;
    }
    return text;
  }

  return `${label}: ${(result as RollResult).total}`;
}
