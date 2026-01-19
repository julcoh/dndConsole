import { signal } from '@preact/signals';
import { currentSession, addDeathSuccess, addDeathFailure, resetDeathSaves, modifyHP } from '../../state';

// Track last death save roll result for display
const lastDeathSaveRoll = signal<{ roll: number; result: 'success' | 'failure' | 'nat20' | 'nat1' } | null>(null);

function rollDeathSave(): void {
  const roll = Math.floor(Math.random() * 20) + 1;

  if (roll === 20) {
    // Natural 20: regain 1 HP and wake up
    lastDeathSaveRoll.value = { roll, result: 'nat20' };
    modifyHP(1);
    resetDeathSaves();
  } else if (roll === 1) {
    // Natural 1: 2 failures
    lastDeathSaveRoll.value = { roll, result: 'nat1' };
    addDeathFailure();
    addDeathFailure();
  } else if (roll >= 10) {
    // Success
    lastDeathSaveRoll.value = { roll, result: 'success' };
    addDeathSuccess();
  } else {
    // Failure
    lastDeathSaveRoll.value = { roll, result: 'failure' };
    addDeathFailure();
  }

  // Clear the roll display after 3 seconds
  setTimeout(() => {
    lastDeathSaveRoll.value = null;
  }, 3000);
}

export function DeathSavesOverlay() {
  const session = currentSession.value;

  if (!session || !session.isDowned) return null;

  const { successes, failures } = session.deathSaves;
  const isStable = successes >= 3;
  const isDead = failures >= 3;
  const rollResult = lastDeathSaveRoll.value;

  return (
    <div class="death-saves-overlay">
      <div class="death-saves-overlay__backdrop" />
      <div class="death-saves-overlay__panel card">
        <h2 class="death-saves__title">
          {isDead ? 'DEAD' : isStable ? 'Stable' : 'DOWNED'}
        </h2>

        {/* Roll result display */}
        {rollResult && (
          <div class={`death-saves__roll-result death-saves__roll-result--${rollResult.result}`}>
            <span class="death-saves__roll-number">{rollResult.roll}</span>
            <span class="death-saves__roll-text">
              {rollResult.result === 'nat20' && 'NAT 20! Back up with 1 HP!'}
              {rollResult.result === 'nat1' && 'NAT 1! Two failures!'}
              {rollResult.result === 'success' && 'Success!'}
              {rollResult.result === 'failure' && 'Failure!'}
            </span>
          </div>
        )}

        <div class="death-saves__rows">
          <div class="death-saves__row">
            <span class="death-saves__label">Successes</span>
            <div class="death-saves__pips">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  class={`death-saves__pip ${i < successes ? 'death-saves__pip--success' : ''}`}
                >
                  {i < successes ? '\u25CF' : '\u25CB'}
                </span>
              ))}
            </div>
            <button
              class="btn btn--small"
              onClick={addDeathSuccess}
              disabled={isStable || isDead}
            >
              +
            </button>
          </div>

          <div class="death-saves__row">
            <span class="death-saves__label">Failures</span>
            <div class="death-saves__pips">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  class={`death-saves__pip ${i < failures ? 'death-saves__pip--failure' : ''}`}
                >
                  {i < failures ? '\u25CF' : '\u25CB'}
                </span>
              ))}
            </div>
            <button
              class="btn btn--small btn--danger"
              onClick={addDeathFailure}
              disabled={isStable || isDead}
            >
              +
            </button>
          </div>
        </div>

        {/* Roll button - prominent when not stable/dead */}
        {!isStable && !isDead && (
          <button
            class="btn btn--primary death-saves__roll-btn"
            onClick={rollDeathSave}
          >
            Roll Death Save (d20)
          </button>
        )}

        <div class="death-saves__actions">
          <button
            class="btn"
            onClick={() => {
              modifyHP(1);
              resetDeathSaves();
            }}
          >
            Heal (1 HP)
          </button>
          <button
            class="btn btn--secondary"
            onClick={resetDeathSaves}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
